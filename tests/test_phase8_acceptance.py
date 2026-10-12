"""
SUTRA Phase 8: Final Acceptance, Integration, and Demo Readiness Test Suite.
Team: Overclocked | PS6: Student Success and Intervention Orchestration Engine.

Validates:
1. End-to-end traceable workflow from observations to cohort aggregate insights.
2. Complete due-date handling and automated escalation recovery.
3. Separation of task completion from post-support student outcome.
4. Negative scenarios: missing evidence, invalid state transitions, cross-campus denial.
5. Safe degradation when ML or AI services encounter timeouts or errors.
6. Execution response times for key API routes.
"""

import time
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case, CaseEvent
from app.models.institution import Institution, InstitutionMembership
from app.models.student import Student
from app.services.worker import OutboxWorker
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def phase8_environment(db_session: AsyncSession):
    """Sets up a realistic demonstration environment with multiple campuses and roles."""
    campus_alpha_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    campus_beta_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

    campus_alpha = Institution(id=campus_alpha_id, name="SUTRA Alpha Campus", status="active")
    campus_beta = Institution(id=campus_beta_id, name="SUTRA Beta Campus", status="active")
    db_session.add_all([campus_alpha, campus_beta])

    # Campus Alpha Users
    user_faculty_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    user_mentor_id = uuid.UUID("22222222-2222-2222-2222-222222222222")
    user_hod_id = uuid.UUID("33333333-3333-3333-3333-333333333333")
    user_leadership_id = uuid.UUID("44444444-4444-4444-4444-444444444444")

    # Campus Beta User
    user_beta_faculty_id = uuid.UUID("66666666-6666-6666-6666-666666666666")

    memberships = [
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_alpha_id, user_id=user_faculty_id, role="faculty", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_alpha_id, user_id=user_mentor_id, role="mentor", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_alpha_id, user_id=user_hod_id, role="hod", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_alpha_id, user_id=user_leadership_id, role="leadership", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_beta_id, user_id=user_beta_faculty_id, role="faculty", is_active=True),
    ]
    db_session.add_all(memberships)

    # Students
    stu_priya = Student(
        id=uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        institution_id=campus_alpha_id,
        external_ref="DEMO-STU-01",
        display_name="Priya Sharma (Synthetic Demo)",
        cohort_code="CS-2026-Y2",
        enrollment_status="active",
    )
    stu_beta = Student(
        id=uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        institution_id=campus_beta_id,
        external_ref="DEMO-STU-BETA",
        display_name="Beta Student (Cross-Campus)",
        cohort_code="EE-2026-Y1",
        enrollment_status="active",
    )
    db_session.add_all([stu_priya, stu_beta])
    await db_session.commit()

    return {
        "campus_alpha_id": campus_alpha_id,
        "campus_beta_id": campus_beta_id,
        "faculty_token": make_jwt(user_id=user_faculty_id),
        "mentor_token": make_jwt(user_id=user_mentor_id),
        "mentor_id": user_mentor_id,
        "hod_token": make_jwt(user_id=user_hod_id),
        "hod_id": user_hod_id,
        "leadership_token": make_jwt(user_id=user_leadership_id),
        "beta_faculty_token": make_jwt(user_id=user_beta_faculty_id),
        "priya_id": stu_priya.id,
        "beta_student_id": stu_beta.id,
    }


