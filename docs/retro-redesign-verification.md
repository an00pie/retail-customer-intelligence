# Cinematic redesign — preservation inventory

## Baseline (2026-10-19)

- Clean `main` at `de849b5`; no existing work to overwrite.
- Vercel serves `frontend/`; Flask serves `web/templates/` and `web/static/`.
- All three HTML/CSS/JS pairs were byte-identical before editing.
- Existing Vercel project `retail-customer-intelligence`, root `.`, static output;
  production alias `retail-customer-intelligence-two.vercel.app`. API rewrite targets Render.
- Backend unit/integration baseline: 18 tests passed.
- Requested `/mnt/data/` reference absent; latest user specification is the design reference.
- Specified video responds HTTP 200. Bubbledot stylesheet available with attribution required.
- No `logo.webp` or Geist font present: retain existing SVG brand mark and monospace fallback.
- Initial production backend health request returned 503.

## Feature-preservation checklist

Checked against the original DOM/control contracts and reviewed source diff. Runtime checks
are described separately below; a preserved control is not a claim that every input permutation was tested.

- [x] Original two-line hero, description, Explore Dashboard CTA and globe canvas.
- [x] Five primary destinations: Dashboard, Customer Lookup, Segmentation, CLV & Churn, Simulator.
- [x] Architecture, FAQ, mining catalog (global search), contextual RFM access, back buttons.
- [x] Four API-updated dashboard KPIs and comparison labels.
- [x] Chart.js revenue/order chart: both datasets, dual axes, tooltips, legend, all six periods,
  select control, loading overlay, error/retry state, tab-return resize.
- [x] Overview customer lookup, profile metrics and transaction table.
- [x] Overview RFM sliders, calculation button, score/segment/CLV/churn outputs.
- [x] Four cohort shortcuts and authoritative cohort statistics.
- [x] Full lookup: ID search, seven sample buttons, profile, transactions, unavailable-action toasts.
- [x] Customer ledger/profile CSV, cohort CSV, executive print action.
- [x] RFM calculator: three sliders, score, segment and estimated CLV.
- [x] Segmentation: four cohort cards with all original metrics and calculator link.
- [x] CLV/churn model metrics and risk thresholds.
- [x] Simulator: four number/range pairs, validation, API inference and three outputs.
- [x] Global search, Enter routing, Cmd/Ctrl+K, empty search state.
- [x] Architecture/mining/FAQ modals, accordion, Escape, focus trapping/restoration.
- [x] Mobile navigation, all destinations, outside click, Escape, resize and focus management.
- [x] Reduced motion, video fallback, no-JS readable content, normal document scrolling.

The existing app has one analytical Chart.js canvas and one decorative globe canvas.
Segmentation and churn use metric cards, not additional chart instances. No original footer
or sign-in workflow exists. No data, model, API, chart configuration or calculation changes made.

## Local validation — PASSED

- `.venv/bin/python -m unittest discover -s tests -p test_platform.py`: 18/18 before and after.
- `.venv/bin/python tests/test_frontend_integrity.py`: 3/3; matching assets, balanced HTML,
  unique IDs, every original selector and interactive control contract retained.
- `node --check frontend/static/js/dashflow.js` and `git diff --check`: passed.
- Existing `tests/test_e2e_full.py`: passed before and after, including API-consistent KPIs,
  chart series, customer lookup/404, RFM, simulator validation/inference, global search,
  modal/FAQ keyboard behavior, honest unavailable-action toasts, three CSV exports,
  print CSS and cohort/navigation checks. Zero reported console errors.
- `tests/test_cinematic_ui.py`: passed. All six periods match live local API chart series;
  chart hover tooltip, overview lookup/RFM, contextual navigation and mining modal checked.
  All six panes and chart dimensions checked at 320, 360, 375, 390, 430, 768, 1024,
  1280, 1440 and 1920px with no document overflow.
- Mobile sheet focus cycling, Escape/restoration, overlay dismissal, link selection,
  desktop resize, 390x320 short-height scrolling and touch navigation passed.
- Exact remote display font and video loaded. Pause/play, reduced-motion no-download,
  data-saving no-download, intentional video-network-failure fallback and no-JS content passed.
- Desktop/mobile screenshots visually inspected. Emerald chart semantics retained.
- Video range requests occasionally show `net::ERR_ABORTED` when playback pauses; playback
  verified. No other failed requests or uncaught errors in the cinematic regression run.
- Initial production backend 503 recovered to HTTP 200 / `operational` on recheck.

## Scope and deployment notes

- No Geist fallback or raster logo was supplied; existing SVG brand mark retained.
- Display font attribution included as required by its supplied stylesheet.
- Chromium automation used; physical devices and Safari/Firefox are NOT TESTED.
- Native OS print-dialog interaction and exhaustive customer/input combinations are NOT TESTED.
- Vercel project has no Git link configured; use existing linked `frontend/` CLI production
  deployment, matching previous deployment metadata. No project settings or API rewrites changed.
