"""
Unit tests for SUTRA Agent 2: Intervention Strategist (Phase 2).

Tests synthetic catalog compliance, allowed owner role constraints,
citation grounding, and rejection of invented interventions or roles.
"""

import pytest

from backend.app.orchestration.agents.intervention_strategist import InterventionStrategist
from backend.app.orchestration.agents.prompts import (
    INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1,
)
from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.context import AgentContextFilter
from backend.app.orchestration.contracts import (
    ClaimKind,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    SignalInterpretation,
)
from backend.app.orchestration.provider import (
    MockLLMClient,
    ProviderFatalError,
)


@pytest.fixture
def sample_interpretation() -> SignalInterpretation:
    """Valid SignalInterpretation from Agent 1."""
    return SignalInterpretation(
        summary="Student logged in on only 2 active days during the first 30 days.",
        velocity_assessment="Activity ceased with 22 days of inactivity recorded.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            ),
            EvidenceReference(
                feature_name="vle_days_since_last_click",
                cited_value=22.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            ),
        ],
        missing_or_stale_indicators=["assessments_submitted_d30 = 0.0"],
        requires_human_review=True,
    )


def test_agent_2_valid_intervention_proposal_succeeds(
    sample_evidence_packet: EvidencePacket,
    sample_interpretation: SignalInterpretation,
    mock_llm_client: MockLLMClient,
):
    """Agent 2 successfully selects an approved catalog intervention with authorized owner role."""
    context = AgentContextFilter.filter_context(sample_evidence_packet)

    valid_proposal = InterventionProposal(
        selected_intervention_id="INT-VLE-ONBOARD-01",
        target_role="PEER_MENTOR",
        rationale="Student needs navigation check-in due to low platform active days.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
        alternative_intervention_ids=["INT-PEER-CONNECT-01"],
    )
    mock_llm_client.register_response(InterventionProposal, valid_proposal)

    result = InterventionStrategist.strategize(
        context=context,
        interpretation=sample_interpretation,
        provider=mock_llm_client,
    )

    assert result.selected_intervention_id == "INT-VLE-ONBOARD-01"
    assert result.target_role == "PEER_MENTOR"
    assert len(result.evidence_references) == 1
    assert mock_llm_client.recorded_calls[0]["system_prompt"] == INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1


def test_agent_2_rejects_invented_intervention_id(
    sample_evidence_packet: EvidencePacket,
    sample_interpretation: SignalInterpretation,
    mock_llm_client: MockLLMClient,
):
    """Agent 2 fails closed if the model invents an uncataloged intervention ID."""
    context = AgentContextFilter.filter_context(sample_evidence_packet)

    invented_proposal = InterventionProposal(
        selected_intervention_id="INT-EMERGENCY-TUITION-DISMISSAL-99",  # Invented!
        target_role="ACADEMIC_ADVISOR",
        rationale="Urgent tuition dismissal needed.",
        evidence_references=[],
    )
    mock_llm_client.register_response(InterventionProposal, invented_proposal)

    with pytest.raises(ProviderFatalError) as exc_info:
        InterventionStrategist.strategize(
            context=context,
            interpretation=sample_interpretation,
            provider=mock_llm_client,
        )

    assert "uncataloged intervention ID" in str(exc_info.value)


def test_agent_2_rejects_unauthorized_role_for_catalog_entry(
    sample_evidence_packet: EvidencePacket,
    sample_interpretation: SignalInterpretation,
    mock_llm_client: MockLLMClient,
):
    """Agent 2 fails closed if the proposed owner role is not in the entry's allowed roles."""
    context = AgentContextFilter.filter_context(sample_evidence_packet)

    # INT-PEER-CONNECT-01 allows only PEER_MENTOR or STUDENT_SUCCESS_COACH, NOT MODULE_TUTOR
    invalid_role_proposal = InterventionProposal(
        selected_intervention_id="INT-PEER-CONNECT-01",
        target_role="MODULE_TUTOR",  # Invalid role for this intervention
        rationale="Tutor peer connection.",
        evidence_references=[],
    )
    mock_llm_client.register_response(InterventionProposal, invalid_role_proposal)

    with pytest.raises(ProviderFatalError) as exc_info:
        InterventionStrategist.strategize(
            context=context,
            interpretation=sample_interpretation,
            provider=mock_llm_client,
        )

    assert "role validation failed" in str(exc_info.value)
    assert "MODULE_TUTOR" in str(exc_info.value)


def test_agent_2_supports_explicit_no_supported_intervention(
    sample_evidence_packet: EvidencePacket,
    sample_interpretation: SignalInterpretation,
    mock_llm_client: MockLLMClient,
):
    """When evidence does not justify any catalog intervention, NO_SUPPORTED_INTERVENTION is valid."""
    context = AgentContextFilter.filter_context(sample_evidence_packet)

    no_op_proposal = InterventionProposal(
        selected_intervention_id=SyntheticDemoCatalog.NO_SUPPORTED_INTERVENTION,
        target_role="ACADEMIC_ADVISOR",
        rationale="Student engagement is borderline; advisor should wait for Day 45 checkpoint.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )
    mock_llm_client.register_response(InterventionProposal, no_op_proposal)

    result = InterventionStrategist.strategize(
        context=context,
        interpretation=sample_interpretation,
        provider=mock_llm_client,
    )

    assert result.selected_intervention_id == "NO_SUPPORTED_INTERVENTION"
    assert result.target_role == "ACADEMIC_ADVISOR"


def test_agent_2_rejects_uncited_or_mismatched_telemetry(
    sample_evidence_packet: EvidencePacket,
    sample_interpretation: SignalInterpretation,
    mock_llm_client: MockLLMClient,
):
    """Agent 2 rejects citations with mismatched feature values in rationale."""
    context = AgentContextFilter.filter_context(sample_evidence_packet)

    mismatched_proposal = InterventionProposal(
        selected_intervention_id="INT-VLE-ONBOARD-01",
        target_role="ACADEMIC_ADVISOR",
        rationale="Student logged in 99 times.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=99.0,  # Canonical source value is 2.0!
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )
    mock_llm_client.register_response(InterventionProposal, mismatched_proposal)

    with pytest.raises(ProviderFatalError) as exc_info:
        InterventionStrategist.strategize(
            context=context,
            interpretation=sample_interpretation,
            provider=mock_llm_client,
        )

    assert "mismatch" in str(exc_info.value).lower()
