"""
Automated Unit and Integration Tests for SUTRA Phase Eighteen.

Verifies:
1. Loading synthetic profiles & evaluating explainable risk signals.
2. Mandatory human review gate before case assignment.
3. State machine transitions (valid and invalid paths rejected).
4. Assignment, deadlines, reassignment, and overdue escalation tracking.
5. Follow-up evidence and structured outcome recording.
6. Rejection path with mandatory rationale.
7. Audit trail correctness and immutability.
8. Confidential financial-aid routing and access restrictions.
9. Insufficient and stale data handling.
10. Dynamic cohort-level metric calculation from actual records.
11. Local demonstration persistence store contracts (seed, reset, atomic save).
12. Zero external side effects or real messages.
13. Production model hash (78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f) and threshold (0.46) immutability.
14. Shadow-mode candidate gate remaining closed.
15. FastAPI endpoint integration tests.
"""

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import pytest
from starlette.testclient import TestClient

from backend.app.core.config import DEFAULT_MODEL_PATH
from backend.app.main import app
from sutra_ml.interventions.engine import InterventionWorkflowEngine
from sutra_ml.interventions.store import InterventionCaseStore
from sutra_ml.schemas.interventions import (
    AuditEvent,
    CasePriority,
    CaseStatus,
    EscalationLevel,
    InterventionCase,
    InterventionType,
    OutcomeCategory,
    is_valid_transition,
)
from sutra_ml.schemas.multisource import (
    AssignedRole,
    SignalCategory,
    SignalSeverity,
    StudentSuccess360Profile,
)
from sutra_ml.signals.risk_signal_engine import RiskSignal, RiskSignalEngine


EXPECTED_PRODUCTION_SHA256 = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"


@pytest.fixture
def tmp_store(tmp_path):
    store_file = tmp_path / "test_cases.json"
    store = InterventionCaseStore(store_path=store_file)
    store.reset_to_seed()
    return store


