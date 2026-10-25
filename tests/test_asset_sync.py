"""
Unit tests for INSIGHT.arc asset synchronization and integrity guard.
Tests cover:
- Exact matching mirror files
- Drift detection on mismatched content
- Handling of missing mirror files
- Explicit sync direction (frontend -> web and web -> frontend)
- Safety guards against unexpected overwrites (newer mtime, dirty status)
- Dry-run verification
"""

from __future__ import annotations

import os
from pathlib import Path
import shutil
import tempfile
from typing import Optional
import unittest
from unittest.mock import MagicMock, patch

from scripts.sync_assets import (
    MIRRORED_ASSETS,
    check_integrity,
    compute_sha256,
    sync_assets,
)


class TestAssetSync(unittest.TestCase):
    def setUp(self):
        """Create a mock repository structure with all mirrored assets."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

        # Standard baseline content
        self.html_content = b"<html><head><title>INSIGHT.arc</title></head><body><h1>Dashboard</h1></body></html>"
        self.css_content = b":root { --bg: #000; --accent: #10b981; }\nbody { background: var(--bg); }"
        self.js_content = b"console.log('INSIGHT.arc initialized');\nfunction init() { return true; }"
        self.chart_content = b"/* Chart.js mock v4 */\nwindow.Chart = function() {};"

        # Populate initial matched structure
        self._write_file("frontend/index.html", self.html_content)
        self._write_file("web/templates/index.html", self.html_content)

        self._write_file("frontend/static/css/dashflow.css", self.css_content)
        self._write_file("web/static/css/dashflow.css", self.css_content)
        self._write_file("frontend/public/static/css/dashflow.css", self.css_content)

        self._write_file("frontend/static/js/dashflow.js", self.js_content)
        self._write_file("web/static/js/dashflow.js", self.js_content)
        self._write_file("frontend/public/static/js/dashflow.js", self.js_content)

        self._write_file("frontend/static/js/chart.min.js", self.chart_content)
        self._write_file("web/static/js/chart.min.js", self.chart_content)
        self._write_file("frontend/public/static/js/chart.min.js", self.chart_content)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _write_file(self, rel_path: str, content: bytes, mtime: Optional[float] = None) -> Path:
        target = self.root / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        if mtime is not None:
            os.utime(target, (mtime, mtime))
        return target

    def test_matching_files_pass_integrity(self):
        """Test that identical files pass integrity check."""
        in_sync, diagnostics = check_integrity(self.root, verbose=False)
        self.assertTrue(in_sync)
        for d in diagnostics:
            self.assertTrue(d["in_sync"])
            self.assertEqual(d["issues"], [])

    def test_mismatched_html_fails_integrity(self):
        """Test that mismatched HTML is detected as drift."""
        self._write_file("frontend/index.html", b"<html><body>Modified in Frontend</body></html>")
        in_sync, diagnostics = check_integrity(self.root, verbose=False)
        self.assertFalse(in_sync)

        html_diag = next(d for d in diagnostics if d["name"] == "HTML Template")
        self.assertFalse(html_diag["in_sync"])
        self.assertTrue(any("Drift between frontend" in issue for issue in html_diag["issues"]))

    def test_mismatched_css_fails_integrity(self):
        """Test that mismatched CSS is detected as drift."""
        self._write_file("web/static/css/dashflow.css", b"body { background: #fff; }")
        in_sync, diagnostics = check_integrity(self.root, verbose=False)
        self.assertFalse(in_sync)

        css_diag = next(d for d in diagnostics if d["name"] == "CSS Stylesheet")
        self.assertFalse(css_diag["in_sync"])
        self.assertTrue(any("Drift between frontend" in issue for issue in css_diag["issues"]))

    def test_mismatched_public_mirror_fails_integrity(self):
        """Test that stale public static mirror is detected as drift."""
        self._write_file("frontend/public/static/js/dashflow.js", b"console.log('stale public');")
        in_sync, diagnostics = check_integrity(self.root, verbose=False)
        self.assertFalse(in_sync)

        js_diag = next(d for d in diagnostics if d["name"] == "JS Application")
        self.assertFalse(js_diag["in_sync"])
        self.assertTrue(any("Drift between frontend static and public mirror" in issue for issue in js_diag["issues"]))

    def test_missing_file_fails_integrity(self):
        """Test that missing mirror file fails integrity check."""
        (self.root / "web/templates/index.html").unlink()
        in_sync, diagnostics = check_integrity(self.root, verbose=False)
        self.assertFalse(in_sync)

        html_diag = next(d for d in diagnostics if d["name"] == "HTML Template")
        self.assertFalse(html_diag["in_sync"])
        self.assertTrue(any("Missing web file" in issue for issue in html_diag["issues"]))

    def test_sync_from_frontend_updates_web_and_public(self):
        """Test syncing with frontend as canonical updates web and public static."""
        updated_html = b"<html><body>Updated from Frontend</body></html>"
        updated_css = b":root { --accent: #34d399; }"
        self._write_file("frontend/index.html", updated_html, mtime=3000.0)
        self._write_file("frontend/static/css/dashflow.css", updated_css, mtime=3000.0)

        # Set older mtime on target files
        self._write_file("web/templates/index.html", self.html_content, mtime=1000.0)
        self._write_file("web/static/css/dashflow.css", self.css_content, mtime=1000.0)
        self._write_file("frontend/public/static/css/dashflow.css", self.css_content, mtime=1000.0)

        success = sync_assets(self.root, source="frontend", force=False, dry_run=False, verbose=False)
        self.assertTrue(success)

        # Verify web template was updated
        self.assertEqual((self.root / "web/templates/index.html").read_bytes(), updated_html)
        # Verify web css and public css were updated
        self.assertEqual((self.root / "web/static/css/dashflow.css").read_bytes(), updated_css)
        self.assertEqual((self.root / "frontend/public/static/css/dashflow.css").read_bytes(), updated_css)

        # Integrity check should now pass
        in_sync, _ = check_integrity(self.root, verbose=False)
        self.assertTrue(in_sync)

    def test_sync_from_web_updates_frontend_and_public(self):
        """Test syncing with web as canonical updates frontend and public static."""
        updated_html = b"<html><body>Updated from Web Flask Template</body></html>"
        updated_js = b"console.log('Updated from Flask web');"
        self._write_file("web/templates/index.html", updated_html, mtime=3000.0)
        self._write_file("web/static/js/dashflow.js", updated_js, mtime=3000.0)

        # Set older mtime on target files
        self._write_file("frontend/index.html", self.html_content, mtime=1000.0)
        self._write_file("frontend/static/js/dashflow.js", self.js_content, mtime=1000.0)
        self._write_file("frontend/public/static/js/dashflow.js", self.js_content, mtime=1000.0)

        success = sync_assets(self.root, source="web", force=False, dry_run=False, verbose=False)
        self.assertTrue(success)

        # Verify frontend template and js were updated
        self.assertEqual((self.root / "frontend/index.html").read_bytes(), updated_html)
        self.assertEqual((self.root / "frontend/static/js/dashflow.js").read_bytes(), updated_js)
        self.assertEqual((self.root / "frontend/public/static/js/dashflow.js").read_bytes(), updated_js)

        # Integrity check should now pass
        in_sync, _ = check_integrity(self.root, verbose=False)
        self.assertTrue(in_sync)

    def test_safety_guard_blocks_overwriting_newer_target_without_force(self):
        """Test that sync rejects overwriting target with newer mtime unless force=True."""
        self._write_file("frontend/index.html", b"<html>Frontend content</html>", mtime=1000.0)
        self._write_file("web/templates/index.html", b"<html>Web newer content</html>", mtime=2000.0)

        # Attempt to sync frontend -> web without force should fail
        success = sync_assets(self.root, source="frontend", force=False, dry_run=False, verbose=False)
        self.assertFalse(success)
        # Web file should remain unchanged
        self.assertEqual((self.root / "web/templates/index.html").read_bytes(), b"<html>Web newer content</html>")

        # Now attempt with force=True
        success = sync_assets(self.root, source="frontend", force=True, dry_run=False, verbose=False)
        self.assertTrue(success)
        self.assertEqual((self.root / "web/templates/index.html").read_bytes(), b"<html>Frontend content</html>")

    def test_dry_run_does_not_modify_files(self):
        """Test that dry-run does not write to target files."""
        self._write_file("frontend/index.html", b"<html>New Frontend</html>", mtime=2000.0)
        self._write_file("web/templates/index.html", self.html_content, mtime=1000.0)

        success = sync_assets(self.root, source="frontend", force=False, dry_run=True, verbose=False)
        self.assertTrue(success)

        # Target should still have original content
        self.assertEqual((self.root / "web/templates/index.html").read_bytes(), self.html_content)

    def test_git_status_failure_rejects_without_force(self):
        """Test that failure to query Git status causes sync to fail closed unless force=True."""
        (self.root / ".git").mkdir(exist_ok=True)
        self._write_file("frontend/index.html", b"<html>New Frontend Content</html>", mtime=2000.0)
        self._write_file("web/templates/index.html", self.html_content, mtime=1000.0)

        # Mock git status returning nonzero returncode
        mock_proc = MagicMock()
        mock_proc.returncode = 128
        mock_proc.stdout = ""

        with patch("scripts.sync_assets.subprocess.run", return_value=mock_proc):
            # Without force: must reject
            success = sync_assets(self.root, source="frontend", force=False, dry_run=False, verbose=False)
            self.assertFalse(success)
            self.assertEqual((self.root / "web/templates/index.html").read_bytes(), self.html_content)

            # With force: must proceed
            success_force = sync_assets(self.root, source="frontend", force=True, dry_run=False, verbose=False)
            self.assertTrue(success_force)
            self.assertEqual((self.root / "web/templates/index.html").read_bytes(), b"<html>New Frontend Content</html>")

    def test_git_dirty_target_rejects_without_force(self):
        """Test that uncommitted changes in Git working tree block sync without force."""
        (self.root / ".git").mkdir(exist_ok=True)
        self._write_file("frontend/index.html", b"<html>New Frontend Content</html>", mtime=2000.0)
        self._write_file("web/templates/index.html", self.html_content, mtime=1000.0)

        # Mock git status returning dirty status for web/templates/index.html
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = " M web/templates/index.html\n"

        with patch("scripts.sync_assets.subprocess.run", return_value=mock_proc):
            # Without force: must reject
            success = sync_assets(self.root, source="frontend", force=False, dry_run=False, verbose=False)
            self.assertFalse(success)
            self.assertEqual((self.root / "web/templates/index.html").read_bytes(), self.html_content)

            # With force: must proceed
            success_force = sync_assets(self.root, source="frontend", force=True, dry_run=False, verbose=False)
            self.assertTrue(success_force)
            self.assertEqual((self.root / "web/templates/index.html").read_bytes(), b"<html>New Frontend Content</html>")

    def test_invalid_source_raises_error(self):
        """Test that invalid source parameter raises ValueError."""
        with self.assertRaises(ValueError):
            sync_assets(self.root, source="invalid_side")


if __name__ == "__main__":
    unittest.main()
