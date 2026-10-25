"""
Model Parity and Compatibility Regression Tests for INSIGHT.arc.

Protects against silent drift, version incompatibilities, and regression in
the four customer intelligence models:
- models/clv_regressor.joblib (GradientBoostingRegressor)
- models/churn_classifier.joblib (RandomForestClassifier)
- models/kmeans_segmentation.joblib (KMeans)
- models/rfm_scaler.joblib (StandardScaler)

Note:
The 5 baseline cohorts tested represent key customer behavioral profiles:
1. Champions
2. Loyal Customers
3. At-Risk
4. Lost / Churned
5. Boundary Zero (minimum valid input)

These cases establish an explicit numerical baseline to guard against regression
and version mismatches. While they protect these tested profiles, they do not
constitute mathematical proof of universal parity across all possible inputs.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, NamedTuple
import unittest
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.exceptions import InconsistentVersionWarning

from web.app import predict_customer

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"


class BaselineCohort(NamedTuple):
    name: str
    recency_days: int
    frequency: int
    total_spend: float
    tenure_days: int
    avg_order_value: float
    expected_cluster: int
    expected_segment: str
    expected_clv_raw: float
    expected_churn_raw: float
    expected_clv_app: float
    expected_churn_app: float


# Documented numerical baseline established during Phase 2 investigation
BASELINE_COHORTS: list[BaselineCohort] = [
    BaselineCohort(
        name="Champions",
        recency_days=10,
        frequency=25,
        total_spend=12000.0,
        tenure_days=400,
        avg_order_value=480.0,
        expected_cluster=2,
        expected_segment="Champions",
        expected_clv_raw=2927.885764,
        expected_churn_raw=0.068369,
        expected_clv_app=2927.89,
        expected_churn_app=0.0684,
    ),
    BaselineCohort(
        name="Loyal Customers",
        recency_days=25,
        frequency=5,
        total_spend=900.0,
        tenure_days=200,
        avg_order_value=180.0,
        expected_cluster=0,
        expected_segment="Loyal Customers",
        expected_clv_raw=330.120031,
        expected_churn_raw=0.251355,
        expected_clv_app=330.12,
        expected_churn_app=0.2514,
    ),
    BaselineCohort(
        name="At-Risk",
        recency_days=180,
        frequency=6,
        total_spend=2200.0,
        tenure_days=350,
        avg_order_value=366.67,
        expected_cluster=3,
        expected_segment="At-Risk",
        expected_clv_raw=553.790639,
        expected_churn_raw=0.372953,
        expected_clv_app=553.79,
        expected_churn_app=0.373,
    ),
    BaselineCohort(
        name="Lost / Churned",
        recency_days=400,
        frequency=1,
        total_spend=250.0,
        tenure_days=410,
        avg_order_value=250.0,
        expected_cluster=1,
        expected_segment="Lost / Churned",
        expected_clv_raw=42.416452,
        expected_churn_raw=0.891869,
        expected_clv_app=42.42,
        expected_churn_app=0.8919,
    ),
    BaselineCohort(
        name="Boundary Zero",
        recency_days=0,
        frequency=1,
        total_spend=0.0,
        tenure_days=0,
        avg_order_value=0.0,
        expected_cluster=0,
        expected_segment="Loyal Customers",
        expected_clv_raw=360.130644,
        expected_churn_raw=0.535363,
        expected_clv_app=360.13,
        expected_churn_app=0.5354,
    ),
]


class ModelParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Load all model artifacts and capture any deserialization warnings."""
        with warnings.catch_warnings(record=True) as recorded:
            warnings.simplefilter("always")
            cls.clv_model = joblib.load(MODELS_DIR / "clv_regressor.joblib")
            cls.churn_model = joblib.load(MODELS_DIR / "churn_classifier.joblib")
            cls.kmeans_model = joblib.load(MODELS_DIR / "kmeans_segmentation.joblib")
            cls.rfm_scaler = joblib.load(MODELS_DIR / "rfm_scaler.joblib")
            with open(MODELS_DIR / "segment_mapping.json") as f:
                cls.segment_mapping = {int(k): v for k, v in json.load(f).items()}

            cls.deserialization_warnings = [
                w for w in recorded if issubclass(w.category, InconsistentVersionWarning)
            ]

    def test_zero_inconsistent_version_warnings_on_load(self):
        """Verify that restored model artifacts load cleanly without InconsistentVersionWarning."""
        self.assertEqual(
            self.deserialization_warnings,
            [],
            f"Expected 0 InconsistentVersionWarnings, got: {self.deserialization_warnings}",
        )

    def test_raw_estimator_prediction_parity(self):
        """Verify raw estimator calculations match baseline within strict floating tolerance (1e-4)."""
        tolerance = 1e-4

        for cohort in BASELINE_COHORTS:
            with self.subTest(cohort=cohort.name):
                # 1. K-Means Segmentation
                rfm_input = pd.DataFrame(
                    [[float(cohort.recency_days), float(cohort.frequency), float(cohort.total_spend)]],
                    columns=["recency_days", "frequency", "total_spend"],
                )
                rfm_scaled = self.rfm_scaler.transform(np.log1p(rfm_input))
                cluster_id = int(self.kmeans_model.predict(rfm_scaled)[0])
                segment = self.segment_mapping.get(cluster_id)

                self.assertEqual(cluster_id, cohort.expected_cluster)
                self.assertEqual(segment, cohort.expected_segment)

                # 2. Features for CLV & Churn
                features_df = pd.DataFrame([{
                    "recency_days": float(cohort.recency_days),
                    "frequency": float(cohort.frequency),
                    "total_spend": float(cohort.total_spend),
                    "tenure_days": float(cohort.tenure_days),
                    "avg_order_value": float(cohort.avg_order_value),
                }])

                # 3. CLV Regression
                clv_pred = float(self.clv_model.predict(features_df)[0])
                self.assertAlmostEqual(
                    clv_pred,
                    cohort.expected_clv_raw,
                    delta=tolerance,
                    msg=f"CLV prediction mismatch for {cohort.name}",
                )

                # 4. Churn Probability
                churn_prob = float(self.churn_model.predict_proba(features_df)[0, 1])
                self.assertAlmostEqual(
                    churn_prob,
                    cohort.expected_churn_raw,
                    delta=tolerance,
                    msg=f"Churn probability mismatch for {cohort.name}",
                )

    def test_application_inference_path_parity(self):
        """Verify the full web/app predict_customer inference pipeline produces exact expected outputs."""
        for cohort in BASELINE_COHORTS:
            with self.subTest(cohort=cohort.name):
                result = predict_customer(
                    recency_days=cohort.recency_days,
                    frequency=cohort.frequency,
                    total_spend=cohort.total_spend,
                    tenure_days=cohort.tenure_days,
                )

                self.assertEqual(result.get("inference_status"), "available")
                self.assertEqual(result.get("segment"), cohort.expected_segment)
                self.assertEqual(result.get("predicted_clv"), cohort.expected_clv_app)
                self.assertEqual(result.get("churn_probability"), cohort.expected_churn_app)


if __name__ == "__main__":
    unittest.main()
