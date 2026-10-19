"""Browser regression checks for cinematic presentation and menu/media lifecycle.

Run against Flask or the production alias; never mocks customer or chart data.
"""
import sys
from playwright.sync_api import sync_playwright


def run(url):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors, failed = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("requestfailed", lambda r: failed.append((r.url, r.failure)))
        page.goto(url)
        page.wait_for_function("typeof window.switchDashboardTab === 'function'")
        page.evaluate("document.fonts.ready")
        assert page.evaluate("document.fonts.check('40px BubbledotICG-FinePos')")
        assert page.locator("#heroVideo").count() == 1
        assert page.locator("h1.hero-title").inner_text() == "Customer Intelligence\nCommand Center"
        assert page.locator(".hero-title-main").evaluate("e => getComputedStyle(e).webkitTextFillColor") == "rgb(255, 255, 255)"
        page.wait_for_function("document.querySelector('video').readyState >= 2", timeout=30000)
        page.locator("#heroMotionToggle").click()
        assert page.locator("#heroVideo").evaluate("v => v.paused")
        assert page.locator("#heroMotionToggle").get_attribute("aria-pressed") == "true"
        page.locator("#heroMotionToggle").click()
        page.wait_for_function("!document.querySelector('video').paused")
        print("PASSED: solid headline, external font loaded, video playback and pause control")

        for period in ["7d", "30d", "90d", "6m", "all", "12m"]:
            with page.expect_response(lambda r: f"period={period}" in r.url) as response:
                page.locator(f'.period-pill[data-period="{period}"]').click()
            data = response.value.json()
            page.wait_for_function("""expected => {
                const c = Chart.getChart(document.querySelector('#dashTrajectoryChart'));
                return c && JSON.stringify(c.data.labels) === JSON.stringify(expected.labels)
                  && JSON.stringify(c.data.datasets[0].data) === JSON.stringify(expected.revenue)
                  && JSON.stringify(c.data.datasets[1].data) === JSON.stringify(expected.orders);
            }""", arg=data)
        chart = page.locator('#dashTrajectoryChart')
        point = chart.evaluate("c => {const p = Chart.getChart(c).getDatasetMeta(0).data[3]; return {x:p.x,y:p.y};}")
        chart.hover(position=point)
        page.wait_for_function("Chart.getChart(document.querySelector('#dashTrajectoryChart')).tooltip.getActiveElements().length > 0")
        print("PASSED: all six chart periods match live API series; hover tooltip works")

        page.locator('#ovLookupInput').fill('12364')
        with page.expect_response(lambda r: '/api/customer/12364' in r.url):
            page.locator('#ovLookupBtn').click()
        page.wait_for_function("document.querySelector('#ovProfileSegment').textContent === 'Loyal Customers'")
        with page.expect_response(lambda r: '/api/predict' in r.url):
            page.locator('#ovCalcRfmBtn').click()
        page.locator('.dash-ov-card [data-tab="rfm"]').click()
        assert page.locator('#tab-rfm').is_visible()
        page.locator('#tab-rfm [data-tab="segmentation"]').click()
        assert page.locator('#tab-segmentation').is_visible()
        page.locator('#tab-segmentation button:has-text("Back to Overview")').click()
        assert page.locator('#tab-dashboard').is_visible()
        page.locator('#dashGlobalSearchInput').fill('mining')
        page.locator('#dashGlobalSearchInput').press('Enter')
        page.locator('#modal-mining').wait_for(state='visible')
        page.keyboard.press('Escape')
        print("PASSED: overview lookup/RFM, contextual calculator, back navigation, mining catalog")

        for width in [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]:
            page.set_viewport_size({"width": width, "height": 900})
            for tab in ["dashboard", "lookup", "segmentation", "rfm", "clv", "churn"]:
                page.evaluate("tab => window.switchDashboardTab(tab)", tab)
                page.wait_for_timeout(180)
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, tab)
                assert page.locator(f"#tab-{tab}").is_visible()
            page.evaluate("window.switchDashboardTab('dashboard')")
            page.wait_for_timeout(250)
            assert page.locator("#dashTrajectoryChart").evaluate("c => c.clientWidth > 100 && c.clientHeight > 100")
            print(f"PASSED: {width}px, all six panes, chart resize, no page overflow")

        page.set_viewport_size({"width": 390, "height": 568})
        toggle = page.locator("#mobileNavToggle")
        toggle.click()
        assert toggle.get_attribute("aria-expanded") == "true"
        assert page.locator(".hero-section").evaluate("e => e.inert")
        page.keyboard.press("Shift+Tab")
        assert page.evaluate("document.activeElement.textContent.trim()") == "Technical FAQ"
        page.keyboard.press("Tab")
        assert page.evaluate("document.activeElement.classList.contains('mobile-menu-close')")
        page.keyboard.press("Escape")
        assert toggle.get_attribute("aria-expanded") == "false"
        assert toggle.evaluate("e => e === document.activeElement")
        assert not page.locator(".hero-section").evaluate("e => e.inert")
        toggle.click()
        page.locator("#mobileNavBackdrop").click(position={"x": 4, "y": 4})
        assert toggle.get_attribute("aria-expanded") == "false"
        toggle.click()
        page.locator('#mobileNavDropdown [data-tab="lookup"]').click()
        assert page.locator("#tab-lookup").is_visible()
        assert toggle.get_attribute("aria-expanded") == "false"
        toggle.click()
        page.set_viewport_size({"width": 1280, "height": 720})
        assert toggle.get_attribute("aria-expanded") == "false"
        assert page.evaluate("document.body.style.overflow") == ""
        page.set_viewport_size({"width": 390, "height": 320})
        toggle.click()
        menu = page.locator("#mobileNavDropdown")
        assert menu.bounding_box()["height"] <= 288
        menu.locator('[data-tab="faq"]').click()
        page.locator("#modal-faq").wait_for(state="visible")
        page.keyboard.press("Escape")
        print("PASSED: menu focus trap, Escape, backdrop, selection, resize, short-height scrolling")

        reduced = browser.new_page(reduced_motion="reduce")
        media_requests = []
        reduced.on("request", lambda r: media_requests.append(r.url) if ".mp4" in r.url else None)
        reduced.goto(url)
        reduced.wait_for_timeout(1000)
        assert not media_requests
        assert reduced.locator("#heroVideo").evaluate("v => v.paused && !v.getAttribute('src')")
        assert reduced.locator(".dash-hero-header").evaluate("e => getComputedStyle(e).opacity") == "1"
        print("PASSED: reduced motion shows content and skips video download")

        touch = browser.new_page(viewport={"width": 375, "height": 667}, has_touch=True)
        touch.add_init_script("Object.defineProperty(navigator, 'connection', {value: {saveData: true, addEventListener() {}}})")
        touch.goto(url)
        touch.locator('#mobileNavToggle').tap()
        touch.locator('#mobileNavDropdown [data-tab="clv"]').tap()
        assert touch.locator('#tab-clv').is_visible()
        assert touch.locator('#heroVideo').evaluate("v => !v.getAttribute('src')")
        print("PASSED: touch navigation and data-saving video suppression")

        fallback = browser.new_page()
        fallback.route("**/*.mp4", lambda route: route.abort())
        fallback.goto(url)
        fallback.wait_for_timeout(1000)
        assert fallback.locator(".hero-title").is_visible()
        fallback.locator('.hero-actions [data-tab="dashboard"]').click()
        assert fallback.locator("#tab-dashboard").is_visible()
        print("PASSED: video network failure leaves dashboard usable")

        static = browser.new_page(java_script_enabled=False)
        static.goto(url)
        assert static.locator(".dash-hero-header").evaluate("e => getComputedStyle(e).opacity") == "1"
        assert static.locator(".dash-kpi-card-luxury").first.is_visible()
        assert static.locator('#tab-segmentation').is_visible()
        print("PASSED: no-JavaScript hero and KPI content remains visible")
        assert not errors, errors
        # Intentional video aborts above use a separate page; report real main-page failures.
        print("Main-page failed requests:", failed)
        assert not [item for item in failed if item[1] != "net::ERR_ABORTED"], failed
        print("PASSED: no uncaught runtime errors or unexpected failed requests")
        browser.close()


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8501")
