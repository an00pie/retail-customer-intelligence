# Directory Structure & Organization — INSIGHT.arc

```text
/
├── .agent/                      # Project-local GSD runtime, skills, agents, and hooks
├── .planning/                   # GSD planning directory (codebase maps, roadmaps, states)
│   └── codebase/                # Codebase intelligence documentation
├── data/                        # Processed customer datasets and serving SQLite database
│   ├── processed/               # Cleaned UCI Retail features and clusters
│   ├── raw/                     # Raw transaction archives
│   └── serving/                 # customer_profile.db (SQLite store)
├── docs/                        # Architecture documentation, roadmaps, guides
├── frontend/                    # Vercel deployment root
│   ├── index.html               # Primary production SPA template
│   ├── app.html                 # React workspace template
│   ├── package.json             # Frontend dependencies & build script
│   ├── vite.config.ts           # Dual-entry Vite configuration
│   ├── vercel.json              # Vercel routing rules & API rewrites
│   ├── src/                     # React TypeScript source code
│   │   ├── features/            # Feature modules (simulator, dashboard, etc.)
│   │   ├── lib/                 # Shared API client and formatters
│   │   └── types/               # TypeScript interfaces
│   └── static/                  # Shared styles, scripts, videos, and avatar assets
│       ├── css/dashflow.css     # Master DashFlow CSS stylesheet
│       ├── js/dashflow.js       # Master DashFlow DOM & Chart.js logic
│       └── img/avatars/         # Avatar images and monogram icons
├── models/                      # Pickled Scikit-Learn ML models
│   ├── clv_regressor.pkl        # Gradient Boosting Regressor
│   ├── churn_classifier.pkl     # Random Forest Classifier
│   └── segment_kmeans.pkl       # KMeans 4-cluster model
├── tests/                       # Test suites
│   ├── test_frontend_integrity.py  # Byte-parity & DOM contract protection
│   ├── test_api_v1.py           # Flask API endpoints test suite
│   ├── test_platform.py         # Platform logic & ML inference tests
│   └── test_gemini.py           # Gemini explanation tests
├── web/                         # Flask application source
│   ├── app.py                   # Flask server entry point & route registration
│   ├── static/                  # Mirrored static assets for Flask serving
│   └── templates/               # Mirrored Jinja2 templates (index.html)
└── AGENTS.md                    # Core rules and constraints for autonomous agents
```
