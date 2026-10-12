"""
Integration and persistence tests for Phase 6:
- Pure deterministic cohort analytics (compute_cohort_aggregates)
- Small-group privacy suppression (< 5 threshold)
- Separation of task completion from student academic outcomes
- Cohort Learning Analyst (Agent 7) report generation & persistence
- Support Evidence Ledger audit export with cryptographic hash verification
- Tamper-detection pinpoints corrupted seq_id
- FastAPI endpoints with campus isolation & RBAC
"""

import json
import os
import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.orchestration.analytics import compute_cohort_aggregates
from backend.app.orchestration.contracts import (
    ActionStep,
    CohortAggregatePacket,
    OrchestrationResult,
    RunStatus,
    StageExecutionRecord,
    StageStatus,
    SupportPlanDraft,
    ValidationSummary,
)
from backend.app.orchestration.persistence.db import create_connection, init_db
from backend.app.orchestration.persistence.models import (
    AdvisorDecisionKind,
    CaseDecisionRequest,
    CohortReportGenerateRequest,
    OutcomeRecordRequest,
    OutcomeStatus,
    TaskStatus,
    TaskStatusUpdateRequest,
)
from backend.app.orchestration.persistence.repository import CaseRepository
from backend.app.schemas.features import StudentFeatureInput
from sutra_ml.schemas.evidence_card import build_evidence_card


@pytest.fixture
def in_memory_repo():
    """Create in-memory SQLite connection and initialized CaseRepository."""
    conn = create_connection(":memory:")
    init_db(conn)
    return CaseRepository(conn)


@pytest.fixture
def client_with_in_memory_db(tmp_path):
    """FastAPI TestClient backed by an isolated test SQLite database."""
    db_file = str(tmp_path / "test_phase_6_api.db")
    os.environ["SUTRA_DB_PATH"] = db_file
    os.environ["SUTRA_ENV"] = "development"
    os.environ["SUTRA_DEMO_AUTH_ENABLED"] = "true"

    conn = create_connection(db_file)
    init_db(conn)

    app = create_app()
    app.state.db_conn = conn

    with TestClient(app) as test_client:
        yield test_client

    if "SUTRA_DB_PATH" in os.environ:
        del os.environ["SUTRA_DB_PATH"]


def seed_test_case(
    repo: CaseRepository,
    case_id: str,
    campus_id: str = "CAMPUS_DEFAULT",
    risk_prob: float = 0.72,
    approve: bool = True,
) -> str:
    """Helper creating a test case with an approved support plan and tasks."""
    record_id = case_id.replace("CASE-", "")
    student_input = StudentFeatureInput(
        record_id=record_id,
        num_of_prev_attempts=0,
        studied_credits=60,
        gender="F",
        region="East Anglian Region",
        highest_education="A Level or Equivalent",
        imd_band="20-30%",
        age_band="0-35",
        disability="N",
        days_registered_before_start=-30,
        has_missing_registration_date=0,
        vle_total_clicks_d30=150,
        vle_active_days_d30=8,
        vle_clicks_precourse=20,
        vle_clicks_poststart_d30=130,
        vle_clicks_last_7d=10,
        vle_days_since_last_click=5.0,
        vle_clicks_forumng_d30=15,
        vle_clicks_oucontent_d30=90,
        vle_clicks_quiz_d30=5,
        vle_clicks_homepage_d30=20,
        vle_clicks_other_d30=0,
        has_vle_activity_d30=1,
        assessments_submitted_d30=0,
        assessment_banked_d30=0,
        has_early_assessment_submission_d30=0,
    )

    evidence_card = build_evidence_card(
        record_id=record_id,
        module_code="BBB",
        presentation_code="2014J",
        risk_prob=risk_prob,
        top_pos_factors=[{"feature": "vle_clicks_last_7d", "val": "10", "weight": 0.35, "desc": "Low clicks"}],
        top_neg_factors=[],
        model_name="baseline_logistic_regression",
        model_version="1.0.0",
        threshold=0.46,
    )

    steps = [
        ActionStep(
            step_number=1,
            step_id="STEP-1",
            suggested_role="ACADEMIC_ADVISOR",
            action_description="Conduct 1-on-1 learning strategy check-in.",
            target_days=3,
            evidence_reference="Low VLE active days (8 days)",
            follow_up_evidence="Advisor meeting summary note",
        ),
        ActionStep(
            step_number=2,
            step_id="STEP-2",
            suggested_role="PEER_TUTOR",
            action_description="Enroll in peer study group.",
            target_days=7,
            evidence_reference="No forum activity",
            follow_up_evidence="Attendance verification",
        ),
    ]

    plan = SupportPlanDraft(
        plan_title=f"Support Plan for {case_id}",
        target_window_days=14,
        action_steps=steps,
        evidence_requirements=["Attendance check"],
        is_draft=True,
    )

    run_result = OrchestrationResult(
        run_id=f"RUN-{case_id}",
        record_id=record_id,
        status=RunStatus.SUCCESS,
        evidence_card=evidence_card,
        stages={
            "stage_3_plan": StageExecutionRecord(
                stage_id="stage_3_plan",
                stage_name="Planner",
                status=StageStatus.COMPLETED,
                duration_ms=50.0,
                output=plan,
            )
        },
        validation_summary=ValidationSummary(passed=True, error_count=0, warning_count=0),
        total_duration_ms=15.0,
    )

    repo.create_case_from_run(
        result=run_result,
        campus_id=campus_id,
        student_input_features=student_input.to_feature_dict(),
        actor_id="SYS-SEEDED",
        actor_role="SYSTEM",
    )

    if approve:
        repo.submit_advisor_decision(
            case_id=case_id,
            request=CaseDecisionRequest(
                decision_kind=AdvisorDecisionKind.APPROVE,
                reviewed_plan_version=1,
                notes="Approved for cohort demo.",
            ),
            actor_id="ADV-USER-01",
            actor_role="ACADEMIC_ADVISOR",
            campus_id=campus_id,
        )

    return case_id


