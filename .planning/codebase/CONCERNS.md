# Technical Debt & Architecture Concerns — INSIGHT.arc

## 1. Scikit-Learn Model Unpickling Version Warnings
- **Symptom**: Unpickling models in `models/` outputs `InconsistentVersionWarning` (pickled in 1.9.1 vs. runtime 1.6.1).
- **Risk**: Potential breaking changes or subtle numeric drift across sklearn minor/major releases.
- **Remediation**: Re-serialize models using the pinned production virtualenv version or migrate to an ONNX runtime.

## 2. Manual Duplication Overhead
- **Symptom**: Files must be manually copied between `frontend/` and `web/` (`index.html`, `dashflow.css`, `dashflow.js`).
- **Risk**: Forgetting to mirror one file causes `test_frontend_integrity.py` failure and discrepancies between Vercel and local Flask server.
- **Remediation**: Create an automated sync pre-commit hook or build step that mirrors automatically.

## 3. Large Static CSS File
- **Symptom**: `dashflow.css` is over 9,000 lines long, containing styles for hero, navbar, cards, charts, simulator, and modals.
- **Risk**: Rule duplication, cascading order override bugs, and high maintenance overhead.
- **Remediation**: Modularize into CSS component partials (e.g. `base.css`, `simulator.css`, `cards.css`, `nav.css`) bundled via PostCSS/Vite.
