"""
Comprehensive End-to-End Test Suite for Customer Intelligence Platform.
Tests:
1. Live rendering & viewports (1440x900, 1280x800, 1024x768, 768x1024, 390x844, 375x812, 320x568)
2. Chart period switching & KPI live updates
3. Customer lookup with multi-segment known profiles + honest 404 on unknown profile
4. RFM interactive calculator
5. Global search & keyboard navigation
6. Modal dialogs (Architecture, Mining, FAQ)
7. Console error tracking & horizontal overflow checks
"""
import os
import sys
import time
from playwright.sync_api import sync_playwright

VIEWPORTS = [
    {"name": "UltraWide 1920", "width": 1920, "height": 1080},
    {"name": "Desktop 1440",   "width": 1440, "height": 900},
    {"name": "Laptop 1280",    "width": 1280, "height": 800},
    {"name": "Tablet 1024",    "width": 1024, "height": 768},
    {"name": "iPad 768",       "width": 768,  "height": 1024},
    {"name": "Large Mobile 430", "width": 430, "height": 932},
    {"name": "iPhone 14 (390)",  "width": 390, "height": 844},
    {"name": "iPhone SE (375)",  "width": 375, "height": 667},
    {"name": "Android 360",    "width": 360,  "height": 640},
    {"name": "Compact 320",    "width": 320,  "height": 568}
]

