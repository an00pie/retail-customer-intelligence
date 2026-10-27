"""
INSIGHT.arc Gemini AI Service — Foundation & Read-Only Copilot Integration.
Uses the official Google Gen AI Python SDK (google-genai) with function calling.
Strict rate limits, timeouts, error isolation, and privacy guards.
"""
import os
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from web.services.ai_tools import ALLOWED_AI_TOOLS


class GeminiError(Exception):
    """Base exception for Gemini service issues."""
    pass


class GeminiUnavailableError(GeminiError):
    """Raised when Gemini API is unconfigured, disabled, or offline."""
    pass


class GeminiRateLimitError(GeminiError):
    """Raised when request frequency exceeds allowed rate limits."""
    pass


class GeminiService:
    """Manages Gemini client initialization, rate limits, allowlisted tools, and prompt execution."""

    def __init__(self):
        self._client = None
        self._ip_request_timestamps = defaultdict(list)
        self._global_request_timestamps = []
        self._max_per_ip_per_min = 20
        self._max_global_per_min = 60
        self._timeout_seconds = 15

    @property
    def api_key(self) -> str:
        return os.environ.get("GEMINI_API_KEY", "").strip()

    @property
    def model_id(self) -> str:
        model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash").strip()
        # Validate model ID format (allow standard gemini models)
        if not re.fullmatch(r"gemini-[a-zA-Z0-9.\-]+", model):
            return "gemini-3.8-flash"
        return model

    @property
    def ai_enabled(self) -> bool:
        return os.environ.get("GEMINI_AI_ENABLED", "true").strip().lower() in ("true", "1", "yes")

    def is_available(self) -> bool:
        """Returns True only if Gemini is explicitly enabled and API key is present."""
        return bool(self.ai_enabled and self.api_key)

    def get_client(self):
        """Lazily initialize and return the official google-genai Client."""
        if not self.is_available():
            raise GeminiUnavailableError("Gemini AI is not configured or disabled on this server.")

        if self._client is None:
            try:
                from google import genai
                from google.genai import types
                self._client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(timeout=self._timeout_seconds * 1000)
                )
            except Exception as e:
                raise GeminiUnavailableError(f"Failed to initialize Google GenAI client: {str(e)}") from None

        return self._client

    def check_rate_limit(self, client_ip: str) -> None:
        """Sliding window rate limit: max 20 requests/min per IP, 60 requests/min global."""
        now = time.time()
        cutoff = now - 60.0

        # Prune global
        self._global_request_timestamps = [t for t in self._global_request_timestamps if t > cutoff]
        if len(self._global_request_timestamps) >= self._max_global_per_min:
            raise GeminiRateLimitError("Global AI request rate limit reached. Please wait a moment.")

        # Prune per IP
        ip_timestamps = [t for t in self._ip_request_timestamps[client_ip] if t > cutoff]
        self._ip_request_timestamps[client_ip] = ip_timestamps
        if len(ip_timestamps) >= self._max_per_ip_per_min:
            raise GeminiRateLimitError("Client AI rate limit exceeded (20 queries/min). Please try again shortly.")

        # Record
        self._global_request_timestamps.append(now)
        self._ip_request_timestamps[client_ip].append(now)

    def get_status(self) -> Dict[str, Any]:
        """Safe status descriptor without exposing secrets."""
        is_ready = self.is_available()
        return {
            "enabled": self.ai_enabled,
            "configured": bool(self.api_key),
            "available": is_ready,
            "model": self.model_id,
            "provider": "Google Gemini",
            "sdk": "google-genai (v1)",
            "allowed_tools": [fn.__name__ for fn in ALLOWED_AI_TOOLS],
            "mode": "live_copilot" if is_ready else "setup_mode",
            "notice": (
                f"INSIGHT Copilot active with {self.model_id} and verified analytics tools."
                if is_ready else
                "Gemini API key is not configured. Configure GEMINI_API_KEY in Render environment to enable Copilot."
            )
        }

    def ask_copilot(self, prompt: str, client_ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Executes a natural-language query via Gemini with verified read-only analytics tools."""
        if not prompt or not isinstance(prompt, str):
            raise GeminiError("Prompt must be a non-empty string.")

        clean_prompt = prompt.strip()
        if len(clean_prompt) < 2 or len(clean_prompt) > 1000:
            raise GeminiError("Prompt length must be between 2 and 1000 characters.")

        # Check availability
        if not self.is_available():
            raise GeminiUnavailableError(
                "INSIGHT Copilot is currently in setup mode. Please configure GEMINI_API_KEY in server environment."
            )

        # Enforce rate limit
        self.check_rate_limit(client_ip)

        client = self.get_client()

        # Build tools tracking wrapper
        tools_called = []
        wrapped_tools = []

        def make_wrapper(orig_fn):
            def wrapper(*args, **kwargs):
                name = orig_fn.__name__
                if name not in tools_called:
                    tools_called.append(name)
                return orig_fn(*args, **kwargs)
            wrapper.__name__ = orig_fn.__name__
            wrapper.__doc__ = orig_fn.__doc__
            wrapper.__annotations__ = getattr(orig_fn, "__annotations__", {})
            return wrapper

        for tool_fn in ALLOWED_AI_TOOLS:
            wrapped_tools.append(make_wrapper(tool_fn))

        system_instruction = (
            "You are INSIGHT Copilot, an enterprise retail intelligence assistant. "
            "You interpret verified retail analytics for store operators and executives. "
            "CRITICAL RULES: "
            "1. Ground all numeric facts, revenue, order counts, CLV, and churn in the tools provided. "
            "2. If you need retail KPIs, segment counts, or customer metrics, CALL THE RELEVANT TOOL. "
            "3. Never invent numbers, revenue figures, or customer transactions. "
            "4. If data is unavailable, state the limitation clearly. "
            "5. Keep answers concise, executive-ready, and formatted in clean markdown."
        )

        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=1500,
                system_instruction=system_instruction,
                tools=wrapped_tools,
                http_options=types.HttpOptions(timeout=self._timeout_seconds * 1000)
            )

            response = client.models.generate_content(
                model=self.model_id,
                contents=clean_prompt,
                config=config
            )

            text_output = response.text or ""
            if not text_output.strip():
                text_output = "I queried the retail analytics tools, but could not produce a text summary. Please refine your query."

            return {
                "status": "success",
                "answer": text_output,
                "model": self.model_id,
                "tools_invoked": tools_called,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except GeminiRateLimitError:
            raise
        except Exception as e:
            err_str = str(e)
            if "timeout" in err_str.lower() or "timed out" in err_str.lower() or "deadline" in err_str.lower():
                raise GeminiUnavailableError("Gemini API request timed out (15s limit reached).") from None
            if "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                raise GeminiUnavailableError("Gemini API quota exceeded. Please check your Google AI Studio plan.") from None
            if "UNAUTHENTICATED" in err_str or "API key not valid" in err_str:
                raise GeminiUnavailableError("Gemini API key is invalid or unauthenticated.") from None
            raise GeminiError(f"AI query failed: {err_str}") from None


# Global singleton instance
_gemini_service = None

def get_gemini_service() -> GeminiService:
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
