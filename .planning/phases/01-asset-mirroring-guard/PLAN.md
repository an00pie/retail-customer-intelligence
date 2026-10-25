# Phase 1 Plan: Automated Asset Mirroring Guard for INSIGHT.arc

## Context & Objectives
INSIGHT.arc maintains dual frontends:
1. `frontend/` (Vite + React + static serving, deployed to Vercel)
2. `web/` (Flask Jinja templates + Flask static serving, deployed to Render)

Historical drift between `frontend/` and `web/` caused critical regressions when changes applied to one environment failed to reach the other.
Phase 1 introduces a deterministic asset sync and integrity guard without changing deployment workflows, silently overwriting uncommitted edits, or altering UI/ML code.

## Canonical Source Policy
- **No static single canonical source:** Frontend is canonical when UI/Vite work is done; Web is canonical when Flask/Jinja work is done.
- **Explicit source requirement:** Sync commands must explicitly specify `--from frontend` or `--from web`.
- **Integrity Check:** `--check` validates equality between all mirrored files and fails with exit code 1 if drift is detected.

## Assets in Scope
1. Primary Templates:
   - `frontend/index.html` ↔ `web/templates/index.html`
2. Stylesheets:
   - `frontend/static/css/dashflow.css` ↔ `web/static/css/dashflow.css`
   - `frontend/static/css/dashflow.css` ↔ `frontend/public/static/css/dashflow.css`
3. Client Scripts:
   - `frontend/static/js/dashflow.js` ↔ `web/static/js/dashflow.js`
   - `frontend/static/js/dashflow.js` ↔ `frontend/public/static/js/dashflow.js`

## Safety Guarantees
- Default / `--check` mode is strictly read-only.
- Overwriting modified files requires `--force` if target has uncommitted changes or newer modification timestamp.
- Atomic copy operations with SHA-256 verification.
- No silent build hooks added until explicitly authorized.

## Deliverables
1. `scripts/sync_assets.py`: Deterministic CLI utility with `--check`, `--from [frontend|web]`, `--dry-run`, and `--force`.
2. `tests/test_asset_sync.py`: Unit tests covering:
   - Matching files (passes check).
   - Mismatched files (check detects drift and exits 1).
   - Missing files (check detects missing target/source and exits 1).
   - Sync from frontend -> web.
   - Sync from web -> frontend.
   - Protection against accidental overwrite without `--force`.
3. `frontend/package.json`: Explicit npm script entries for `assets:check` and `assets:sync`.
4. Ralph Loop bounded execution for test verification.
5. CodeRabbit review of uncommitted changes.