def test_compute_cohort_aggregates_empty(in_memory_repo: CaseRepository):
    """Empty cohort returns valid packet with zero metrics and small-group limitations."""
    packet = compute_cohort_aggregates(in_memory_repo, campus_id="CAMPUS_EMPTY", min_cohort_threshold=5)
    assert isinstance(packet, CohortAggregatePacket)
    assert packet.total_cases_analyzed == 0
    assert packet.campus_id == "CAMPUS_EMPTY"
    assert len(packet.data_quality_limitations) >= 1
    total_metric = next(m for m in packet.metrics if m.metric_id == "M_CASE_COUNT_TOTAL")
    assert total_metric.value == 0.0


def test_compute_cohort_aggregates_small_group_suppression(in_memory_repo: CaseRepository):
    """When cohort size < threshold (e.g. 2 cases < 5), cell breakdown metrics are suppressed."""
    seed_test_case(in_memory_repo, "CASE-01", "CAMPUS_A", risk_prob=0.85, approve=True)
    seed_test_case(in_memory_repo, "CASE-02", "CAMPUS_A", risk_prob=0.35, approve=False)

    packet = compute_cohort_aggregates(in_memory_repo, campus_id="CAMPUS_A", min_cohort_threshold=5)
    assert packet.total_cases_analyzed == 2
    # Total count itself is not suppressed
    total_metric = next(m for m in packet.metrics if m.metric_id == "M_CASE_COUNT_TOTAL")
    assert total_metric.is_suppressed is False
    assert total_metric.value == 2.0

    # Sub-breakdowns like high-risk count are suppressed because N=2 < 5
    high_risk_metric = next(m for m in packet.metrics if m.metric_id == "M_TIER_HIGH")
    assert high_risk_metric.is_suppressed is True
    assert high_risk_metric.notes is not None
    assert any("Small cohort size" in lim for lim in packet.data_quality_limitations)


