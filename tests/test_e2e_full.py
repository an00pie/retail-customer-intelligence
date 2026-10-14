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
import sys
import time
from playwright.sync_api import sync_playwright

VIEWPORTS = [
    {"name": "Desktop 1440", "width": 1440, "height": 900},
    {"name": "Laptop 1280",  "width": 1280, "height": 800},
    {"name": "Tablet 1024",  "width": 1024, "height": 768},
    {"name": "iPad 768",     "width": 768,  "height": 1024},
    {"name": "iPhone 14 (390)", "width": 390, "height": 844},
    {"name": "iPhone SE (375)", "width": 375, "height": 812},
    {"name": "Compact 320",  "width": 320,  "height": 568}
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
            
            results[f"viewport_{vp['name']}"] = {
                "overflow": has_overflow,
                "errors": len(errors)
            }
            page.close()

        # 2. Functional Feature Testing on standard Desktop (1440x900)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if (msg.type == "error" and "404" not in msg.text) else None)
        page.goto(base_url, wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        page.wait_for_selector("#kpiTotalCustomers", state="visible", timeout=20000)

        print("\n--- Phase 2: KPI & Chart Period Filtering ---")
        # Check initial KPI values
        kpi_customers = page.locator("#kpiTotalCustomers").text_content()
        kpi_orders = page.locator("#kpiTotalOrders").text_content()
        kpi_rev = page.locator("#kpiTotalRevenue").text_content()
        print(f"  Initial KPIs -> Customers: {kpi_customers} | Orders: {kpi_orders} | Rev: {kpi_rev}")
        
        # Test period pill 7D
        page.locator('button.period-pill[data-period="7d"]').click()
        try:
            page.wait_for_function("() => document.getElementById('kpiTotalOrders').textContent !== '17,132'", timeout=12000)
        except Exception:
            page.wait_for_timeout(3000)
        kpi_orders_7d = page.locator("#kpiTotalOrders").text_content()
        kpi_rev_7d = page.locator("#kpiTotalRevenue").text_content()
        print(f"  After 7D switch -> Orders: {kpi_orders_7d} | Rev: {kpi_rev_7d}")
        
        # Test period pill All
        page.locator('button.period-pill[data-period="all"]').click()
        try:
            page.wait_for_function(f"() => document.getElementById('kpiTotalOrders').textContent !== '{kpi_orders_7d}'", timeout=12000)
        except Exception:
            page.wait_for_timeout(3000)
        kpi_orders_all = page.locator("#kpiTotalOrders").text_content()
        kpi_rev_all = page.locator("#kpiTotalRevenue").text_content()
        print(f"  After All switch -> Orders: {kpi_orders_all} | Rev: {kpi_rev_all}")

        results["kpi_filtering"] = (kpi_orders_7d != kpi_orders_all)

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

        # Lookup 99999 (Honest 404 Not Found)
        page.fill("#lookupCustIdInput", "99999")
        page.click("#lookupSearchBtn")
        page.locator("#lookupSearchBtn:not([disabled])").wait_for(timeout=20000)
        card_text_99999 = page.locator("#customerProfileTarget").text_content()
        has_not_found = "Not Found" in card_text_99999
        print(f"  Lookup #99999 -> Honest 'Not Found' State: {has_not_found}")

        results["customer_lookup"] = (has_champ and has_risk and has_not_found)

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
        page.locator("#navNotifBtn").click()
        page.wait_for_selector(".toast-pill", timeout=6000)
        toast_text = page.locator(".toast-message").text_content()
        print(f"  Toast Triggered via Bell: '{toast_text}'")
        results["toast_notifications"] = ("5,942 profiles synchronized" in toast_text)

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
        bell_btn = page.locator("#navNotifBtn")
        bell_btn.focus()
        page.evaluate("() => window.openSpaModal('architecture')")
        page.wait_for_timeout(400)
        active_in_modal = page.evaluate("() => document.activeElement ? document.activeElement.className : ''")
        close_btn_focused = "spa-modal-close-btn" in active_in_modal
        print(f"  Modal Opened -> Close button auto-focused: {close_btn_focused}")

        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        arch_closed_esc = not page.locator("#modal-architecture").evaluate("el => el.classList.contains('open')")
        active_after_close = page.evaluate("() => document.activeElement ? document.activeElement.id : ''")
        focus_restored = (active_after_close == "navNotifBtn")
        print(f"  Escape Key Pressed -> Modal Closed: {arch_closed_esc} | Focus Restored to #navNotifBtn: {focus_restored}")

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
    run_e2e_tests(url)
