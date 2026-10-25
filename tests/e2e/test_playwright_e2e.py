"""
Playwright End-to-End Regression Test Suite for INSIGHT.arc
Covers:
- Homepage and Dashboard initialization
- SPA Tab Navigation
- What-If Simulator Scenario Loading & In-Flight State
- Error State & Input Validation
- Viewport Responsiveness (Desktop 1440px, Tablet 768px, Mobile 390px)
- JavaScript Error Detection & Network Health
"""

import os
import time
import pytest
from playwright.sync_api import sync_playwright

TEST_URL = os.environ.get("INSIGHT_TEST_URL", "http://127.0.0.1:5055")
SCREENSHOT_DIR = os.environ.get(
    "INSIGHT_SCREENSHOT_DIR",
    "/Users/jisshajan/.gemini/antigravity/brain/d10b9bcc-95d1-43bc-b8ea-b0b4f604dd54/screenshots"
)
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


@pytest.fixture(scope="module")
def browser_instance():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


def test_homepage_and_dashboard_render(browser_instance):
    """Verifies homepage loads cleanly without JS errors and renders key dashboard metrics."""
    page = browser_instance.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(TEST_URL, wait_until="networkidle")
    assert page.title() != "", "Page title should not be empty"

    # Verify hero header and brand badge
    brand = page.locator(".nav-brand, .nav-brand-badge, .nav-capsule")
    assert brand.count() > 0, "Brand identity element should exist"

    # Verify absence of uncaught console errors
    assert len(errors) == 0, f"Uncaught page errors detected: {errors}"
    page.close()


def test_spa_tab_navigation(browser_instance):
    """Verifies tab switching between Dashboard, Customer Lookup, and What-If Simulator."""
    page = browser_instance.new_page(viewport={"width": 1440, "height": 900})
    page.goto(TEST_URL, wait_until="networkidle")

    # Switch to Customer Lookup tab
    page.evaluate("() => window.switchDashboardTab && window.switchDashboardTab('lookup')")
    page.wait_for_timeout(300)
    lookup_pane = page.locator("#tab-lookup")
    assert "active" in (lookup_pane.get_attribute("class") or ""), "Lookup pane should be active"

    # Switch to Simulator tab (tab-clv)
    page.evaluate("() => window.switchDashboardTab && window.switchDashboardTab('clv')")
    page.wait_for_timeout(300)
    sim_pane = page.locator("#tab-clv")
    assert "active" in (sim_pane.get_attribute("class") or ""), "Simulator pane should be active"

    page.close()


def test_simulator_scenarios_and_keyboard_accessibility(browser_instance):
    """Verifies Simulator scenario cards, accessibility attributes, keyboard activation, and values."""
    page = browser_instance.new_page(viewport={"width": 1440, "height": 900})
    page.goto(TEST_URL, wait_until="networkidle")
    page.evaluate("() => window.switchDashboardTab && window.switchDashboardTab('clv')")
    page.wait_for_timeout(400)

    # 1. Attribute assertions
    for scen_id in ["simCardConservative", "simCardBase", "simCardOptimistic"]:
        card = page.locator(f"#{scen_id}")
        assert card.get_attribute("role") == "button", f"{scen_id} must have role='button'"
        assert card.get_attribute("tabindex") == "0", f"{scen_id} must have tabindex='0'"
        assert card.get_attribute("aria-label") is not None, f"{scen_id} must have aria-label"

    # 2. Keyboard Enter activation on Conservative card
    page.locator("#simCardConservative").focus()
    with page.expect_response(lambda r: "/api/predict" in r.url and r.status == 200):
        page.keyboard.press("Enter")
    page.wait_for_timeout(500)

    assert "active" in (page.locator("#simCardConservative").get_attribute("class") or "")
    assert page.locator("#simCardConservative").get_attribute("aria-pressed") == "true"
    assert page.locator("#simRecency").input_value() == "75"
    assert page.locator("#simFreq").input_value() == "3"

    # 3. Keyboard Space activation on Optimistic card
    page.locator("#simCardOptimistic").focus()
    with page.expect_response(lambda r: "/api/predict" in r.url and r.status == 200):
        page.keyboard.press("Space")
    page.wait_for_timeout(500)

    assert "active" in (page.locator("#simCardOptimistic").get_attribute("class") or "")
    assert page.locator("#simCardOptimistic").get_attribute("aria-pressed") == "true"
    assert page.locator("#simRecency").input_value() == "10"
    assert page.locator("#simFreq").input_value() == "14"

    # 4. Return to Base scenario
    page.locator("#simCardBase").click()
    page.wait_for_timeout(400)
    assert "active" in (page.locator("#simCardBase").get_attribute("class") or "")
    assert page.locator("#simCardBase").get_attribute("aria-pressed") == "true"

    page.close()


def test_simulator_input_validation_and_recovery(browser_instance):
    """Verifies that invalid input triggers error placeholders and cleanly recovers without sticking."""
    page = browser_instance.new_page(viewport={"width": 1440, "height": 900})
    page.goto(TEST_URL, wait_until="networkidle")
    page.evaluate("() => window.switchDashboardTab && window.switchDashboardTab('clv')")
    page.wait_for_timeout(400)

    # Inject invalid negative recency
    page.locator("#simRecency").fill("-99")
    page.locator("#simRecency").dispatch_event("input")
    page.wait_for_timeout(300)

    seg_output = page.locator("#simSegOutput").inner_text()
    assert "Invalid Input" in seg_output, f"Expected Invalid Input text, got: {seg_output}"

    # Verify not stuck in loading
    is_loading = page.evaluate("() => document.querySelector('.sim-quad-grid').classList.contains('sim-is-loading')")
    assert not is_loading, "Simulator must not be stuck in loading state on invalid input"

    # Recover with valid input
    page.locator("#simRecency").fill("30")
    page.locator("#simRecency").dispatch_event("input")
    page.wait_for_timeout(700)

    recovered_seg = page.locator("#simSegOutput").inner_text()
    assert "Invalid Input" not in recovered_seg, "Simulator should cleanly recover with valid input"
    page.close()


def test_responsive_layout_captures(browser_instance):
    """Captures responsive screenshots for Desktop (1440px), Tablet (768px), and Mobile (390px)."""
    viewports = [
        ("desktop_1440", {"width": 1440, "height": 900}, 2),
        ("tablet_768", {"width": 768, "height": 1024}, 2),
        ("mobile_390", {"width": 390, "height": 844}, 3),
    ]

    for name, vp, scale in viewports:
        page = browser_instance.new_page(viewport=vp, device_scale_factor=scale)
        page.goto(TEST_URL, wait_until="networkidle")
        page.evaluate("() => window.switchDashboardTab && window.switchDashboardTab('clv')")
        page.wait_for_timeout(400)

        # Capture screenshot of Simulator
        path = os.path.join(SCREENSHOT_DIR, f"e2e_playwright_{name}.png")
        page.locator("#tab-clv").screenshot(path=path)
        assert os.path.exists(path), f"Screenshot {path} should be generated"
        page.close()