def test_compute_cohort_aggregates_task_and_outcome_separation(in_memory_repo: CaseRepository):
    """
    Ensure task execution rate is calculated correctly and strictly separated
    from student academic outcomes.
    """
    # Seed 6 cases to exceed threshold of 5
    for i in range(1, 7):
        case_id = f"CASE-COHORT-{i:02d}"
        seed_test_case(in_memory_repo, case_id, "CAMPUS_LARGE", risk_prob=0.75, approve=True)

    # In CASE-COHORT-01, complete one task
    case_detail = in_memory_repo.get_case_detail("CASE-COHORT-01")
    assert case_detail is not None
    tasks = case_detail.tasks
    assert len(tasks) == 2
    in_memory_repo.update_task_status(
        task_id=tasks[0].task_id,
        request=TaskStatusUpdateRequest(
            status=TaskStatus.COMPLETED,
            completion_note="Student attended advisory check-in.",
        ),
        actor_id="ADVISOR-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_LARGE",
    )

    # In CASE-COHORT-02, record a distinct student outcome
    in_memory_repo.record_outcome(
        case_id="CASE-COHORT-02",
        request=OutcomeRecordRequest(
            outcome_status=OutcomeStatus.RECORDED,
            outcome_summary="Student completed semester with satisfactory GPA.",
        ),
        actor_id="REGISTRAR-01",
        actor_role="REGISTRAR",
        campus_id="CAMPUS_LARGE",
    )

    packet = compute_cohort_aggregates(in_memory_repo, campus_id="CAMPUS_LARGE", min_cohort_threshold=5)
    assert packet.total_cases_analyzed == 6

    # Total tasks = 6 cases * 2 tasks = 12 tasks. Completed = 1.
    task_total = next(m for m in packet.metrics if m.metric_id == "M_TASKS_TOTAL")
    task_completed = next(m for m in packet.metrics if m.metric_id == "M_TASKS_COMPLETED")
    task_rate = next(m for m in packet.metrics if m.metric_id == "M_TASK_COMPLETION_RATE")

    assert task_total.value == 12.0
    assert task_completed.value == 1.0
    assert pytest.approx(task_rate.value, 0.1) == (1.0 / 12.0) * 100.0

    # Outcomes: 5 unobserved, 1 recorded
    outcome_unobs = next(m for m in packet.metrics if m.metric_id == "M_OUTCOME_UNOBSERVED")
    outcome_retained = next(m for m in packet.metrics if m.metric_id == "M_OUTCOME_RECORDED")
    assert outcome_unobs.value == 5.0
    assert outcome_retained.value == 1.0


def test_generate_and_persist_cohort_report(in_memory_repo: CaseRepository):
    """Test full workflow: Agent 7 generates report, validates, persists in DB and audit ledger."""
    for i in range(1, 6):
        seed_test_case(in_memory_repo, f"CASE-REPORT-{i}", "CAMPUS_REPORT", risk_prob=0.65, approve=True)

    gen_req = CohortReportGenerateRequest(
        campus_id="CAMPUS_REPORT",
        min_cohort_threshold=5,
        grouping_dimension="ALL_CAMPUS_CASES",
    )

    record = in_memory_repo.generate_cohort_report(
        request=gen_req,
        actor_id="USER-ANALYST",
        actor_role="COHORT_ANALYST",
        user_campus_id="CAMPUS_REPORT",
    )

    assert record.report_id.startswith("rpt_")
    assert record.campus_id == "CAMPUS_REPORT"
    assert len(record.observed_patterns) >= 1
    assert "M_CASE_COUNT_TOTAL" in record.metric_references

    # Verify retrieval
    fetched = in_memory_repo.get_cohort_report(record.report_id)
    assert fetched is not None
    assert fetched.report_id == record.report_id

    # Verify listed
    all_reports = in_memory_repo.list_cohort_reports(campus_id="CAMPUS_REPORT")
    assert any(r.report_id == record.report_id for r in all_reports)

    # Verify audit event in ledger
    events = in_memory_repo.conn.execute(
        "SELECT * FROM audit_ledger WHERE event_type = 'COHORT_REPORT_GENERATED'"
    ).fetchall()
    assert len(events) >= 1
    assert events[-1]["case_id"] == "COHORT:CAMPUS_REPORT"


def test_audit_ledger_export_and_chain_verification(in_memory_repo: CaseRepository):
    """Test exporting audit ledger and verifying tamper-evident hash pointer chain."""
    for i in range(3):
        seed_test_case(in_memory_repo, f"CASE-AUDIT-{i}", "CAMPUS_AUDIT", approve=True)

    export_pkg = in_memory_repo.export_audit_ledger(campus_id="CAMPUS_AUDIT", actor_id="ADMIN-01")
    assert export_pkg.total_events > 0
    assert export_pkg.is_chain_valid is True
    assert "verified" in export_pkg.chain_verification_message or "integrity holds" in export_pkg.chain_verification_message

    # Verify event fields
    first_ev = export_pkg.events[0]
    assert first_ev.seq_id == 1
    assert first_ev.prev_entry_hash == "GENESIS"
    assert len(first_ev.entry_hash) == 64


