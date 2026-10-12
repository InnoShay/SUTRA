"""
Unit tests for AgentContextFilter in SUTRA Phase 1.

Tests least-privilege boundary, sensitive feature redaction,
and demographic equity review flagging.
"""

import pytest

from backend.app.orchestration.context import AgentContextFilter, FilteredAgentContext
from backend.app.orchestration.contracts import EvidencePacket


def test_context_filter_excludes_sensitive_features_by_default(
    sample_evidence_packet: EvidencePacket,
):
    """Sensitive demographic/proxy attributes are excluded by default from agent context."""
    filtered: FilteredAgentContext = AgentContextFilter.filter_context(
        evidence_packet=sample_evidence_packet,
        allow_sensitive_override=False,
    )

    # Sensitive attributes must NOT be present in operational telemetry
    for sensitive_attr in [
        "gender",
        "region",
        "highest_education",
        "imd_band",
        "age_band",
        "disability",
    ]:
        assert sensitive_attr not in filtered.operational_telemetry, (
            f"Sensitive attribute '{sensitive_attr}' must not be in operational telemetry"
        )

    # Operational LMS activity metrics MUST be present
    assert "vle_active_days_d30" in filtered.operational_telemetry
    assert filtered.operational_telemetry["vle_active_days_d30"] == 2.0
    assert "vle_days_since_last_click" in filtered.operational_telemetry
    assert filtered.operational_telemetry["vle_days_since_last_click"] == 22.0
    assert "studied_credits" in filtered.operational_telemetry
    assert filtered.operational_telemetry["studied_credits"] == 120


def test_context_filter_redacts_sensitive_model_drivers(
    sample_evidence_packet: EvidencePacket,
):
    """
    EvidenceCard risk drivers and protective factors referencing sensitive
    demographic attributes (e.g. IMD, disability) are redacted from safe drivers
    by default and trigger a demographic equity review flag.
    """
    filtered = AgentContextFilter.filter_context(
        evidence_packet=sample_evidence_packet,
        allow_sensitive_override=False,
    )

    # The raw evidence card had 3 risk drivers:
    # 1. Active Learning Days on Platform (telemetry - safe)
    # 2. Days Inactive Since Last VLE Access (telemetry - safe)
    # 3. Index of Multiple Deprivation Band: 10-20 (sensitive - should be redacted)
    assert len(filtered.safe_risk_drivers) == 2
    driver_titles = [d.factor_title for d in filtered.safe_risk_drivers]
    assert "Active Learning Days on Platform" in driver_titles
    assert "Days Inactive Since Last VLE Access" in driver_titles
    assert not any("Deprivation" in t for t in driver_titles)

    # The raw evidence card had 2 protective factors:
    # 1. Declared Disability Indicator: N (sensitive - should be redacted)
    # 2. Course Registration Lead Time (telemetry - safe)
    assert len(filtered.safe_protective_factors) == 1
    assert filtered.safe_protective_factors[0].factor_title == "Course Registration Lead Time"

    # Redacted count should count 6 sensitive features + 1 risk driver + 1 protective factor = 8
    assert filtered.redacted_sensitive_feature_count == 8

    # Demographic equity review must be flagged
    assert filtered.requires_demographic_equity_review is True


def test_context_filter_explicit_override_includes_sensitive_fields(
    sample_evidence_packet: EvidencePacket,
):
    """
    When explicit institutional authorization is granted (allow_sensitive_override=True),
    fields are passed and redacted count is 0.
    """
    filtered = AgentContextFilter.filter_context(
        evidence_packet=sample_evidence_packet,
        allow_sensitive_override=True,
    )

    assert "gender" in filtered.operational_telemetry
    assert "imd_band" in filtered.operational_telemetry
    assert "disability" in filtered.operational_telemetry
    assert len(filtered.safe_risk_drivers) == 3
    assert len(filtered.safe_protective_factors) == 2
    assert filtered.redacted_sensitive_feature_count == 0


def test_context_filter_preserves_authoritative_evidence_card(
    sample_evidence_packet: EvidencePacket,
):
    """Filtering context does not mutate the authoritative EvidenceCard in the packet."""
    original_driver_count = len(sample_evidence_packet.evidence_card.top_risk_drivers)
    original_protective_count = len(sample_evidence_packet.evidence_card.top_protective_factors)

    _ = AgentContextFilter.filter_context(sample_evidence_packet)

    assert len(sample_evidence_packet.evidence_card.top_risk_drivers) == original_driver_count
    assert len(sample_evidence_packet.evidence_card.top_protective_factors) == original_protective_count