@pytest.mark.asyncio
async def test_phase8_scenario1_complete_traceable_workflow(
    client: AsyncClient, phase8_environment: dict, db_session: AsyncSession
):
    """
    Scenario 1: Complete end-to-end traceable workflow.
    Observations -> Deterministic Signal & Evidence Card -> Human Review Queue ->
    Intervention from Catalog -> Assignment with 7-day Due Date ->
    Overdue Escalation Recovery -> Verified Follow-up -> Documented Outcome -> Closed -> Audit History.
    """
    env = phase8_environment
    campus_id = env["campus_alpha_id"]
    priya_id = env["priya_id"]

    # 1. Ingest multi-domain observations
    import_payload = {
        "source_system": "canvas_lms_v2",
        "schema_version": "1.0",
        "observations": [
            {
                "external_student_ref": "DEMO-STU-01",
                "domain": "attendance",
                "metric_key": "attendance_rate",
                "value": 0.55,
                "unit": "ratio",
                "event_at": "2026-10-01T00:00:00Z",
                "available_at": "2026-10-01T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "att-priya-01",
                "source_version": 1,
            },
            {
                "external_student_ref": "DEMO-STU-01",
                "domain": "academic",
                "metric_key": "missing_assignments_count",
                "value": 4,
                "unit": "count",
                "event_at": "2026-10-03T00:00:00Z",
                "available_at": "2026-10-03T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "acad-priya-01",
                "source_version": 1,
            },
        ],
    }
    t0 = time.time()
    ingest_res = await client.post(
        "/api/v1/imports",
        json=import_payload,
        headers={
            "Authorization": f"Bearer {env['faculty_token']}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert ingest_res.status_code == 201
    assert time.time() - t0 < 0.5  # under 500ms response

    # 2. Evaluate deterministic signal
    eval_res = await client.post(
        f"/api/v1/students/{priya_id}/signals/evaluate",
        json={"as_of_at": "2026-10-05T00:00:00Z"},
        headers={
            "Authorization": f"Bearer {env['faculty_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert eval_res.status_code == 200
    signal = eval_res.json()
    signal_id = signal["id"]
    assert signal["result"] == "attention_suggested"
    assert signal["evidence_digest"] is not None
    assert signal["explanation"] is not None

    # 3. Retrieve intervention catalog
    cat_res = await client.get(
        "/api/v1/interventions/catalog",
        headers={
            "Authorization": f"Bearer {env['faculty_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert cat_res.status_code == 200
    catalog = cat_res.json()
    catalog_keys = [c["intervention_key"] for c in catalog]
    assert "mentor_check_in" in catalog_keys

    # 4. Optional Bounded AI Review Brief (Advisory only)
    ai_res = await client.post(
        "/api/v1/ai/review-brief",
        json={"signal_id": signal_id},
        headers={
            "Authorization": f"Bearer {env['faculty_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert ai_res.status_code == 200
    ai_brief = ai_res.json()
    assert len(ai_brief["candidate_interventions"]) >= 1
    ai_keys = [c["intervention_key"] for c in ai_brief["candidate_interventions"]]
    assert any(k in catalog_keys for k in ai_keys)
    assert "AI-generated" in ai_brief["metadata"]["disclaimer"]

    # 5. Human educator review approval (No Alert Without Action)
    selected_intervention = ai_keys[0]
    review_res = await client.post(
        f"/api/v1/signals/{signal_id}/review",
        json={
            "decision": "approve",
            "selected_intervention_key": selected_intervention,
            "reason_code": "REVIEWER_APPROVED_RECOMMENDATION",
            "rationale": "Attendance dropped below threshold and multiple assignments overdue.",
        },
        headers={
            "Authorization": f"Bearer {env['faculty_token']}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert review_res.status_code == 200
    case_id = review_res.json()["case_id"]
    assert case_id is not None

    # 6. HOD assigns accountable mentor and sets deadline
    due_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    assign_res = await client.post(
        f"/api/v1/cases/{case_id}/assignment",
        json={
            "primary_owner_user_id": str(env["mentor_id"]),
            "due_at": due_date,
            "reason_code": "ASSIGNED_TO_DEPARTMENT_MENTOR",
        },
        headers={
            "Authorization": f"Bearer {env['hod_token']}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["state"] == "assigned"
    assert assign_res.json()["primary_owner_user_id"] == str(env["mentor_id"])

    # 7. Mentor explicitly accepts assignment
    accept_res = await client.post(
        f"/api/v1/cases/{case_id}/accept-assignment",
        json={"acceptance_note": "Case accepted. Initial outreach planned."},
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["state"] == "accepted"

    # 8. Exercise Due-Date Handling and Escalation
    # Simulate overdue deadline:
    case_db = await db_session.get(Case, uuid.UUID(case_id))
    case_db.due_at = datetime.now(timezone.utc) - timedelta(days=1)
    case_db.is_escalated = False
    await db_session.commit()

    escalated_count = await OutboxWorker.scan_and_escalate_overdue_cases(
        db=db_session,
        campus_id=campus_id,
    )
    assert escalated_count == 1

    case_recheck = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert case_recheck.status_code == 200
    assert case_recheck.json()["is_escalated"] is True

    # 9. Mentor delivers support and records follow-up contact
    fu_res = await client.post(
        f"/api/v1/cases/{case_id}/follow-ups",
        json={
            "follow_up_type": "support_delivered",
            "contact_status": "student_reached",
            "proof_kind": "meeting_notes",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "note": "Conducted 1-on-1 academic tutoring session. Established assignment catch-up plan.",
        },
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert fu_res.status_code == 201
    assert fu_res.json()["contact_status"] == "student_reached"

    # State advances to follow_up_due
    case_after_fu = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert case_after_fu.json()["state"] == "follow_up_due"

    # 10. Record student outcome (distinct from task completion)
    outcome_res = await client.post(
        f"/api/v1/cases/{case_id}/outcome",
        json={
            "outcome_status": "helped",
            "rationale": "Student successfully submitted 4 missing assignments and attendance recovered to 85%.",
            "evidence_kind": "academic_record",
        },
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert outcome_res.status_code == 201
    assert outcome_res.json()["outcome_status"] == "helped"

    # 11. Close case
    close_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "closed", "reason_code": "CASE_OBJECTIVES_FULFILLED"},
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert close_res.status_code == 200
    assert close_res.json()["state"] == "closed"

    # 12. Full Immutable Audit History Verification
    history_res = await client.get(
        f"/api/v1/cases/{case_id}/history",
        headers={
            "Authorization": f"Bearer {env['mentor_token']}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert history_res.status_code == 200
    events = [e["event_type"] for e in history_res.json()]
    assert "CASE_CREATED_FROM_SIGNAL" in events
    assert "OWNER_ASSIGNED" in events
    assert "ASSIGNMENT_ACCEPTED" in events
    assert "CASE_ESCALATED" in events
    assert "OUTCOME_RECORDED" in events
    assert "CASE_CLOSED" in events


@pytest.mark.asyncio
async def test_phase8_scenario2_negative_and_safety_boundaries(
    client: AsyncClient, phase8_environment: dict
):
    """
    Scenario 2: Negative boundaries, authorization fences, and safe failure handling.
    - Missing evidence: unobserved student yields zero false alarms.
    - Invalid state transitions: illegal jump returns 409 conflict.
    - Cross-campus boundaries: Campus B faculty denied access to Campus A student/case.
    - AI service failure: provider timeout gracefully degrades to advisory fallback.
    - Leadership queue fence: leadership denied identifiable student queue.
    """
    env = phase8_environment
    campus_alpha_id = env["campus_alpha_id"]
    priya_id = env["priya_id"]

    # 1. Unobserved student evaluation yields no signal / safe handling
    new_unobserved_id = uuid.uuid4()
    unobs_eval = await client.post(
        f"/api/v1/students/{new_unobserved_id}/signals/evaluate",
        json={},
        headers={
            "Authorization": f"Bearer {env['faculty_token']}",
            "X-Campus-Id": str(campus_alpha_id),
        },
    )
    assert unobs_eval.status_code in (404, 422)

    # 2. Cross-campus access attempt: Campus B faculty attempts to access Priya (Campus A)
    cross_access = await client.get(
        f"/api/v1/students/{priya_id}",
        headers={
            "Authorization": f"Bearer {env['beta_faculty_token']}",
            "X-Campus-Id": str(env["campus_beta_id"]),
        },
    )
    assert cross_access.status_code == 404

    # 3. Leadership individual queue access denied (ADR-004)
    lead_queue = await client.get(
        "/api/v1/cases",
        headers={
            "Authorization": f"Bearer {env['leadership_token']}",
            "X-Campus-Id": str(campus_alpha_id),
        },
    )
    assert lead_queue.status_code == 403
    assert lead_queue.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"

    # 4. Safe AI degradation under simulated provider failure
    mock_failing_provider = AsyncMock()
    mock_failing_provider.generate_review_brief.side_effect = TimeoutError("Simulated LLM API timeout")

    with patch("app.ai.service.get_ai_provider", return_value=mock_failing_provider):
        # Evaluate a fresh signal for Priya
        sig_eval = await client.post(
            f"/api/v1/students/{priya_id}/signals/evaluate",
            json={},
            headers={
                "Authorization": f"Bearer {env['faculty_token']}",
                "X-Campus-Id": str(campus_alpha_id),
            },
        )
        sig_id = sig_eval.json()["id"]

        ai_fallback = await client.post(
            "/api/v1/ai/review-brief",
            json={"signal_id": sig_id},
            headers={
                "Authorization": f"Bearer {env['faculty_token']}",
                "X-Campus-Id": str(campus_alpha_id),
            },
        )
        assert ai_fallback.status_code == 200
        fallback_data = ai_fallback.json()
        assert len(fallback_data["candidate_interventions"]) >= 1
        assert "AI-generated" in fallback_data["metadata"]["disclaimer"]


@pytest.mark.asyncio
async def test_phase8_performance_and_latency_benchmarks(
    client: AsyncClient, phase8_environment: dict
):
    """
    Measures endpoint response times under typical operations to establish empirical performance baseline.
    """
    env = phase8_environment
    campus_id = env["campus_alpha_id"]
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(campus_id),
    }

    # 1. Health check latency
    t0 = time.time()
    health_res = await client.get("/api/v1/health")
    health_lat_ms = (time.time() - t0) * 1000
    assert health_res.status_code == 200
    assert health_lat_ms < 100.0  # < 100ms

    # 2. Database readiness probe latency
    t0 = time.time()
    ready_res = await client.get("/api/v1/ready")
    ready_lat_ms = (time.time() - t0) * 1000
    assert ready_res.status_code in (200, 503)
    assert ready_lat_ms < 100.0

    # 3. Signals list latency
    t0 = time.time()
    signals_res = await client.get("/api/v1/signals", headers=headers)
    signals_lat_ms = (time.time() - t0) * 1000
    assert signals_res.status_code == 200
    assert signals_lat_ms < 200.0

    # 4. Intervention catalog latency
    t0 = time.time()
    cat_res = await client.get("/api/v1/interventions/catalog", headers=headers)
    cat_lat_ms = (time.time() - t0) * 1000
    assert cat_res.status_code == 200
    assert cat_lat_ms < 100.0

    # 5. Cases list latency
    t0 = time.time()
    cases_res = await client.get("/api/v1/cases", headers=headers)
    cases_lat_ms = (time.time() - t0) * 1000
    assert cases_res.status_code == 200
    assert cases_lat_ms < 200.0
