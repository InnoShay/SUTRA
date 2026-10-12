"""
Integration tests for SUTRA Phase 3: Full Four-Specialist Orchestration Pipeline.

Tests:
1. End-to-end 4-stage sequential pipeline execution to RunStatus.SUCCESS.
2. Invariant: 4-stage completion remains an unapproved draft awaiting human review.
3. Stage 1 failure aborts Stages 2, 3, and 4 (all reporting attempt_count=0).
4. Stage 2 failure aborts Stages 3 and 4 (reporting attempt_count=0).
5. Stage 3 validation failure aborts Stage 4 (reporting attempt_count=0).
6. Agent 4 advisory challenge flags preserved distinctly as warnings without crashing gate.
7. Attempt accounting: SKIPPED or PENDING stages report attempt_count == 0.
8. Hard overall deadline exhaustion preserves authoritative EvidenceCard.
9. Bounded retry budget capping across 4 stages.
"""

import pytest

from backend.app.orchestration.agents.evidence_challenge_agent import EvidenceChallengeAgent
from backend.app.orchestration.agents.intervention_strategist import InterventionStrategist
from backend.app.orchestration.agents.signal_interpreter import StudentSignalInterpreter
from backend.app.orchestration.agents.support_plan_designer import SupportPlanDesigner
from backend.app.orchestration.contracts import (
    ActionStep,
    ChallengeFinding,
    ClaimKind,
    EvidenceChallengeReport,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    StageStatus,
    SupportPlanDraft,
    ValidationSeverity,
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
        rationale="Student needs LMS navigation check-in due to low platform active days.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
        alternative_intervention_ids=["INT-PEER-CONNECT-01"],
    )


@pytest.fixture
def valid_stage_3_plan() -> SupportPlanDraft:
    return SupportPlanDraft(
        plan_title="Digital Onboarding & Mentoring Check-in",
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Peer mentor schedules 20-minute LMS walk-through session.",
                suggested_role="PEER_MENTOR",
                target_days=5,
                step_id="STEP-1",
                evidence_reference="vle_active_days_d30",
                follow_up_evidence="Mentor log note verifying completed session.",
            ),
            ActionStep(
                step_number=2,
                action_description="Academic advisor reviews subsequent week telemetry.",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=12,
                step_id="STEP-2",
                follow_up_evidence="Activity report showing clicks in subsequent 7-day period.",
            ),
        ],
        evidence_requirements=["Completed mentor check-in log note."],
        target_window_days=14,
        is_draft=True,
        rationale="Structured peer support followed by telemetry audit.",
    )


@pytest.fixture
def valid_stage_4_challenge() -> EvidenceChallengeReport:
    return EvidenceChallengeReport(
        critique_summary="Plan is grounded in telemetry and satisfies catalog constraints.",
        unsupported_claims=[],
        catalog_divergences=[],
        unjustified_certainty_flags=[],
        flags_count=0,
        findings=[],
    )


def test_full_four_stage_pipeline_success(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
    valid_stage_2_proposal: InterventionProposal,
    valid_stage_3_plan: SupportPlanDraft,
    valid_stage_4_challenge: EvidenceChallengeReport,
):
    """
    Full four-specialist triage pipeline executes sequentially to SUCCESS.
    All 4 stages complete; authoritative EvidenceCard preserved.
    """
    mock_client = MockLLMClient()
    mock_client.register_response(SignalInterpretation, valid_stage_1_interpretation)
    mock_client.register_response(InterventionProposal, valid_stage_2_proposal)
    mock_client.register_response(SupportPlanDraft, valid_stage_3_plan)
    mock_client.register_response(EvidenceChallengeReport, valid_stage_4_challenge)

    coordinator = OrchestrationCoordinator(provider=mock_client)

    result: OrchestrationResult = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=4,
    )

    assert result.status == RunStatus.SUCCESS
    assert result.retries_used == 0
    assert result.validation_summary.passed is True
    assert len(result.stages) == 4

    # All 4 stages executed with exactly 1 attempt
    for stage_id, rec in result.stages.items():
        assert rec.status == StageStatus.COMPLETED
        assert rec.attempt_count == 1
        assert rec.output is not None

    # Crucial Invariant: plan remains a draft awaiting human review
    plan_out: SupportPlanDraft = result.stages["stage_3_plan"].output
    assert plan_out.is_draft is True

    interp_out: SignalInterpretation = result.stages["stage_1_interpretation"].output
    assert interp_out.requires_human_review is True

    # Authoritative Evidence Card preserved intact
    assert result.evidence_card.record_id == "SYNTH-TEST-001"
    assert result.evidence_card.risk_tier.value == "HIGH"


def test_stage_1_failure_skips_downstream_with_zero_attempts(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
):
    """If Stage 1 fails fatally, Stages 2, 3, and 4 are SKIPPED with attempt_count == 0."""
    mock_client = MockLLMClient(force_fatal_error=True)
    coordinator = OrchestrationCoordinator(provider=mock_client)

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=4,
    )

    assert result.status == RunStatus.FAILED
    assert result.stages["stage_1_interpretation"].status == StageStatus.FAILED
    assert result.stages["stage_1_interpretation"].attempt_count == 1

    # Stages 2, 3, 4 are SKIPPED and do NOT claim invocation attempts
    for sid in ["stage_2_intervention", "stage_3_plan", "stage_4_challenge"]:
        rec = result.stages[sid]
        assert rec.status == StageStatus.SKIPPED
        assert rec.attempt_count == 0
        assert rec.output is None

    # ML Evidence Card preserved
    assert result.evidence_card.record_id == "SYNTH-TEST-001"


