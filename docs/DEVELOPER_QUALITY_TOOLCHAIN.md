# INSIGHT.arc — Developer Quality & Security Toolchain Guide

This document outlines the six developer quality and security tools integrated into INSIGHT.arc: **Playwright**, **Lighthouse CI**, **Dependabot**, **Sentry**, **PostHog**, and **OWASP ZAP**, alongside our existing **GSD**, **Ralph Loop**, and **CodeRabbit** workflows.

---

## 1. Toolchain Overview

| Tool | Category | Status in Repository | Configuration File |
| :--- | :--- | :--- | :--- |
| **Playwright** | E2E Browser Testing | Active (Python/Chromium) | `tests/e2e/test_playwright_e2e.py` |
| **Lighthouse CI** | Web Vitals & A11y Audit | Active (NPM devDependency) | `frontend/lighthouserc.cjs` |
| **Dependabot** | Vulnerability Alerts | Active (GitHub Automation) | `.github/dependabot.yml` |
| **Sentry** | Error Monitoring | Optional (Disabled unless DSN provided) | `web/app.py`, `frontend/static/js/dashflow.js` |
| **PostHog** | Product Analytics | Optional (Disabled unless API key provided) | `frontend/static/js/dashflow.js` |
| **OWASP ZAP** | Baseline Security Scan | Active (Docker / Native Python Fallback) | `scripts/zap_baseline_scan.sh`, `scripts/security_baseline_scan.py` |

---

## 2. Tool Guides & Local Commands

### 1. Playwright (End-to-End Browser Automation)
- **Purpose**: Automates cross-browser testing for the homepage, dashboard charts, Customer Lookup, What-If Simulator scenario switching, responsive layouts (Desktop 1440px, Tablet 768px, Mobile 390px), and console error detection.
- **Prerequisites**: Python virtual environment with `pytest` and `playwright`.
- **Command**:
  ```bash
  # 1. Start local Flask server (or point to local instance)
  PORT=5055 PYTHONPATH=. python3 web/app.py &

  # 2. Run E2E test suite
  INSIGHT_TEST_URL="http://127.0.0.1:5055" PYTHONPATH=. pytest tests/e2e/test_playwright_e2e.py -v
  ```

### 2. Lighthouse CI (Performance, Accessibility, SEO)
- **Purpose**: Runs automated Google Lighthouse audits against production builds, evaluating Performance, Accessibility, Best Practices, and SEO.
- **Prerequisites**: Node.js 18+ and `frontend/package.json` dependencies.
- **Commands**:
  ```bash
  cd frontend
  npm run build
  npx lhci autorun --config=lighthouserc.cjs
  ```
- **Interpreting Results**: Reports are written to `frontend/.lighthouseci/`. Thresholds are tuned for static/SPA hydration (Performance >= 0.50, Accessibility >= 0.75, Best Practices >= 0.70, SEO >= 0.70). These assertions are configured at warning level (`warn`) so audits provide actionable quality telemetry without blocking CI pipelines.

### 3. GitHub Dependabot (Automated Dependency Audits)
- **Purpose**: Audits pip (`requirements.txt`) and npm (`frontend/package.json`) dependencies weekly on Mondays at 06:00 UTC.
- **Safety Safeguard**: Groups minor and patch updates together to minimize PR noise. Automatically pins `scikit-learn` to prevent breaking serialization compatibility with existing model artifacts.
- **GitHub Setup**:
  1. Navigate to repository **Settings** → **Code security and analysis**.
  2. Enable **Dependabot alerts** and **Dependabot security updates**.

### 4. Sentry (Error Monitoring)
- **Purpose**: Captures uncaught frontend exceptions and backend server errors.
- **Safe Fallback**: Monitoring is completely inert unless an explicit DSN is provided.
- **Privacy & Scrubbing**: Automatically scrubs authorization/cookie headers and request body payloads before transmission.
- **Environment Variables**:
  - `SENTRY_DSN`: `https://<public_key>@o<org>.ingest.sentry.io/<project_id>` (Set in Render dashboard)
  - `SENTRY_ENVIRONMENT`: `production` or `development`
  - Frontend injection: `<meta name="sentry-dsn" content="...">` or `window.__SENTRY_DSN__`

### 5. PostHog (Privacy-Preserving Product Analytics)
- **Purpose**: Tracks high-level aggregate user actions (e.g. `dashboard_viewed`, `simulator_scenario_selected`, `prediction_completed`) to understand feature adoption.
- **Safe Fallback**: Inert no-op dispatcher (`window.insightAnalytics.track`) when no API key is provided.
- **Privacy Policy Compliance**:
  - Strictly NO session recording (`disable_session_recording: true`).
  - Text & attributes masked by default (`mask_all_text: true`).
  - Never collects customer names, emails, raw spend, or personal identifiers.
  - Honors browser Do Not Track (`respect_dnt: true`).
- **Environment Variables**:
  - `POSTHOG_API_KEY`: `phc_xxxxxxxxxxxx`
  - `POSTHOG_HOST`: `https://us.i.posthog.com` (default)
  - Frontend injection: `<meta name="posthog-api-key" content="...">` or `window.__POSTHOG_API_KEY__`

### 6. OWASP ZAP (Baseline Web Security Scanning)
- **Purpose**: Non-destructive, passive web application security baseline audit. Inspects HTTP response headers, CORS policies, method handling, and information disclosure.
- **Safety Boundary**: NEVER run destructive active attacks against live customer platforms. Only run against local test servers or isolated staging environments.
- **Command**:
  ```bash
  # Using automated wrapper (launches Docker if daemon is active, or native Python audit)
  bash scripts/zap_baseline_scan.sh http://localhost:5055 reports/security

  # Native Python audit runner
  PYTHONPATH=. python3 scripts/security_baseline_scan.py --target http://localhost:5055 --output-dir reports/security
  ```
- **Interpreting Reports**: Output is generated in `reports/security/security_baseline_report.html` and `reports/security/security_baseline_report.json`.

---

## 3. Reproducing CI Failures Locally

To run the complete verification pipeline locally exactly as CI runs it:

```bash
# 1. Asset mirroring integrity
python3 scripts/sync_assets.py --check

# 2. Backend & ML Model Parity
PYTHONPATH=. pytest --ignore=tests/test_react_app.py --ignore=tests/e2e/test_playwright_e2e.py

# 3. Frontend production build
cd frontend && npm run build && cd ..

# 4. Lighthouse CI
cd frontend && npx lhci autorun --config=lighthouserc.cjs && cd ..

# 5. Playwright E2E
PORT=5055 PYTHONPATH=. python3 web/app.py &
SERVER_PID=$!
sleep 2
INSIGHT_TEST_URL="http://127.0.0.1:5055" PYTHONPATH=. pytest tests/e2e/test_playwright_e2e.py

# 6. Security Baseline
PYTHONPATH=. python3 scripts/security_baseline_scan.py --target http://127.0.0.1:5055
kill $SERVER_PID
```
