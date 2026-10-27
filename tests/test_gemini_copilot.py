"""
Unit & Integration Tests for INSIGHT.arc Gemini AI Service & Read-Only Copilot.
Covers:
- Configuration & lazy initialization
- Privacy (zero key leakage)
- Rate limiting (sliding window per-IP and global)
- Read-only analytics tool execution & data grounding
- Mocked Gemini generate_content responses
- Graceful handling of quota errors, invalid keys, and unconfigured state
"""
import pytest
from unittest.mock import MagicMock, patch
from web.app import app
from web.services.gemini_service import (
    GeminiService,
    get_gemini_service,
    GeminiUnavailableError,
    GeminiRateLimitError,
    GeminiError
)
from web.services.ai_tools import (
    get_dashboard_kpis,
    get_segment_summary,
    get_churn_summary,
    get_customer_summary,
    get_top_customers,
    ALLOWED_AI_TOOLS
)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def clean_gemini_service():
    """Returns a fresh GeminiService instance with clean rate limit trackers."""
    service = GeminiService()
    return service


class TestGeminiConfigurationAndStatus:
    """Tests Phase 0 foundation requirements for configuration and safety."""

    def test_unconfigured_status(self, client, monkeypatch):
        """When GEMINI_API_KEY is not set, service reports available: False in setup mode."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.setenv("GEMINI_AI_ENABLED", "true")

        res = client.get("/api/v1/ai/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["available"] is False
        assert data["configured"] is False
        assert data["mode"] == "setup_mode"
        assert data["provider"] == "Google Gemini"
        assert "get_dashboard_kpis" in data["allowed_tools"]
        assert "not configured" in data["notice"].lower()

    def test_configured_status_hides_secrets(self, client, monkeypatch):
        """When GEMINI_API_KEY is configured, status is available: True and key is never leaked."""
        secret_key = "AIzaSy_super_secret_production_key_12345"
        monkeypatch.setenv("GEMINI_API_KEY", secret_key)
        monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")
        monkeypatch.setenv("GEMINI_AI_ENABLED", "true")

        res = client.get("/api/v1/ai/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["available"] is True
        assert data["configured"] is True
        assert data["model"] == "gemini-3.8-flash"
        assert data["mode"] == "live_copilot"
        # Verify secret key is NEVER exposed in JSON response
        assert secret_key not in str(data)

    def test_ai_disabled_flag(self, client, monkeypatch):
        """When GEMINI_AI_ENABLED=false, service reports available: False even with key present."""
        monkeypatch.setenv("GEMINI_API_KEY", "test_key")
        monkeypatch.setenv("GEMINI_AI_ENABLED", "false")

        res = client.get("/api/v1/ai/status")
        assert res.status_code == 200
        data = res.get_json()
        assert data["available"] is False
        assert data["enabled"] is False

    def test_invalid_model_id_falls_back_safely(self, clean_gemini_service, monkeypatch):
        """Invalid or malformed model identifiers fall back to safe default gemini-3.8-flash."""
        monkeypatch.setenv("GEMINI_MODEL", "invalid;model$(rm -rf)")
        assert clean_gemini_service.model_id == "gemini-3.8-flash"


class TestGeminiRateLimitingAndValidation:
    """Tests rate limiting and parameter bounds."""

    def test_per_ip_rate_limiting(self, clean_gemini_service, monkeypatch):
        """More than 20 requests/min from the same client IP triggers GeminiRateLimitError."""
        monkeypatch.setenv("GEMINI_API_KEY", "test_key")
        monkeypatch.setenv("GEMINI_AI_ENABLED", "true")

        client_ip = "192.168.1.100"
        # Consume 20 requests
        for _ in range(20):
            clean_gemini_service.check_rate_limit(client_ip)

        # 21st request must raise
        with pytest.raises(GeminiRateLimitError) as exc_info:
            clean_gemini_service.check_rate_limit(client_ip)
        assert "rate limit exceeded" in str(exc_info.value).lower()

    def test_prompt_validation_empty(self, client, monkeypatch):
        """Empty or whitespace-only prompt returns HTTP 400."""
        monkeypatch.setenv("GEMINI_API_KEY", "test_key")
        res = client.post("/api/v1/ai/copilot", json={"prompt": "   "})
        assert res.status_code == 400
        data = res.get_json()
        assert data["code"] == "EMPTY_PROMPT"

    def test_prompt_validation_oversized(self, client, monkeypatch):
        """Prompts exceeding 1000 characters return HTTP 400."""
        monkeypatch.setenv("GEMINI_API_KEY", "test_key")
        oversized_prompt = "A" * 1001
        res = client.post("/api/v1/ai/copilot", json={"prompt": oversized_prompt})
        assert res.status_code == 400
        assert "between 2 and 1000" in res.get_json()["error"]


class TestReadOnlyAnalyticsTools:
    """Verifies that all 5 allowlisted tools return factual grounded data without write side-effects."""

    def test_allowed_tools_count(self):
        assert len(ALLOWED_AI_TOOLS) == 5

    def test_get_dashboard_kpis(self):
        data = get_dashboard_kpis()
        assert data["verified_customer_count"] == 5942
        assert data["total_revenue_usd"] > 1000000.0
        assert data["total_orders"] > 10000
        assert data["avg_order_value_usd"] > 0

    def test_get_segment_summary(self):
        data = get_segment_summary()
        assert "segments" in data
        assert "Champions" in data["segments"]
        assert "Loyal Customers" in data["segments"]
        assert "At-Risk" in data["segments"]
        assert "Lost / Churned" in data["segments"]
        # Verify sizes sum up to active base
        total_size = sum(s["audience_size"] for s in data["segments"].values())
        assert total_size == 5942

    def test_get_churn_summary(self):
        data = get_churn_summary()
        assert data["total_active_base"] == 5942
        assert data["lost_churned_count"] == 2037
        assert data["at_risk_count"] == 1476

    def test_get_customer_summary_valid(self):
        cust = get_customer_summary("15485")
        assert cust["found"] is True
        assert cust["customer_id"] == "15485"
        assert cust["segment"] == "Champions"
        assert cust["total_spend_usd"] > 0
        assert 0.0 <= cust["churn_risk_probability"] <= 1.0

    def test_get_customer_summary_unknown(self):
        cust = get_customer_summary("99999999")
        assert cust["found"] is False
        assert "not found" in cust["error"].lower()

    def test_get_top_customers_clamped_and_ranked(self):
        top = get_top_customers(metric="monetary", limit=20)
        # Limit must be clamped to 10
        assert len(top["customers"]) <= 10
        assert len(top["customers"]) > 0
        # First customer should have higher spend than second
        assert top["customers"][0]["total_spend"] >= top["customers"][1]["total_spend"]


class TestCopilotExecutionWithMockedGemini:
    """Verifies full request/response cycle using mocked Gemini SDK responses."""

    def test_copilot_when_unconfigured_returns_503(self, client, monkeypatch):
        """When unconfigured, Copilot returns HTTP 503 with helpful setup instructions."""
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        res = client.post("/api/v1/ai/copilot", json={"prompt": "Summarize retention risks."})
        assert res.status_code == 503
        data = res.get_json()
        assert data["code"] == "AI_UNAVAILABLE"
        assert "setup mode" in data["error"].lower()

    @patch("google.genai.Client")
    def test_copilot_successful_mocked_query(self, mock_client_cls, client, monkeypatch):
        """Verifies that ask_copilot calls the model and returns formatted grounded response."""
        monkeypatch.setenv("GEMINI_API_KEY", "mock_key_for_test")
        monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")
        monkeypatch.setenv("GEMINI_AI_ENABLED", "true")

        # Mock the SDK client
        mock_instance = MagicMock()
        mock_client_cls.return_value = mock_instance

        mock_response = MagicMock()
        mock_response.text = "Based on verified KPIs, INSIGHT.arc tracks 5,942 customers with $16.7M in total revenue."
        mock_instance.models.generate_content.return_value = mock_response

        # Inject into service
        service = get_gemini_service()
        service._client = mock_instance

        res = client.post("/api/v1/ai/copilot", json={"prompt": "What are our total verified customer and revenue KPIs?"})
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "success"
        assert "5,942 customers" in data["answer"]
        assert data["model"] == "gemini-3.8-flash"
        assert "timestamp" in data

    @patch("google.genai.Client")
    def test_copilot_quota_exceeded_handled_gracefully(self, mock_client_cls, client, monkeypatch):
        """Quota errors (RESOURCE_EXHAUSTED) return friendly HTTP 503 without crashing."""
        monkeypatch.setenv("GEMINI_API_KEY", "mock_key_for_test")
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = Exception("429 RESOURCE_EXHAUSTED: Quota exceeded for model")
        mock_client_cls.return_value = mock_instance

        service = get_gemini_service()
        service._client = mock_instance

        res = client.post("/api/v1/ai/copilot", json={"prompt": "Give me a summary."})
        assert res.status_code == 503
        data = res.get_json()
        assert "quota exceeded" in data["error"].lower()

    @patch("google.genai.Client")
    def test_copilot_timeout_handled_gracefully(self, mock_client_cls, client, monkeypatch):
        """Request timeout errors return friendly HTTP 503 with timeout indication."""
        monkeypatch.setenv("GEMINI_API_KEY", "mock_key_for_test")
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = Exception("DeadlineExceeded: request timed out after 15000ms")
        mock_client_cls.return_value = mock_instance

        service = get_gemini_service()
        service._client = mock_instance

        res = client.post("/api/v1/ai/copilot", json={"prompt": "Summarize customer churn."})
        assert res.status_code == 503
        data = res.get_json()
        assert "timed out" in data["error"].lower()
