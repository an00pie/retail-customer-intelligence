# Retail Customer Intelligence Platform — Agent Rules

## Project
- **GitHub repository**: https://github.com/an00pie/retail-customer-intelligence
- **Main branch**: `main`
- **Production frontend**: https://retail-customer-intelligence-two.vercel.app
- **Production backend**: https://retail-customer-intelligence.onrender.com
- **Frontend**: existing HTML, CSS, and JavaScript application
- **Backend**: existing Flask/Gunicorn application
- **Deployment**: Vercel frontend and Render backend

## Primary objective
Refine the existing deployed website. Do not rebuild it, replace its stack, or create a separate application.

## Mandatory constraints
- Preserve the existing emerald-green luxury dashboard and current functionality.
- Preserve existing backend APIs, real customer data, ML inference, and business logic.
- Never fabricate KPI values, customers, predictions, test results, or deployment status.
- **Keep these files synchronized when modifying the relevant source:**
  - `frontend/index.html` and `web/templates/index.html`
  - `frontend/static/css/dashflow.css` and `web/static/css/dashflow.css`
  - `frontend/static/js/dashflow.js` and `web/static/js/dashflow.js`
- Prioritize premium UI polish, subtle scroll animations, smooth transitions, accessibility, and responsive behavior.
- Run existing tests and inspect diffs before completing changes.
- Do not overwrite uncommitted work or reset tracked files without explicit approval.
- Do not commit, push, or deploy without explicit user approval.
- Never expose API keys, secrets, credentials, or production environment variables.
- Report actual changes, test outcomes, and unresolved issues honestly.

## Collaboration protocol
- **Antigravity** is the primary implementation agent.
- **Codex** is the independent reviewer and may suggest focused fixes.
- Before editing, inspect Git status and the current diff.
- Prefer small, reviewable changes over broad rewrites.
- Do not run both agents against the same files concurrently.
- Review all changes before committing or deploying.
- Preserve existing deployment architecture and production behavior.
