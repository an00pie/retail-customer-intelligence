# Testing Strategies & Test Suites — INSIGHT.arc

## 1. Test Suite Overview

| Test Suite | File | Technology | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend Integrity** | `tests/test_frontend_integrity.py` | Python `unittest` + HTMLParser | Validates 100% byte-parity between `frontend/` and `web/`; protects original DOM contracts and IDs against baseline `de849b5`. |
| **API Endpoints** | `tests/test_api_v1.py` | Python `unittest` + Flask TestClient | Tests authenticated login, customer detail retrieval, Shopify stores, pagination, and simulator endpoints. |
| **Platform Logic** | `tests/test_platform.py` | Python `unittest` + Flask TestClient | Tests revenue/order analytics, cohort counts, CSV sanitization & export, and boundary prediction logic. |
| **Gemini Integration** | `tests/test_gemini.py` | Python `unittest` + Mock/Patches | Validates prediction explanations, model configuration (`gemini-flash-lite-latest`), and error fallbacks. |
| **E2E Browser Tests** | Playwright (Python) | Headless Chromium | Responsive viewport checks (1440px, 1280px, 768px, 390px), chart rendering, and interaction verification. |

## 2. Standard Test Execution Commands
```bash
# 1. Frontend parity and integrity contracts
python3 tests/test_frontend_integrity.py

# 2. Complete backend and platform test suites
PYTHONPATH=. .venv/bin/pytest tests/test_api_v1.py tests/test_platform.py -v

# 3. Gemini integration suite
PYTHONPATH=. .venv/bin/python3 -m unittest tests/test_gemini.py

# 4. Frontend bundle build
cd frontend && npm run build
```