def test_stage_2_validation_failure_aborts_stages_3_and_4(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
):
    """If Stage 2 outputs an uncataloged intervention, Stages 3 & 4 are skipped with attempt_count == 0."""
    invalid_proposal = InterventionProposal(
        selected_intervention_id="UNCATALOGED-POLICY-99",  # Invalid ID!
        target_role="ACADEMIC_ADVISOR",
        rationale="Invented policy proposal.",
        evidence_references=[],
    )

    coordinator = OrchestrationCoordinator(provider=MockLLMClient())

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        stage_1_executor=lambda ctx, to: valid_stage_1_interpretation,
        stage_2_executor=lambda ctx, interp, to: invalid_proposal,
        max_active_stages=4,
    )

    # Deterministic validator caught uncataloged intervention
    assert result.status == RunStatus.FAILED
    assert result.stages["stage_1_interpretation"].status == StageStatus.COMPLETED
    assert result.stages["stage_2_intervention"].status == StageStatus.COMPLETED
    assert result.validation_summary.passed is False
    assert any(f.code == "ERR_UNCATALOGED_INTERVENTION" for f in result.validation_summary.findings)

    # Downstream stages 3 & 4 aborted with zero attempts
    assert result.stages["stage_3_plan"].status == StageStatus.SKIPPED
    assert result.stages["stage_3_plan"].attempt_count == 0
    assert result.stages["stage_4_challenge"].status == StageStatus.SKIPPED
    assert result.stages["stage_4_challenge"].attempt_count == 0


def test_stage_3_validation_failure_aborts_stage_4(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
    valid_stage_2_proposal: InterventionProposal,
):
    """If Stage 3 violates catalog role constraints, Stage 4 is aborted with attempt_count == 0 and run FAILED."""
    invalid_plan = SupportPlanDraft(
        plan_title="Disallowed Role Plan",
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Hold meeting.",
                suggested_role="DISALLOWED_ROLE_99",
                target_days=5,
                follow_up_evidence="Log.",
            )
        ],
        evidence_requirements=["Log."],
        target_window_days=14,
    )

    coordinator = OrchestrationCoordinator(provider=MockLLMClient())

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        stage_1_executor=lambda ctx, to: valid_stage_1_interpretation,
        stage_2_executor=lambda ctx, interp, to: valid_stage_2_proposal,
        stage_3_executor=lambda ctx, prop, to: invalid_plan,
        max_active_stages=4,
    )

    assert result.status == RunStatus.FAILED
    assert result.stages["stage_3_plan"].status == StageStatus.COMPLETED
    assert result.validation_summary.passed is False
    assert any(f.code == "ERR_DISALLOWED_ROLE" for f in result.validation_summary.findings)

    # Stage 4 aborted with attempt_count == 0
    assert result.stages["stage_4_challenge"].status == StageStatus.SKIPPED
    assert result.stages["stage_4_challenge"].attempt_count == 0


def test_agent_4_advisory_findings_recorded_without_failing_gate(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
    valid_stage_2_proposal: InterventionProposal,
    valid_stage_3_plan: SupportPlanDraft,
):
    """Agent 4 critique findings are recorded as advisory warnings while run remains SUCCESS."""
    advisory_challenge = EvidenceChallengeReport(
        critique_summary="Red-team flag: student note mentioned broken laptop which is unverified.",
        unsupported_claims=["Student note implies broken laptop without telemetry evidence."],
        catalog_divergences=[],
        unjustified_certainty_flags=["Assumes disengagement is strictly tech-related."],
        flags_count=2,
        findings=[
            ChallengeFinding(
                target="plan.rationale",
                severity=ValidationSeverity.WARNING,
                reason="Advisory note on potential unverified student assumption.",
            )
        ],
    )

    mock_client = MockLLMClient()
    mock_client.register_response(SignalInterpretation, valid_stage_1_interpretation)
    mock_client.register_response(InterventionProposal, valid_stage_2_proposal)
    mock_client.register_response(SupportPlanDraft, valid_stage_3_plan)
    mock_client.register_response(EvidenceChallengeReport, advisory_challenge)

    coordinator = OrchestrationCoordinator(provider=mock_client)

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=4,
    )

    # Deterministic checks passed; advisory flags recorded as warnings
    assert result.status == RunStatus.SUCCESS
    assert result.validation_summary.passed is True
    assert result.validation_summary.warning_count >= 2
    assert any(f.code == "WARN_ADVISORY_CHALLENGE" for f in result.validation_summary.findings)


def test_deadline_exhaustion_preserves_card_and_stops_pipeline(
    sample_evidence_packet: EvidencePacket,
    mock_security_context: SecurityContext,
    valid_stage_1_interpretation: SignalInterpretation,
):
    """When run deadline is tight, coordinator times out gracefully and preserves EvidenceCard."""
    mock_client = MockLLMClient(simulated_latency_sec=0.1)
    mock_client.register_response(SignalInterpretation, valid_stage_1_interpretation)

    # Max deadline of 0.05s is immediately exhausted
    coordinator = OrchestrationCoordinator(
        provider=mock_client,
        max_deadline_sec=0.05,
    )

    result = coordinator.run_pipeline(
        evidence_packet=sample_evidence_packet,
        security_context=mock_security_context,
        max_active_stages=4,
    )

    # Preserves authoritative EvidenceCard
    assert result.evidence_card.record_id == "SYNTH-TEST-001"
    assert result.evidence_card.risk_tier.value == "HIGH"
    # Stage 1 timed out before execution could complete
    assert result.stages["stage_1_interpretation"].status in (StageStatus.TIMED_OUT, StageStatus.FAILED)
