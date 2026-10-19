"""
Comprehensive Unit & Integration Test Suite for API v1 Endpoints.
Covers authentication, paginated customer queries, ML inference,
dataset imports, simulator persistence, and retention recommendations.
"""
import unittest
import json
import io
from web.app import app

class ApiV1TestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_auth_flow(self):
        # 1. Login with demo credentials
        res = self.app.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("token", data)
        self.assertEqual(data["user"]["username"], "admin")
        token = data["token"]

        # 2. Check /auth/me with Bearer token
        res_me = self.app.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_me.status_code, 200)
        data_me = json.loads(res_me.data)
        self.assertTrue(data_me["authenticated"])
        self.assertEqual(data_me["user"]["username"], "admin")

        # 3. Logout
        res_out = self.app.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_out.status_code, 200)

    def test_auth_invalid_credentials(self):
        res = self.app.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("error", json.loads(res.data))

    def test_dashboard_kpis(self):
        res = self.app.get("/api/v1/dashboard/kpis")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertGreaterEqual(data["total_customers"], 5000)
        self.assertGreater(data["total_revenue"], 1000000)
        self.assertGreater(data["total_orders"], 10000)
        self.assertIn("average_order_value", data)
        self.assertIn("repeat_purchase_rate", data)

    def test_paginated_customers(self):
        # 1. Default page 1 limit 10
        res = self.app.get("/api/v1/customers?page=1&limit=10")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(len(data["customers"]), 10)
        self.assertGreaterEqual(data["total_count"], 5000)
        self.assertEqual(data["page"], 1)
        self.assertTrue(data["has_next"])

        # 2. Search for existing customer 15485
        res_search = self.app.get("/api/v1/customers?search=15485")
        self.assertEqual(res_search.status_code, 200)
        data_search = json.loads(res_search.data)
        self.assertGreater(len(data_search["customers"]), 0)
        self.assertEqual(data_search["customers"][0]["customer_id"], "15485")

        # 3. Filter by segment
        res_seg = self.app.get("/api/v1/customers?segment=Champions&limit=5")
        self.assertEqual(res_seg.status_code, 200)
        data_seg = json.loads(res_seg.data)
        for c in data_seg["customers"]:
            self.assertEqual(c["segment"], "Champions")

    def test_customer_detail_api(self):
        res = self.app.get("/api/v1/customers/15485")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["customer_id"], "15485")
        self.assertEqual(data["segment"], "Champions")
        self.assertGreater(len(data["transactions"]), 0)

    def test_analytics_retention_matrix(self):
        res = self.app.get("/api/v1/analytics/retention-matrix")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(len(data["months"]), 12)
        self.assertEqual(len(data["matrix"]), 12)
        self.assertEqual(data["matrix"][0]["retention"][0], 100.0)

    def test_predictions_metrics(self):
        res = self.app.get("/api/v1/predictions/metrics")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("clv_model", data)
        self.assertIn("churn_model", data)
        self.assertGreater(data["clv_model"]["test_r2"], 0.5)
        self.assertGreater(data["churn_model"]["roc_auc"], 0.8)

    def test_simulator_scenarios(self):
        # 1. Save new scenario
        payload = {
            "name": "Q4 High-Touch Strategy",
            "recency_days": 14,
            "frequency": 12,
            "total_spend": 3200.0,
            "tenure_days": 365,
            "predicted_segment": "Champions",
            "predicted_clv": 1820.0,
            "predicted_churn": 0.05,
            "notes": "Testing high-touch concierge"
        }
        res = self.app.post("/api/v1/simulator/scenarios", json=payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        scen_id = data["scenario"]["id"]

        # 2. List scenarios
        res_list = self.app.get("/api/v1/simulator/scenarios")
        self.assertEqual(res_list.status_code, 200)
        data_list = json.loads(res_list.data)
        self.assertGreaterEqual(data_list["count"], 1)

        # 3. Delete scenario
        res_del = self.app.delete(f"/api/v1/simulator/scenarios/{scen_id}")
        self.assertEqual(res_del.status_code, 200)

    def test_datasets_upload_and_validate(self):
        csv_content = "Invoice,StockCode,Description,Quantity,InvoiceDate,Price,Customer ID,Country\n575340,22029,SPACEBOY BIRTHDAY CARD,12,2011-11-09 11:21:00,0.42,15485,United Kingdom\n"
        data = {
            "file": (io.BytesIO(csv_content.encode("utf-8")), "retail_test_upload.csv")
        }
        res_upload = self.app.post("/api/v1/datasets/upload", data=data, content_type="multipart/form-data")
        self.assertEqual(res_upload.status_code, 200)
        upload_data = json.loads(res_upload.data)
        self.assertEqual(upload_data["filename"], "retail_test_upload.csv")
        self.assertEqual(upload_data["total_rows"], 1)

        # Validate
        res_val = self.app.post("/api/v1/datasets/validate", json={"filename": "retail_test_upload.csv", "total_rows": 100})
        self.assertEqual(res_val.status_code, 200)
        val_data = json.loads(res_val.data)
        self.assertEqual(val_data["status"], "valid")

        # Commit import
        res_imp = self.app.post("/api/v1/datasets/import", json={"filename": "retail_test_upload.csv", "total_rows": 100, "valid_rows": 96, "rejected_rows": 4})
        self.assertEqual(res_imp.status_code, 201)

        # Check history
        res_hist = self.app.get("/api/v1/datasets/history")
        self.assertEqual(res_hist.status_code, 200)
        self.assertGreaterEqual(json.loads(res_hist.data)["count"], 1)

    def test_recommendations(self):
        res = self.app.get("/api/v1/recommendations")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertGreaterEqual(data["total_recommendations"], 3)
        self.assertEqual(data["recommendations"][0]["priority"], "Critical")
        self.assertIn("suggested_action", data["recommendations"][0])

    def test_reports(self):
        res = self.app.get("/api/v1/reports")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertGreaterEqual(len(data["reports"]), 3)

if __name__ == "__main__":
    unittest.main()
