# Implementation Plan: Customer Intelligence Platform for Retail

**Group 3** — Big Data-driven CLV prediction + RFM segmentation, enriched with scraped product data.

This document is written as a build spec for an coding agent to implement. Each module lists inputs, outputs, and acceptance criteria so it can be built and verified independently.

---

## 0. Architecture overview

```
[A] Transaction dataset (base)        [B] Web scraper (enrichment)
        |                                     |
        v                                     v
   HDFS raw zone  <----------------------------
        |
        v
   Hive external tables (cleaning, joins, aggregation)
        |
        v
   Spark / PySpark (feature engineering, RFM, ML models)
        |
        v
   HBase (serving layer: per-customer segment + predictions)
        |
        v
   Flask/Streamlit web app  --->  Tableau / Power BI dashboard (reads Hive/Spark output tables)
```

Two data sources feed the pipeline:
- **A — Transaction data**: a public retail transaction dataset (e.g. UCI Online Retail II), used for RFM/CLV/churn per customer.
- **B — Scraped data**: product-level data (price, rating, review count, review text) scraped from a retail site or marketplace, joined in on product ID/category to enrich features (e.g. "does this customer buy products with falling prices / high review volume").

---

## 1. Module: Data mining / scraper

**Goal:** collect product-level data (name, category, price, rating, review count, sample reviews) for the product categories present in the transaction dataset.

**Build:**
- Scrapy project (preferred) or `requests` + `BeautifulSoup` for static pages; add Selenium only if the target site needs JS rendering.
- Target: a retail/marketplace site's public category or search pages. Respect `robots.txt` and add rate limiting (`DOWNLOAD_DELAY`) and a custom `User-Agent`.
- Output: raw JSON/CSV, one record per product, per scrape run (add a `scraped_at` timestamp).

**Fields to capture:** `product_id`/`sku` (or a generated key), `product_name`, `category`, `price`, `rating`, `review_count`, `review_text[]` (sample of latest N reviews).

**Acceptance criteria:**
- Scraper runs end-to-end without manual intervention and produces a non-empty output file.
- Handles pagination and at least basic error handling (timeouts, missing fields → null, not crash).
- Output schema matches the fields above exactly, so downstream Hive tables don't need reshaping.

---

## 2. Module: HDFS ingestion

**Goal:** land both data sources in HDFS raw zone, unmodified.

**Build:**
- `/retail/raw/transactions/` — load the transaction CSV.
- `/retail/raw/products/` — load scraper output (one subfolder per scrape run, e.g. `/retail/raw/products/2026-09-22/`).
- Simple `hdfs dfs -put` commands or a small Python/Airflow script; no transformation at this stage.

**Acceptance criteria:** both datasets are visible in HDFS with `hdfs dfs -ls`, and file counts/row counts match the source files.

---

## 3. Module: Hive layer

**Goal:** expose both raw datasets as queryable external tables, then build cleaned/aggregated tables.

**Build:**
- `CREATE EXTERNAL TABLE raw_transactions (...)` and `CREATE EXTERNAL TABLE raw_products (...)` pointing at the HDFS raw paths, partitioned by date where applicable.
- Cleaning: a `clean_transactions` table (via `INSERT OVERWRITE ... SELECT`) that removes nulls/duplicates and casts types.
- Aggregation: HiveQL queries/views for:
  - Per-customer RFM base numbers (last purchase date, purchase count, total spend) calculated directly via Hive/Spark.
  - Per-category average price/rating/review volume from scraped data.
- Store as ORC or Parquet for efficient downstream reads.

**Acceptance criteria:** `SELECT` queries against `clean_transactions` and the RFM aggregate return correct row counts and no null primary keys; a sample query joining transactions to products by category runs without error.

---

## 4. Module: Spark / PySpark — feature engineering & ML

**Goal:** build the customer feature table and train the models.

**Build (read from Hive tables via Spark SQL):**
- Feature engineering: Recency, Frequency, Monetary, average order value, tenure (days since first purchase), category-level enrichment features joined from the scraped product table (e.g. avg category price trend, avg category rating).
- **Segmentation:** K-Means (Spark MLlib) on standardized RFM features → segment label (e.g. Champions, Loyal, At-Risk, Lost) per customer.
- **CLV prediction:** regression model (Random Forest Regressor or Gradient-Boosted Trees) predicting future spend.
- **Churn prediction:** classification model (Random Forest / GBT Classifier) predicting probability of no purchase in the next N days.
- Evaluate: RMSE/MAE/R² for CLV; F1/AUC for churn. Log metrics to a results file/table.
- Output: a single `customer_predictions` table/DataFrame with `customer_id, segment, predicted_clv, churn_probability`.

**Acceptance criteria:** models train without error on the full feature table; evaluation metrics are logged; `customer_predictions` has one row per customer with no nulls in the four output columns.

---

## 5. Module: HBase serving layer

**Goal:** make per-customer predictions available for low-latency lookup.

**Build:**
- Table `customer_profile`, row key = `customer_id`.
- Column families: `info:` (segment), `pred:` (clv, churn_probability), `meta:` (last_updated).
- Load script: write `customer_predictions` from Spark into HBase (via `happybase` in Python, or Spark-HBase connector).

**Acceptance criteria:** a `get` on a known `customer_id` returns segment, CLV and churn probability; the row count in HBase matches the row count of `customer_predictions`.

---

## 6. Module: Web application

**Goal:** a small web app for lookup + on-demand prediction.

**Build (Flask or Streamlit):**
- Page 1 — **Customer lookup**: enter a customer ID → fetch from HBase → display segment, predicted CLV, churn probability.
- Page 2 — **What-if prediction**: form with RFM-style inputs (recency, frequency, monetary) → call the saved Spark/scikit-learn model (exported via `MLlib` save or `joblib`) → return predicted CLV/churn on the fly.
- Embed or link out to the Tableau/Power BI dashboard (Tableau Public embed code, or Power BI "Publish to web" iframe).

**Acceptance criteria:** both pages return a result for valid input within a few seconds; invalid/missing customer ID shows a clear message instead of an error page.

---

## 7. Module: Dashboard (Tableau / Power BI)

**Goal:** visualize segments, revenue and predictions for a business audience.

**Build:**
- Data source: export `customer_predictions` (joined with the RFM aggregate) from Hive/Spark as CSV/Parquet, connect Tableau/Power BI to that export (not live Hive).
- Views: segment sizes (pie/bar), revenue contribution by segment, retention/cohort trend, predicted vs. actual CLV scatter, top at-risk customers table.

**Acceptance criteria:** dashboard refreshes correctly from the exported file and every planned view renders with real data (no placeholder charts).

---

## 8. Suggested build order

1. Scraper (Module 1) — can be built and run in parallel with everything else.
2. HDFS ingestion (Module 2) once both raw datasets exist.
3. Hive tables (Module 3).
4. Spark features + models (Module 4) — the core deliverable; start early, it will need iteration.
5. HBase load (Module 5).
6. Web app (Module 6) — can be stubbed against sample data before Module 5 is finished.
7. Dashboard (Module 7) — build once `customer_predictions` is stable.

## 9. Environment notes

- Local dev: Docker Compose for HDFS + Hive + HBase (pseudo-distributed), or PySpark alone on Colab/Databricks Community Edition if the Hadoop stack is too heavy to run locally — document this substitution if used.
- Keep raw scraped HTML/JSON as-is in HDFS (don't overwrite between runs) so the scrape is reproducible and auditable.
- All Hive/Spark table and column names should be finalized before Module 6 starts, since the web app and dashboard both depend on that schema.
