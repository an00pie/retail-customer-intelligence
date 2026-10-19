import sys
from playwright.sync_api import sync_playwright

def test_react():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        
        print("Navigating to http://localhost:8501/app...")
        page.goto("http://localhost:8501/app")
        page.wait_for_selector("#root")
        page.wait_for_selector(".platform-container", timeout=10000)
        
        # Verify brand & navigation
        brand_text = page.locator(".nav-brand-title").inner_text()
        assert "INSIGHT" in brand_text or "Customer Intelligence" in brand_text
        print("✓ React Navbar rendered:", repr(brand_text))
        
        # Verify 3D Canvas Globe
        assert page.locator("canvas").count() >= 1
        print("✓ Interactive 3D Canvas Globe rendered")
        
        # Verify Hero headline
        title_text = page.locator("h1.hero-title").inner_text()
        assert "Customer Intelligence" in title_text
        print("✓ Hero headline rendered:", repr(title_text))
        
        # Take full hero screenshot
        page.screenshot(path="mono_react_desktop_1440.png")
        print("✓ Screenshot saved to mono_react_desktop_1440.png")
        
        # Test tab navigation to Simulator
        page.locator(".workspace-nav-bar button:has-text('What-If Simulator')").click()
        page.wait_for_selector("h2:has-text('What-If Scenario Simulator')")
        print("✓ Navigated to Simulator Tab")
        
        # Test tab navigation to Datasets
        page.locator(".workspace-nav-bar button:has-text('Dataset Ingestion')").click()
        page.wait_for_selector("h2:has-text('Dataset Ingestion & Schema Validation Engine')")
        print("✓ Navigated to Datasets Tab")
        
        # Test tab navigation to Recommendations
        page.locator(".workspace-nav-bar button:has-text('Action Playbooks')").click()
        page.wait_for_selector("h2:has-text('Prescriptive Retention & Revenue Recommendations')")
        print("✓ Navigated to Recommendations Tab")
        
        # Test tab navigation to Lookup
        page.locator(".workspace-nav-bar button:has-text('Customer 360 Lookup')").click()
        page.wait_for_selector("input[placeholder*='Customer ID']")
        print("✓ Navigated to Customer 360 Lookup Tab")
        
        print(f"Total console page errors: {len(errors)}")
        if errors:
            print("Errors encountered:", errors)
        assert len(errors) == 0, f"Found {len(errors)} page errors!"
        print("ALL REACT TESTS PASSED!")

if __name__ == "__main__":
    test_react()
