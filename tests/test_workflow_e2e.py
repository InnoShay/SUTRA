import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import InstitutionMembership
from app.models.student import Student
from tests.utils import make_jwt


@pytest.mark.asyncio
async def test_complete_student_support_workflow_journey(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """Verifies complete 10-step PS6 workflow from observations to auditable closed outcome."""
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]
    faculty_token = make_jwt(user_id=faculty_user_id)

    # 1. Setup mentor and HOD roles
    mentor_user_id = uuid.UUID("11112222-3333-4444-5555-666677778888")
    m_mentor = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=mentor_user_id,
        role="mentor",
        is_active=True,
    )
    hod_user_id = uuid.UUID("99998888-7777-6666-5555-444433332222")
    m_hod = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=hod_user_id,
        role="hod",
        is_active=True,
    )
    db_session.add_all([m_mentor, m_hod])
    await db_session.flush()

    mentor_token = make_jwt(user_id=mentor_user_id)
    hod_token = make_jwt(user_id=hod_user_id)

    # Create synthetic student
    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-1007",
        display_name="Asha (synthetic)",
        cohort_code="CS-Y2",
    )
    db_session.add(student)
    await db_session.commit()

    # Step 1: Ingest observations across multiple domains
    import_payload = {
        "source_system": "canvas_lms_v2",
        "schema_version": "1.0",
        "observations": [
            {
                "external_student_ref": "SYN-1007",
                "domain": "attendance",
                "metric_key": "attendance_rate",
                "value": 0.58,
                "unit": "ratio",
                "event_at": "2026-10-02T00:00:00Z",
                "available_at": "2026-10-02T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "att_001",
                "source_version": 1,
            },
            {
                "external_student_ref": "SYN-1007",
                "domain": "academic",
                "metric_key": "missing_assignments_count",
                "value": 3,
                "unit": "count",
                "event_at": "2026-10-05T00:00:00Z",
                "available_at": "2026-10-05T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "acad_001",
                "source_version": 1,
            },
        ],
    }
    ingest_res = await client.post(
        "/api/v1/imports",
        json=import_payload,
        headers={
            "Authorization": f"Bearer {faculty_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert ingest_res.status_code == 201

    # Step 2: Evaluate deterministic policy rules as of 2026-10-07
    eval_res = await client.post(
        f"/api/v1/students/{student.id}/signals/evaluate",
        json={"as_of_at": "2026-10-07T00:00:00Z"},
        headers={
            "Authorization": f"Bearer {faculty_token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert eval_res.status_code == 200
    signal_data = eval_res.json()
    signal_id = signal_data["id"]
    assert signal_data["result"] == "attention_suggested"
    assert signal_data["evidence_digest"] is not None

    # Step 3: Authorized educator inspects signal in review queue
    queue_res = await client.get(
        "/api/v1/signals",
        headers={
            "Authorization": f"Bearer {faculty_token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert queue_res.status_code == 200
    assert any(s["id"] == signal_id for s in queue_res.json())

    # Step 4: Educator approves signal and selects intervention
    review_res = await client.post(
        f"/api/v1/signals/{signal_id}/review",
        json={
            "decision": "approve",
            "selected_intervention_key": "mentor_check_in",
            "reason_code": "REVIEWER_APPROVED_RECOMMENDATION",
            "rationale": "Student missed multiple assignments and attendance is lagging.",
        },
        headers={
            "Authorization": f"Bearer {faculty_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    case_id = review_data["case_id"]
    assert case_id is not None

    # Step 5: HOD assigns accountable mentor and due date
    assign_res = await client.post(
        f"/api/v1/cases/{case_id}/assignment",
        json={
            "primary_owner_user_id": str(mentor_user_id),
            "due_at": "2026-10-20T00:00:00Z",
            "reason_code": "ASSIGNED_TO_DEPARTMENT_MENTOR",
        },
        headers={
            "Authorization": f"Bearer {hod_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["state"] == "assigned"
    assert assign_res.json()["primary_owner_user_id"] == str(mentor_user_id)

    # Step 6: Assigned mentor explicitly accepts responsibility
    accept_res = await client.post(
        f"/api/v1/cases/{case_id}/accept-assignment",
        json={"acceptance_note": "Acknowledged. Scheduled 1-on-1 meeting."},
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["state"] == "accepted"

    # Step 7: Mentor delegates subtask
    task_res = await client.post(
        f"/api/v1/cases/{case_id}/tasks",
        json={
            "domain": "academic",
            "generic_label": "Math 101 Catch-up Session",
            "due_at": "2026-10-18T00:00:00Z",
        },
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert task_res.status_code == 201

    # Step 8: Mentor records contact and support delivery
    fu_res = await client.post(
        f"/api/v1/cases/{case_id}/follow-ups",
        json={
            "follow_up_type": "support_delivered",
            "contact_status": "student_reached",
            "proof_kind": "staff_attestation",
            "occurred_at": "2026-10-14T10:00:00Z",
            "note": "Conducted 45m tutoring session. Identified missed prerequisites.",
        },
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert fu_res.status_code == 201

    # Verify case state advanced to follow_up_due
    case_chk = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert case_chk.json()["state"] == "follow_up_due"

    # Step 9: Record post-support outcome separately from task completion
    outcome_res = await client.post(
        f"/api/v1/cases/{case_id}/outcome",
        json={
            "outcome_status": "helped",
            "rationale": "Student submitted both backlogged assignments within 7 days of tutoring session.",
            "evidence_kind": "academic_record",
        },
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert outcome_res.status_code == 201
    assert outcome_res.json()["outcome_status"] == "helped"

    # Step 10: Close case formally
    close_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "closed", "reason_code": "CASE_OBJECTIVES_FULFILLED"},
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert close_res.status_code == 200
    assert close_res.json()["state"] == "closed"

    # Step 11: Retrieve immutable audit history timeline
    history_res = await client.get(
        f"/api/v1/cases/{case_id}/history",
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert history_res.status_code == 200
    events = history_res.json()
    event_types = [e["event_type"] for e in events]
    assert "CASE_CREATED_FROM_SIGNAL" in event_types
    assert "OWNER_ASSIGNED" in event_types
    assert "ASSIGNMENT_ACCEPTED" in event_types
    assert "OUTCOME_RECORDED" in event_types
    assert "CASE_CLOSED" in event_types


@pytest.mark.asyncio
async def test_signal_dismissal_creates_no_case(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=faculty_user_id)

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-DISMISS",
        display_name="Dismiss Test Student",
    )
    db_session.add(student)
    await db_session.commit()

    eval_res = await client.post(
        f"/api/v1/students/{student.id}/signals/evaluate",
        json={},
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    signal_id = eval_res.json()["id"]

    dismiss_res = await client.post(
        f"/api/v1/signals/{signal_id}/review",
        json={
            "decision": "dismiss",
            "reason_code": "STUDENT_RESOLVED_EXTERNALLY",
            "rationale": "Medical leave confirmed by registrar.",
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["case_id"] is None
    assert dismiss_res.json()["decision"] == "dismiss"


@pytest.mark.asyncio
async def test_invalid_case_transition_rejected_with_conflict(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """Verifies that an illegal transition (e.g. action_planned directly to closed) is rejected with 409."""
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=faculty_user_id)

    student = Student(id=uuid.uuid4(), institution_id=campus_id, external_ref="SYN-CONFLICT", display_name="Conflict Student")
    db_session.add(student)
    await db_session.commit()

    eval_res = await client.post(
        f"/api/v1/students/{student.id}/signals/evaluate",
        json={},
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    sig_id = eval_res.json()["id"]

    review_res = await client.post(
        f"/api/v1/signals/{sig_id}/review",
        json={"decision": "approve"},
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    case_id = review_res.json()["case_id"]

    # Attempt illegal jump: action_planned -> closed
    bad_jump = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "closed"},
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert bad_jump.status_code == 409
    assert bad_jump.json()["error"]["code"] == "CASE_TRANSITION_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_finance_domain_segregation_and_mentor_denial(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """Verifies that mentors are strictly denied access to finance observations (ADR-003)."""
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]  # role: faculty (not finance)
    token = make_jwt(user_id=faculty_user_id)

    student = Student(id=uuid.uuid4(), institution_id=campus_id, external_ref="SYN-FIN-TEST", display_name="Finance Gate Student")
    db_session.add(student)
    await db_session.commit()

    # Faculty tries to access finance endpoint
    denied_res = await client.get(
        f"/api/v1/students/{student.id}/finance",
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert denied_res.status_code == 403
    assert denied_res.json()["error"]["code"] == "FINANCE_DOMAIN_RESTRICTED"

    # Support view omits finance observation data
    support_view_res = await client.get(
        f"/api/v1/students/{student.id}/support-view",
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert support_view_res.status_code == 200
    assert "finance_observations" not in support_view_res.text
