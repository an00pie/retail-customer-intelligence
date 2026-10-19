import sys
from playwright.sync_api import sync_playwright

def capture_tabs():
    art_dir = "/Users/jisshajan/.gemini/antigravity/brain/d10b9bcc-95d1-43bc-b8ea-b0b4f604dd54"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        page.goto("http://localhost:8501/app")
        page.wait_for_selector(".platform-container")
        
        # 1. Overview Dashboard (scroll to workspace)
        page.evaluate("window.scrollTo(0, 520)")
        page.wait_for_timeout(500)
        page.screenshot(path=f"{art_dir}/react_tab_overview.png")
        print("Captured react_tab_overview.png")
        
        # 2. Simulator
        page.locator(".workspace-nav-bar button:has-text('What-If Simulator')").click()
        page.wait_for_timeout(600)
        page.screenshot(path=f"{art_dir}/react_tab_simulator.png")
        print("Captured react_tab_simulator.png")
        
        # 3. Datasets
        page.locator(".workspace-nav-bar button:has-text('Dataset Ingestion')").click()
        page.wait_for_timeout(600)
        page.screenshot(path=f"{art_dir}/react_tab_datasets.png")
        print("Captured react_tab_datasets.png")
        
        # 4. Recommendations
        page.locator(".workspace-nav-bar button:has-text('Action Playbooks')").click()
        page.wait_for_timeout(600)
        page.screenshot(path=f"{art_dir}/react_tab_recommendations.png")
        print("Captured react_tab_recommendations.png")
        
        # 5. Customer 360 Lookup
        page.locator(".workspace-nav-bar button:has-text('Customer 360 Lookup')").click()
        page.wait_for_timeout(600)
        page.screenshot(path=f"{art_dir}/react_tab_lookup.png")
        print("Captured react_tab_lookup.png")
        
        # 6. Auth Modal
        page.locator("button:has-text('Sign In')").first.click()
        page.wait_for_timeout(400)
        page.screenshot(path=f"{art_dir}/react_modal_auth.png")
        print("Captured react_modal_auth.png")
        page.keyboard.press("Escape")

if __name__ == "__main__":
    capture_tabs()