def test_tamper_detection_in_audit_ledger(in_memory_repo: CaseRepository):
    """
    Tampering test: direct SQLite modification of payload breaks SHA-256 chain
    and pinpoints exactly which seq_id was corrupted.
    """
    seed_test_case(in_memory_repo, "CASE-TAMPER-01", "CAMPUS_TAMPER", approve=True)

    # Verify ledger is valid initially
    res_initial = in_memory_repo.verify_audit_ledger()
    assert res_initial.is_valid is True

    # Drop triggers temporarily to simulate an out-of-band DB modification
    with in_memory_repo.conn:
        in_memory_repo.conn.execute("DROP TRIGGER IF EXISTS prevent_audit_ledger_update;")
        # Tamper with seq_id 2 payload
        in_memory_repo.conn.execute(
            "UPDATE audit_ledger SET payload_canonical_json = '{\"tampered\": true}' WHERE seq_id = 2;"
        )

    # Verify ledger now fails integrity check
    res_tampered = in_memory_repo.verify_audit_ledger()
    assert res_tampered.is_valid is False
    assert res_tampered.corrupted_seq_id == 2
    assert "Audit entry hash mismatch at seq_id 2" in res_tampered.message


# -----------------------------------------------------------------------------
# FastAPI HTTP Integration Tests
# -----------------------------------------------------------------------------

def test_api_cohort_analytics_and_report_endpoints(client_with_in_memory_db: TestClient):
    """Integration test for /api/v1/cohort/analytics, /cohort/report, and /audit/export."""
    headers = {"Authorization": "Bearer demo-token-ADV-MAIN-01"}

    # 1. Seed cases via /api/v1/cases/seed
    scenarios = [
        "HIGH_ENGAGEMENT_ON_TRACK",
        "LOW_ENGAGEMENT_AT_RISK",
        "MIXED_SIGNALS_MODERATE",
        "EDGE_CASE_ZERO_VALUES",
        "EDGE_CASE_MAX_VALUES",
    ]
    for sc in scenarios:
        seed_res = client_with_in_memory_db.post(
            "/api/v1/cases/seed",
            headers=headers,
            json={"scenario_name": sc, "campus_id": "CAMPUS-MAIN"},
        )
        assert seed_res.status_code == 200

    # 2. Query cohort analytics
    analytics_res = client_with_in_memory_db.get("/api/v1/cohort/analytics?campus_id=CAMPUS-MAIN", headers=headers)
    assert analytics_res.status_code == 200
    packet_data = analytics_res.json()
    assert packet_data["total_cases_analyzed"] >= 5
    assert len(packet_data["metrics"]) >= 5

    # 3. Generate cohort report
    report_res = client_with_in_memory_db.post(
        "/api/v1/cohort/report",
        headers=headers,
        json={
            "campus_id": "CAMPUS-MAIN",
            "min_cohort_threshold": 5,
            "grouping_dimension": "ALL_CAMPUS_CASES",
        },
    )
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["report_id"].startswith("rpt_")
    assert report_data["campus_id"] == "CAMPUS-MAIN"
    assert len(report_data["observed_patterns"]) >= 1

    # 4. List cohort reports
    list_res = client_with_in_memory_db.get("/api/v1/cohort/reports?campus_id=CAMPUS-MAIN", headers=headers)
    assert list_res.status_code == 200
    reports = list_res.json()
    assert any(r["report_id"] == report_data["report_id"] for r in reports)

    # 5. Fetch single cohort report
    get_res = client_with_in_memory_db.get(f"/api/v1/cohort/reports/{report_data['report_id']}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["report_id"] == report_data["report_id"]

    # 6. Test campus boundary isolation
    forbidden_headers = {"Authorization": "Bearer demo-token-ADV-REMOTE-02"}
    forbidden_res = client_with_in_memory_db.get(
        "/api/v1/cohort/analytics?campus_id=CAMPUS-MAIN",
        headers=forbidden_headers,
    )
    assert forbidden_res.status_code == 403

    # 7. Test audit export endpoint
    export_res = client_with_in_memory_db.get("/api/v1/audit/export?campus_id=CAMPUS-MAIN", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data["is_chain_valid"] is True
    assert export_data["total_events"] > 0
    assert len(export_data["events"]) > 0
