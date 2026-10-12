"""
Unit tests for SQLite Support Evidence Ledger, audit chain verification,
atomic transactions, optimistic concurrency, and task/outcome separation.
"""

import json
import sqlite3
import pytest

from backend.app.orchestration.contracts import (
    ActionStep,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    StageExecutionRecord,
    StageStatus,
    SupportPlanDraft,
    ValidationFinding,
    ValidationSeverity,
    ValidationSummary,
)
from backend.app.orchestration.persistence.audit import compute_plan_hash
from backend.app.orchestration.persistence.db import create_connection, init_db
from backend.app.orchestration.persistence.models import (
    AdvisorDecisionKind,
    CaseDecisionRequest,
    CaseStatus,
    OutcomeRecordRequest,
    OutcomeStatus,
    TaskStatus,
    TaskStatusUpdateRequest,
)
from backend.app.orchestration.persistence.repository import CaseRepository
from sutra_ml.schemas.evidence_card import (
    GovernanceNotices,
    RiskTier,
    SutraEvidenceCard,
    build_evidence_card,
)


@pytest.fixture
def in_memory_repo() -> CaseRepository:
    """Provide an in-memory SQLite repository with initialized schema."""
    conn = create_connection(":memory:")
    init_db(conn)
    return CaseRepository(conn)


@pytest.fixture
def mock_orchestration_result() -> OrchestrationResult:
    """Fixture providing a valid 4-stage pipeline orchestration result."""
    card = build_evidence_card(
        record_id="SYNTH-TEST-01",
        module_code="BBB",
        presentation_code="2014J",
        risk_prob=0.78,
        top_pos_factors=[
            {
                "feature": "vle_days_since_last_click",
                "val": "22.0",
                "weight": 0.35,
                "desc": "22 days since last click",
            }
        ],
        top_neg_factors=[],
        model_name="BaselineLogisticRegression",
        model_version="1.0.0",
        threshold=0.46,
    )

    plan = SupportPlanDraft(
        plan_title="[SYNTHETIC DEMO] Test Support Plan",
        target_window_days=14,
        is_draft=True,
        action_steps=[
            ActionStep(
                step_number=1,
                step_id="STEP-1",
                action_description="Advisor outreach call",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=3,
                evidence_reference="vle_days_since_last_click",
                follow_up_evidence="Documented call log",
            ),
            ActionStep(
                step_number=2,
                step_id="STEP-2",
                action_description="Peer tutor connection",
                suggested_role="PEER_MENTOR",
                target_days=7,
                evidence_reference="vle_clicks_forumng_d30",
                follow_up_evidence="Mentorship circle entry",
            ),
        ],
        evidence_requirements=["Call log documented"],
        limitations_and_questions=["Verify student contact details"],
    )

    return OrchestrationResult(
        run_id="RUN-TEST-001",
        record_id="SYNTH-TEST-01",
        status=RunStatus.SUCCESS,
        evidence_card=card,
        stages={
            "stage_1_interpretation": StageExecutionRecord(
                stage_id="stage_1_interpretation",
                stage_name="Interpreter",
                status=StageStatus.COMPLETED,
                duration_ms=45.0,
                output=SignalInterpretation(
                    summary="Test interpretation",
                    velocity_assessment="Low clicks",
                    requires_human_review=True,
                ),
            ),
            "stage_3_plan": StageExecutionRecord(
                stage_id="stage_3_plan",
                stage_name="Planner",
                status=StageStatus.COMPLETED,
                duration_ms=50.0,
                output=plan,
            ),
        },
        validation_summary=ValidationSummary(
            passed=True,
            findings=[],
            error_count=0,
            warning_count=0,
        ),
        total_duration_ms=120.0,
        retries_used=0,
    )


