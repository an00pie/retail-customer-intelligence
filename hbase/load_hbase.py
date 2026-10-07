"""
Loader script for Module 5: HBase Serving Layer.
Loads data/warehouse/customer_predictions.parquet into the customer_profile serving table.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pandas as pd
from hbase.serving import CustomerServingLayer

PREDICTIONS_PATH = "data/warehouse/customer_predictions.parquet"

def load_predictions_to_serving():
    if not os.path.exists(PREDICTIONS_PATH):
        print(f"Error: {PREDICTIONS_PATH} does not exist. Run Module 4 first.")
        sys.exit(1)

    print(f"Reading {PREDICTIONS_PATH}...")
    df = pd.read_parquet(PREDICTIONS_PATH)
    total_rows = len(df)
    print(f"Loading {total_rows:,} customer prediction records into serving layer...")

    serving = CustomerServingLayer()
    records = df.to_dict(orient="records")

    # High-throughput batch population
    serving.put_customers_batch(records)
    print(f"  Batch loaded {total_rows:,} customer records.")

    final_count = serving.count()
    print(f"\n[SUCCESS] Serving layer populated with {final_count:,} records.")

    # Verification test (Acceptance Criteria)
    test_id = str(records[0]["customer_id"])
    sample = serving.get_customer(test_id)
    print(f"\n[VERIFY] Sample lookup test for customer_id '{test_id}':")
    print(sample)
    assert sample is not None, "Lookup returned None for existing customer!"
    assert "segment" in sample and "predicted_clv" in sample and "churn_probability" in sample
    assert final_count == total_rows, f"Serving count {final_count} does not match predictions count {total_rows}!"
    print("[ACCEPTANCE CRITERIA MET] HBase serving layer verified.")

if __name__ == "__main__":
    load_predictions_to_serving()
