"""Real-browser desktop/mobile checks using a disposable database and local Flask server."""
import os
from pathlib import Path
import shutil
import sys
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    with tempfile.TemporaryDirectory(prefix='retail-operations-browser-') as directory:
        database = Path(directory) / 'customer_profile.db'
        shutil.copy2(ROOT / 'data/serving/customer_profile.db', database)
        os.environ['RETAIL_DB_PATH'] = str(database)
        os.environ['GEMINI_API_KEY'] = ''  # Browser checks must never make paid provider calls.
        from web.app import app
        from werkzeug.serving import make_server
        from playwright.sync_api import sync_playwright
        server = make_server('127.0.0.1', 0, app)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch()
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                base_url = f'http://127.0.0.1:{server.server_port}'
                page.goto(base_url + '/')
                page.wait_for_function("typeof window.switchDashboardTab === 'function'")
                assert not page.locator('#tab-operations').is_visible(), 'Operations should be a separate inactive section'
                assert page.locator('.dash-content').get_by_text('Data freshness & quality', exact=True).count() == 0, 'Quality workspace must not appear on the dashboard'
                page.locator('.nav-links [data-tab=operations]').click()
                page.locator('#tab-operations').wait_for(state='visible')
                assert not page.locator('#tab-dashboard').is_visible(), 'Dashboard should hide when operations opens'
                assert page.locator('.nav-links [data-tab=operations]').get_attribute('aria-current') == 'page'
                assert page.locator('#tab-operations').get_by_text('Trust & Operations', exact=True).is_visible()
                page.locator('.nav-links [data-tab=dashboard]').click()
                assert not page.locator('#tab-operations').is_visible()
                page.goto(base_url + '/#operations')
                page.locator('#tab-operations').wait_for(state='visible')
                page.set_viewport_size({'width': 390, 'height': 1000})
                page.locator('#mobileNavToggle').click()
                page.locator('#mobileNavDropdown [data-tab=operations]').click()
                page.locator('#tab-operations').wait_for(state='visible')
                assert page.locator('#mobileNavToggle').get_attribute('aria-expanded') == 'false'
                page.set_viewport_size({'width': 1440, 'height': 1000})
                page.goto(f'http://127.0.0.1:{server.server_port}/api/v1/operations/workspace')
                page.wait_for_function("document.querySelector('#quality').textContent.includes('records')")
                page.locator('#login [name=username]').fill('admin')
                page.locator('#login [name=password]').fill('admin123')
                page.locator('#login button').click()
                page.locator('#authenticated').wait_for(state='visible')
                page.locator('#action [name=segment]').select_option('Champions')
                page.locator('#action [name=name]').fill('Browser verified follow-up')
                page.locator('#action [name=owner]').fill('analyst')
                page.locator('#action [name=follow_up]').fill('2027-01-01')
                page.locator('#action button').click()
                page.get_by_text('Browser verified follow-up', exact=False).wait_for()
                page.get_by_role('button', name='Mark done').first.click()
                page.get_by_role('button', name='Reopen').first.wait_for()
                page.get_by_role('button', name='Audit trail').first.click()
                page.wait_for_function("document.querySelector('#report').textContent.includes('item_updated')")
                page.get_by_text('Inspect a trained prediction', exact=True).click()
                page.locator('#prediction button').click()
                page.wait_for_function("document.querySelector('#prediction-result').textContent.includes('model_versions')")
                page.locator('#explain').click()
                page.wait_for_function("document.querySelector('#explanation').textContent.includes('not configured')")
                page.locator('summary').filter(has_text='Create a measured campaign').click()
                page.locator('#campaign [name=name]').fill('Browser campaign')
                page.locator('#campaign [name=segment]').select_option('Champions')
                page.locator('#campaign [name=intervention]').fill('Review call')
                page.locator('#campaign [name=outcome_definition]').fill('30-day purchase, net revenue')
                page.locator('#campaign button').click()
                page.get_by_role('button', name='Results, members & audit').first.wait_for()
                page.get_by_role('button', name='Results, members & audit').first.click()
                page.wait_for_function("document.querySelector('#report').textContent.includes('Insufficient sample')")
                for width in (1440, 390):
                    page.set_viewport_size({'width': width, 'height': 1000})
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}px'
                page.keyboard.press('Tab')
                assert page.evaluate("document.activeElement.tagName !== 'BODY'"), 'Keyboard focus missing'
                assert not errors, errors
                print('Browser checks passed: separate operations section, desktop/mobile navigation, direct link, sign-in, cohort work item, status update, audit, trained prediction, Gemini unavailable state, campaign creation/report, keyboard focus, 1440px/390px overflow, reduced motion; no runtime errors.')
                browser.close()
        finally:
            server.shutdown()
            thread.join()


if __name__ == '__main__':
    main()
