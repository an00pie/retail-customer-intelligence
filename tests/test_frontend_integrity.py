"""Protect mirrored serving assets and pre-redesign DOM integration contracts."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASELINE = "de849b5"


class Inventory(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = []
        self.contracts = Counter()
        self.stack = []
        self.errors = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        keys = ("id", "href", "onclick", "data-tab", "data-period", "data-id",
                "type", "min", "max", "step", "value", "src")
        if tag in {"a", "button", "input", "select", "option", "canvas", "script"}:
            self.contracts[(tag, tuple((key, attrs[key]) for key in keys if key in attrs))] += 1
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.errors.append((tag, self.stack[-1:] ))
        else:
            self.stack.pop()

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1] == tag:
            self.handle_endtag(tag)


class FrontendIntegrityTests(unittest.TestCase):
    def test_serving_copies_match(self):
        for frontend, flask in [("frontend/index.html", "web/templates/index.html"),
                                ("frontend/static/css/dashflow.css", "web/static/css/dashflow.css"),
                                ("frontend/static/js/dashflow.js", "web/static/js/dashflow.js")]:
            self.assertEqual((ROOT / frontend).read_bytes(), (ROOT / flask).read_bytes())

    def test_html_structure_and_unique_ids(self):
        html = Inventory((ROOT / "frontend/index.html").read_text())
        self.assertEqual(html.errors, [])
        self.assertEqual(html.stack, [])
        self.assertEqual(len(html.ids), len(set(html.ids)))

    def test_original_selectors_and_controls_preserved(self):
        original = subprocess.check_output(["git", "show", f"{BASELINE}:frontend/index.html"], cwd=ROOT, text=True)
        before = Inventory(original)
        after = Inventory((ROOT / "frontend/index.html").read_text())
        self.assertFalse(set(before.ids) - set(after.ids))
        self.assertEqual(before.contracts - after.contracts, Counter())


if __name__ == "__main__":
    unittest.main()
