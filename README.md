# Customer Intelligence Platform for Retail

A Big Data-driven CLV (Customer Lifetime Value) prediction and RFM customer segmentation platform, enriched with scraped retail catalog data. Built according to [Implementation_Plan.md](file:///home/an00pie/Documents/da_project/Implementation_Plan%20%281%29.md).

---

## 🏛️ Architecture Overview

```
[A] UCI Online Retail II (1.06M rows)        [B] Web Scraper (Product & Review Data)
                  \                                       /
                   \-------------------------------------/
                                      v
                                HDFS Raw Zone
                    (/retail/raw/transactions/ & /products/)
                                      v
                             Hive / Warehouse Layer
                      (805K clean rows, 5,878 RFM profiles)
                                      v
                              Spark / ML Pipeline
                    (K-Means, Random Forest CLV, Churn GBT)
                                      v
                             HBase Serving Layer
                     (Low-latency customer profile lookup)
                                      v
                         Interactive Web App & BI Hub
                    (Streamlit UI + Tableau/Power BI Export)
```

---

## 🚀 Quick Start Guide

### 1. Environment Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Module 1: Web Scraper
Scrapes product categories, ratings, reviews, and prices into timestamped partitions:
```bash
python3 scraper/run_scraper.py --categories 5
```
Output: `data/raw/products/<YYYY-MM-DD>/products.csv` and `products.json`.

### 3. Run Module 2: HDFS Ingestion
Starts HDFS daemons and lands both datasets unmodified into HDFS:
```bash
./hdfs/ingest_to_hdfs.sh
```
HDFS paths:
- `/retail/raw/transactions/transactions.csv`
- `/retail/raw/products/<YYYY-MM-DD>/products.csv`

### 4. Run Module 3: Hive & Data Cleaning Layer
Executes schema validation, removes cancellations and null customers, and builds RFM aggregates:
```bash
python3 hive/run_hive_pipeline.py
```
Outputs:
- `data/warehouse/clean_transactions` (Parquet)
- `data/warehouse/rfm_aggregates` (Parquet)
- `data/warehouse/category_enrichment` (Parquet)

### 5. Run Module 4: Spark ML Models & Predictions
Trains K-Means RFM segmentation, Random Forest CLV Regressor, and Churn Classifier:
```bash
python3 spark/train_models.py
```
Outputs:
- Models saved in `models/`
- Full prediction table saved to `data/warehouse/customer_predictions.csv` & HDFS.

### 6. Run Module 5: Populate HBase Serving Layer
Loads customer profiles into the low-latency serving store:
```bash
python3 hbase/load_hbase.py
```

### 7. Run Module 6 & 7: Web Application & BI Dashboard
Launches the interactive DashFlow-redesigned UI & serving API:
```bash
python3 web/app.py
# Or via Streamlit:
streamlit run web/app.py
```
Open your browser at `http://localhost:8501`.

---

## 📊 Modules & Acceptance Criteria

| Module | Purpose | Status | Key Deliverables |
|---|---|---|---|
| **1. Scraper** | Product enrichment | ✅ Verified | [scraper/spider.py](file:///home/an00pie/Documents/da_project/scraper/spider.py), `products.csv` |
| **2. HDFS Ingest** | Raw landing zone | ✅ Verified | [hdfs/ingest_to_hdfs.sh](file:///home/an00pie/Documents/da_project/hdfs/ingest_to_hdfs.sh), HDFS `/retail/raw/` |
| **3. Hive Layer** | Cleaning & Aggregation | ✅ Verified | [hive/schema.sql](file:///home/an00pie/Documents/da_project/hive/schema.sql), [hive/run_hive_pipeline.py](file:///home/an00pie/Documents/da_project/hive/run_hive_pipeline.py) |
| **4. Spark ML** | RFM, CLV, Churn models | ✅ Verified | [spark/train_models.py](file:///home/an00pie/Documents/da_project/spark/train_models.py), `customer_predictions` |
| **5. HBase Serving** | Low-latency lookup | ✅ Verified | [hbase/serving.py](file:///home/an00pie/Documents/da_project/hbase/serving.py), [hbase/load_hbase.py](file:///home/an00pie/Documents/da_project/hbase/load_hbase.py) |
| **6. Web App** | Lookup & What-if UI | ✅ Verified | [web/app.py](file:///home/an00pie/Documents/da_project/web/app.py) (Running on `:8501`) |
| **7. Dashboard** | Tableau / Power BI | ✅ Verified | Embedded charts + `customer_predictions.csv` export |
