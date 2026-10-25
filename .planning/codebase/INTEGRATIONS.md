# External & Internal Integrations — INSIGHT.arc

## 1. Cloud & Deployment Integrations
- **Vercel**: Hosts the static frontend and React bundle (`frontend/dist/`). Configured in `frontend/vercel.json` with API proxy rewrites routing `/api/*` to Render.
- **Render**: Hosts the Flask API backend and machine learning inference engine. Serves health checks, analytics, predictions, and customer profiles.

## 2. API Endpoints Contract
- `GET /api/health`: Health status and serving record counts.
- `GET /api/kpis`: Real-time aggregated retail business metrics.
- `GET /api/analytics/revenue-orders`: Time-series revenue, orders, and AOV trajectory data.
- `GET /api/analytics/shopify-stores`: Shopify multi-store intelligence and risk telemetry.
- `GET /api/customers`: Paginated customer profiles with cohort assignments.
- `GET /api/customer/<id>`: Detailed customer profile, RFM scores, and predictions.
- `POST /api/predict`: Real-time ML inference for CLV and churn probability based on what-if sliders.
- `POST /api/v1/operations/explain-prediction`: Explain customer predictions using Gemini AI.

## 3. Third-Party Services
- **Google Gemini API**: Configured via `GEMINI_API_KEY` on Render backend; uses `gemini-flash-lite-latest` to provide explanations.
- **OnlineWebFonts**: External web font stylesheet delivering `BubbledotICG-FinePos` for pixel headings.
- **Google Fonts**: CDN delivery of `Inter` and `JetBrains Mono`.

## 4. Developer & Autonomous Agent Tooling Integrations
- **CodeRabbit**: Integrated via CLI `0.9.1` and Antigravity plugin for automated code review, security analysis, and PR autofixing.
- **Ralph Loop**: Integrated via Antigravity plugin (`ralph-wiggum`) for bounded autonomous iterative development with deterministic test backpressure.
- **GSD**: Integrated via local `.agent/` runtime for phase planning, codebase mapping, and roadmap tracking.
