"""Read-only screenshot matrix for both actual production entries.

Artifacts must be outside the repository. No login, uploads or persistent writes.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

SIZES = {1920: 1080, 1440: 900, 1280: 800, 1024: 768, 768: 1024,
         430: 932, 390: 844, 375: 812, 360: 800, 320: 700}
ROOT_TABS = ['dashboard', 'lookup', 'segmentation', 'churn', 'clv', 'rfm']
APP_TABS = ['dashboard', 'lookup', 'segmentation', 'clv', 'simulator', 'datasets', 'recommendations']


def capture(url, output, widths):
    output.mkdir(parents=True, exist_ok=True)
    records, errors, requests = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for entry, tabs in [('root', ROOT_TABS), ('app', APP_TABS)]:
            page = browser.new_page()
            page.add_init_script("sessionStorage.setItem('insight_arc_intro_viewed', 'true')")
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: requests.append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
            for width in widths:
                page.set_viewport_size({'width': width, 'height': SIZES[width]})
                page.goto(url.rstrip('/') + ('/' if entry == 'root' else '/app'), wait_until='domcontentloaded')
                page.wait_for_function("document.fonts.status === 'loaded'")
                page.wait_for_timeout(1500)
                page.screenshot(path=str(output / f'{entry}-{width}-hero.png'))
                for index, tab in enumerate(tabs):
                    if entry == 'root':
                        page.evaluate('(tab) => window.switchDashboardTab(tab)', tab)
                        target = page.locator('.hero-mockup-wrapper')
                    else:
                        page.locator('.workspace-nav-bar button').nth(index).click()
                        target = page.locator('#analytics-workspace')
                    target.evaluate("e => e.scrollIntoView({behavior: 'instant', block: 'start'})")
                    page.wait_for_timeout(1000)
                    path = output / f'{entry}-{width}-{tab}.png'
                    page.screenshot(path=str(path))
                    if width in (1440, 390):
                        target.screenshot(path=str(output / f'{entry}-{width}-{tab}-full.png'))
                    records.append({'entry': entry, 'width': width, 'tab': tab, 'screenshot': str(path),
                                    'overflow': page.evaluate('document.documentElement.scrollWidth > innerWidth'),
                                    'displayFontLoaded': page.evaluate("document.fonts.check('24px BubbledotICG-FinePos')")})
                if width in (1440, 390):
                    page.locator('#navArchitectureBtn').click()
                    page.wait_for_timeout(500)
                    page.screenshot(path=str(output / f'{entry}-{width}-architecture.png'))
                    page.keyboard.press('Escape')
                    if entry == 'app':
                        # Baseline versions do not handle Escape; record/capture them without blocking the audit.
                        if page.locator('#modal-architecture-react').is_visible():
                            page.get_by_role('button', name='Close Specifications').click()
                        page.get_by_title('Login / Register').click()
                        page.wait_for_timeout(400)
                        page.screenshot(path=str(output / f'{entry}-{width}-auth.png'))
                        page.keyboard.press('Escape')
                        page.reload(wait_until='domcontentloaded')
                print(entry, width, 'captured', flush=True)
            page.close()
        browser.close()
    result = {'url': url, 'records': records, 'runtimeErrors': errors, 'httpErrors': requests}
    (output / 'matrix.json').write_text(json.dumps(result, indent=2))
    print('Overflow:', [(r['entry'], r['width'], r['tab']) for r in records if r['overflow']])
    print('Runtime errors:', errors)
    # Contact sheets allow the actual rendered sections to be reviewed together.
    from PIL import Image, ImageOps, ImageDraw
    for entry in ('root', 'app'):
        for width in (1440, 390):
            if width not in widths:
                continue
            shots = list(output.glob(f'{entry}-{width}-*.png'))
            shots = [s for s in shots if '-full' not in s.stem]
            sheet = Image.new('RGB', (1200, ((len(shots) + 2) // 3) * 340), '#262626')
            for i, shot in enumerate(shots):
                image = Image.open(shot).convert('RGB')
                image.thumbnail((390, 310))
                x, y = (i % 3) * 400, (i // 3) * 340
                sheet.paste(image, (x, y + 22))
                ImageDraw.Draw(sheet).text((x + 4, y + 3), shot.stem, fill='white')
            sheet.save(output / f'{entry}-{width}-contact.png')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:8501')
    parser.add_argument('--output', required=True)
    parser.add_argument('--widths', default=','.join(map(str, SIZES)))
    args = parser.parse_args()
    capture(args.url, Path(args.output), [int(w) for w in args.widths.split(',')])
