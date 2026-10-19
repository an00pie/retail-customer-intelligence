#!/usr/bin/env python3
"""
tests/test_cinematic_intro.py
Automated end-to-end verification of the INSIGHT.arc 10-second cinematic loading intro.
Tests:
1. Initial fresh visit -> Overlay and video present, playing muted inline, full-screen.
2. Screenshot capture during playback (initial, mid-video 5s, 9.5s).
3. Automatic transition at 10s -> Overlay fades and unmounts, scroll restored, page interactive.
4. Intra-session navigation & reload -> Intro does not replay.
5. Reduced motion preference -> Intro bypassed.
6. Skip button -> Smoothly exits on click.
"""

import sys
import time
from playwright.sync_api import sync_playwright

def run_tests(base_url="http://localhost:8501", artifact_dir="/Users/jisshajan/.gemini/antigravity/brain/d10b9bcc-95d1-43bc-b8ea-b0b4f604dd54"):
    print(f"=======================================================")
    print(f" Starting Cinematic Intro E2E Verification on: {base_url}")
    print(f"=======================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # TEST 1: Fresh Visit with Normal Motion
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("\n--- Test 1: Fresh Visit & 10s Automatic Transition ---")
        t_start = time.time()
        page.goto(base_url, wait_until="commit")

        # Intro overlay should be present immediately
        overlay = page.locator("#cinematicIntroOverlay")
        overlay.wait_for(state="attached", timeout=5000)
        assert overlay.is_visible(), "Intro overlay must be visible on initial visit"
        print("✓ Intro overlay attached and visible")

        # Check video element
        video = page.locator("#cinematicIntroVideo")
        video.wait_for(state="attached", timeout=5000)
        assert video.is_visible(), "Intro video must be visible"
        print("✓ Intro video element attached and visible")

        # Capture initial frame screenshot
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{artifact_dir}/intro_01_initial.png")
        print("✓ Captured initial intro screenshot: intro_01_initial.png")

        # Wait to 5s mark and capture mid-video screenshot
        page.wait_for_timeout(4000)
        page.screenshot(path=f"{artifact_dir}/intro_02_mid_5s.png")
        print("✓ Captured mid-video screenshot: intro_02_mid_5s.png")

        # Wait to 9s mark and capture near-end screenshot
        page.wait_for_timeout(4000)
        page.screenshot(path=f"{artifact_dir}/intro_03_end_9s.png")
        print("✓ Captured near-end screenshot: intro_03_end_9s.png")

        # Wait for the overlay to complete its transition and unmount (at ~10.8s)
        overlay.wait_for(state="detached", timeout=6000)
        t_elapsed = time.time() - t_start
        print(f"✓ Intro overlay unmounted automatically at {t_elapsed:.2f}s")
        assert 9.5 <= t_elapsed <= 13.0, f"Transition timing {t_elapsed:.2f}s out of expected 10s window"

        # Capture post-transition home page
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{artifact_dir}/intro_04_home_revealed.png")
        print("✓ Captured post-transition home page: intro_04_home_revealed.png")

        # Verify page is fully interactive
        dashboard_heading = page.locator("h1.hero-title")
        assert dashboard_heading.is_visible(), "Hero title must be visible after transition"
        scroll_locked = page.evaluate("document.documentElement.style.overflow === 'hidden' || document.body.style.overflow === 'hidden'")
        assert not scroll_locked, "Scroll lock must be removed after transition"
        print("✓ Website interactive and scroll lock released")

        # TEST 2: Intra-session reload / navigation does not replay intro
        print("\n--- Test 2: Intra-Session No-Replay Guard ---")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1000)
        assert page.locator("#cinematicIntroOverlay").count() == 0, "Intro must NOT replay on session reload"
        print("✓ Intro did not replay on reload")

        # Navigate to tab and verify no replay
        page.locator('a.nav-link[data-tab="lookup"]').first.click()
        page.wait_for_timeout(500)
        assert page.locator("#cinematicIntroOverlay").count() == 0, "Intro must NOT replay on tab change"
        print("✓ Tab navigation preserved without intro re-trigger")
        context.close()

        # TEST 3: Skip Button Functionality
        print("\n--- Test 3: Skip Button Interaction ---")
        context_skip = browser.new_context(viewport={"width": 1440, "height": 900})
        page_skip = context_skip.new_page()
        page_skip.goto(base_url, wait_until="commit")
        skip_btn = page_skip.locator("#cinematicIntroSkip")
        skip_btn.wait_for(state="visible", timeout=5000)
        t_skip_start = time.time()
        skip_btn.click()
        page_skip.locator("#cinematicIntroOverlay").wait_for(state="detached", timeout=3000)
        t_skip_duration = time.time() - t_skip_start
        print(f"✓ Skip button cleanly dismissed intro in {t_skip_duration:.2f}s")
        assert t_skip_duration < 2.0, "Skip button should dismiss intro promptly"
        context_skip.close()

        # TEST 4: Reduced Motion Preference Bypass
        print("\n--- Test 4: Reduced-Motion Preference ---")
        context_rm = browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="reduce"
        )
        page_rm = context_rm.new_page()
        page_rm.goto(base_url, wait_until="networkidle")
        assert page_rm.locator("#cinematicIntroOverlay").count() == 0, "Intro must be bypassed when reduced motion is preferred"
        print("✓ Reduced-motion preference successfully bypassed intro")
        context_rm.close()

        # TEST 5: Mobile Viewport Framing (390px)
        print("\n--- Test 5: Mobile Viewport Framing (390px) ---")
        context_mobile = browser.new_context(viewport={"width": 390, "height": 844})
        page_mobile = context_mobile.new_page()
        page_mobile.goto(base_url, wait_until="commit")
        overlay_m = page_mobile.locator("#cinematicIntroOverlay")
        overlay_m.wait_for(state="visible", timeout=5000)
        page_mobile.wait_for_timeout(2000)
        page_mobile.screenshot(path=f"{artifact_dir}/intro_05_mobile_390.png")
        print("✓ Captured mobile intro screenshot: intro_05_mobile_390.png")
        page_mobile.locator("#cinematicIntroSkip").click()
        overlay_m.wait_for(state="detached", timeout=3000)
        print("✓ Mobile intro verified and skipped")
        context_mobile.close()

        browser.close()

    print("\n=======================================================")
    print(" ALL CINEMATIC INTRO E2E TESTS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8501"
    run_tests(url)
