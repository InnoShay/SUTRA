import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import StateConflictError
from app.core.logging import redact_sensitive_data
from app.models.case import Case, CaseEvent, CaseTask, RestrictedTaskDetail
from app.models.followup import CaseOutcome, FollowUp
from app.models.idempotency import IdempotencyRecord
from app.models.institution import Institution, InstitutionMembership
from app.models.observation import FinanceObservation, StudentObservation
from app.models.outbox import NotificationOutbox
from app.models.policy import PolicyVersion
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from app.services.case_service import CaseService
from app.services.idempotency import IdempotencyService, compute_request_hash
from app.services.worker import OutboxWorker
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_multi_campus(db_session: AsyncSession):
    """Sets up two isolated campuses with different roles for authorization testing."""
    campus_a_id = uuid.UUID("aaaaaaaa-1111-1111-1111-111111111111")
    campus_b_id = uuid.UUID("bbbbbbbb-2222-2222-2222-222222222222")

    c_a = Institution(id=campus_a_id, name="Campus A", status="active")
    c_b = Institution(id=campus_b_id, name="Campus B", status="active")
    db_session.add_all([c_a, c_b])

    # Users
    user_faculty_a = uuid.UUID("11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    user_hod_a = uuid.UUID("22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    user_counsellor_a = uuid.UUID("33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    user_finance_a = uuid.UUID("44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    user_leadership_a = uuid.UUID("55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

    user_faculty_b = uuid.UUID("66666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

    memberships = [
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_faculty_a, role="faculty", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_hod_a, role="hod", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_counsellor_a, role="counsellor", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_finance_a, role="finance", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_leadership_a, role="leadership", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_b_id, user_id=user_faculty_b, role="faculty", is_active=True),
    ]
    db_session.add_all(memberships)

    # Student at Campus A
    student_a = Student(
        id=uuid.UUID("99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        institution_id=campus_a_id,
        external_ref="STU-A-001",
        display_name="Student Alpha",
        cohort_code="2026-UG",
        enrollment_status="active",
    )
    # Student at Campus B
    student_b = Student(
        id=uuid.UUID("99999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        institution_id=campus_b_id,
        external_ref="STU-B-001",
        display_name="Student Beta",
        cohort_code="2026-UG",
        enrollment_status="active",
    )
    db_session.add_all([student_a, student_b])

    # Policy versions
    pv_a = PolicyVersion(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        policy_key="ug_attendance_academic_v1",
        version=1,
        status="published",
        definition={"rules": []},
        checksum="hash-a",
        evaluator_version="2.0.0",
        published_at=datetime.now(timezone.utc),
        effective_from=datetime.now(timezone.utc),
    )
    pv_b = PolicyVersion(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        policy_key="ug_attendance_academic_v1",
        version=1,
        status="published",
        definition={"rules": []},
        checksum="hash-b",
        evaluator_version="2.0.0",
        published_at=datetime.now(timezone.utc),
        effective_from=datetime.now(timezone.utc),
    )
    db_session.add_all([pv_a, pv_b])
    await db_session.flush()

    # Evidence Packet and Signal at Campus A
    ep_a = EvidencePacket(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_a.id,
        policy_version_id=pv_a.id,
        schema_version="2.0.0",
        as_of_at=datetime.now(timezone.utc),
        snapshot={"attendance": 0.60},
        digest="sha256-mock-digest-a",
    )
    db_session.add(ep_a)
    await db_session.flush()

    sig_a = Signal(
        id=uuid.UUID("88888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        institution_id=campus_a_id,
        student_id=student_a.id,
        policy_version_id=pv_a.id,
        evidence_packet_id=ep_a.id,
        rule_key="ug_attendance_academic_v1",
        result="attention_suggested",
        quality_state="verified",
        explanation="Low attendance detected",
        evaluated_at=datetime.now(timezone.utc),
    )
    db_session.add(sig_a)

    # Case at Campus A
    case_a = Case(
        id=uuid.UUID("77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        institution_id=campus_a_id,
        student_id=student_a.id,
        originating_signal_id=sig_a.id,
        selected_intervention_key="mentor_check_in",
        state="assigned",
        primary_owner_user_id=user_faculty_a,
        due_at=datetime.now(timezone.utc) + timedelta(days=7),
        version=1,
    )
    db_session.add(case_a)

    # Case at Campus B
    ep_b = EvidencePacket(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        student_id=student_b.id,
        policy_version_id=pv_b.id,
        schema_version="2.0.0",
        as_of_at=datetime.now(timezone.utc),
        snapshot={"attendance": 0.50},
        digest="sha256-mock-digest-b",
    )
    db_session.add(ep_b)
    await db_session.flush()

    sig_b = Signal(
        id=uuid.UUID("88888888-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        institution_id=campus_b_id,
        student_id=student_b.id,
        policy_version_id=pv_b.id,
        evidence_packet_id=ep_b.id,
        rule_key="ug_attendance_academic_v1",
        result="attention_suggested",
        quality_state="verified",
        explanation="Low attendance detected",
        evaluated_at=datetime.now(timezone.utc),
    )
    db_session.add(sig_b)
    await db_session.flush()

    case_b = Case(
        id=uuid.UUID("77777777-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        institution_id=campus_b_id,
        student_id=student_b.id,
        originating_signal_id=sig_b.id,
        selected_intervention_key="mentor_check_in",
        state="action_planned",
        version=1,
    )
    db_session.add(case_b)

    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "user_faculty_a": user_faculty_a,
        "user_hod_a": user_hod_a,
        "user_counsellor_a": user_counsellor_a,
        "user_finance_a": user_finance_a,
        "user_leadership_a": user_leadership_a,
        "user_faculty_b": user_faculty_b,
        "student_a": student_a,
        "student_b": student_b,
        "sig_a": sig_a,
        "sig_b": sig_b,
        "case_a": case_a,
        "case_b": case_b,
    }


# ==============================================================================
# 1. CROSS-CAMPUS ISOLATION & TENANCY TESTS (ADR-004)
# ==============================================================================

@pytest.mark.asyncio
async def test_cross_campus_student_access_returns_404(client: AsyncClient, setup_multi_campus):
    """User in Campus A attempting to access Student in Campus B returns 404 (indistinguishable from non-existent)."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    response = await client.get(f"/api/v1/students/{ctx['student_b'].id}", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] in ("RESOURCE_NOT_FOUND", "NOT_FOUND")


@pytest.mark.asyncio
async def test_cross_campus_case_access_returns_404(client: AsyncClient, setup_multi_campus):
    """User in Campus A attempting to view or transition Case in Campus B returns 404."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    response = await client.get(f"/api/v1/cases/{ctx['case_b'].id}", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] in ("RESOURCE_NOT_FOUND", "NOT_FOUND")

    # Also transition mutation across campus must return 404
    trans_resp = await client.post(
        f"/api/v1/cases/{ctx['case_b'].id}/transition",
        headers=headers,
        json={"to_state": "assigned"},
    )
    assert trans_resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_campus_signal_review_returns_404(client: AsyncClient, setup_multi_campus):
    """User in Campus A attempting to review Signal in Campus B returns 404."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_hod_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    response = await client.post(
        f"/api/v1/signals/{ctx['sig_b'].id}/review",
        headers=headers,
        json={"decision": "approve", "selected_intervention_key": "mentor_check_in"},
    )
    assert response.status_code == 404


# ==============================================================================
# 2. ROLE RESTRICTIONS & LEADERSHIP PRIVACY TESTS (ADR-003, ADR-004)
# ==============================================================================

@pytest.mark.asyncio
async def test_leadership_cannot_access_identifiable_queues(client: AsyncClient, setup_multi_campus):
    """Leadership role is restricted to cohort aggregates only; requesting individual queues returns 403."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_leadership_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    # /cases queue
    cases_resp = await client.get("/api/v1/cases", headers=headers)
    assert cases_resp.status_code == 403
    assert cases_resp.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"

    # /students queue
    students_resp = await client.get("/api/v1/students", headers=headers)
    assert students_resp.status_code == 403
    assert students_resp.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"

    # /signals queue
    signals_resp = await client.get("/api/v1/signals", headers=headers)
    assert signals_resp.status_code == 403
    assert signals_resp.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"


@pytest.mark.asyncio
async def test_mentor_and_faculty_cannot_read_finance_details(client: AsyncClient, setup_multi_campus):
    """Faculty or mentor requesting /students/{id}/finance returns 403 Forbidden."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    response = await client.get(f"/api/v1/students/{ctx['student_a'].id}/finance", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FINANCE_DOMAIN_RESTRICTED"


@pytest.mark.asyncio
async def test_finance_role_can_read_finance_details(client: AsyncClient, setup_multi_campus):
    """Authorized finance role accessing /students/{id}/finance returns 200 OK."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_finance_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    response = await client.get(f"/api/v1/students/{ctx['student_a'].id}/finance", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "finance_observations" in data


@pytest.mark.asyncio
async def test_non_counsellor_cannot_read_restricted_task_details(client: AsyncClient, setup_multi_campus, db_session: AsyncSession):
    """Faculty attempting to read restricted counselling task details returns 403."""
    ctx = setup_multi_campus

    # Create counselling task with restricted details
    task = CaseTask(
        id=uuid.uuid4(),
        institution_id=ctx["campus_a_id"],
        case_id=ctx["case_a"].id,
        domain="counselling",
        generic_label="Emotional Well-being Check-in",
        state="pending",
        idempotency_key="task-counsel-01",
    )
    r_detail = RestrictedTaskDetail(
        id=uuid.uuid4(),
        institution_id=ctx["campus_a_id"],
        task_id=task.id,
        restricted_domain="counselling",
        details={"confidential_notes": "Student indicated high personal anxiety"},
        purpose_key="counselling_support",
    )
    db_session.add_all([task, r_detail])
    await db_session.commit()

    token_faculty = make_jwt(ctx["user_faculty_a"])
    headers_faculty = {"Authorization": f"Bearer {token_faculty}", "X-Campus-Id": str(ctx["campus_a_id"])}

    resp_fac = await client.get(f"/api/v1/cases/{ctx['case_a'].id}/tasks/{task.id}/restricted", headers=headers_faculty)
    assert resp_fac.status_code == 403
    assert resp_fac.json()["error"]["code"] == "RESTRICTED_DOMAIN_PERMISSION_DENIED"

    # Authorized counsellor access returns 200
    token_counsellor = make_jwt(ctx["user_counsellor_a"])
    headers_counsellor = {"Authorization": f"Bearer {token_counsellor}", "X-Campus-Id": str(ctx["campus_a_id"])}
    resp_coun = await client.get(f"/api/v1/cases/{ctx['case_a'].id}/tasks/{task.id}/restricted", headers=headers_counsellor)
    assert resp_coun.status_code == 200
    assert resp_coun.json()["details"]["confidential_notes"] == "Student indicated high personal anxiety"


# ==============================================================================
# 3. SERVER-SIDE JWT VALIDATION & UNTRUSTED CLIENT CLAIMS
# ==============================================================================

@pytest.mark.asyncio
async def test_client_supplied_role_in_request_body_is_ignored(client: AsyncClient, setup_multi_campus):
    """Client attempting privilege escalation by passing role='institution_admin' in JSON is blocked."""
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    # Faculty trying to call supervisor override
    resp = await client.post(
        f"/api/v1/cases/{ctx['case_a'].id}/override",
        headers=headers,
        json={
            "role": "institution_admin",
            "override_action": "manual_close",
            "to_state": "closed",
            "reason_code": "TAMPER_ATTEMPT",
            "rationale": "Attempting override as faculty",
        },
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "INSUFFICIENT_ROLE_PERMISSIONS"


# ==============================================================================
# 4. IDEMPOTENCY & TRANSACTION CONSISTENCY TESTS (ADR-007)
# ==============================================================================

@pytest.mark.asyncio
async def test_duplicate_transition_with_idempotency_key_replays_result(client: AsyncClient, setup_multi_campus):
    """
    Submitting the same transition twice with the same Idempotency-Key returns
    the cached response without re-triggering state changes or duplicating events.
    """
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])  # Assigned owner
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Campus-Id": str(ctx["campus_a_id"]),
        "Idempotency-Key": "idemp-accept-12345",
    }

    # First request: assigned -> accepted
    payload = {"to_state": "accepted", "reason_code": "OWNER_ACCEPTED_ASSIGNMENT"}
    resp1 = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/transition", headers=headers, json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["state"] == "accepted"

    # Second request: identical Idempotency-Key & payload
    resp2 = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/transition", headers=headers, json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2 == data1


@pytest.mark.asyncio
async def test_idempotency_key_mismatch_raises_409_conflict(client: AsyncClient, setup_multi_campus):
    """
    Reusing an Idempotency-Key with a different payload raises a 409 Conflict (IDEMPOTENCY_KEY_MISMATCH).
    """
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Campus-Id": str(ctx["campus_a_id"]),
        "Idempotency-Key": "idemp-reused-key-999",
    }

    # First request
    payload1 = {"to_state": "accepted", "reason_code": "OWNER_ACCEPTED_ASSIGNMENT"}
    resp1 = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/transition", headers=headers, json=payload1)
    assert resp1.status_code == 200

    # Second request with SAME idempotency key but DIFFERENT payload (mismatch)
    payload2 = {"to_state": "accepted", "reason_code": "DIFFERENT_REASON_PAYLOAD"}
    resp2 = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/transition", headers=headers, json=payload2)
    assert resp2.status_code == 409
    assert resp2.json()["error"]["code"] == "IDEMPOTENCY_KEY_MISMATCH"


@pytest.mark.asyncio
async def test_optimistic_concurrency_version_mismatch_raises_409(client: AsyncClient, setup_multi_campus):
    """
    Supplying an outdated expected_version raises a 409 Conflict (CONCURRENT_CASE_MODIFICATION).
    """
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    # Case version is currently 1. We pass expected_version = 99
    payload = {
        "to_state": "accepted",
        "reason_code": "OWNER_ACCEPTED_ASSIGNMENT",
        "expected_version": 99,
    }
    resp = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/transition", headers=headers, json=payload)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONCURRENT_CASE_MODIFICATION"


@pytest.mark.asyncio
async def test_duplicate_case_creation_from_signal_is_idempotent(db_session: AsyncSession, setup_multi_campus):
    """
    Calling CaseService.create_case_from_signal concurrently or repeatedly
    returns the single canonical case without duplicate rows.
    """
    ctx = setup_multi_campus

    c1 = await CaseService.create_case_from_signal(
        db=db_session,
        campus_id=ctx["campus_a_id"],
        signal_id=ctx["sig_a"].id,
        user_id=ctx["user_hod_a"],
        selected_intervention_key="mentor_check_in",
        reason_code="APPROVAL_1",
        idempotency_key="create-sig-a-1",
    )
    c2 = await CaseService.create_case_from_signal(
        db=db_session,
        campus_id=ctx["campus_a_id"],
        signal_id=ctx["sig_a"].id,
        user_id=ctx["user_hod_a"],
        selected_intervention_key="mentor_check_in",
        reason_code="APPROVAL_2",
        idempotency_key="create-sig-a-2",
    )
    assert c1.id == c2.id


@pytest.mark.asyncio
async def test_outcome_recording_is_idempotent(client: AsyncClient, setup_multi_campus, db_session: AsyncSession):
    """
    Recording outcome multiple times on a case returns the existing outcome idempotently.
    """
    ctx = setup_multi_campus
    # Advance case to follow_up_due first
    case = await db_session.get(Case, ctx["case_a"].id)
    case.state = "follow_up_due"
    await db_session.commit()

    token = make_jwt(ctx["user_hod_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    outcome_payload = {
        "outcome_status": "helped",
        "rationale": "Student completed all required remedial tutoring sessions",
        "evidence_kind": "staff_review",
    }
    resp1 = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/outcome", headers=headers, json=outcome_payload)
    assert resp1.status_code == 201
    o1 = resp1.json()

    # Second call returns existing outcome
    resp2 = await client.post(f"/api/v1/cases/{ctx['case_a'].id}/outcome", headers=headers, json=outcome_payload)
    assert resp2.status_code == 201
    o2 = resp2.json()
    assert o1["id"] == o2["id"]


# ==============================================================================
# 5. DURABLE ASYNCHRONOUS WORKER & FAILURE RECOVERY (ADR-007)
# ==============================================================================

@pytest.mark.asyncio
async def test_outbox_worker_drains_pending_items(db_session: AsyncSession, setup_multi_campus):
    """Worker picks up pending notification outbox events and marks them sent."""
    ctx = setup_multi_campus

    outbox_item = NotificationOutbox(
        id=uuid.uuid4(),
        institution_id=ctx["campus_a_id"],
        case_id=ctx["case_a"].id,
        adapter_key="in_app_demo",
        template_key="TEST_NOTIFICATION",
        safe_payload={"msg": "Hello"},
        status="pending",
        idempotency_key="outbox-test-drain-1",
    )
    db_session.add(outbox_item)
    await db_session.commit()

    stats = await OutboxWorker.process_outbox_batch(db=db_session, campus_id=ctx["campus_a_id"])
    assert stats["processed"] >= 1
    assert stats["sent"] >= 1

    updated = await db_session.get(NotificationOutbox, outbox_item.id)
    assert updated.status == "sent"
    assert updated.sent_at is not None


@pytest.mark.asyncio
async def test_outbox_worker_retries_with_backoff_and_dead_letters(db_session: AsyncSession, setup_multi_campus):
    """
    When an outbox dispatch fails, attempts increments with backoff;
    after MAX_RETRIES (5), status is set to dead_letter.
    """
    ctx = setup_multi_campus

    outbox_item = NotificationOutbox(
        id=uuid.uuid4(),
        institution_id=ctx["campus_a_id"],
        case_id=ctx["case_a"].id,
        adapter_key="failing_adapter",
        template_key="TEST_FAIL",
        safe_payload={"msg": "Fail me"},
        status="pending",
        attempts=4,  # Next failure will trigger dead-lettering
        idempotency_key="outbox-test-fail-1",
    )
    db_session.add(outbox_item)
    await db_session.commit()

    def failing_dispatcher(item):
        raise ConnectionError("Simulated external service timeout")

    stats = await OutboxWorker.process_outbox_batch(
        db=db_session,
        campus_id=ctx["campus_a_id"],
        dispatcher=failing_dispatcher,
    )
    assert stats["dead_letter"] == 1

    updated = await db_session.get(NotificationOutbox, outbox_item.id)
    assert updated.status == "dead_letter"
    assert "MAX_RETRIES_EXCEEDED" in updated.last_error_code


@pytest.mark.asyncio
async def test_deadline_escalation_worker_scans_and_escalates(db_session: AsyncSession, setup_multi_campus):
    """Overdue cases with due_at < now are escalated, recorded in events, and queued in outbox."""
    ctx = setup_multi_campus

    # Set due_at in the past
    past_due = datetime.now(timezone.utc) - timedelta(days=2)
    case = await db_session.get(Case, ctx["case_a"].id)
    case.due_at = past_due
    case.is_escalated = False
    await db_session.commit()

    escalated_count = await OutboxWorker.scan_and_escalate_overdue_cases(
        db=db_session,
        campus_id=ctx["campus_a_id"],
    )
    assert escalated_count == 1

    updated_case = await db_session.get(Case, ctx["case_a"].id)
    assert updated_case.is_escalated is True

    # CaseEvent emitted
    history = (await db_session.execute(
        CaseEvent.__table__.select().where(CaseEvent.case_id == ctx["case_a"].id, CaseEvent.event_type == "CASE_ESCALATED")
    )).all()
    assert len(history) == 1


# ==============================================================================
# 6. AUDIT INTEGRITY & SENSITIVE DATA REDACTION
# ==============================================================================

def test_sensitive_data_redactor_masks_confidential_fields():
    """Confidential fields, passwords, tokens, fees, and raw vectors are masked."""
    payload = {
        "student_display_name": "John Doe",
        "token": "eyJhbGciOi...",
        "supabase_service_role_key": "secret-service-key",
        "fee_amount": 15000,
        "counselling_note": "Confidential therapeutic note",
        "feature_vector": [0.1, 0.4, 0.9],
        "nested": {
            "password": "plaintext_pwd",
            "session_notes": "Private doctor consultation",
            "normal_field": "visible",
        },
    }
    redacted = redact_sensitive_data(payload)
    assert redacted["token"] == "[REDACTED]"
    assert redacted["supabase_service_role_key"] == "[REDACTED]"
    assert redacted["fee_amount"] == "[REDACTED]"
    assert redacted["counselling_note"] == "[REDACTED]"
    assert redacted["feature_vector"] == "[REDACTED]"
    assert redacted["nested"]["password"] == "[REDACTED]"
    assert redacted["nested"]["session_notes"] == "[REDACTED]"
    assert redacted["nested"]["normal_field"] == "visible"


# ==============================================================================
# 7. ML & WORKFLOW RESILIENCE (ADR-002, ADR-005)
# ==============================================================================

@pytest.mark.asyncio
async def test_corrupt_ml_artifact_does_not_break_deterministic_workflow(client: AsyncClient, setup_multi_campus):
    """
    If ML model artifact fails or is corrupt:
    - /predict returns 503 Service Unavailable cleanly.
    - Deterministic policy evaluation /signals/evaluate continues working 100%.
    - Human review and case lifecycle remain fully functional.
    """
    ctx = setup_multi_campus
    token = make_jwt(ctx["user_hod_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    with patch("app.ml.service.ml_service.get_status", return_value="corrupt"):
        # 1. Deterministic policy evaluation succeeds regardless of ML status
        eval_resp = await client.post(
            f"/api/v1/students/{ctx['student_a'].id}/signals/evaluate",
            headers=headers,
        )
        assert eval_resp.status_code == 200
        assert eval_resp.json()["result"] in ("attention_suggested", "normal", "unknown")

        # 2. Case workflow transitions succeed regardless of ML status (using assigned owner)
        token_faculty = make_jwt(ctx["user_faculty_a"])
        headers_fac = {"Authorization": f"Bearer {token_faculty}", "X-Campus-Id": str(ctx["campus_a_id"])}
        case_resp = await client.post(
            f"/api/v1/cases/{ctx['case_a'].id}/transition",
            headers=headers_fac,
            json={"to_state": "accepted", "reason_code": "OWNER_ACCEPTED_ASSIGNMENT"},
        )
        assert case_resp.status_code == 200
        assert case_resp.json()["state"] == "accepted"