def run_e2e_tests(base_url="http://localhost:8501"):
    print(f"\n=======================================================")
    print(f" Starting Comprehensive E2E Verification on: {base_url}")
    print(f"=======================================================")

    results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Test Viewports and Overflow
        print("\n--- Phase 1: Viewport & Layout Overflow Audit ---")
        for vp in VIEWPORTS:
            page = browser.new_page(viewport={"width": vp["width"], "height": vp["height"]})
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            page.goto(base_url, wait_until="domcontentloaded")
            page.wait_for_timeout(1000)

            # Check overflow
            has_overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            scroll_width = page.evaluate("() => document.documentElement.scrollWidth")
            print(f"  [{vp['name']}] Width: {vp['width']}px | ScrollWidth: {scroll_width}px | Overflow: {has_overflow} | Errors: {len(errors)}")

            # Save screenshot for designated review viewports
            shot_mapping = {
                1440: "audit_desktop_1440.png",
                1280: "audit_laptop_1280.png",
                390:  "audit_mobile_390.png",
                320:  "audit_compact_320.png"
            }
            if vp["width"] in shot_mapping:
                shot_path = os.path.join("/Users/jisshajan/.gemini/antigravity/brain/d10b9bcc-95d1-43bc-b8ea-b0b4f604dd54", shot_mapping[vp["width"]])
                page.screenshot(path=shot_path, full_page=False)

            results[f"viewport_{vp['name']}"] = {
                "overflow": has_overflow,
                "errors": len(errors)
            }
            page.close()

        # 2. Functional Feature Testing on standard Desktop (1440x900)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if (msg.type == "error" and "404" not in msg.text) else None)
        page.goto(base_url, wait_until="networkidle")
        page.wait_for_timeout(500)
        page.wait_for_selector("#kpiTotalCustomers", state="visible", timeout=20000)

        print("\n--- Phase 2: KPI & Chart Period Filtering & API Consistency ---")
        # Check initial KPI values
        kpi_customers = page.locator("#kpiTotalCustomers").text_content()
        kpi_orders = page.locator("#kpiTotalOrders").text_content()
        kpi_rev = page.locator("#kpiTotalRevenue").text_content()
        print(f"  Initial KPIs -> Customers: {kpi_customers} | Orders: {kpi_orders} | Rev: {kpi_rev}")
        
        # Test period pill 7D and compare with actual API response
        with page.expect_response(lambda r: "period=7d" in r.url) as resp_info:
            page.locator('button.period-pill[data-period="7d"]').click()
        resp_7d = resp_info.value
        data_7d = resp_7d.json()
        expected_orders_7d = f"{data_7d['total_orders']:,}"
        try:
            page.wait_for_function(f"() => document.getElementById('kpiTotalOrders').textContent === '{expected_orders_7d}'", timeout=12000)
        except Exception:
            page.wait_for_timeout(2000)
        kpi_orders_7d = page.locator("#kpiTotalOrders").text_content()
        kpi_rev_7d = page.locator("#kpiTotalRevenue").text_content()
        print(f"  After 7D switch -> Orders: {kpi_orders_7d} (API Expected: {expected_orders_7d}) | Rev: {kpi_rev_7d}")
        
        # Test rapid sequential period switches for stale response protection
        page.locator('button.period-pill[data-period="all"]').click()
        page.locator('button.period-pill[data-period="30d"]').click()
        with page.expect_response(lambda r: "period=12m" in r.url) as resp_12m_info:
            page.locator('button.period-pill[data-period="12m"]').click()
        resp_12m = resp_12m_info.value
        data_12m = resp_12m.json()
        expected_orders_12m = f"{data_12m['total_orders']:,}"
        try:
            page.wait_for_function(f"() => document.getElementById('kpiTotalOrders').textContent === '{expected_orders_12m}'", timeout=12000)
        except Exception:
            page.wait_for_timeout(2000)
        kpi_orders_final = page.locator("#kpiTotalOrders").text_content()
        print(f"  After rapid switches to 12M -> Orders: {kpi_orders_final} (API Expected: {expected_orders_12m})")

        results["kpi_filtering"] = (kpi_orders_7d == expected_orders_7d and kpi_orders_final == expected_orders_12m)
        # Verify the rendered series, not just a changed counter.
        page.wait_for_function("""expected => {
            const canvas = document.querySelector('#dashTrajectoryChart');
            const chart = canvas && Chart.getChart(canvas);
            return chart && JSON.stringify(chart.data.labels) === JSON.stringify(expected.labels)
              && JSON.stringify(chart.data.datasets[0].data) === JSON.stringify(expected.revenue)
              && JSON.stringify(chart.data.datasets[1].data) === JSON.stringify(expected.orders);
        }""", arg=data_12m, timeout=12000)
        results["chart_series_match_api"] = True


        print("\n--- Phase 3: Customer Lookup & Ledger Audit ---")
        # Switch to Lookup tab
        page.evaluate("() => window.switchDashboardTab('lookup')")
        page.wait_for_timeout(800)

        # Ensure search button is ready
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)

        # Lookup 15485 (Champions)
        page.fill("#lookupCustIdInput", "15485")
        page.click("#lookupSearchBtn")
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)
        card_text_15485 = page.locator("#customerProfileTarget").text_content()
        has_champ = "Champions" in card_text_15485
        print(f"  Lookup #15485 -> Segment 'Champions' Found: {has_champ}")

        # Lookup 13748 (At-Risk)
        page.fill("#lookupCustIdInput", "13748")
        page.click("#lookupSearchBtn")
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)
        card_text_13748 = page.locator("#customerProfileTarget").text_content()
        has_risk = "At-Risk" in card_text_13748
        print(f"  Lookup #13748 -> Segment 'At-Risk' Found: {has_risk}")

        # Check honest Unavailable state for Message and Assign Task buttons
        btn_msg = page.locator("#customerProfileTarget button:has-text('Message')")
        btn_task = page.locator("#customerProfileTarget button:has-text('Assign Task')")
        msg_text = btn_msg.text_content() if btn_msg.count() > 0 else ""
        task_text = btn_task.text_content() if btn_task.count() > 0 else ""
        has_unavailable = ("Unavailable" in msg_text and "Unavailable" in task_text)
        print(f"  Message & Assign Task Honest '(Unavailable)' State: {has_unavailable}")
        
        honest_toast = True
        if btn_msg.count() > 0:
            btn_msg.click()
            page.wait_for_timeout(300)
            toast_text = page.locator("#toast-container .toast-pill").last.text_content() if page.locator("#toast-container .toast-pill").count() > 0 else ""
            honest_toast = "unavailable" in toast_text.lower()
            print(f"  Message Action Toast: '{toast_text}' (Honest Unavailable: {honest_toast})")

        # Lookup 99999 (Honest 404 Not Found)
        page.fill("#lookupCustIdInput", "99999")
        page.click("#lookupSearchBtn")
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)
        card_text_99999 = page.locator("#customerProfileTarget").text_content()
        has_not_found = "Not Found" in card_text_99999
        print(f"  Lookup #99999 -> Honest 'Not Found' State: {has_not_found}")

        results["customer_lookup"] = (has_champ and has_risk and has_not_found and has_unavailable and honest_toast)

        print("\n--- Phase 4: RFM Interactive Calculator ---")
        page.evaluate("() => window.switchDashboardTab('rfm')")
        page.wait_for_timeout(600)
        page.evaluate("""() => {
            const r = document.getElementById('rfmRecencySlider');
            const f = document.getElementById('rfmFreqSlider');
            const m = document.getElementById('rfmMonetarySlider');
            r.value = 10;
            f.value = 25;
            m.value = 8500;
            r.dispatchEvent(new Event('input'));
        }""")
        page.wait_for_timeout(800)
        rfm_badge = page.locator("#rfmSegmentBadge").text_content()
        rfm_clv = page.locator("#rfmClvEst").text_content()
        print(f"  RFM Calculator result -> Segment: {rfm_badge} | CLV: {rfm_clv}")
        results["rfm_calculator"] = (rfm_badge == "Champions")

        print("\n--- Phase 4b: What-If Scenario Simulator Client-Side Validation ---")
        page.evaluate("() => window.switchDashboardTab('clv')")
        page.wait_for_timeout(600)

        # 1. Test invalid negative frequency (-5)
        page.evaluate("""() => {
            const f = document.getElementById('simFreq');
            f.value = '-5';
            f.dispatchEvent(new Event('input'));
        }""")
        page.wait_for_timeout(400)
        freq_invalid = page.locator("#simFreq").get_attribute("aria-invalid")
        freq_err_text = page.locator("#simFreqErr").text_content()
        sim_seg_error = page.locator("#simSegOutput").text_content()
        print(f"  Invalid Frequency -> aria-invalid: {freq_invalid} | Error: '{freq_err_text}' | Output: '{sim_seg_error}'")

        # 2. Test correction with valid boundary inputs (recency=0, spend=0, tenure=0, freq=1)
        page.evaluate("""() => {
            const r = document.getElementById('simRecency');
            const f = document.getElementById('simFreq');
            const s = document.getElementById('simSpend');
            const t = document.getElementById('simTenure');
            r.value = '0';
            f.value = '1';
            s.value = '0';
            t.value = '0';
            r.dispatchEvent(new Event('input'));
        }""")
        page.wait_for_timeout(1000)
        freq_valid = page.locator("#simFreq").get_attribute("aria-invalid")
        sim_seg_valid = page.locator("#simSegOutput").text_content()
        print(f"  Corrected to Valid Boundary -> aria-invalid: {freq_valid} | Segment Output: '{sim_seg_valid}'")

        # 3. Test typical scenario (recency=15, freq=12, spend=4500, tenure=250)
        page.evaluate("""() => {
            const r = document.getElementById('simRecency');
            const f = document.getElementById('simFreq');
            const s = document.getElementById('simSpend');
            const t = document.getElementById('simTenure');
            r.value = '15';
            f.value = '12';
            s.value = '4500';
            t.value = '250';
            r.dispatchEvent(new Event('input'));
        }""")
        page.wait_for_timeout(1200)
        sim_clv_output = page.locator("#simClvOutput").text_content()
        print(f"  Scenario Inference Result -> Segment: {page.locator('#simSegOutput').text_content()} | CLV: {sim_clv_output}")

        results["simulator_validation"] = (freq_invalid == "true" and "at least 1" in freq_err_text and freq_valid == "false" and sim_clv_output != "--")

        print("\n--- Phase 5: Global Search & Keyboard Routing ---")
        search_input = page.locator("#dashGlobalSearchInput")
        search_input.fill("12364")
        page.wait_for_timeout(500)
        dropdown_html = page.locator("#dashSearchDropdown").inner_html()
        has_dropdown = "Look up Customer #12364" in dropdown_html
        print(f"  Global Search dropdown displayed: {has_dropdown}")
        
        search_input.press("Enter")
        page.wait_for_timeout(1500)
        lookup_pane_active = page.locator("#tab-lookup").evaluate("el => el.classList.contains('active')")
        print(f"  Global Search navigated to Lookup tab: {lookup_pane_active}")
        results["global_search"] = (has_dropdown and lookup_pane_active)

        print("\n--- Phase 6: Modals Verification ---")
        page.evaluate("() => window.openSpaModal('architecture')")
        page.wait_for_timeout(400)
        arch_open = page.locator("#modal-architecture").evaluate("el => el.classList.contains('open')")
        page.evaluate("() => window.closeSpaModal('architecture')")
        page.wait_for_timeout(300)
        arch_closed = not page.locator("#modal-architecture").evaluate("el => el.classList.contains('open')")
        print(f"  Architecture Modal Open: {arch_open} | Close: {arch_closed}")
        results["modals"] = (arch_open and arch_closed)

        print("\n--- Phase 6b: In-App Toast System Verification ---")
        # Exercise an honest unavailable action instead of the removed mock bell.
        page.evaluate("() => window.switchDashboardTab('lookup')")
        page.locator('button.sample-id-pill[data-id="15485"]').click()
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)
        page.get_by_role("button", name="Message", exact=False).click()
        page.wait_for_selector(".toast-pill", timeout=6000)
        toast_text = page.locator(".toast-message").last.text_content()
        results["toast_notifications"] = ("Messaging integration unavailable" in toast_text)

        print("\n--- Phase 8: Interactive Controls & Keyboard Accessibility (Fix 03) ---")
        # 1. Semantic Sample ID Pill keyboard activation
        page.evaluate("() => window.switchDashboardTab('lookup')")
        page.wait_for_timeout(600)
        pill_13748 = page.locator('button.sample-id-pill[data-id="13748"]')
        pill_13748.focus()
        page.keyboard.press("Enter")
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)
        pill_input_val = page.locator("#lookupCustIdInput").input_value()
        pill_card_text = page.locator("#customerProfileTarget").text_content()
        pill_keyboard_ok = (pill_input_val == "13748" and "At-Risk" in pill_card_text)
        print(f"  Sample ID Pill Keyboard (Enter) -> Input: {pill_input_val} | Segment 'At-Risk': {pill_keyboard_ok}")

        # 2. Semantic Cohort Pill keyboard activation
        page.evaluate("() => window.switchDashboardTab('dashboard')")
        page.wait_for_timeout(600)
        cohort_pill = page.locator('.ov-cohort-pill').first
        cohort_pill.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(600)
        seg_tab_active = page.locator("#tab-segmentation").evaluate("el => el.classList.contains('active')")
        print(f"  Cohort Card Pill Keyboard (Enter) -> Navigated to Segmentation Tab: {seg_tab_active}")

        # 3. Modal Focus Trap, Escape Key & Focus Restoration
        architecture_btn = page.locator("#navArchitectureBtn")
        architecture_btn.focus()
        page.evaluate("() => window.openSpaModal('architecture')")
        page.wait_for_timeout(400)
        active_in_modal = page.evaluate("() => document.activeElement ? document.activeElement.className : ''")
        close_btn_focused = "spa-modal-close-btn" in active_in_modal
        print(f"  Modal Opened -> Close button auto-focused: {close_btn_focused}")

        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        arch_closed_esc = not page.locator("#modal-architecture").evaluate("el => el.classList.contains('open')")
        active_after_close = page.evaluate("() => document.activeElement ? document.activeElement.id : ''")
        focus_restored = (active_after_close == "navArchitectureBtn")
        print(f"  Escape Key Pressed -> Modal Closed: {arch_closed_esc} | Focus Restored to #navArchitectureBtn: {focus_restored}")

        # 4. FAQ Accordion Keyboard Navigation & ARIA State
        page.evaluate("() => window.openSpaModal('faq')")
        page.wait_for_timeout(400)
        faq_header = page.locator(".faq-header").nth(1)
        faq_initial = faq_header.get_attribute("aria-expanded")
        faq_header.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)
        faq_expanded_enter = faq_header.get_attribute("aria-expanded")
        page.keyboard.press("Space")
        page.wait_for_timeout(300)
        faq_expanded_space = faq_header.get_attribute("aria-expanded")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        print(f"  FAQ Accordion -> Initial: {faq_initial} | Enter expanded: {faq_expanded_enter} | Space collapsed: {faq_expanded_space}")

        results["keyboard_accessibility"] = (
            pill_keyboard_ok and
            seg_tab_active and
            close_btn_focused and
            arch_closed_esc and
            focus_restored and
            faq_initial == "false" and
            faq_expanded_enter == "true" and
            faq_expanded_space == "false"
        )

        print("\n--- Phase 9: Data Export, Reporting & Print Media (Fix 04) ---")
        # 1. Segment Cohort CSV Export
        page.evaluate("() => window.switchDashboardTab('segmentation')")
        page.wait_for_timeout(500)
        with page.expect_download() as seg_dl_info:
            page.locator("#exportSegmentsCsvBtn").click()
        seg_dl = seg_dl_info.value
        seg_filename = seg_dl.suggested_filename
        seg_path = seg_dl.path()
        with open(seg_path, "r", encoding="utf-8") as f:
            seg_csv = f.read()
        seg_lines = [r for r in seg_csv.strip().split("\n") if r.strip()]
        seg_dl_ok = (
            seg_filename == "customer_segmentation_cohorts_summary.csv" and
            len(seg_lines) == 5 and
            "Champions" in seg_csv and
            "Loyal Customers" in seg_csv
        )
        print(f"  Segment CSV Export -> Filename: '{seg_filename}' | Rows: {len(seg_lines)} | Verified: {seg_dl_ok}")

        # 2. Customer Ledger CSV Export
        page.evaluate("() => window.switchDashboardTab('lookup')")
        page.wait_for_timeout(500)
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=10000)
        curr_cust_id = page.locator("#lookupCustIdInput").input_value().strip() or "15485"
        with page.expect_download() as cust_dl_info:
            page.locator("#exportCustomerCsvBtn").click()
        cust_dl = cust_dl_info.value
        cust_filename = cust_dl.suggested_filename
        cust_path = cust_dl.path()
        with open(cust_path, "r", encoding="utf-8") as f:
            cust_csv = f.read()
        cust_lines = [r for r in cust_csv.strip().split("\n") if r.strip()]
        cust_dl_ok = (
            f"customer_{curr_cust_id}_ledger.csv" in cust_filename and
            len(cust_lines) >= 2 and
            curr_cust_id in cust_csv
        )
        print(f"  Customer Ledger CSV -> Filename: '{cust_filename}' | Rows: {len(cust_lines)} | Verified: {cust_dl_ok}")

        # 3. Customer Profile Summary CSV Export
        with page.expect_download() as prof_dl_info:
            page.locator("#exportCustomerProfileBtn").click()
        prof_dl = prof_dl_info.value
        prof_filename = prof_dl.suggested_filename
        prof_path = prof_dl.path()
        with open(prof_path, "r", encoding="utf-8") as f:
            prof_csv = f.read()
        prof_dl_ok = (
            f"customer_{curr_cust_id}_profile.csv" in prof_filename and
            "CustomerID,Segment,RecencyDays" in prof_csv and
            curr_cust_id in prof_csv
        )
        print(f"  Customer Profile CSV -> Filename: '{prof_filename}' | Verified: {prof_dl_ok}")

        # 4. Print Media Stylesheet Verification
        page.emulate_media(media="print")
        nav_print_display = page.locator(".nav-capsule-wrapper").evaluate("el => window.getComputedStyle(el).display")
        hdr_print_display = page.locator(".print-only-header").evaluate("el => window.getComputedStyle(el).display")
        page.emulate_media(media="screen")
        hdr_screen_display = page.locator(".print-only-header").evaluate("el => window.getComputedStyle(el).display")
        print_styles_ok = (
            nav_print_display == "none" and
            hdr_print_display == "block" and
            hdr_screen_display == "none"
        )
        print(f"  Print Media Styles -> Nav Hidden: {nav_print_display == 'none'} | Print Header Visible: {hdr_print_display == 'block'} | Screen Header Hidden: {hdr_screen_display == 'none'}")

        # 5. Modal Focus Trapping Verification
        page.evaluate("() => window.openSpaModal('architecture')")
        close_btn = page.locator("#modal-architecture .spa-modal-close-btn")
        close_btn.wait_for(state="visible", timeout=5000)
        close_btn.focus()
        page.wait_for_timeout(200)
        page.keyboard.press("Tab")
        active_trap_forward = page.evaluate("() => document.activeElement ? document.activeElement.className : ''")
        page.keyboard.press("Shift+Tab")
        active_trap_backward = page.evaluate("() => document.activeElement ? document.activeElement.className : ''")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        focus_trap_ok = (
            "spa-modal-close-btn" in active_trap_forward and
            "spa-modal-close-btn" in active_trap_backward
        )
        print(f"  Modal Focus Trap -> Forward Tab: '{active_trap_forward}' | Backward Shift+Tab: '{active_trap_backward}' | Trapped: {focus_trap_ok}")

        results["data_export_and_reporting"] = (
            seg_dl_ok and
            cust_dl_ok and
            prof_dl_ok and
            print_styles_ok and
            focus_trap_ok
        )

        print("\n--- Phase 10: Authoritative Cohorts & Navigation Verification ---")
        page.evaluate("() => window.switchDashboardTab('dashboard')")
        page.wait_for_timeout(500)
        
        cohort_grid_text = page.locator("#tab-dashboard .ov-cohorts-grid").text_content()
        has_loyal_pill = "Loyal Customers" in cohort_grid_text and "20.0%" in cohort_grid_text
        has_champ_pill = "Champions" in cohort_grid_text and "20.9%" in cohort_grid_text
        print(f"  Overview Cohort Grid Loyal (20.0%): {has_loyal_pill} | Champ (20.9%): {has_champ_pill}")

        ov_text = page.locator("#tab-dashboard .ov-cluster-insights-list").text_content()
        has_authoritative_loyal = ("1,187" in ov_text and "20.0%" in ov_text) or ("1,242" in ov_text and "20.9%" in ov_text)
        print(f"  Overview Insights Authoritative Figures: {has_authoritative_loyal}")

        page.evaluate("() => window.switchDashboardTab('segmentation')")
        page.wait_for_timeout(500)
        seg_text = page.locator("#tab-segmentation").text_content()
        has_seg_loyal = "1,187 accounts (20.0%)" in seg_text
        print(f"  Segmentation Tab Loyal Customers Count (1,187): {has_seg_loyal}")

        nav_texts = [page.locator(f".nav-links .nav-link:nth-child({i})").text_content().strip() for i in range(1, 6)]
        print(f"  Primary Navigation Links: {nav_texts}")
        expected_nav = ["Dashboard", "Customer Lookup", "Segmentation", "CLV & Churn", "Simulator"]
        nav_ok = (nav_texts == expected_nav)
        print(f"  Primary Navigation Structure Verified: {nav_ok}")

        results["authoritative_cohorts_and_nav"] = (has_loyal_pill and has_champ_pill and has_authoritative_loyal and has_seg_loyal and nav_ok)

        print("\n--- Phase 7: Console Errors Audit ---")
        print(f"  Total Console Errors: {len(console_errors)}")
        if console_errors:
            for err in console_errors:
                print(f"    - {err}")
        results["console_errors"] = len(console_errors)

        browser.close()

    print("\n=======================================================")
    print(" E2E Verification Summary:")
    for k, v in results.items():
        print(f"  {k}: {v}")
    print("=======================================================\n")
    return results

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8501"
    results = run_e2e_tests(url)
    failures = [key for key, value in results.items()
                if value is False or (key == 'console_errors' and value != 0)
                or (key.startswith('viewport_') and (value['overflow'] or value['errors']))]
    if failures:
        raise AssertionError(f"E2E checks failed: {failures}")
