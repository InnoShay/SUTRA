"""
Provider Protocol and Deterministic Mock Client for SUTRA Phase 1.

Enables 100% deterministic, offline automated testing of coordinator state
transitions, timeouts, and recoverable retries without external API credentials.
"""

from typing import Any, Generic, Optional, Protocol, Type, TypeVar
import time
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar("T", bound=BaseModel)


class ProviderError(Exception):
    """Base exception for provider invocations."""
    pass


class ProviderRecoverableError(ProviderError):
    """Transient error eligible for bounded retry (e.g., HTTP 503, HTTP 429, connection reset)."""
    pass


class ProviderFatalError(ProviderError):
    """Non-recoverable error ineligible for retry (e.g., invalid request, policy rejection)."""
    pass


class ProviderTimeoutError(ProviderError):
    """Raised when an attempt exceeds its allocated timeout."""
    pass


class ProviderResponse(BaseModel, Generic[T]):
    """Standardized response envelope from a provider execution."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    result: Optional[T] = Field(default=None, description="Parsed structured response")
    latency_ms: float = Field(ge=0.0, description="Observed round-trip latency in milliseconds")
    model_name: str = Field(default="mock-deterministic-v1", description="Model identifier")
    provider_name: str = Field(default="mock-offline-provider", description="Provider identifier")
    tokens_used: int = Field(default=0, ge=0, description="Total tokens consumed")


class LLMProviderProtocol(Protocol):
    """
    Protocol for structured LLM execution.

    Designed for single-provider compliance in Phase 1 and live provider integration later.
    """

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        timeout_sec: float,
        system_prompt: Optional[str] = None,
    ) -> ProviderResponse[T]:
        """Generate structured Pydantic output within an explicit timeout."""
        ...


class MockLLMClient:
    """
    Deterministic Mock Provider for unit and integration testing.

    Configurable to simulate normal completions, structured validation errors,
    delays, timeouts, recoverable errors, and fatal failures without network calls.
    """

    def __init__(
        self,
        default_responses: Optional[dict[Type[BaseModel], BaseModel]] = None,
        simulated_latency_sec: float = 0.001,
        force_timeout: bool = False,
        force_recoverable_error: bool = False,
        force_fatal_error: bool = False,
        error_on_attempts: Optional[set[int]] = None,
    ):
        self._responses: dict[Type[BaseModel], BaseModel] = default_responses or {}
        self.simulated_latency_sec = simulated_latency_sec
        self.force_timeout = force_timeout
        self.force_recoverable_error = force_recoverable_error
        self.force_fatal_error = force_fatal_error
        self.error_on_attempts = error_on_attempts or set()
        self.invocation_count = 0
        self.recorded_calls: list[dict[str, Any]] = []

    def register_response(self, response_model: Type[BaseModel], instance: BaseModel) -> None:
        """Register a canned response for a specific Pydantic model type."""
        self._responses[response_model] = instance

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        timeout_sec: float,
        system_prompt: Optional[str] = None,
    ) -> ProviderResponse[T]:
        """Simulate structured generation deterministically."""
        self.invocation_count += 1
        self.recorded_calls.append({
            "prompt": prompt,
            "response_model": response_model.__name__,
            "timeout_sec": timeout_sec,
            "system_prompt": system_prompt,
        })

        # Simulate timeout if requested or if simulated latency exceeds timeout
        if self.force_timeout or self.simulated_latency_sec > timeout_sec:
            time.sleep(min(self.simulated_latency_sec, timeout_sec))
            raise ProviderTimeoutError(
                f"Mock provider execution timed out after {timeout_sec:.2f}s"
            )

        # Check attempt-specific error triggers
        if self.invocation_count in self.error_on_attempts or self.force_recoverable_error:
            raise ProviderRecoverableError(
                f"Mock transient upstream 503 error on attempt {self.invocation_count}"
            )

        if self.force_fatal_error:
            raise ProviderFatalError(
                f"Mock non-recoverable 400 bad request on attempt {self.invocation_count}"
            )

        # Normal execution
        if self.simulated_latency_sec > 0:
            time.sleep(self.simulated_latency_sec)

        canned = self._responses.get(response_model)
        if canned is not None:
            # Validate that the canned response matches the requested type
            if not isinstance(canned, response_model):
                raise ProviderFatalError(
                    f"Mock response type mismatch: expected {response_model.__name__}, got {type(canned).__name__}"
                )
            return ProviderResponse[T](
                result=canned,
                latency_ms=self.simulated_latency_sec * 1000.0,
                model_name="mock-deterministic-v1",
                provider_name="mock-offline-provider",
                tokens_used=120,
            )

        # If no explicit canned response is registered, try constructing a default instance
        try:
            default_instance = response_model.model_construct()
            return ProviderResponse[T](
                result=default_instance,
                latency_ms=self.simulated_latency_sec * 1000.0,
                model_name="mock-deterministic-v1",
                provider_name="mock-offline-provider",
                tokens_used=50,
            )
        except Exception as exc:
            raise ProviderFatalError(
                f"Cannot construct mock response for {response_model.__name__}: {exc}"
            )


class LiveProviderClient:
    """
    Opt-in live provider adapter supporting structured outputs.

    Activated strictly when SUTRA_LIVE_LLM_ENABLED is set and valid credentials
    exist in the environment (SUTRA_LLM_API_KEY or OPENAI_API_KEY).
    Never used in automated CI/CD test suites.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
    ):
        import os
        self.api_key = api_key or os.getenv("SUTRA_LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("SUTRA_LLM_MODEL", model)
        self.base_url = base_url or os.getenv("SUTRA_LLM_BASE_URL", "https://api.openai.com/v1")

        if not self.api_key:
            raise ProviderFatalError(
                "Live provider credentials not found. Set SUTRA_LLM_API_KEY or OPENAI_API_KEY in environment. "
                "Normal test suites must use MockLLMClient."
            )

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        timeout_sec: float,
        system_prompt: Optional[str] = None,
    ) -> ProviderResponse[T]:
        """
        Execute structured LLM call via HTTP request.
        """
        import httpx
        import json

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        }

        t_start = time.time()
        try:
            with httpx.Client(timeout=timeout_sec) as client:
                resp = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

            if resp.status_code in (429, 500, 502, 503, 504):
                raise ProviderRecoverableError(f"Live provider upstream status {resp.status_code}: {resp.text[:100]}")
            if resp.status_code != 200:
                raise ProviderFatalError(f"Live provider error status {resp.status_code}: {resp.text[:100]}")

            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed_dict = json.loads(content)
            result = response_model.model_validate(parsed_dict)
            latency_ms = (time.time() - t_start) * 1000.0
            usage = data.get("usage", {})
            tokens_used = usage.get("total_tokens", 0)

            return ProviderResponse[T](
                result=result,
                latency_ms=latency_ms,
                model_name=self.model,
                provider_name="live-openai-compatible",
                tokens_used=tokens_used,
            )

        except httpx.TimeoutException:
            raise ProviderTimeoutError(f"Live provider timed out after {timeout_sec:.2f}s")
        except (ProviderRecoverableError, ProviderFatalError, ProviderTimeoutError):
            raise
        except Exception as exc:
            raise ProviderFatalError(f"Failed to execute live structured completion: {exc}")
