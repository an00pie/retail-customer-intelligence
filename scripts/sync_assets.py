#!/usr/bin/env python3
"""
INSIGHT.arc Deterministic Asset Sync & Integrity Guard.

Ensures synchronization between the dual frontend environments:
- frontend/ (Vite/React/Vercel)
- web/ (Flask/Render)
- frontend/public/static/ (Vite public static directory)

Safety rules:
- Does NOT assume either side is always canonical.
- Requires explicit source (--from [frontend|web]) to perform sync.
- Default mode is read-only integrity check (--check).
- Refuses to overwrite dirty/newer targets without --force.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import NamedTuple


class MirrorPair(NamedTuple):
    name: str
    frontend_path: str
    web_path: str
    public_path: str | None = None


MIRRORED_ASSETS: list[MirrorPair] = [
    MirrorPair(
        name="HTML Template",
        frontend_path="frontend/index.html",
        web_path="web/templates/index.html",
    ),
    MirrorPair(
        name="CSS Stylesheet",
        frontend_path="frontend/static/css/dashflow.css",
        web_path="web/static/css/dashflow.css",
        public_path="frontend/public/static/css/dashflow.css",
    ),
    MirrorPair(
        name="JS Application",
        frontend_path="frontend/static/js/dashflow.js",
        web_path="web/static/js/dashflow.js",
        public_path="frontend/public/static/js/dashflow.js",
    ),
    MirrorPair(
        name="JS Chart Library",
        frontend_path="frontend/static/js/chart.min.js",
        web_path="web/static/js/chart.min.js",
        public_path="frontend/public/static/js/chart.min.js",
    ),
]


def compute_sha256(path: Path) -> str:
    """Compute SHA-256 digest of file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def check_git_target_status(repo_root: Path, rel_path: str) -> tuple[bool, bool]:
    """
    Check Git status for target file.
    Returns (is_dirty, is_error).
    If not a git repository, returns (False, False) since git tracking is not active.
    If Git status fails with non-zero exit code or exception inside a git repository, is_error is True.
    """
    if not (repo_root / ".git").exists():
        return False, False

    try:
        proc = subprocess.run(
            ["git", "status", "--porcelain", rel_path],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            return False, True
        return bool(proc.stdout.strip()), False
    except Exception:
        return False, True


def check_integrity(repo_root: Path, verbose: bool = True) -> tuple[bool, list[dict]]:
    """
    Check if all mirrored files match across frontend, web, and public directories.
    Returns (all_in_sync, list_of_diagnostics).
    """
    all_in_sync = True
    diagnostics = []

    for pair in MIRRORED_ASSETS:
        fe_file = repo_root / pair.frontend_path
        web_file = repo_root / pair.web_path
        pub_file = (repo_root / pair.public_path) if pair.public_path else None

        item: dict = {
            "name": pair.name,
            "frontend_path": pair.frontend_path,
            "web_path": pair.web_path,
            "public_path": pair.public_path,
            "in_sync": True,
            "issues": [],
        }

        # Check frontend file existence
        if not fe_file.is_file():
            all_in_sync = False
            item["in_sync"] = False
            item["issues"].append(f"Missing frontend file: {pair.frontend_path}")

        # Check web file existence
        if not web_file.is_file():
            all_in_sync = False
            item["in_sync"] = False
            item["issues"].append(f"Missing web file: {pair.web_path}")

        # Compare frontend vs web
        if fe_file.is_file() and web_file.is_file():
            fe_hash = compute_sha256(fe_file)
            web_hash = compute_sha256(web_file)
            item["frontend_sha256"] = fe_hash
            item["web_sha256"] = web_hash

            if fe_hash != web_hash:
                all_in_sync = False
                item["in_sync"] = False
                fe_mtime = fe_file.stat().st_mtime
                web_mtime = web_file.stat().st_mtime
                newer = "frontend" if fe_mtime > web_mtime else ("web" if web_mtime > fe_mtime else "same timestamp")
                item["issues"].append(
                    f"Drift between frontend ({fe_hash[:8]}) and web ({web_hash[:8]}). Newer: {newer}"
                )

        # Check public mirror if applicable
        if pub_file is not None:
            if not pub_file.is_file():
                all_in_sync = False
                item["in_sync"] = False
                item["issues"].append(f"Missing public mirror file: {pair.public_path}")
            elif fe_file.is_file():
                pub_hash = compute_sha256(pub_file)
                item["public_sha256"] = pub_hash
                if pub_hash != item.get("frontend_sha256", compute_sha256(fe_file)):
                    all_in_sync = False
                    item["in_sync"] = False
                    item["issues"].append(
                        f"Drift between frontend static and public mirror ({pair.public_path})"
                    )

        diagnostics.append(item)

    if verbose:
        print("=" * 70)
        print("INSIGHT.arc Asset Mirroring Integrity Guard")
        print("=" * 70)
        for item in diagnostics:
            status = "✔ SYNCED" if item["in_sync"] else "❌ MISMATCH"
            print(f"[{status}] {item['name']}")
            print(f"  • Frontend: {item['frontend_path']}")
            print(f"  • Web:      {item['web_path']}")
            if item.get("public_path"):
                print(f"  • Public:   {item['public_path']}")
            if item["issues"]:
                for issue in item["issues"]:
                    print(f"    ! {issue}")
        print("=" * 70)
        if all_in_sync:
            print("Status: All mirrored assets are 100% synchronized.")
        else:
            print("Status: Drift detected! Use 'sync_assets.py --from [frontend|web]' to sync.")
        print("=" * 70)

    return all_in_sync, diagnostics


def copy_atomic(src: Path, dst: Path) -> None:
    """Safely copy a file atomically using os.replace to prevent partial writes."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    temp_fd, temp_path = tempfile.mkstemp(dir=dst.parent, prefix="sync_tmp_")
    try:
        with open(temp_fd, "wb") as f_out, open(src, "rb") as f_in:
            shutil.copyfileobj(f_in, f_out)
        shutil.copymode(src, temp_path)
        os.replace(temp_path, dst)
    except Exception:
        if Path(temp_path).exists():
            Path(temp_path).unlink(missing_ok=True)
        raise


def sync_assets(
    repo_root: Path,
    source: str,
    force: bool = False,
    dry_run: bool = False,
    verbose: bool = True,
) -> bool:
    """
    Synchronize mirrored assets with an explicit source ('frontend' or 'web').
    """
    if source not in ("frontend", "web"):
        raise ValueError("Source must be explicitly designated as 'frontend' or 'web'.")

    actions: list[tuple[Path, Path, str, str]] = []  # (src_file, dst_file, src_rel, dst_rel)

    for pair in MIRRORED_ASSETS:
        fe_path = repo_root / pair.frontend_path
        web_path = repo_root / pair.web_path
        pub_path = (repo_root / pair.public_path) if pair.public_path else None

        if source == "frontend":
            actions.append((fe_path, web_path, pair.frontend_path, pair.web_path))
            if pub_path:
                actions.append((fe_path, pub_path, pair.frontend_path, pair.public_path))
        else:  # source == 'web'
            actions.append((web_path, fe_path, pair.web_path, pair.frontend_path))
            if pub_path:
                actions.append((web_path, pub_path, pair.web_path, pair.public_path))

    # Pre-validation & safety check
    for src_file, dst_file, src_rel, dst_rel in actions:
        if not src_file.is_file():
            print(f"Error: Source file does not exist: {src_rel}", file=sys.stderr)
            return False

        if dst_file.is_file():
            src_hash = compute_sha256(src_file)
            dst_hash = compute_sha256(dst_file)

            if src_hash != dst_hash:
                # Check for dirty working tree or git status failure in target
                is_dirty, git_err = check_git_target_status(repo_root, dst_rel)
                if git_err and not force:
                    print(
                        f"Error: Could not determine Git status for target '{dst_rel}'.\n"
                        f"Refusing to sync without --force to prevent accidental overwrites.",
                        file=sys.stderr,
                    )
                    return False

                if is_dirty and not force:
                    print(
                        f"Error: Target file '{dst_rel}' has uncommitted Git changes.\n"
                        f"Refusing to overwrite without --force.",
                        file=sys.stderr,
                    )
                    return False

                # Check if target is newer than source
                src_mtime = src_file.stat().st_mtime
                dst_mtime = dst_file.stat().st_mtime
                if dst_mtime > src_mtime and not force:
                    print(
                        f"Error: Target file '{dst_rel}' has a newer timestamp than source '{src_rel}'.\n"
                        f"Refusing to overwrite newer changes without --force.",
                        file=sys.stderr,
                    )
                    return False

    if verbose:
        mode_label = "[DRY-RUN] " if dry_run else ""
        print(f"{mode_label}Syncing mirrored assets using CANONICAL SOURCE: '{source}'")

    copied_count = 0
    identical_count = 0

    for src_file, dst_file, src_rel, dst_rel in actions:
        src_hash = compute_sha256(src_file)
        dst_hash = compute_sha256(dst_file) if dst_file.is_file() else None

        if src_hash == dst_hash:
            if verbose:
                print(f"  • Up to date: {dst_rel}")
            identical_count += 1
            continue

        if dry_run:
            if verbose:
                print(f"  • Would copy: {src_rel} -> {dst_rel}")
            copied_count += 1
        else:
            if verbose:
                print(f"  • Copying: {src_rel} -> {dst_rel}")
            copy_atomic(src_file, dst_file)
            copied_count += 1

    if verbose:
        action_verb = "Would update" if dry_run else "Updated"
        print(f"Summary: {action_verb} {copied_count} file(s); {identical_count} already identical.")

    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="INSIGHT.arc Deterministic Asset Mirroring Guard and Sync Tool"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--check",
        action="store_true",
        help="Check integrity of all mirrored assets without modifying any files (default)",
    )
    group.add_argument(
        "--from",
        dest="from_source",
        choices=["frontend", "web"],
        help="Explicitly designate canonical source to sync from ('frontend' or 'web')",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate sync actions without writing to disk",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow overwriting targets that have uncommitted changes or newer timestamps",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output integrity check results in JSON format",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress non-error log messages",
    )

    args = parser.parse_args()

    # Locate repository root relative to this script
    repo_root = Path(__file__).resolve().parents[1]

    # Default to --check if no --from source is given
    if not args.from_source:
        in_sync, diagnostics = check_integrity(repo_root, verbose=not (args.quiet or args.json))
        if args.json:
            print(json.dumps({"in_sync": in_sync, "diagnostics": diagnostics}, indent=2))
        return 0 if in_sync else 1

    # Sync mode
    success = sync_assets(
        repo_root=repo_root,
        source=args.from_source,
        force=args.force,
        dry_run=args.dry_run,
        verbose=not args.quiet,
    )

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
