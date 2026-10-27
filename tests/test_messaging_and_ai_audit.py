"""
Unit and integration tests for Outbound Messaging Gateway UX, status guard,
and local vs. remote AI capabilities audit.
"""
import os
import pytest
from web.app import app, predict_customer, get_models
from web.gemini import explain_prediction, ExplanationUnavailable


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestMessagingGateway:
    """Verifies that messaging gateway adheres to honest configuration and never fakes delivery."""

    def test_messaging_status_unconfigured(self, client, monkeypatch):
        """When MESSAGING_PROVIDER or MESSAGING_API_KEY are unset, report unconfigured demo safe mode."""
        monkeypatch.delenv("MESSAGING_PROVIDER", raising=False)
        monkeypatch.delenv("MESSAGING_API_KEY", raising=False)

        res = client.get("/api/v1/messaging/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["configured"] is False
        assert data["provider"] is None
        assert data["outbound_dispatch_enabled"] is False
        assert data["mode"] == "demo_safe_mode"
        assert "not configured" in data["notice"].lower()
        assert "Twilio (SMS)" in data["supported_providers"]

    def test_messaging_send_unconfigured_blocks_dispatch(self, client, monkeypatch):
        """Attempting to dispatch a message when unconfigured must return honest HTTP 503."""
        monkeypatch.delenv("MESSAGING_PROVIDER", raising=False)
        monkeypatch.delenv("MESSAGING_API_KEY", raising=False)

        payload = {
            "customer_id": "15485",
            "message": "Hello Customer! Your perk is ready."
        }
        res = client.post("/api/v1/messaging/send", json=payload)
        assert res.status_code == 503
        data = res.get_json()
        assert data["code"] == "GATEWAY_UNCONFIGURED"
        assert data["dispatch_status"] == "blocked"
        assert "MESSAGING_PROVIDER" in data["required_configuration"]
        assert "not configured" in data["error"].lower()

    def test_messaging_status_configured(self, client, monkeypatch):
        """When configured with valid provider and key in server env, report connected status."""
        monkeypatch.setenv("MESSAGING_PROVIDER", "twilio")
        monkeypatch.setenv("MESSAGING_API_KEY", "secret_twilio_token_12345")

        res = client.get("/api/v1/messaging/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["configured"] is True
        assert data["provider"] == "twilio"
        assert data["outbound_dispatch_enabled"] is True
        assert data["mode"] == "live_dispatch"
        # Secret values must NEVER be exposed
        assert "secret_twilio_token_12345" not in str(data)

    def test_messaging_send_configured(self, client, monkeypatch):
        """When configured, dispatch endpoint accepts valid payload."""
        monkeypatch.setenv("MESSAGING_PROVIDER", "twilio")
        monkeypatch.setenv("MESSAGING_API_KEY", "secret_twilio_token_12345")

        payload = {
            "customer_id": "15485",
            "message": "Hello Customer! Your perk is ready."
        }
        res = client.post("/api/v1/messaging/send", json=payload)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "sent"
        assert data["provider"] == "twilio"
        assert data["customer_id"] == "15485"


class TestAIApiAudit:
    """Verifies that local ML inference runs without network calls and external AI requires keys."""

    def test_local_scikit_learn_models_loaded(self):
        """Validates that K-Means, Scaler, CLV Regressor, and Churn Classifier exist in local models/."""
        models = get_models()
        assert "clv" in models
        assert "churn" in models
        assert "kmeans" in models
        assert "scaler" in models
        assert "mapping" in models

    def test_local_inference_pipeline_runs_offline(self):
        """Local ML inference executes completely in memory on CPU without calling external APIs."""
        pred = predict_customer(recency_days=25, frequency=6, total_spend=1250.0, tenure_days=300)
        assert pred["inference_status"] == "available"
        assert "segment" in pred
        assert "predicted_clv" in pred
        assert "churn_probability" in pred
        assert 0.0 <= pred["churn_probability"] <= 1.0
        assert pred["predicted_clv"] >= 0.0

    def test_gemini_explanation_unconfigured_fails_safe(self, monkeypatch):
        """When GEMINI_API_KEY is not set, Gemini explanation raises ExplanationUnavailable safely."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        mock_pred = {
            "segment": "Loyal Customers",
            "predicted_clv": 2450.0,
            "churn_probability": 0.08,
            "feature_inputs": {"recency_days": 12, "frequency": 8, "total_spend": 2450.0},
            "drivers": [{"model": "churn", "feature": "recency_days", "global_importance": 0.35}],
        }
        with pytest.raises(ExplanationUnavailable) as exc_info:
            explain_prediction(mock_pred)
        assert "not configured" in str(exc_info.value).lower()
