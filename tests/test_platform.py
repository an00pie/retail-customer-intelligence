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

        # Non-JSON content type
        res = self.app.post("/api/predict", data="plain text", content_type="text/plain")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Request must have Content-Type: application/json", json.loads(res.data)["error"])

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

    def test_evaluation_metrics_api(self):
        """Verify model evaluation benchmark metrics endpoint."""
        res = self.app.get("/api/metrics")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("clv_regression", data)
        self.assertIn("churn_classification", data)

if __name__ == "__main__":
    unittest.main()
