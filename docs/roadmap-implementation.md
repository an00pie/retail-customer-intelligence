# Trust and operational readiness

This increment follows Phase 1 of the supplied Customer Intelligence Platform roadmap within the existing Flask, SQLite, HTML/JS and React application.

## Using the improvements

- Legacy dashboard: dedicated **Trust & Operations** navigation section (desktop and mobile), or `/#operations`.
- React workspace: **Trust & Operations** tab.
- Both embed the same Flask-rendered operational panel. Existing dashboard sections remain available.
- Data freshness/coverage is also displayed above dashboard results. The operational panel includes refresh, import history evidence and reviewable alerts.
- Sign in using an existing account to save cohort work items, owners, notes, follow-up dates, status and reusable work-status filters. Cohort membership is frozen when saved. Changes retain actor, timestamp and payload in the audit log. Workspaces are scoped to the authenticated account; owner names are assignment labels, not cross-account sharing permissions.
- Create a campaign from a segment, define its intervention and outcome/window/attribution rule, and inspect the frozen randomized treatment/control membership. Record observed outcomes for both groups. Records are replaced by campaign/customer key rather than added twice; each submission is audited. No external communication is sent.

## Evidence and measurement semantics

- `/api/predict` and `/api/v1/predictions/predict` return inference status, SHA-256 artifact versions, actual feature inputs and computed global feature importances for both CLV and churn. Failed inference returns HTTP 503 and null outputs. Legacy heuristic fallbacks are removed.
- Global importance is explicitly not a signed, causal, customer-specific explanation. Feature values are exposed as evidence rather than inventing directional explanations.
- Existing model artifacts lack a recorded training-data timestamp. This is reported as unknown. Future normal training runs write `models/training_metadata.json` with actual source transaction end date, training completion time, cutoff and artifact hashes. The API accepts this metadata only when hashes match. This change does not retrain or replace existing models.
- Quality evidence comes from the SQLite serving snapshot and recorded dataset imports. Serving refresh time is distinguished from source transaction age. A seven-day serving freshness threshold and a 50% import-volume change threshold generate reviewable alerts; imports can have different scopes. No source records are silently corrected. Existing stored prediction coverage does not establish historical model-version provenance.
- Campaign reports expose arm-level contacted counts, observed outcomes, conversion rate, retention rate/coverage, revenue and cost. Unobserved conversions are not treated as zero-rate evidence. Retention remains null until observed.
- Incremental revenue is treatment revenue minus control revenue per member multiplied by treatment membership. It is withheld until every member has an outcome and at least 30 observed members exist per arm. Results remain descriptive and require manual attribution review; they are not statistical significance or causal guarantees.
- Operational tables are additive and use the existing `RETAIL_DB_PATH` database. Production durability depends on the existing persistent database deployment configuration.

## Deferred by the roadmap

CRM/task syncing and email/SMS execution require a selected provider, permitted customer fields, consent/frequency rules and a success outcome. No providers, credentials or sends are hard-coded. Next-best-action rankings and an analyst copilot remain later phases, after outcome history exists. Exact individual prediction attribution and broader KPI-change baselines remain follow-up work.

## Optional Gemini explanations

The simulator and authenticated operational panel include **Explain with Gemini**. The authenticated `POST /api/v1/operations/explain-prediction` endpoint recomputes the prediction before asking Gemini for a plain-language explanation. It sends only numeric features, computed outputs, global feature importances and provenance. Customer identity, notes, credentials and client-supplied predictions are excluded.

Configure `GEMINI_API_KEY` in the Flask/Render backend environment with a fresh Google Gemini API credential. `GEMINI_MODEL` is optional and defaults to `gemini-flash-lite-latest`; set it to a model enabled for the backend's Google project. Never use a frontend/Vite environment variable for this secret. No key is stored in this repository or sent to the browser. Restart/redeploy the backend after configuration.

Gemini is used only on an explicit explanation request, not for core inference, KPI calculations, campaign measurement or automatic actions. Explanations include references to the exact evidence, are labeled AI-generated, and can still be inaccurate. Missing configuration, failed trained inference, provider errors and invalid/blocked responses produce explicit unavailable states. Provider error bodies are not returned or logged. Provider calls have connect/read timeouts and are not automatically retried.

Provider behavior is covered with mocks in `tests/test_gemini.py`. Successful live Gemini access must be verified after configuring a valid backend key; mocked tests do not establish live credential validity or provider availability.

## Verification

Run `.venv/bin/python scripts/verify_roadmap.py` for existing platform/API/integrity tests and new operational contract tests. It copies the serving database into a temporary directory before importing Flask, avoiding changes to tracked data.

Run `.venv/bin/python tests/test_operations_browser.py` for local Chromium checks using another disposable database: authenticated work item creation/update/audit, prediction evidence, campaign creation/reporting, keyboard focus and desktop/mobile overflow checks with reduced motion.

Build the existing frontend with `npm run build` from `frontend/`. No production deployment is performed by these checks.
