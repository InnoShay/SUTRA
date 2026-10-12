import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import InterventionCatalog
from app.models.institution import InstitutionMembership
from app.models.observation import StudentObservation
from app.models.policy import PolicyVersion
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from tests.utils import make_jwt


@pytest.mark.asyncio
async def test_phase14_end_to_end_student_support_workflow(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """
    Phase 14 End-to-End Student Support Workflow Test.
    Covers the complete 9-step human-in-the-loop lifecycle:
    1. Authenticate & confirm active user / campus
    2. Retrieve student record & available observations
    3. Inspect active signals & AI evidence review brief
    4. Review signal with explicit rationale (approving intervention -> provisions case)
    5. Inspect provisioned case in state 'action_planned'
    6. Assign responsible staff member -> state 'assigned'
    7. Assigned owner transitions case -> state 'accepted'
    8. Record follow-up -> state 'support_in_progress' / 'follow_up_due'; Record outcome -> state 'outcome_reviewed'; Close -> 'closed'
    9. Read back case & audit history to verify persisted changes
    """
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]
    mentor_user_id = uuid.UUID("33333333-3333-3333-3333-333333333333")
    hod_user_id = uuid.UUID("44444444-4444-4444-4444-444444444444")

    # Add mentor and hod memberships
    m_mentor = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=mentor_user_id,
        role="mentor",
        is_active=True,
    )
    m_hod = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=hod_user_id,
        role="hod",
        is_active=True,
    )
    db_session.add_all([m_mentor, m_hod])

    # Add catalogue intervention
    cat = InterventionCatalog(
        institution_id=campus_id,
        intervention_key="academic_tutoring_offer",
        display_label="Academic Tutoring Offer",
        domain="academic",
        recipient_role="student",
        required_purpose_key="academic_support",
        description="Structured 1-on-1 tutoring sessions for core academic modules.",
        requires_human_approval=True,
    )
    db_session.add(cat)

    # Create student
    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-1014",
        display_name="Kavya Student",
        cohort_code="CS-Y1",
        enrollment_status="active",
    )
    db_session.add(student)
    await db_session.flush()

    # Add observations
    now = datetime.now(timezone.utc)
    obs1 = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="attendance",
        metric_key="attendance_drop",
        value=0.52,
        unit="ratio",
        event_at=now,
        available_at=now,
        source_system="campus_rfid",
        source_record_ref="rfid-p14",
        source_version=1,
        quality_state="valid",
    )
    obs2 = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="academic",
        metric_key="assignment_missing",
        value=3.0,
        unit="count",
        event_at=now,
        available_at=now,
        source_system="canvas_lms",
        source_record_ref="canvas-p14",
        source_version=1,
        quality_state="valid",
    )
    db_session.add_all([obs1, obs2])

    # Add policy version
    pv = PolicyVersion(
        id=uuid.uuid4(),
        institution_id=campus_id,
        policy_key="campus_p14_v1",
        version=1,
        status="published",
        definition={"rules": []},
        checksum="hash-p14",
        evaluator_version="2.0.0",
        published_at=now,
        effective_from=now,
    )
    db_session.add(pv)
    await db_session.flush()

    # Add packet and signal
    packet = EvidencePacket(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        policy_version_id=pv.id,
        schema_version="2.0.0",
        as_of_at=now,
        snapshot={"attendance_drop": 0.52, "missing_assignments": 3},
        digest="p14-evidence-digest-verified",
    )
    db_session.add(packet)
    await db_session.flush()

    signal = Signal(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        policy_version_id=pv.id,
        evidence_packet_id=packet.id,
        rule_key="attendance_concern",
        result="attention_suggested",
        quality_state="clean",
        evaluated_at=now,
        explanation={
            "summary": "Attendance dropped below threshold and 3 assignments missing",
            "trigger": "attendance_drop",
        },
    )
    db_session.add(signal)
    await db_session.commit()

    faculty_token = make_jwt(user_id=faculty_user_id)
    hod_token = make_jwt(user_id=hod_user_id)
    mentor_token = make_jwt(user_id=mentor_user_id)

    # ---------------------------------------------------------
    # STEP 1: Authenticate and confirm active user and campus
    # ---------------------------------------------------------
    whoami_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert whoami_res.status_code == 200
    whoami_data = whoami_res.json()
    assert whoami_data["user_id"] == str(faculty_user_id)
    assert any(m["institution_id"] == str(campus_id) for m in whoami_data["memberships"])

    # ---------------------------------------------------------
    # STEP 2: Retrieve student record and available observations
    # ---------------------------------------------------------
    stu_res = await client.get(
        f"/api/v1/students/{student.id}",
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert stu_res.status_code == 200
    assert stu_res.json()["external_ref"] == "SYN-1014"

    obs_res = await client.get(
        f"/api/v1/students/{student.id}/observations",
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert obs_res.status_code == 200
    observations = obs_res.json()
    assert len(observations) == 2

    # ---------------------------------------------------------
    # STEP 3: Inspect active signals and available evidence brief
    # ---------------------------------------------------------
    signals_res = await client.get(
        "/api/v1/signals",
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert signals_res.status_code == 200
    matching_signals = [s for s in signals_res.json() if s["id"] == str(signal.id)]
    assert len(matching_signals) == 1

    sig_detail_res = await client.get(
        f"/api/v1/signals/{signal.id}",
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert sig_detail_res.status_code == 200
    assert sig_detail_res.json()["result"] == "attention_suggested"

    brief_res = await client.post(
        "/api/v1/ai/review-brief",
        json={"signal_id": str(signal.id)},
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert brief_res.status_code == 200
    brief_data = brief_res.json()
    assert brief_data["target_student_ref"] == "SYN-1014"
    assert brief_data["tier1_observed_data"]["total_observations"] == 2
    assert brief_data["tier2_rule_signal"]["rule_key"] == "attendance_concern"
    # Ensure advisory only: no case provisioned by brief
    assert brief_data["tier4_ai_recommendation"]["is_advisory"] is True

    # ---------------------------------------------------------
    # STEP 4: Review signal with explicit human rationale
    # ---------------------------------------------------------
    review_res = await client.post(
        f"/api/v1/signals/{signal.id}/review",
        json={
            "decision": "approve",
            "selected_intervention_key": "academic_tutoring_offer",
            "reason_code": "EDUCATOR_APPROVED_INTERVENTION",
            "rationale": "Consecutive low attendance and 3 missing assignments observed. Tutoring recommended per university policy.",
        },
        headers={
            "Authorization": f"Bearer {faculty_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["decision"] == "approve"
    case_id = review_data["case_id"]
    assert case_id is not None

    # ---------------------------------------------------------
    # STEP 5: Inspect provisioned case
    # ---------------------------------------------------------
    case_res = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": f"Bearer {faculty_token}", "X-Campus-Id": str(campus_id)},
    )
    assert case_res.status_code == 200
    case_data = case_res.json()
    assert case_data["state"] == "action_planned"
    assert case_data["selected_intervention_key"] == "academic_tutoring_offer"
    assert case_data["student_display_name"] == "Kavya Student"

    # ---------------------------------------------------------
    # STEP 6: Assign responsible staff member (by HOD)
    # ---------------------------------------------------------
    assign_res = await client.post(
        f"/api/v1/cases/{case_id}/assignment",
        json={
            "primary_owner_user_id": str(mentor_user_id),
            "due_at": "2026-10-25T12:00:00Z",
            "reason_code": "ASSIGNED_BY_HOD",
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

    # ---------------------------------------------------------
    # STEP 7: Transition case: assigned owner accepts responsibility
    # ---------------------------------------------------------
    accept_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "accepted", "reason_code": "OWNER_ACCEPTED_ASSIGNMENT"},
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["state"] == "accepted"

    # ---------------------------------------------------------
    # STEP 8: Record follow-up, outcome, and close case
    # ---------------------------------------------------------
    # 8a: Follow-up outreach attempt
    fu_res = await client.post(
        f"/api/v1/cases/{case_id}/follow-ups",
        json={
            "follow_up_type": "in_person",
            "contact_status": "student_reached",
            "proof_kind": "faculty_meeting_notes",
            "occurred_at": "2026-10-12T14:00:00Z",
            "note": "Met with Kavya in department tutoring center. Scheduled 3 recovery problem sessions.",
        },
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert fu_res.status_code == 201

    # Check case state advanced to support_in_progress
    case_check1 = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": f"Bearer {mentor_token}", "X-Campus-Id": str(campus_id)},
    )
    assert case_check1.json()["state"] in ("support_in_progress", "contact_attempted")

    # Transition to follow_up_due
    trans_fu_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "follow_up_due", "reason_code": "TUTORING_SESSIONS_COMPLETED"},
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    # If state is support_in_progress, transition to follow_up_due succeeds
    if case_check1.json()["state"] == "support_in_progress":
        assert trans_fu_res.status_code == 200
        assert trans_fu_res.json()["state"] == "follow_up_due"

    # 8b: Record post-intervention outcome
    outcome_res = await client.post(
        f"/api/v1/cases/{case_id}/outcome",
        json={
            "outcome_status": "helped",
            "rationale": "Student attended all 3 tutoring problem sessions and submitted overdue coursework on time.",
            "evidence_kind": "academic_record",
        },
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert outcome_res.status_code == 201
    assert outcome_res.json()["outcome_status"] == "helped"

    # Verify case state is now outcome_reviewed
    case_check2 = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": f"Bearer {mentor_token}", "X-Campus-Id": str(campus_id)},
    )
    assert case_check2.json()["state"] == "outcome_reviewed"

    # 8c: Formally close case in canonical state machine
    close_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "closed", "reason_code": "INTERVENTION_COMPLETE"},
        headers={
            "Authorization": f"Bearer {mentor_token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert close_res.status_code == 200
    assert close_res.json()["state"] == "closed"

    # ---------------------------------------------------------
    # STEP 9: Read back case and audit history to verify persisted changes
    # ---------------------------------------------------------
    final_case_res = await client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": f"Bearer {mentor_token}", "X-Campus-Id": str(campus_id)},
    )
    assert final_case_res.status_code == 200
    final_case = final_case_res.json()
    assert final_case["state"] == "closed"
    assert len(final_case["follow_ups"]) >= 1
    assert final_case["outcome"]["outcome_status"] == "helped"
    assert final_case["primary_owner_user_id"] == str(mentor_user_id)

    # Verify audit history
    history_res = await client.get(
        f"/api/v1/cases/{case_id}/history",
        headers={"Authorization": f"Bearer {mentor_token}", "X-Campus-Id": str(campus_id)},
    )
    assert history_res.status_code == 200
    events = history_res.json()
    event_types = [e["event_type"] for e in events]
    assert "CASE_CREATED_FROM_SIGNAL" in event_types
    assert "OWNER_ASSIGNED" in event_types
    assert "ASSIGNMENT_ACCEPTED" in event_types
    assert "FOLLOW_UP_RECORDED" in event_types
    assert "OUTCOME_RECORDED" in event_types
    assert "CASE_CLOSED" in event_types


@pytest.mark.asyncio
async def test_phase14_invalid_transition_rejection(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """Verifies that jumping states illegally (e.g. action_planned directly to closed) is blocked with 409."""
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=faculty_user_id)

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-INVALID",
        display_name="Invalid Jump Student",
    )
    db_session.add(student)
    await db_session.flush()

    pv2 = PolicyVersion(
        id=uuid.uuid4(),
        institution_id=campus_id,
        policy_key="campus_p14_v2",
        version=1,
        status="published",
        definition={"rules": []},
        checksum="hash-p14-inv",
        evaluator_version="2.0.0",
        published_at=datetime.now(timezone.utc),
        effective_from=datetime.now(timezone.utc),
    )
    db_session.add(pv2)
    await db_session.flush()

    packet = EvidencePacket(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        policy_version_id=pv2.id,
        schema_version="2.0.0",
        as_of_at=datetime.now(timezone.utc),
        snapshot={},
        digest="p14-inv-digest",
    )
    db_session.add(packet)
    await db_session.flush()

    signal = Signal(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        policy_version_id=pv2.id,
        evidence_packet_id=packet.id,
        rule_key="academic_drop",
        result="attention_suggested",
        quality_state="clean",
        evaluated_at=datetime.now(timezone.utc),
        explanation={"summary": "Academic drop detected", "trigger": "gpa"},
    )
    db_session.add(signal)
    await db_session.commit()

    review_res = await client.post(
        f"/api/v1/signals/{signal.id}/review",
        json={"decision": "approve", "rationale": "Initial approval for invalid jump test."},
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    case_id = review_res.json()["case_id"]

    # Illegal transition: action_planned -> closed
    bad_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "closed"},
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert bad_res.status_code == 409
    err = bad_res.json()["error"]
    assert err["code"] == "CASE_TRANSITION_NOT_ALLOWED"
    assert "assigned" in err["message"]


@pytest.mark.asyncio
async def test_phase14_leadership_queue_segregation(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """Verifies that leadership role cannot access individual cases or queue records (403 Forbidden)."""
    campus_id = seed_data["campus_1"].id
    leadership_user_id = uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")

    m_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=leadership_user_id,
        role="leadership",
        is_active=True,
    )
    db_session.add(m_lead)
    await db_session.commit()

    token = make_jwt(user_id=leadership_user_id)

    # Leadership attempting to list cases
    lead_cases = await client.get(
        "/api/v1/cases",
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert lead_cases.status_code == 403
    assert lead_cases.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"

    # Leadership attempting to list signals
    lead_sigs = await client.get(
        "/api/v1/signals",
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert lead_sigs.status_code == 403
    assert lead_sigs.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"
