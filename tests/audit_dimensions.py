"""
Precision UI Layout and Dimension Audit Script
Measures bounding boxes, padding, gaps, scroll widths, card dimensions,
and overflow across the 9 required viewport sizes:
- Desktop: 1920x1080, 1600x900, 1440x900, 1366x768
- Tablet: 1024x768, 768x1024
- Mobile: 430x932, 390x844, 360x800
"""
import sys
import json
from playwright.sync_api import sync_playwright

AUDIT_VIEWPORTS = [
    {"category": "Desktop", "name": "1920x1080", "width": 1920, "height": 1080},
    {"category": "Desktop", "name": "1600x900",  "width": 1600, "height": 900},
    {"category": "Desktop", "name": "1440x900",  "width": 1440, "height": 900},
    {"category": "Desktop", "name": "1366x768",  "width": 1366, "height": 768},
    {"category": "Tablet",  "name": "1024x768",  "width": 1024, "height": 768},
    {"category": "Tablet",  "name": "768x1024",  "width": 768,  "height": 1024},
    {"category": "Mobile",  "name": "430x932",   "width": 430,  "height": 932},
    {"category": "Mobile",  "name": "390x844",   "width": 390,  "height": 844},
    {"category": "Mobile",  "name": "360x800",   "width": 360,  "height": 800}
]

def run_dimension_audit(base_url="http://localhost:8501"):
    print(f"\n=======================================================")
    print(f"  PRECISION UI LAYOUT & DIMENSIONS AUDIT: {base_url}")
    print(f"=======================================================\n")

    audit_records = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for vp in AUDIT_VIEWPORTS:
            page = browser.new_page(viewport={"width": vp["width"], "height": vp["height"]})
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            page.goto(base_url, wait_until="domcontentloaded")
            page.wait_for_timeout(1000)

            # Measure DOM metrics via client evaluation
            metrics = page.evaluate("""() => {
                const getBox = (sel) => {
                    const el = document.querySelector(sel);
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return {
                        width: Math.round(r.width),
                        height: Math.round(r.height),
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
                        margin: `${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`,
                        display: style.display,
                        fontSize: style.fontSize,
                        lineHeight: style.lineHeight
                    };
                };

                const scrollWidth = document.documentElement.scrollWidth;
                const innerWidth = window.innerWidth;
                const hasOverflow = scrollWidth > innerWidth;

                return {
                    scrollWidth: scrollWidth,
                    innerWidth: innerWidth,
                    hasOverflow: hasOverflow,
                    nav: getBox('.nav-capsule'),
                    sidebar: getBox('.dash-sidebar'),
                    content: getBox('.dash-content'),
                    kpiGrid: getBox('.dash-kpis-grid-four'),
                    kpiCard: getBox('.dash-kpi-card-luxury'),
                    chartCard: getBox('.dash-chart-card-luxury'),
                    overviewModules: getBox('.dash-overview-modules-row')
                };
            }""")

            record = {
                "category": vp["category"],
                "viewport": vp["name"],
                "width": vp["width"],
                "height": vp["height"],
                "scrollWidth": metrics["scrollWidth"],
                "hasOverflow": metrics["hasOverflow"],
                "errors": len(errors),
                "metrics": metrics
            }
            audit_records.append(record)

            status_icon = "❌" if metrics["hasOverflow"] or len(errors) > 0 else "✅"
            print(f"{status_icon} [{vp['category']} {vp['name']}] Width: {vp['width']}px | ScrollWidth: {metrics['scrollWidth']}px | Overflow: {metrics['hasOverflow']} | ContentW: {metrics['content']['width'] if metrics['content'] else 'N/A'}px | SidebarW: {metrics['sidebar']['width'] if metrics['sidebar'] else 'N/A'}px | KPICardW: {metrics['kpiCard']['width'] if metrics['kpiCard'] else 'N/A'}px")

            page.close()

        browser.close()

    with open("/Users/jisshajan/.gemini/antigravity/brain/d10b9bcc-95d1-43bc-b8ea-b0b4f604dd54/dimension_audit.json", "w") as f:
        json.dump(audit_records, f, indent=2)

    print(f"\nAudit complete. Detailed records written to dimension_audit.json")
    return audit_records

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8501"
    run_dimension_audit(url)
