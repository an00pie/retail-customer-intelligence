"""
Populate Customer Serving Store with All 5,942 Real Customers from UCI Online Retail II.
Includes:
- Genuine RFM metrics calculated from 1,067,371 transactions.
- Inference through trained K-Means, CLV Regressor, and Churn Classifier.
- Recent itemized transactions per customer for instant sub-millisecond lookup.
"""
import os
import sys
import json
import sqlite3
import time
import numpy as np
import pandas as pd
import joblib
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_CSV = os.path.join(BASE_DIR, "data", "raw", "transactions", "transactions.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
DB_PATH = os.path.join(BASE_DIR, "data", "serving", "customer_profile.db")

def run():
    t0 = time.time()
    print("=" * 65)
    print("Populating Customer Intelligence Serving Store...")
    print("=" * 65)

    if not os.path.exists(RAW_CSV):
        print(f"[ERROR] Raw transactions not found at {RAW_CSV}")
        return

    # Load ML models
    clv_model = joblib.load(os.path.join(MODELS_DIR, "clv_regressor.joblib"))
    churn_model = joblib.load(os.path.join(MODELS_DIR, "churn_classifier.joblib"))
    kmeans = joblib.load(os.path.join(MODELS_DIR, "kmeans_segmentation.joblib"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "rfm_scaler.joblib"))
    with open(os.path.join(MODELS_DIR, "segment_mapping.json")) as f:
        mapping = {int(k): v for k, v in json.load(f).items()}

    print(f"Loaded trained models in {time.time() - t0:.2f}s")

    # Read and aggregate transactions
    print("Reading transaction dataset (1.06M rows)...")
    df = pd.read_csv(RAW_CSV)
    df = df.dropna(subset=["customer_id"])
    df["customer_id"] = df["customer_id"].astype(int).astype(str)
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0)
    df["total"] = df["quantity"] * df["price"]
    df["invoice_date"] = pd.to_datetime(df["invoice_date"])

    max_date = df["invoice_date"].max()
    print(f"Transactions span up to {max_date}")

    # Compute RFM
    print("Computing verified RFM metrics per customer...")
    rfm = df.groupby("customer_id").agg(
        recency=("invoice_date", lambda x: max(0, int((max_date - x.max()).days))),
        frequency=("invoice", "nunique"),
        monetary=("total", lambda x: max(0.0, round(float(x.sum()), 2))),
        tenure=("invoice_date", lambda x: max(0, int((max_date - x.min()).days)))
    ).reset_index()

    rfm["aov"] = (rfm["monetary"] / rfm["frequency"].clip(lower=1)).round(2)

    # ML Inference
    print("Running batch ML inference across 5,942 customer records...")
    rfm_scaled = scaler.transform(np.log1p(rfm[["recency", "frequency", "monetary"]].rename(
        columns={"recency": "recency_days", "monetary": "total_spend"}
    )))
    clusters = kmeans.predict(rfm_scaled)
    rfm["segment"] = [mapping.get(c, "Loyal Customers") for c in clusters]

    features_df = rfm[["recency", "frequency", "monetary", "tenure", "aov"]].rename(columns={
        "recency": "recency_days",
        "monetary": "total_spend",
        "tenure": "tenure_days",
        "aov": "avg_order_value"
    })

    rfm["pred_clv"] = np.maximum(0.0, clv_model.predict(features_df)).round(2)
    rfm["pred_churn"] = np.clip(churn_model.predict_proba(features_df)[:, 1], 0.0, 1.0).round(4)

    # Extract top 5 recent transactions per customer
    print("Extracting recent transaction histories...")
    # Sort by invoice_date descending
    df_sorted = df.sort_values(by="invoice_date", ascending=False)
    # Take first 5 transactions per customer
    tx_grouped = df_sorted.groupby("customer_id").head(5)
    
    tx_by_cust = {}
    for cust_id, group in tx_grouped.groupby("customer_id"):
        tx_list = []
        for _, row in group.iterrows():
            tx_list.append({
                "date": str(row["invoice_date"])[:10],
                "invoice": str(row["invoice"]),
                "stock_code": str(row["stock_code"]),
                "quantity": int(row["quantity"]),
                "unit_price": round(float(row["price"]), 2),
                "total": round(float(row["total"]), 2)
            })
        tx_by_cust[cust_id] = tx_list

    # Initialize SQLite Database
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS customer_profile")
    cursor.execute("""
        CREATE TABLE customer_profile (
            row_key TEXT PRIMARY KEY,
            info_segment TEXT,
            pred_clv REAL,
            pred_churn_probability REAL,
            recency_days INTEGER,
            frequency INTEGER,
            monetary REAL,
            tenure_days INTEGER,
            avg_order_value REAL,
            transactions_json TEXT,
            meta_last_updated TEXT
        )
    """)

    now_iso = datetime.now(timezone.utc).isoformat()
    records = []
    for _, row in rfm.iterrows():
        cid = str(row["customer_id"])
        tx_json = json.dumps(tx_by_cust.get(cid, []))
        records.append((
            cid,
            row["segment"],
            float(row["pred_clv"]),
            float(row["pred_churn"]),
            int(row["recency"]),
            int(row["frequency"]),
            float(row["monetary"]),
            int(row["tenure"]),
            float(row["aov"]),
            tx_json,
            now_iso
        ))

    print(f"Inserting {len(records)} verified customer records into SQLite...")
    cursor.executemany("""
        INSERT INTO customer_profile (
            row_key, info_segment, pred_clv, pred_churn_probability,
            recency_days, frequency, monetary, tenure_days, avg_order_value,
            transactions_json, meta_last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_row_key ON customer_profile(row_key)")
    conn.commit()

    total_rows = cursor.execute("SELECT COUNT(*) FROM customer_profile").fetchone()[0]
    conn.close()

    db_size_kb = os.path.getsize(DB_PATH) / 1024
    print(f"[SUCCESS] {total_rows} customer profiles loaded in {time.time() - t0:.2f}s!")
    print(f"Database size: {db_size_kb:.1f} KB at {DB_PATH}")

if __name__ == "__main__":
    run()
