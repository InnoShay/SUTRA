"""
Unit tests for OrchestrationCoordinator in SUTRA Phase 1.

Tests sequential 4-stage pipeline execution, per-stage timeouts, global 18s deadline,
single retry budget enforcement, dependent stage abortion, and EvidenceCard preservation.
"""

import time
from typing import Any
import pytest

from backend.app.orchestration.contracts import (
    ActionStep,
    ClaimKind,
    EvidenceChallengeReport,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    StageExecutionRecord,
    StageStatus,
    SupportPlanDraft,
)
from backend.app.orchestration.context import FilteredAgentContext
from backend.app.orchestration.coordinator import OrchestrationCoordinator
from backend.app.orchestration.provider import (
    MockLLMClient,
    ProviderFatalError,
    ProviderRecoverableError,
    ProviderTimeoutError,
)
from backend.app.orchestration.security import AuthorizationError, SecurityContext


# Helper stage mock executors
def mock_stage_1(ctx: FilteredAgentContext, timeout: float) -> SignalInterpretation:
    return SignalInterpretation(
        summary="Student has only 2 active VLE days and zero assessments.",
        velocity_assessment="Persistent inactivity observed.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )


def mock_stage_2(ctx: FilteredAgentContext, interp: SignalInterpretation, timeout: float) -> InterventionProposal:
    return InterventionProposal(
        selected_intervention_id="INT-VLE-ONBOARD-01",
        target_role="PEER_MENTOR",
        rationale="Early platform re-engagement needed.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )


def mock_stage_3(ctx: FilteredAgentContext, prop: InterventionProposal, timeout: float) -> SupportPlanDraft:
    return SupportPlanDraft(
        plan_title="Peer Mentoring Onboarding Plan",
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Peer mentor schedules 15-minute portal navigation session.",
                suggested_role=prop.target_role,
                target_days=5,
            )
        ],
        evidence_requirements=["Log confirmed login by day 35."],
        target_window_days=14,
    )


def mock_stage_4(ctx: FilteredAgentContext, plan: SupportPlanDraft, timeout: float) -> EvidenceChallengeReport:
    return EvidenceChallengeReport(
        critique_summary="Plan is grounded in telemetry and cataloged role constraints.",
        unsupported_claims=[],
        catalog_divergences=[],
        unjustified_certainty_flags=[],
        flags_count=0,
    )


def test_coordinator_full_four_stage_success(
    mock_llm_client: MockLLMClient,
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
):
    """Coordinator executes 4-stage sequential pipeline to full success without retries."""
    coordinator = OrchestrationCoordinator(
        provider=mock_llm_client,
        max_deadline_sec=18.0,
        stage_timeout_sec=4.0,
    )

    result: OrchestrationResult = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        stage_1_executor=mock_stage_1,
        stage_2_executor=mock_stage_2,
        stage_3_executor=mock_stage_3,
        stage_4_executor=mock_stage_4,
    )

    assert result.status == RunStatus.SUCCESS
    assert result.retries_used == 0
    assert result.validation_summary.passed is True
    assert len(result.stages) == 4

    for stage_id, record in result.stages.items():
        assert record.status == StageStatus.COMPLETED
        assert record.attempt_count == 1
        assert record.output is not None

    # Preserves authoritative EvidenceCard
    assert result.evidence_card.record_id == "SYNTH-TEST-001"
    assert result.evidence_card.risk_tier.value == "HIGH"


def test_coordinator_stage_1_failure_aborts_dependent_stages_and_preserves_card(
    mock_llm_client: MockLLMClient,
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
):
    """If Stage 1 fails fatally, Stages 2, 3, and 4 are skipped; EvidenceCard remains preserved."""
    coordinator = OrchestrationCoordinator(provider=mock_llm_client)

    def failing_stage_1(ctx: FilteredAgentContext, timeout: float) -> SignalInterpretation:
        raise ProviderFatalError("Syntax parse failure in mock executor")

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        stage_1_executor=failing_stage_1,
        stage_2_executor=mock_stage_2,
        stage_3_executor=mock_stage_3,
        stage_4_executor=mock_stage_4,
    )

    assert result.status == RunStatus.FAILED
    assert result.stages["stage_1_interpretation"].status == StageStatus.FAILED
    assert result.stages["stage_2_intervention"].status == StageStatus.SKIPPED
    assert result.stages["stage_3_plan"].status == StageStatus.SKIPPED
    assert result.stages["stage_4_challenge"].status == StageStatus.SKIPPED

    # Crucial: Authoritative EvidenceCard is preserved
    assert result.evidence_card.record_id == "SYNTH-TEST-001"