def test_db_initialization_and_anti_tamper_triggers():
    """Verify database creates schema and anti-tamper triggers prevent UPDATE and DELETE on audit_ledger."""
    conn = create_connection(":memory:")
    init_db(conn)

    # Insert test audit event
    conn.execute(
        """
        INSERT INTO audit_ledger (
            event_id, case_id, event_type, actor_id, actor_role,
            payload_canonical_json, prev_entry_hash, entry_hash, timestamp
        ) VALUES ('E1', 'C1', 'TEST', 'ACT1', 'ADV', '{}', 'GENESIS', 'HASH1', '2026-01-01T00:00:00Z')
        """
    )

    # Attempting to UPDATE an audit record must be rejected by SQLite trigger
    with pytest.raises(sqlite3.DatabaseError) as exc_update:
        conn.execute("UPDATE audit_ledger SET actor_id = 'HACKER' WHERE event_id = 'E1'")
    assert "append-only" in str(exc_update.value).lower()

    # Attempting to DELETE an audit record must be rejected by SQLite trigger
    with pytest.raises(sqlite3.DatabaseError) as exc_delete:
        conn.execute("DELETE FROM audit_ledger WHERE event_id = 'E1'")
    assert "cannot be deleted" in str(exc_delete.value).lower()


def test_audit_hash_chain_verification_and_corruption_detection(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify cryptographic audit hash chain verification detects normal validity and tampering."""
    features = {"vle_days_since_last_click": 22.0, "vle_active_days_d30": 2.0}
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features=features,
    )

    # 1. Normal audit verification should pass
    res = in_memory_repo.verify_audit_ledger()
    assert res.is_valid is True
    assert res.total_events >= 4
    assert res.corrupted_seq_id is None

    # 2. Simulate out-of-band corruption by temporarily dropping trigger and altering a hash
    with in_memory_repo.conn:
        in_memory_repo.conn.execute("DROP TRIGGER prevent_audit_ledger_update")
        in_memory_repo.conn.execute(
            "UPDATE audit_ledger SET entry_hash = 'TAMPERED_HASH' WHERE seq_id = 2"
        )

    tampered_res = in_memory_repo.verify_audit_ledger()
    assert tampered_res.is_valid is False
    assert tampered_res.corrupted_seq_id == 2
    assert "mismatch" in tampered_res.message.lower() or "broken" in tampered_res.message.lower()


def test_atomic_decision_and_task_creation(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify APPROVE decision creates tasks atomically and updates status to APPROVED."""
    features = {"vle_days_since_last_click": 22.0}
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features=features,
    )

    case_id = f"CASE-{mock_orchestration_result.record_id}"

    # Submit APPROVE decision
    request = CaseDecisionRequest(
        decision_kind=AdvisorDecisionKind.APPROVE,
        reviewed_plan_version=1,
        notes="Reviewed and approved by academic advisor.",
        idempotency_key="IDEMP-001",
    )

    detail = in_memory_repo.submit_advisor_decision(
        case_id=case_id,
        request=request,
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    assert detail.case.status == CaseStatus.APPROVED
    assert len(detail.decisions) == 1
    assert detail.decisions[0].decision_kind == AdvisorDecisionKind.APPROVE
    assert len(detail.tasks) == 2
    assert detail.tasks[0].status == TaskStatus.PENDING
    assert detail.tasks[0].assigned_role == "ACADEMIC_ADVISOR"
    assert detail.tasks[1].assigned_role == "PEER_MENTOR"


def test_plan_modification_preserves_version_history(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify advisor modifying a plan preserves original v1 draft and creates versioned v2."""
    features = {"vle_days_since_last_click": 22.0}
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features=features,
    )
    case_id = f"CASE-{mock_orchestration_result.record_id}"

    modified_plan = SupportPlanDraft(
        plan_title="[ADVISOR MODIFIED] Customized Onboarding Plan",
        target_window_days=10,
        is_draft=False,
        action_steps=[
            ActionStep(
                step_number=1,
                step_id="MOD-STEP-1",
                action_description="Direct in-person consultation with advisor",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=2,
            )
        ],
        evidence_requirements=["In-person attendance slip"],
    )

    request = CaseDecisionRequest(
        decision_kind=AdvisorDecisionKind.MODIFY,
        reviewed_plan_version=1,
        notes="Shortened target window to 2 days for immediate triage.",
        modified_plan=modified_plan,
    )

    detail = in_memory_repo.submit_advisor_decision(
        case_id=case_id,
        request=request,
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    assert detail.case.status == CaseStatus.APPROVED
    assert detail.case.current_plan_version == 2
    assert len(detail.plan_versions) == 2

    # Original v1 preserved
    v1 = detail.plan_versions[0]
    assert v1.version_number == 1
    assert v1.is_advisor_modified is False
    assert len(v1.action_steps) == 2

    # Modified v2 created
    v2 = detail.plan_versions[1]
    assert v2.version_number == 2
    assert v2.is_advisor_modified is True
    assert v2.plan_title == "[ADVISOR MODIFIED] Customized Onboarding Plan"
    assert len(v2.action_steps) == 1

    # Tasks created correspond to v2
    assert len(detail.tasks) == 1
    assert detail.tasks[0].plan_version == 2
    assert detail.tasks[0].action_description == "Direct in-person consultation with advisor"


def test_hard_deterministic_validation_gate_blocks_approval(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify that if deterministic validation failed, advisor APPROVE is strictly rejected."""
    # Alter mock orchestration result to have validation failure
    mock_orchestration_result.validation_summary = ValidationSummary(
        passed=False,
        findings=[
            ValidationFinding(
                field="selected_intervention_id",
                severity=ValidationSeverity.ERROR,
                message="Uncataloged intervention ID",
                code="ERR_UNCATALOGED_INTERVENTION",
            )
        ],
        error_count=1,
        warning_count=0,
    )

    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features={},
    )
    case_id = f"CASE-{mock_orchestration_result.record_id}"

    request = CaseDecisionRequest(
        decision_kind=AdvisorDecisionKind.APPROVE,
        reviewed_plan_version=1,
        notes="Attempting approval despite validation failure",
    )

    with pytest.raises(ValueError) as exc:
        in_memory_repo.submit_advisor_decision(
            case_id=case_id,
            request=request,
            actor_id="ADV-MAIN-01",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS-MAIN",
        )
    assert "deterministic validation failed" in str(exc.value).lower()


def test_optimistic_concurrency_stale_version_rejection(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify optimistic concurrency rejects a decision reviewing a stale version."""
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features={},
    )
    case_id = f"CASE-{mock_orchestration_result.record_id}"

    # First modification bumps version to 2
    mod_plan = SupportPlanDraft(
        plan_title="Modified Plan",
        target_window_days=10,
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Step 1",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=5,
            )
        ],
    )
    in_memory_repo.submit_advisor_decision(
        case_id=case_id,
        request=CaseDecisionRequest(
            decision_kind=AdvisorDecisionKind.MODIFY,
            reviewed_plan_version=1,
            notes="First edit",
            modified_plan=mod_plan,
        ),
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    # Stale reviewer attempts to approve version 1 when case is at version 2
    stale_req = CaseDecisionRequest(
        decision_kind=AdvisorDecisionKind.APPROVE,
        reviewed_plan_version=1,  # Stale!
        notes="Reviewing stale draft",
    )
    with pytest.raises(ValueError) as exc:
        in_memory_repo.submit_advisor_decision(
            case_id=case_id,
            request=stale_req,
            actor_id="ADV-MAIN-02",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS-MAIN",
        )
    assert "concurrency conflict" in str(exc.value).lower()


def test_idempotency_prevents_duplicate_tasks(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify idempotency key returns existing decision without duplicating tasks."""
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features={},
    )
    case_id = f"CASE-{mock_orchestration_result.record_id}"

    req = CaseDecisionRequest(
        decision_kind=AdvisorDecisionKind.APPROVE,
        reviewed_plan_version=1,
        notes="First approval",
        idempotency_key="UNIQUE-KEY-123",
    )

    detail_1 = in_memory_repo.submit_advisor_decision(
        case_id=case_id,
        request=req,
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )
    initial_task_count = len(detail_1.tasks)

    # Re-submit identical request with same key
    detail_2 = in_memory_repo.submit_advisor_decision(
        case_id=case_id,
        request=req,
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    assert len(detail_2.tasks) == initial_task_count

    # Submitting different decision with SAME key must fail with idempotency conflict
    conflicting_req = CaseDecisionRequest(
        decision_kind=AdvisorDecisionKind.REJECT,
        reviewed_plan_version=1,
        notes="Conflicting decision",
        idempotency_key="UNIQUE-KEY-123",
    )
    with pytest.raises(ValueError) as exc:
        in_memory_repo.submit_advisor_decision(
            case_id=case_id,
            request=conflicting_req,
            actor_id="ADV-MAIN-01",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS-MAIN",
        )
    assert "idempotency conflict" in str(exc.value).lower()


def test_task_completion_does_not_alter_student_outcome(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """CRITICAL TEST: Task execution does NOT automatically change student outcome status."""
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features={},
    )
    case_id = f"CASE-{mock_orchestration_result.record_id}"

    # Approve to generate tasks
    detail = in_memory_repo.submit_advisor_decision(
        case_id=case_id,
        request=CaseDecisionRequest(
            decision_kind=AdvisorDecisionKind.APPROVE,
            reviewed_plan_version=1,
            notes="Approved",
        ),
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    task_1 = detail.tasks[0]
    task_2 = detail.tasks[1]

    # Complete task 1
    in_memory_repo.update_task_status(
        task_id=task_1.task_id,
        request=TaskStatusUpdateRequest(
            status=TaskStatus.COMPLETED,
            completion_note="Phone outreach completed successfully.",
        ),
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    # Complete task 2
    in_memory_repo.update_task_status(
        task_id=task_2.task_id,
        request=TaskStatusUpdateRequest(
            status=TaskStatus.COMPLETED,
            completion_note="Peer mentor study group introduction recorded.",
        ),
        actor_id="COACH-MAIN-01",
        actor_role="STUDENT_SUCCESS_COACH",
        campus_id="CAMPUS-MAIN",
    )

    case_after_tasks = in_memory_repo.get_case(case_id)
    assert case_after_tasks is not None
    assert case_after_tasks.status == CaseStatus.TASKS_COMPLETED
    # Outcome MUST STILL BE UNOBSERVED!
    assert case_after_tasks.outcome_status == OutcomeStatus.UNOBSERVED
    assert case_after_tasks.outcome_summary is None

    # Now independently record student course outcome
    in_memory_repo.record_outcome(
        case_id=case_id,
        request=OutcomeRecordRequest(
            outcome_status=OutcomeStatus.RECORDED,
            outcome_summary="Final course grade Pass recorded at Day 120 assessment.",
        ),
        actor_id="ADV-MAIN-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS-MAIN",
    )

    case_final = in_memory_repo.get_case(case_id)
    assert case_final.outcome_status == OutcomeStatus.RECORDED
    assert "Pass" in case_final.outcome_summary


def test_catalog_role_enforcement_on_modified_plan(
    in_memory_repo: CaseRepository,
    mock_orchestration_result: OrchestrationResult,
):
    """Verify modified plan cannot assign tasks to unauthorized non-catalog roles."""
    in_memory_repo.create_case_from_run(
        result=mock_orchestration_result,
        campus_id="CAMPUS-MAIN",
        student_input_features={},
    )
    case_id = f"CASE-{mock_orchestration_result.record_id}"

    invalid_plan = SupportPlanDraft(
        plan_title="Disallowed Role Plan",
        target_window_days=10,
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Step with fake role",
                suggested_role="UNAUTHORIZED_CONTRACTOR",
                target_days=5,
            )
        ],
    )

    with pytest.raises(ValueError) as exc:
        in_memory_repo.submit_advisor_decision(
            case_id=case_id,
            request=CaseDecisionRequest(
                decision_kind=AdvisorDecisionKind.MODIFY,
                reviewed_plan_version=1,
                notes="Attempting unauthorized role",
                modified_plan=invalid_plan,
            ),
            actor_id="ADV-MAIN-01",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS-MAIN",
        )
    assert "approved demo catalog standard roles" in str(exc.value)
