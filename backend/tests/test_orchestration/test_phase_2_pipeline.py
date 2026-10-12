"""
Integration tests for SUTRA Phase 2: Two-Specialist Orchestration Pipeline.

Tests sequential execution of Agent 1 and Agent 2, validation gating between stages,
honest representation of pending downstream stages (3 & 4), retry budget capping,
and EvidenceCard preservation.
"""

import pytest

from backend.app.orchestration.agents.intervention_strategist import InterventionStrategist
from backend.app.orchestration.agents.signal_interpreter import StudentSignalInterpreter
from backend.app.orchestration.contracts import (
    ClaimKind,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    StageStatus,
)
from backend.app.orchestration.coordinator import OrchestrationCoordinator
from backend.app.orchestration.provider import (
    MockLLMClient,
    ProviderFatalError,
    ProviderRecoverableError,
)
from backend.app.orchestration.security import SecurityContext


@pytest.fixture
def valid_stage_1_interpretation() -> SignalInterpretation:
    return SignalInterpretation(
        summary="Student logged in on only 2 active days during the first 30 days.",
        velocity_assessment="Persistent inactivity with 22 days since last click.",
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


@pytest.fixture
def valid_stage_2_proposal() -> InterventionProposal:
    return InterventionProposal(
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


def test_phase_2_pipeline_executes_agents_1_and_2_with_downstream_pending(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
    valid_stage_2_proposal: InterventionProposal,
):
    """
    Coordinator executes Agent 1 and Agent 2 in Phase 2 mode (max_active_stages=2).
    Stages 1 & 2 complete; Stages 3 & 4 are honestly marked PENDING without fabrication.
    """
    mock_client = MockLLMClient()
    mock_client.register_response(SignalInterpretation, valid_stage_1_interpretation)
    mock_client.register_response(InterventionProposal, valid_stage_2_proposal)

    coordinator = OrchestrationCoordinator(provider=mock_client)

    result: OrchestrationResult = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=2,
    )

    # Status is PARTIAL_SUCCESS because downstream stages 3 & 4 remain pending
    assert result.status == RunStatus.PARTIAL_SUCCESS
    assert result.retries_used == 0

    # Stage 1 and 2 completed
    assert result.stages["stage_1_interpretation"].status == StageStatus.COMPLETED
    assert result.stages["stage_1_interpretation"].output is not None
    assert result.stages["stage_2_intervention"].status == StageStatus.COMPLETED
    assert result.stages["stage_2_intervention"].output is not None

    # Downstream stages 3 & 4 are explicitly PENDING, NOT fabricated
    assert result.stages["stage_3_plan"].status == StageStatus.PENDING
    assert result.stages["stage_3_plan"].output is None
    assert "pending phase 3" in result.stages["stage_3_plan"].error.lower()

    assert result.stages["stage_4_challenge"].status == StageStatus.PENDING
    assert result.stages["stage_4_challenge"].output is None
    assert "pending phase 3" in result.stages["stage_4_challenge"].error.lower()

    # Authoritative ML Evidence Card is preserved
    assert result.evidence_card.record_id == "SYNTH-TEST-001"
    assert result.evidence_card.risk_tier.value == "HIGH"


def test_phase_2_agent_1_failure_aborts_agent_2_and_preserves_card(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
):
    """If Agent 1 fails fatally, Agent 2 is skipped and EvidenceCard is preserved."""
    mock_client = MockLLMClient(force_fatal_error=True)
    coordinator = OrchestrationCoordinator(provider=mock_client)

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=2,
    )

    assert result.status == RunStatus.FAILED
    assert result.stages["stage_1_interpretation"].status == StageStatus.FAILED
    assert result.stages["stage_2_intervention"].status == StageStatus.SKIPPED
    assert result.stages["stage_3_plan"].status == StageStatus.PENDING
    assert result.stages["stage_4_challenge"].status == StageStatus.PENDING

    # Preserves ML EvidenceCard
    assert result.evidence_card.record_id == "SYNTH-TEST-001"


def test_phase_2_invalid_agent_1_output_blocks_agent_2(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_2_proposal: InterventionProposal,
):
    """If Agent 1 produces an invalid citation, Agent 2 is aborted."""
    invalid_interpretation = SignalInterpretation(
        summary="Student engagement is low.",
        velocity_assessment="Activity ceased.",
        evidence_references=[
            EvidenceReference(
                feature_name="cafeteria_card_swipes",  # Fabricated!
                cited_value=0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )

    mock_client = MockLLMClient()
    mock_client.register_response(SignalInterpretation, invalid_interpretation)
    mock_client.register_response(InterventionProposal, valid_stage_2_proposal)

    coordinator = OrchestrationCoordinator(provider=mock_client)

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=2,
    )

    assert result.status == RunStatus.FAILED
    # Stage 1 executed, but failed validation gating
    assert result.stages["stage_2_intervention"].status == StageStatus.SKIPPED
    assert "failed validation" in result.stages["stage_2_intervention"].error


def test_phase_2_retry_budget_enforcement(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
    valid_stage_2_proposal: InterventionProposal,
):
    """
    Coordinator executes 1 retry for transient recoverable failure on Stage 1.
    Subsequent recoverable failure on Stage 2 cannot retry because budget is exhausted.
    """
    mock_client = MockLLMClient()
    mock_client.register_response(SignalInterpretation, valid_stage_1_interpretation)
    mock_client.register_response(InterventionProposal, valid_stage_2_proposal)

    # Error on invocation 1 (Stage 1 attempt 1) and invocation 3 (Stage 2 attempt 1)
    mock_client.error_on_attempts = {1, 3}

    coordinator = OrchestrationCoordinator(provider=mock_client)

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=2,
    )

    # Stage 1 succeeded on attempt 2 (consumed 1 retry)
    assert result.stages["stage_1_interpretation"].status == StageStatus.COMPLETED
    assert result.stages["stage_1_interpretation"].attempt_count == 2
    assert result.retries_used == 1

    # Stage 2 failed on attempt 1 because retry budget was exhausted
    assert result.stages["stage_2_intervention"].status == StageStatus.FAILED
    assert result.stages["stage_2_intervention"].attempt_count == 1
    assert "retry budget exhausted" in result.stages["stage_2_intervention"].error