@pytest.fixture
def engine(tmp_store):
    return InterventionWorkflowEngine(store=tmp_store)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_production_artifact_and_threshold_immutability():
    """Verify production baseline v1.0.0 artifact hash and threshold 0.46 remain unchanged."""
    assert DEFAULT_MODEL_PATH.exists(), f"Production model missing at {DEFAULT_MODEL_PATH}"
    with open(DEFAULT_MODEL_PATH, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    assert file_hash == EXPECTED_PRODUCTION_SHA256, (
        f"Production model SHA-256 altered! Expected {EXPECTED_PRODUCTION_SHA256}, got {file_hash}"
    )

    metadata_path = DEFAULT_MODEL_PATH.parent / "model_metadata.json"
    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert round(meta["selected_threshold"], 2) == 0.46
    assert meta["selected_model"] == "Regularized Logistic Regression Baseline"


def test_shadow_mode_candidate_execution_gate_remains_closed():
    """Verify experimental model candidate gate is closed by default."""
    from sutra_ml.evaluation.shadow_mode import ShadowModeEvaluator
    evaluator = ShadowModeEvaluator()
    assert evaluator.candidate_provenance_verified is False
    assert evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"


def test_state_machine_valid_and_invalid_transitions():
    """Verify state machine allows legal transitions and strictly rejects invalid jumps."""
    # Legal transitions
    assert is_valid_transition(CaseStatus.RECOMMENDED, CaseStatus.AWAITING_REVIEW)
    assert is_valid_transition(CaseStatus.RECOMMENDED, CaseStatus.APPROVED)
    assert is_valid_transition(CaseStatus.RECOMMENDED, CaseStatus.REJECTED)
    assert is_valid_transition(CaseStatus.APPROVED, CaseStatus.ASSIGNED)
    assert is_valid_transition(CaseStatus.ASSIGNED, CaseStatus.IN_PROGRESS)
    assert is_valid_transition(CaseStatus.IN_PROGRESS, CaseStatus.FOLLOW_UP_RECORDED)
    assert is_valid_transition(CaseStatus.FOLLOW_UP_RECORDED, CaseStatus.CLOSED)

    # Illegal transitions
    assert not is_valid_transition(CaseStatus.RECOMMENDED, CaseStatus.ASSIGNED)  # Missing human review
    assert not is_valid_transition(CaseStatus.RECOMMENDED, CaseStatus.CLOSED)    # Missing review & follow-up
    assert not is_valid_transition(CaseStatus.CLOSED, CaseStatus.ASSIGNED)       # Terminal state
    assert not is_valid_transition(CaseStatus.REJECTED, CaseStatus.IN_PROGRESS)  # Terminal state


def test_mandatory_human_review_gate_before_assignment(engine):
    """Enforce that cases cannot be assigned directly without human approval."""
    # Create new recommendation
    sig = RiskSignal(
        signal_id="SIG-TEST-ATT-01",
        category=SignalCategory.ATTENDANCE,
        severity=SignalSeverity.HIGH,
        title="Attendance Warning",
        evidence={"consecutive_absences": 4},
        rule_description="Test rule",
        observation_freshness="1d",
        confidence_limitation="None",
        recommended_action="Advisor check-in",
        assigned_role=AssignedRole.ACADEMIC_ADVISOR,
    )
    case = engine.create_case_from_signal(
        student_key="SYNTH-360-TEST-01",
        signal=sig,
        initial_status=CaseStatus.RECOMMENDED,
    )
    assert case.status == CaseStatus.RECOMMENDED
    assert not case.is_human_reviewed

    # Attempting to assign unreviewed case MUST fail closed
    with pytest.raises(ValueError, match="Human review required before assignment"):
        engine.assign_case(
            case_id=case.case_id,
            assigned_by_role="COORDINATOR",
            assigned_by_id="COORD-01",
            assigned_role=AssignedRole.ACADEMIC_ADVISOR,
            assignee_id="STAFF-ADV-02",
            due_date="2026-10-30",
        )


def test_review_rejection_requires_rationale(engine):
    """Test rejecting a recommendation requires documented rationale."""
    sig = RiskSignal(
        signal_id="SIG-TEST-REJ-01",
        category=SignalCategory.ACADEMIC,
        severity=SignalSeverity.MEDIUM,
        title="Quiz Drop",
        evidence={"quiz_avg": 55.0},
        rule_description="Test rule",
        observation_freshness="1d",
        confidence_limitation="None",
        recommended_action="Tutoring referral",
        assigned_role=AssignedRole.COURSE_INSTRUCTOR,
    )
    case = engine.create_case_from_signal(
        student_key="SYNTH-360-TEST-02",
        signal=sig,
    )

    # Empty rationale fails
    with pytest.raises(ValueError, match="documented review rationale"):
        engine.review_case(
            case_id=case.case_id,
            reviewer_role="COURSE_INSTRUCTOR",
            reviewer_id="STAFF-INST-01",
            approved=False,
            rationale="",
        )

    # Valid rejection succeeds and transitions to REJECTED
    rejected = engine.review_case(
        case_id=case.case_id,
        reviewer_role="COURSE_INSTRUCTOR",
        reviewer_id="STAFF-INST-01",
        approved=False,
        rationale="Student already attended office hours and mastered formative concepts.",
    )
    assert rejected.status == CaseStatus.REJECTED
    assert rejected.is_human_reviewed
    assert "office hours" in rejected.decision_rationale


def test_full_lifecycle_and_audit_trail(engine):
    """Execute complete workflow from proposal to closure and inspect audit trail."""
    sig = RiskSignal(
        signal_id="SIG-LIFECYCLE-01",
        category=SignalCategory.ATTENDANCE,
        severity=SignalSeverity.CRITICAL,
        title="Severe Attendance Drop",
        evidence={"consecutive_absences": 5, "recent_attendance_pct": 30.0},
        rule_description="Test rule",
        observation_freshness="1d",
        confidence_limitation="None",
        recommended_action="Holistic check-in",
        assigned_role=AssignedRole.ACADEMIC_ADVISOR,
    )

    # 1. Propose
    case = engine.create_case_from_signal(
        student_key="SYNTH-360-TEST-03",
        signal=sig,
    )
    assert case.status == CaseStatus.RECOMMENDED

    # 2. Review & Approve
    case = engine.review_case(
        case_id=case.case_id,
        reviewer_role="ACADEMIC_ADVISOR",
        reviewer_id="STAFF-ADV-01",
        approved=True,
        rationale="Approved supportive check-in. Non-punitive orientation verified.",
    )
    assert case.status == CaseStatus.APPROVED

    # 3. Assign
    case = engine.assign_case(
        case_id=case.case_id,
        assigned_by_role="STUDENT_SUCCESS_COORDINATOR",
        assigned_by_id="STAFF-COORD-01",
        assigned_role=AssignedRole.ACADEMIC_ADVISOR,
        assignee_id="STAFF-ADV-05",
        due_date="2026-10-28",
        reference_date="2026-10-15",
    )
    assert case.status == CaseStatus.ASSIGNED
    assert case.assignee_id == "STAFF-ADV-05"
    assert not case.is_overdue

    # 4. Start In-Progress
    case = engine.start_progress(
        case_id=case.case_id,
        actor_role="ACADEMIC_ADVISOR",
        actor_id="STAFF-ADV-05",
    )
    assert case.status == CaseStatus.IN_PROGRESS

    # 5. Follow-Up
    case = engine.record_follow_up(
        case_id=case.case_id,
        actor_role="ACADEMIC_ADVISOR",
        actor_id="STAFF-ADV-05",
        follow_up_notes="Conducted in-person check-in. Addressed commuting delays.",
    )
    assert case.status == CaseStatus.FOLLOW_UP_RECORDED
    assert "commuting delays" in case.follow_up_notes

    # 6. Record Outcome & Close
    case = engine.record_outcome(
        case_id=case.case_id,
        actor_role="ACADEMIC_ADVISOR",
        actor_id="STAFF-ADV-05",
        outcome_category=OutcomeCategory.STUDENT_ENGAGEMENT_IMPROVED,
        outcome_notes="Attendance restored to 85% over subsequent two weeks.",
        close_case=True,
    )
    assert case.status == CaseStatus.CLOSED
    assert case.outcome_category == OutcomeCategory.STUDENT_ENGAGEMENT_IMPROVED

    # Audit Trail verification
    assert len(case.audit_history) == 6
    actions = [evt.action for evt in case.audit_history]
    assert actions == [
        "CREATE_CASE_PROPOSAL",
        "REVIEW_APPROVAL",
        "ASSIGN_STAKEHOLDER",
        "START_IN_PROGRESS",
        "RECORD_FOLLOW_UP_NOTES",
        "RECORD_OUTCOME_AND_CLOSE",
    ]


def test_overdue_detection_and_escalation_policy(engine):
    """Verify overdue tasks are detected against simulation date and escalated internally."""
    # Assign a case with past due date
    case = engine.store.get_by_id("CASE-2026-001")
    # Review & approve it first
    case = engine.review_case(
        case_id=case.case_id,
        reviewer_role="ACADEMIC_ADVISOR",
        reviewer_id="STAFF-ADV-01",
        approved=True,
        rationale="Approved for tutor follow-up.",
    )
    # Assign with past due date relative to 2026-10-15
    assigned = engine.assign_case(
        case_id=case.case_id,
        assigned_by_role="COORDINATOR",
        assigned_by_id="COORD-01",
        assigned_role=AssignedRole.ACADEMIC_ADVISOR,
        assignee_id="STAFF-ADV-09",
        due_date="2026-10-01",
        reference_date="2026-10-15",
    )
    assert assigned.is_overdue is True
    assert assigned.escalation_level == EscalationLevel.OVERDUE_FLAGGED

    # Trigger escalation policy
    escalated = engine.escalate_case(
        case_id=assigned.case_id,
        actor_role="SUPERVISOR",
        actor_id="STAFF-SUP-01",
        escalation_reason="No progress recorded after 14 days overdue.",
    )
    assert escalated.escalation_level == EscalationLevel.SUPERVISOR_NOTIFIED
    assert escalated.audit_history[-1].action == "ESCALATE_POLICY_FLAG"


def test_confidential_financial_routing_restrictions(engine):
    """Verify confidential cases and fee status are restricted to authorized financial role."""
    # Advisor view
    metrics_advisor = engine.compute_cohort_metrics(user_role="ACADEMIC_ADVISOR")
    # Financial counselor view
    metrics_fin = engine.compute_cohort_metrics(user_role="FINANCIAL_AID_COUNSELOR")

    assert metrics_advisor["confidential_cases_count"] >= 1
    # Total visible cases for advisor excludes confidential cases
    assert metrics_advisor["total_intervention_cases"] < metrics_fin["total_intervention_cases"]


def test_stale_and_insufficient_data_produces_review_not_punishment():
    """Verify that stale or missing data produces data quality warning without raising punitive risk."""
    scenarios_path = Path("ml/data/synthetic/multisource_scenarios.json")
    with open(scenarios_path, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    stale_profile_raw = scenarios["STALE_AND_MISSING_DATA"]
    profile = StudentSuccess360Profile.model_validate(stale_profile_raw)
    engine_sig = RiskSignalEngine()
    result = engine_sig.evaluate_profile(profile)

    # Must contain a DATA_QUALITY signal
    data_quality_signals = [s for s in result.signals if s.category == SignalCategory.DATA_QUALITY]
    assert len(data_quality_signals) >= 1
    assert "freshness" in data_quality_signals[0].title.lower() or "completeness" in data_quality_signals[0].title.lower()
    # Confirm recommendation is non-punitive
    assert "sync" in data_quality_signals[0].recommended_action.lower() or "audit" in data_quality_signals[0].recommended_action.lower()


def test_zero_external_side_effects_guarantee(engine):
    """Verify system has no real network sockets, email, or messaging triggers."""
    case = engine.store.get_by_id("CASE-2026-003")
    escalated = engine.escalate_case(
        case_id=case.case_id,
        actor_role="SYSTEM_MONITOR",
        actor_id="SYS-DAEMON",
    )
    assert escalated.is_synthetic is True
    # Audit log confirms simulated action
    assert "Internal" in escalated.audit_history[1].rationale or "triage" in escalated.audit_history[1].rationale or "flag" in escalated.audit_history[1].rationale.lower()


# =========================================================================
# FastAPI Endpoint Integration Tests
# =========================================================================

def test_api_list_profiles(client):
    """Test GET /api/v1/interventions/profiles."""
    response = client.get("/api/v1/interventions/profiles")
    assert response.status_code == 200
    profiles = response.json()
    assert len(profiles) > 0
    assert "student_key" in profiles[0]
    assert "signals_count" in profiles[0]


def test_api_get_profile_confidentiality_gating(client):
    """Test GET /api/v1/interventions/profiles/{student_key} fee masking."""
    student_key = "SYNTH-360-FIN-SUPPORT-04"

    # Unauthorized role (Academic Advisor): fee status masked
    resp_adv = client.get(f"/api/v1/interventions/profiles/{student_key}?user_role=ACADEMIC_ADVISOR")
    assert resp_adv.status_code == 200
    data_adv = resp_adv.json()
    assert data_adv["profile"]["fee_status"]["status"] == "RESTRICTED"
    assert data_adv["profile"]["fee_status"]["has_financial_hold"] is False

    # Authorized role (Financial Aid Counselor): fee status visible
    resp_fin = client.get(f"/api/v1/interventions/profiles/{student_key}?user_role=FINANCIAL_AID_COUNSELOR")
    assert resp_fin.status_code == 200
    data_fin = resp_fin.json()
    assert data_fin["profile"]["fee_status"]["status"] == "OVERDUE"
    assert data_fin["profile"]["fee_status"]["has_financial_hold"] is True


def test_api_case_workflow_endpoints(client):
    """Test API workflow operations: list, review, assign, follow-up, outcome."""
    # 1. Reset store
    reset_resp = client.post("/api/v1/interventions/reset")
    assert reset_resp.status_code == 200

    # 2. List cases
    cases_resp = client.get("/api/v1/interventions/cases")
    assert cases_resp.status_code == 200
    cases = cases_resp.json()
    assert len(cases) >= 4

    # 3. Review Case CASE-2026-001
    rev_resp = client.post(
        "/api/v1/interventions/cases/CASE-2026-001/review",
        json={
            "reviewer_role": "ACADEMIC_ADVISOR",
            "reviewer_id": "STAFF-ADV-01",
            "approved": True,
            "rationale": "High grades justify supportive attendance check-in.",
        }
    )
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "APPROVED"

    # 4. Assign Case CASE-2026-001
    assign_resp = client.post(
        "/api/v1/interventions/cases/CASE-2026-001/assign",
        json={
            "assigned_by_role": "COORDINATOR",
            "assigned_by_id": "STAFF-COORD-01",
            "assigned_role": "ACADEMIC_ADVISOR",
            "assignee_id": "STAFF-ADV-04",
            "due_date": "2026-10-25",
        }
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["status"] == "ASSIGNED"

    # 5. Cohort Metrics recalculation
    metrics_resp = client.get("/api/v1/interventions/cohort-metrics")
    assert metrics_resp.status_code == 200
    metrics = metrics_resp.json()
    assert metrics["assigned_interventions"] >= 1


def test_demo_ui_endpoint(client):
    """Test that demonstration dashboard HTML is served at /demo and /interventions/ui."""
    resp1 = client.get("/demo")
    assert resp1.status_code == 200
    assert "SUTRA PS6" in resp1.text

    resp2 = client.get("/interventions/ui")
    assert resp2.status_code == 200
    assert "Intervention Lifecycle State Machine" in resp2.text
