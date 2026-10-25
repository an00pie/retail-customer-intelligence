# Technology Stack — INSIGHT.arc

## 1. Runtime & Languages
- **Python**: `3.9+` (Virtualenv at `.venv/`)
- **Node.js**: `v26.6.0` (npm `11.18.0`)
- **TypeScript**: `5.4.2`
- **Modern JavaScript**: ES2022+

## 2. Frontend Architecture
- **Production Public SPA (`/`)**:
  - Semantic HTML5, DashFlow CSS design system, vanilla JavaScript (`dashflow.js`)
  - Charting: `Chart.js 4.4.2`
  - Typography: `BubbledotICG-FinePos` (Pixel display), `Inter`, `JetBrains Mono`
- **React Workspace (`/app`)**:
  - React 18.2.0, React DOM 18.2.0
  - Bundler: Vite 5.1.6
  - Icons: `lucide-react 0.363.0`
  - Charting: `react-chartjs-2 5.2.0`, `chart.js 4.4.2`

## 3. Backend & API Services
- **Framework**: Flask (WSGI Web Server Gateway)
- **Production Server**: Gunicorn
- **Security / Middleware**: CORS, Rate Limiting, HTTP header sanitization

## 4. Machine Learning & Analytics Pipeline
- **Library**: `scikit-learn`
- **Core Models**:
  - `GradientBoostingRegressor`: 90-Day CLV Prediction (Cohort R² 0.5238, MAE $321.78)
  - `RandomForestClassifier`: Customer Churn Probability Classification
  - `KMeans`: 4-Cluster Behavioral Customer Segmentation (Champions, Loyal Customers, At-Risk, Lost/Churned)
- **Explainability**: Google Gemini API (`gemini-flash-lite-latest`) for plain-language prediction explanation

## 5. Data & Storage
- **Serving Store**: SQLite (`data/serving/customer_profile.db`)
- **Data Warehouse**: UCI Online Retail II transactional dataset
- **Artifact Formats**: CSV, JSON

## 6. Hosting & Cloud Infrastructure
- **Frontend Hosting**: Vercel (`https://retail-customer-intelligence-two.vercel.app`)
- **Backend Hosting**: Render (`https://retail-customer-intelligence.onrender.com`)
- **Version Control**: GitHub (`https://github.com/an00pie/retail-customer-intelligence`, branch `main`)