def test_coordinator_retry_budget_enforces_single_retry(
    mock_llm_client: MockLLMClient,
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
):
    """
    Coordinator permits at most 1 retry across the entire run for recoverable failures.
    Stage 1 recovers on attempt 2; Stage 2 experiences recoverable error but retry budget is exhausted.
    """
    coordinator = OrchestrationCoordinator(provider=mock_llm_client)

    stage_1_attempts = 0

    def recovering_stage_1(ctx: FilteredAgentContext, timeout: float) -> SignalInterpretation:
        nonlocal stage_1_attempts
        stage_1_attempts += 1
        if stage_1_attempts == 1:
            raise ProviderRecoverableError("Transient network glitch on attempt 1")
        return mock_stage_1(ctx, timeout)

    def failing_stage_2(ctx: FilteredAgentContext, interp: SignalInterpretation, timeout: float) -> InterventionProposal:
        raise ProviderRecoverableError("Transient timeout in stage 2")

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        stage_1_executor=recovering_stage_1,
        stage_2_executor=failing_stage_2,
        stage_3_executor=mock_stage_3,
        stage_4_executor=mock_stage_4,
    )

    # Stage 1 used the single available retry
    assert stage_1_attempts == 2
    assert result.stages["stage_1_interpretation"].status == StageStatus.COMPLETED
    assert result.stages["stage_1_interpretation"].attempt_count == 2
    assert result.retries_used == 1

    # Stage 2 failed because retry budget (1) was already consumed
    assert result.stages["stage_2_intervention"].status == StageStatus.FAILED
    assert result.stages["stage_2_intervention"].attempt_count == 1
    assert "retry budget exhausted" in result.stages["stage_2_intervention"].error

    # Stages 3 & 4 skipped
    assert result.stages["stage_3_plan"].status == StageStatus.SKIPPED
    assert result.stages["stage_4_challenge"].status == StageStatus.SKIPPED

    # Partial success because Stage 1 completed
    assert result.status == RunStatus.PARTIAL_SUCCESS


def test_coordinator_no_retry_when_budget_insufficient(
    mock_llm_client: MockLLMClient,
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
):
    """
    Coordinator does not retry if remaining overall time is less than MIN_RETRY_REMAINING_BUDGET_SEC (1.0s).
    """
    # Max deadline 0.5s is strictly less than 1.0s minimum retry budget
    coordinator = OrchestrationCoordinator(
        provider=mock_llm_client,
        max_deadline_sec=0.5,
    )

    def failing_stage(ctx: FilteredAgentContext, timeout: float) -> SignalInterpretation:
        raise ProviderRecoverableError("Recoverable error under tight budget")

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        stage_1_executor=failing_stage,
    )

    # No retry attempted
    assert result.stages["stage_1_interpretation"].attempt_count == 1
    assert result.retries_used == 0
    assert result.stages["stage_1_interpretation"].status == StageStatus.FAILED


def test_coordinator_enforces_security_boundary(
    mock_llm_client: MockLLMClient,
    sample_evidence_packet: EvidencePacket,
):
    """Coordinator denies pipeline execution if security context lacks campus authorization."""
    unauthorized_context = SecurityContext.create_test_context(
        actor_id="ROGUE-ADVISOR",
        campus_id="CAMPUS-UNAUTHORIZED",
    )
    coordinator = OrchestrationCoordinator(provider=mock_llm_client)

    with pytest.raises(AuthorizationError):
        coordinator.run_pipeline(
            evidence_packet=sample_evidence_packet,
            security_context=unauthorized_context,
            stage_1_executor=mock_stage_1,
        )
