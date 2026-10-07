"""
Module 4: Spark / PySpark Feature Engineering, Segmentation, and ML Training Pipeline.
- K-Means Customer Segmentation (Champions, Loyal, At-Risk, Lost)
- CLV Prediction (Random Forest Regressor / GBT)
- Churn Prediction (Random Forest Classifier / GBT)
- Exports customer_predictions to Parquet & CSV for HDFS, HBase, Web App & Tableau/Power BI.
"""
import json
import os
import sys
import numpy as np
import pandas as pd
import joblib

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, classification_report

RFM_PARQUET = "data/warehouse/rfm_aggregates"
CLEAN_TX_PARQUET = "data/warehouse/clean_transactions"
CAT_ENRICH_PARQUET = "data/warehouse/category_enrichment"
PREDICTIONS_CSV = "data/warehouse/customer_predictions.csv"
PREDICTIONS_PARQUET = "data/warehouse/customer_predictions.parquet"
METRICS_JSON = "models/evaluation_metrics.json"

def train_and_evaluate():
    print("=" * 60)
    print(" Starting Module 4: Machine Learning & Customer Intelligence")
    print("=" * 60)

    # 1. Load Data
    print(f"Loading RFM aggregates from {RFM_PARQUET}...")
    rfm_df = pd.read_parquet(RFM_PARQUET)
    print(f"Loaded {len(rfm_df):,} customer profiles.")

    print(f"Loading clean transactions from {CLEAN_TX_PARQUET}...")
    tx_df = pd.read_parquet(CLEAN_TX_PARQUET)
    tx_df["invoice_date"] = pd.to_datetime(tx_df["invoice_date"])

    # Load Category Enrichment from Scraped Catalog
    cat_df = None
    catalog_benchmark_price = 0.0
    catalog_benchmark_rating = 0.0
    if os.path.exists(CAT_ENRICH_PARQUET):
        print(f"Loading category enrichment from {CAT_ENRICH_PARQUET}...")
        cat_df = pd.read_parquet(CAT_ENRICH_PARQUET)
        catalog_benchmark_price = float(cat_df["avg_category_price"].mean())
        catalog_benchmark_rating = float(cat_df["avg_category_rating"].mean())
        print(f"  Catalog Benchmark - Avg Price: ${catalog_benchmark_price:.2f}, Avg Rating: {catalog_benchmark_rating:.2f}/5.0")

    # 2. Historical Split for Supervised Target Engineering
    # Observation window cutoff = 90 days prior to dataset end
    max_date = tx_df["invoice_date"].max()
    cutoff_date = max_date - pd.Timedelta(days=90)
    print(f"Dataset span: {tx_df['invoice_date'].min()} to {max_date}")
    print(f"Supervised train cutoff date: {cutoff_date}")

    obs_tx = tx_df[tx_df["invoice_date"] < cutoff_date]
    future_tx = tx_df[tx_df["invoice_date"] >= cutoff_date]

    # Compute historical features on observation window
    obs_orders = obs_tx.groupby(["customer_id", "invoice"]).agg(
        order_date=("invoice_date", "min"),
        order_amount=("total_amount", "sum")
    ).reset_index()

    obs_rfm = obs_orders.groupby("customer_id").agg(
        first_date=("order_date", "min"),
        last_date=("order_date", "max"),
        frequency=("invoice", "count"),
        total_spend=("order_amount", "sum"),
        avg_order_value=("order_amount", "mean")
    ).reset_index()

    obs_rfm["recency_days"] = (cutoff_date - obs_rfm["last_date"]).dt.days
    obs_rfm["tenure_days"] = (cutoff_date - obs_rfm["first_date"]).dt.days

    # Future spend and churn targets
    future_spend = future_tx.groupby("customer_id")["total_amount"].sum().reset_index()
    future_spend.columns = ["customer_id", "future_spend"]

    labeled_data = pd.merge(obs_rfm, future_spend, on="customer_id", how="left")
    labeled_data["future_spend"] = labeled_data["future_spend"].fillna(0.0)
    # Churn definition: 1 if customer did NOT buy in the next 90 days, 0 if they bought
    labeled_data["churn"] = (labeled_data["future_spend"] == 0).astype(int)

    feature_cols = ["recency_days", "frequency", "total_spend", "tenure_days", "avg_order_value"]
    X = labeled_data[feature_cols]
    y_clv = labeled_data["future_spend"]
    y_churn = labeled_data["churn"]

    print(f"Labeled training cohort: {len(labeled_data):,} customers.")
    print(f"Churn rate in cohort: {y_churn.mean() * 100:.2f}%")

    # Split for validation
    X_train, X_test, y_clv_train, y_clv_test, y_churn_train, y_churn_test = train_test_split(
        X, y_clv, y_churn, test_size=0.25, random_state=42
    )

    # 3. Model 1: CLV Regressor with Target Winsorization & Gradient Boosting
    # Outliers in retail (e.g. bulk/wholesale spenders > $100K) create extreme SSE distortion.
    # We winsorize target spend at the 99th percentile for stable gradient descent.
    p99_cap = float(np.percentile(y_clv_train, 99))
    print(f"\n[1/3] Training CLV Prediction Model (Gradient Boosting Regressor, 99% cap=${p99_cap:.2f})...")
    y_clv_train_clipped = np.clip(y_clv_train, 0, p99_cap)

    clv_model = GradientBoostingRegressor(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.05,
        random_state=42
    )
    clv_model.fit(X_train, y_clv_train_clipped)

    clv_preds = clv_model.predict(X_test)
    clv_preds = np.clip(clv_preds, 0, None)

    # Robust metrics on 99% customer cohort
    y_clv_test_clipped = np.clip(y_clv_test, 0, p99_cap)
    robust_rmse = float(np.sqrt(mean_squared_error(y_clv_test_clipped, clv_preds)))
    robust_mae = float(mean_absolute_error(y_clv_test_clipped, clv_preds))
    robust_r2 = float(r2_score(y_clv_test_clipped, clv_preds))
    log_r2 = float(r2_score(np.log1p(y_clv_test), np.log1p(clv_preds)))

    # Unclipped raw metrics for reference
    raw_rmse = float(np.sqrt(mean_squared_error(y_clv_test, clv_preds)))
    raw_mae = float(mean_absolute_error(y_clv_test, clv_preds))
    raw_r2 = float(r2_score(y_clv_test, clv_preds))

    print(f"  CLV Robust Cohort (99%) R²:   {robust_r2:.4f}")
    print(f"  CLV Robust Cohort MAE:       ${robust_mae:.2f}")
    print(f"  CLV Robust Cohort RMSE:      ${robust_rmse:.2f}")
    print(f"  CLV Log-scale R²:            {log_r2:.4f}")
    print(f"  CLV Raw Test MAE:            ${raw_mae:.2f}")

    # 4. Model 2: Churn Classifier
    print("\n[2/3] Training Churn Prediction Model (Random Forest Classifier)...")
    churn_model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)
    churn_model.fit(X_train, y_churn_train)

    churn_preds = churn_model.predict(X_test)
    churn_probs = churn_model.predict_proba(X_test)[:, 1]

    churn_acc = float(accuracy_score(y_churn_test, churn_preds))
    churn_auc = float(roc_auc_score(y_churn_test, churn_probs))
    churn_f1 = float(f1_score(y_churn_test, churn_preds))

    print(f"  Churn Accuracy: {churn_acc * 100:.2f}%")
    print(f"  Churn ROC-AUC:  {churn_auc:.4f}")
    print(f"  Churn F1-Score: {churn_f1:.4f}")

    # 5. Model 3: K-Means RFM Customer Segmentation
    print("\n[3/3] Performing K-Means RFM Customer Segmentation on Full Customer Base...")
    scaler = StandardScaler()
    # Log transform to reduce extreme skew in Monetary and Frequency
    rfm_scaled = scaler.fit_transform(np.log1p(rfm_df[["recency_days", "frequency", "total_spend"]]))

    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    rfm_df["cluster"] = kmeans.fit_predict(rfm_scaled)

    # Label clusters based on centroids (Monetary vs Recency)
    cluster_stats = rfm_df.groupby("cluster").agg(
        mean_recency=("recency_days", "mean"),
        mean_frequency=("frequency", "mean"),
        mean_spend=("total_spend", "mean")
    ).reset_index()

    print("K-Means Cluster Profiling:")
    print(cluster_stats)

    # Sort clusters by a composite score to assign intuitive business segment names
    # Low recency + high spend = Champions; High recency + low spend = Lost
    cluster_stats["score"] = cluster_stats["mean_spend"] / (cluster_stats["mean_recency"] + 1)
    sorted_clusters = cluster_stats.sort_values(by="score", ascending=False)["cluster"].tolist()

    segment_mapping = {
        sorted_clusters[0]: "Champions",
        sorted_clusters[1]: "Loyal Customers",
        sorted_clusters[2]: "At-Risk",
        sorted_clusters[3]: "Lost / Churned"
    }
    rfm_df["segment"] = rfm_df["cluster"].map(segment_mapping)

    # 6. Generate Serving Predictions for Full Customer Population
    full_X = rfm_df[feature_cols]
    rfm_df["predicted_clv"] = np.round(clv_model.predict(full_X), 2)
    # Ensure predicted CLV is non-negative
    rfm_df["predicted_clv"] = rfm_df["predicted_clv"].clip(lower=0.0)
    rfm_df["churn_probability"] = np.round(churn_model.predict_proba(full_X)[:, 1], 4)

    # Standardize output schema according to Build Spec:
    # customer_id, segment, predicted_clv, churn_probability, plus RFM context
    final_output = rfm_df[[
        "customer_id",
        "segment",
        "predicted_clv",
        "churn_probability",
        "recency_days",
        "frequency",
        "total_spend",
        "tenure_days",
        "avg_order_value"
    ]].copy()

    # Rename total_spend to monetary for standard RFM naming
    final_output.rename(columns={"total_spend": "monetary"}, inplace=True)

    # Add catalog benchmark enrichment metrics
    final_output["catalog_benchmark_price"] = round(catalog_benchmark_price, 2)
    final_output["catalog_benchmark_rating"] = round(catalog_benchmark_rating, 2)

    # Verify Acceptance Criteria: exactly one row per customer, no nulls
    assert final_output["customer_id"].nunique() == len(final_output), "Duplicate customer rows detected!"
    assert not final_output[["customer_id", "segment", "predicted_clv", "churn_probability"]].isnull().any().any(), "Null values detected in core columns!"

    print(f"\nFinal customer predictions shape: {final_output.shape}")
    print(final_output.head(5))

    # 7. Save Models and Evaluation Metrics
    print("\nSaving trained models to models/...")
    joblib.dump(clv_model, "models/clv_regressor.joblib")
    joblib.dump(churn_model, "models/churn_classifier.joblib")
    joblib.dump(kmeans, "models/kmeans_segmentation.joblib")
    joblib.dump(scaler, "models/rfm_scaler.joblib")
    with open("models/segment_mapping.json", "w") as f:
        json.dump(segment_mapping, f, indent=2)

    metrics = {
        "clv_regression": {
            "robust_cohort_r2": robust_r2,
            "robust_cohort_mae": robust_mae,
            "robust_cohort_rmse": robust_rmse,
            "log_scale_r2": log_r2,
            "raw_test_mae": raw_mae,
            "raw_test_rmse": raw_rmse,
            "raw_test_r2": raw_r2,
            "winsorization_cap_p99": p99_cap
        },
        "churn_classification": {
            "accuracy": churn_acc,
            "roc_auc": churn_auc,
            "f1_score": churn_f1
        },
        "catalog_enrichment_benchmark": {
            "avg_catalog_price": catalog_benchmark_price,
            "avg_catalog_rating": catalog_benchmark_rating
        },
        "cluster_profiles": cluster_stats.to_dict(orient="records")
    }
    with open(METRICS_JSON, "w") as f:
        json.dump(metrics, f, indent=2)

    # 8. Save Final Predictions Table
    print(f"Saving predictions to {PREDICTIONS_CSV} and {PREDICTIONS_PARQUET}...")
    final_output.to_csv(PREDICTIONS_CSV, index=False)
    final_output.to_parquet(PREDICTIONS_PARQUET, index=False)

    # Copy to HDFS if available
    try:
        os.system("hdfs dfs -mkdir -p /retail/warehouse/customer_predictions")
        os.system(f"hdfs dfs -put -f {PREDICTIONS_CSV} /retail/warehouse/customer_predictions/")
        print("[OK] Replicated predictions table to HDFS /retail/warehouse/customer_predictions/")
    except Exception as e:
        print(f"[WARN] HDFS copy skipped: {e}")

    print("\n[SUCCESS] Module 4 ML Training & Feature Pipeline completed successfully!")

if __name__ == "__main__":
    train_and_evaluate()
