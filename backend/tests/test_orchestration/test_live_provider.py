"""
Unit and opt-in smoke tests for LiveProviderClient (Phase 2).

Normal automated test suites run completely offline. Live network execution
requires explicit opt-in via SUTRA_LIVE_LLM_ENABLED=1 and SUTRA_LLM_API_KEY.
"""

import os
import pytest

from backend.app.orchestration.contracts import SignalInterpretation
from backend.app.orchestration.provider import (
    LiveProviderClient,
    ProviderFatalError,
)


def test_live_provider_fails_closed_without_credentials(monkeypatch):
    """LiveProviderClient fails closed with ProviderFatalError when API key is missing."""
    monkeypatch.delenv("SUTRA_LLM_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(ProviderFatalError) as exc_info:
        LiveProviderClient()

    assert "credentials not found" in str(exc_info.value).lower()
    assert "mockllmclient" in str(exc_info.value).lower()


@pytest.mark.skipif(
    not os.getenv("SUTRA_LIVE_LLM_ENABLED"),
    reason="Opt-in live provider test requires SUTRA_LIVE_LLM_ENABLED=1 and valid credentials",
)
def test_live_provider_smoke_test():
    """
    Opt-in live provider smoke test.
    Only executed when explicitly enabled with real credentials.
    """
    client = LiveProviderClient()
    response = client.generate_structured(
        prompt="Synthesize student telemetry: active days = 2, inactive days = 22.",
        response_model=SignalInterpretation,
        timeout_sec=4.0,
    )

    assert response.result is not None
    assert response.latency_ms > 0
    assert response.tokens_used > 0
    assert response.provider_name == "live-openai-compatible"
