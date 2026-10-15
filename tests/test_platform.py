"""
Unit & Integration Test Suite for Customer Intelligence Platform.
Covers backend APIs, data integrity, error handling, security, and edge cases.
"""
import unittest
import json
from web.app import app

class CustomerPlatformTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_homepage(self):
        """Verify homepage renders successfully with HTTP 200."""
        response = self.app.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.data.decode("utf-8")
        self.assertIn("Customer Intelligence", html)
        self.assertIn("Command Center", html)

    def test_health_api(self):
        """Verify system health endpoint and operational metadata."""
        response = self.app.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "operational")
        self.assertGreaterEqual(data["serving_records"], 5000)
        self.assertIn("serving_backend", data)
        self.assertIn("warehouse_status", data)
        self.assertIn("model_engine", data)

    def test_valid_customer_lookup(self):
        """Verify valid customer 15485 returns genuine metrics and transactions."""
        response = self.app.get("/api/customer/15485")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["customer_id"], "15485")
        self.assertIn("segment", data)
        self.assertGreater(data["predicted_clv"], 0)
        self.assertGreaterEqual(data["churn_probability"], 0.0)
        self.assertLessEqual(data["churn_probability"], 1.0)
        self.assertIn("transactions", data)
        self.assertIsInstance(data["transactions"], list)
        self.assertGreater(len(data["transactions"]), 0)

    def test_unknown_customer_lookup(self):
        """Verify unknown customer returns honest 404 without synthetic fabrication."""
        response = self.app.get("/api/customer/99999999")
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertEqual(data["customer_id"], "99999999")

    def test_malformed_customer_id(self):
        """Verify malformed customer IDs return 400 Bad Request."""
        for bad_id in ["   ", "<script>alert(1)</script>", "cust/evil", "cust;drop"]:
            response = self.app.get(f"/api/customer/{bad_id}")
            self.assertEqual(response.status_code, 400, f"Failed for {bad_id}")
            data = json.loads(response.data)
            self.assertIn("error", data)

    def test_valid_prediction(self):
        """Verify POST /api/predict produces bounded inference."""
        payload = {
            "recency_days": 25,
            "frequency": 6,
            "total_spend": 1250.0,
            "tenure_days": 300
        }
        response = self.app.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("segment", data)
        self.assertGreater(data["predicted_clv"], 0)
        self.assertGreaterEqual(data["churn_probability"], 0.0)
        self.assertLessEqual(data["churn_probability"], 1.0)
        self.assertEqual(data["recency_days"], 25)
        self.assertEqual(data["frequency"], 6)

    def test_invalid_prediction_payloads(self):
        """Verify invalid prediction inputs return 400 Bad Request."""
        # Non-numeric input
        res = self.app.post("/api/predict", json={"recency_days": "invalid_number"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Feature values must be valid numbers", json.loads(res.data)["error"])

        # Negative values
        res = self.app.post("/api/predict", json={"frequency": -5})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Feature values must be non-negative", json.loads(res.data)["error"])

        # Frequency = 0 rejected (must be >= 1)
        res = self.app.post("/api/predict", json={"frequency": 0, "recency_days": 10, "total_spend": 100})
        self.assertEqual(res.status_code, 400)
        self.assertIn("frequency must be >= 1", json.loads(res.data)["error"])

        # Non-JSON content type
        res = self.app.post("/api/predict", data="plain text", content_type="text/plain")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Request must have Content-Type: application/json", json.loads(res.data)["error"])

    def test_boundary_prediction_zero_values(self):
        """Verify POST /api/predict accepts valid zero values for recency, spend, and tenure with freq >= 1."""
        payload = {
            "recency_days": 0,
            "frequency": 1,
            "total_spend": 0.0,
            "tenure_days": 0
        }
        res = self.app.post("/api/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("segment", data)
        self.assertEqual(data["recency_days"], 0)
        self.assertEqual(data["frequency"], 1)
        self.assertEqual(data["monetary"], 0.0)
        self.assertEqual(data["tenure_days"], 0)

    def test_analytics_revenue_orders(self):
        """Verify trajectory analytics across multiple time aggregations."""
        for period in ["12m", "6m", "all", "90d", "30d", "7d"]:
            res = self.app.get(f"/api/analytics/revenue-orders?period={period}")
            self.assertEqual(res.status_code, 200, f"Failed for period {period}")
            data = json.loads(res.data)
            self.assertIn("revenue", data)
            self.assertIn("orders", data)
            self.assertGreater(len(data["labels"]), 0)
            self.assertGreater(data["total_revenue"], 0)

    def test_prediction_feature_aliases(self):
        """Verify POST /api/predict correctly parses alternate parameter aliases (recency, monetary, freq)."""
        payload = {
            "recency": 15,
            "freq": 12,
            "monetary": 4500.0,
            "tenure": 250
        }
        response = self.app.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["recency_days"], 15)
        self.assertEqual(data["frequency"], 12)
        self.assertEqual(data["monetary"], 4500.0)
        self.assertEqual(data["tenure_days"], 250)
        self.assertEqual(data["segment"], "Champions")

    def test_multi_segment_customer_lookup(self):
        """Verify looking up customers from all 4 known segments in the database."""
        test_accounts = {
            "15485": "Champions",
            "13748": "At-Risk",
            "12364": "Loyal Customers",
            "16964": "Lost / Churned"
        }
        for cust_id, expected_seg in test_accounts.items():
            res = self.app.get(f"/api/customer/{cust_id}")
            self.assertEqual(res.status_code, 200, f"Customer {cust_id} failed")
            profile = json.loads(res.data)
            self.assertEqual(profile["customer_id"], cust_id)
            self.assertEqual(profile["segment"], expected_seg)
            self.assertGreaterEqual(profile["churn_probability"], 0.0)
            self.assertLessEqual(profile["churn_probability"], 1.0)

    def test_cors_headers(self):
        """Verify CORS headers are present on API responses."""
        res = self.app.get("/api/health")
        self.assertEqual(res.headers.get("Access-Control-Allow-Origin"), "*")
        self.assertIn("GET", res.headers.get("Access-Control-Allow-Methods", ""))

    def test_evaluation_metrics_api(self):
        """Verify model evaluation benchmark metrics endpoint."""
        res = self.app.get("/api/metrics")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("clv_regression", data)
        self.assertIn("churn_classification", data)

    def test_customer_csv_export_valid(self):
        """Verify GET /api/customer/15485/export/csv returns valid CSV ledger with correct headers."""
        res = self.app.get("/api/customer/15485/export/csv")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("Content-Type", ""))
        self.assertIn('attachment; filename="customer_15485_ledger.csv"', res.headers.get("Content-Disposition", ""))
        csv_text = res.data.decode("utf-8")
        self.assertTrue(csv_text.startswith("\ufeffDate,Invoice,StockCode,Quantity,UnitPrice,Total,CustomerID,Segment"))
        self.assertIn("15485", csv_text)
        self.assertIn("Champions", csv_text)
        # Check rows count (header + transactions)
        rows = [r for r in csv_text.strip().split("\n") if r.strip()]
        self.assertGreaterEqual(len(rows), 2)

    def test_customer_csv_export_404(self):
        """Verify GET /api/customer/99999999/export/csv returns honest 404 for unknown customer."""
        res = self.app.get("/api/customer/99999999/export/csv")
        self.assertEqual(res.status_code, 404)
        data = json.loads(res.data)
        self.assertIn("error", data)

    def test_segments_csv_export(self):
        """Verify GET /api/analytics/segments/export/csv returns all 4 K-Means cohorts."""
        res = self.app.get("/api/analytics/segments/export/csv")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("Content-Type", ""))
        self.assertIn('customer_segmentation_cohorts_summary.csv', res.headers.get("Content-Disposition", ""))
        csv_text = res.data.decode("utf-8")
        self.assertIn("ClusterID,SegmentName,MeanRecencyDays", csv_text)
        self.assertIn("Champions", csv_text)
        self.assertIn("Loyal Customers", csv_text)
        self.assertIn("At-Risk", csv_text)
        self.assertIn("Lost / Churned", csv_text)
        rows = [r for r in csv_text.strip().split("\n") if r.strip()]
        self.assertEqual(len(rows), 5)  # Header + 4 clusters

    def test_csv_formula_sanitization(self):
        """Verify formula characters are escaped with leading quote while numbers remain unaffected."""
        from web.app import sanitize_csv_value
        # Numbers should not be altered
        self.assertEqual(sanitize_csv_value(50.25), 50.25)
        self.assertEqual(sanitize_csv_value(-12.5), -12.5)
        self.assertEqual(sanitize_csv_value("100"), "100")
        self.assertEqual(sanitize_csv_value("-450"), "-450")
        # Formula injection strings should be neutralized
        self.assertEqual(sanitize_csv_value("=1+1"), "'=1+1")
        self.assertEqual(sanitize_csv_value("@SUM(A1:A10)"), "'@SUM(A1:A10)")
        self.assertEqual(sanitize_csv_value("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0")
        self.assertEqual(sanitize_csv_value("-not-a-number"), "'-not-a-number")

    def test_authoritative_cohort_counts(self):
        """Verify calculated cohort metrics match authoritative customer records (1,187 Loyal Customers out of 5,942 total)."""
        res = self.app.get("/api/analytics/cohorts")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["total_customers"], 5942)
        cohorts = data["cohorts"]
        self.assertEqual(cohorts["Loyal Customers"]["count"], 1187)
        self.assertEqual(cohorts["Loyal Customers"]["percentage"], 20.0)
        self.assertEqual(cohorts["Champions"]["count"], 1242)
        self.assertEqual(cohorts["Champions"]["percentage"], 20.9)
        self.assertEqual(cohorts["At-Risk"]["count"], 1476)
        self.assertEqual(cohorts["At-Risk"]["percentage"], 24.8)
        self.assertEqual(cohorts["Lost / Churned"]["count"], 2037)
        self.assertEqual(cohorts["Lost / Churned"]["percentage"], 34.3)
        # Assert the sum of counts equals total_customers
        total_calculated = sum(c["count"] for c in cohorts.values())
        self.assertEqual(total_calculated, 5942)

if __name__ == "__main__":
    unittest.main()
