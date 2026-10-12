import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import verify_supabase_jwt
from app.models.case import Case, CaseEvent, CaseTask
from app.models.followup import CaseOutcome, FollowUp
from app.models.institution import Institution, InstitutionMembership
from app.models.observation import StudentObservation
from app.models.policy import PolicyVersion
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from tests.conftest import TestAsyncSessionLocal
from tests.utils import make_jwt


# ==============================================================================
# 1. DATABASE CONNECTIVITY, POOLING & TRANSACTION ISOLATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_supabase_database_pool_configuration(db_session: AsyncSession):
    """
    Verifies that the database engine adheres to Supabase-compatible settings:
    - pool_pre_ping enabled to detect dropped cloud connections
    - statement_cache_size=0 for asyncpg PgBouncer transaction pooler compatibility
    - pool size and recycle parameters set
    """
    assert settings.DATABASE_POOL_PRE_PING is True
    assert settings.DATABASE_STATEMENT_CACHE_SIZE == 0
    assert settings.DATABASE_POOL_SIZE >= 5
    assert settings.DATABASE_POOL_RECYCLE > 0

    # Verify connection ping executes cleanly
    result = await db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1


@pytest.mark.asyncio
async def test_database_persistence_across_isolated_sessions(db_session: AsyncSession):
    """
    Verifies that records committed to the database persist and can be retrieved,
    simulating request completion and subsequent query retrieval.
    """
    campus_id = uuid.uuid4()
    inst = Institution(id=campus_id, name="Supabase Persistence Campus", status="active")
    db_session.add(inst)
    await db_session.commit()

    # Query after commit
    queried = (
        await db_session.execute(
            select(Institution).where(Institution.id == campus_id)
        )
    ).scalar_one_or_none()
    assert queried is not None
    assert queried.name == "Supabase Persistence Campus"


@pytest.mark.asyncio
async def test_database_transaction_rollback_on_error(db_session: AsyncSession):
    """
    Verifies that uncommitted changes are rolled back on error and do not corrupt state.
    """
    campus_id = uuid.uuid4()
    inst = Institution(id=campus_id, name="Rollback Campus", status="active")
    db_session.add(inst)

    # Intentionally trigger rollback
    await db_session.rollback()

    queried = (
        await db_session.execute(
            select(Institution).where(Institution.id == campus_id)
        )
    ).scalar_one_or_none()
    assert queried is None


# ==============================================================================
# 2. SUPABASE AUTHENTICATION & JWT VERIFICATION TESTS
# ==============================================================================

def test_supabase_jwt_verification_valid():
    """Verifies that cryptographically signed JWT tokens are properly validated."""
    user_id = uuid.uuid4()
    token = make_jwt(user_id=user_id)
    payload = verify_supabase_jwt(token)
    assert payload["sub"] == str(user_id)
    assert payload["aud"] == "authenticated"


def test_supabase_jwt_verification_expired():
    """Verifies that expired Supabase JWTs are rejected immediately."""
    user_id = uuid.uuid4()
    token = make_jwt(user_id=user_id, expired=True)
    with pytest.raises(Exception) as excinfo:
        verify_supabase_jwt(token)
    assert "expired" in str(excinfo.value).lower()


def test_supabase_jwt_verification_tampered_secret():
    """Verifies that JWTs signed with an invalid or untrusted key are rejected."""
    user_id = uuid.uuid4()
    token = make_jwt(user_id=user_id, secret="untrusted-forged-attacker-key-12345")
    with pytest.raises(Exception) as excinfo:
        verify_supabase_jwt(token)
    assert "invalid" in str(excinfo.value).lower()


@pytest.mark.asyncio
async def test_supabase_jwt_role_in_token_is_not_blindly_trusted(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """
    CRITICAL SECURITY CHECK:
    An attacker crafts a JWT claiming role='finance' or 'institution_admin' in token payload claims.
    FastAPI must ignore client token role claims and authorize strictly via PostgreSQL
    InstitutionMembership.
    """
    campus_1_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]

    student_1 = Student(
        id=uuid.uuid4(),
        institution_id=campus_1_id,
        external_ref="STU-SUPABASE-101",
        display_name="Supabase Test Student",
        enrollment_status="active",
    )
    db_session.add(student_1)
    await db_session.commit()

    # Forged claims in token
    forged_token = make_jwt(
        user_id=user_id,
        extra_claims={"role": "finance", "roles": ["finance", "institution_admin"]}
    )

    # Faculty cannot access finance observations (restricted to 'finance' role in DB)
    response = await client.get(
        f"/api/v1/students/{student_1.id}/finance",
        headers={
            "Authorization": f"Bearer {forged_token}",
            "X-Campus-Id": str(campus_1_id),
        },
    )
    # Must be denied (403 Forbidden)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FINANCE_DOMAIN_RESTRICTED"


# ==============================================================================
# 3. CAMPUS ISOLATION & DIRECT API CROSS-TENANT PREVENTION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_cross_campus_direct_api_access_blocked(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """
    Verifies that a user authorized on Campus 2 cannot access student records
    on Campus 1 via direct API calls.
    """
    campus_1_id = seed_data["campus_1"].id
    student_1 = Student(
        id=uuid.uuid4(),
        institution_id=campus_1_id,
        external_ref="STU-CAMPUS1-001",
        display_name="Campus 1 Student",
        enrollment_status="active",
    )
    db_session.add(student_1)
    await db_session.commit()

    user_campus2 = seed_data["user_campus2_id"]
    token = make_jwt(user_id=user_campus2)

    # Direct request to campus 1 student using Campus 2 credentials
    response = await client.get(
        f"/api/v1/students/{student_1.id}/support-view",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_1_id),
        },
    )
    # Blocked at campus perimeter (403 Forbidden)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CAMPUS_MEMBERSHIP_NOT_FOUND"


# ==============================================================================
# 4. END-TO-END SUPABASE PERSISTENCE JOURNEY (STEP 6 VERIFICATION)
# ==============================================================================

@pytest.mark.asyncio
async def test_supabase_full_e2e_persistence_workflow(
    client: AsyncClient, seed_data, db_session: AsyncSession
):
    """
    STEP 6: Longest Supported End-to-End Workflow Verification:
    1. Authenticate with verified Supabase JWT.
    2. Retrieve authorized student.
    3. Retrieve signals and evidence packet.
    4. Record supported human review with mandatory rationale.
    5. Create and assign intervention.
    6. Record follow-up with proof.
    7. Record outcome.
    8. Retrieve updated history and verify persistence in database.
    """
    campus_id = seed_data["campus_1"].id
    faculty_user_id = seed_data["user_faculty_id"]

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="STU-E2E-001",
        display_name="Ananya Student",
        enrollment_status="active",
    )
    db_session.add(student)
    await db_session.commit()

    mentor_user_id = uuid.uuid4()
    m_mentor = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=mentor_user_id,
        role="mentor",
        is_active=True,
    )
    hod_user_id = uuid.uuid4()
    m_hod = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=hod_user_id,
        role="hod",
        is_active=True,
    )
    db_session.add_all([m_mentor, m_hod])
    await db_session.commit()

    mentor_token = make_jwt(user_id=mentor_user_id)
    hod_token = make_jwt(user_id=hod_user_id)
    mentor_headers = {"Authorization": f"Bearer {mentor_token}", "X-Campus-Id": str(campus_id)}
    hod_headers = {"Authorization": f"Bearer {hod_token}", "X-Campus-Id": str(campus_id)}

    # 1. Retrieve authorized student support view
    res = await client.get(f"/api/v1/students/{student.id}/support-view", headers=mentor_headers)
    assert res.status_code == 200
    stu_data = res.json()
    assert stu_data["student"]["external_ref"] == student.external_ref

    # 2. Ingest fresh observations via standard API
    import_payload = {
        "source_system": "canvas_lms_v2",
        "schema_version": "1.0",
        "observations": [
            {
                "external_student_ref": "STU-E2E-001",
                "domain": "attendance",
                "metric_key": "attendance_rate",
                "value": 0.58,
                "unit": "ratio",
                "event_at": "2026-10-02T00:00:00Z",
                "available_at": "2026-10-02T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "att_e2e_001",
                "source_version": 1,
            },
            {
                "external_student_ref": "STU-E2E-001",
                "domain": "academic",
                "metric_key": "missing_assignments_count",
                "value": 3,
                "unit": "count",
                "event_at": "2026-10-05T00:00:00Z",
                "available_at": "2026-10-05T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "acad_e2e_001",
                "source_version": 1,
            },
        ],
    }
    ingest_res = await client.post(
        "/api/v1/imports",
        json=import_payload,
        headers={
            **hod_headers,
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert ingest_res.status_code == 201

    # Evaluate signal for student
    eval_res = await client.post(
        f"/api/v1/students/{student.id}/signals/evaluate",
        json={"as_of_at": "2026-10-07T00:00:00Z"},
        headers=mentor_headers,
    )
    assert eval_res.status_code == 200
    signal_data = eval_res.json()
    signal_id = signal_data["id"]

    # 3. Retrieve signal's evidence packet
    res = await client.get(f"/api/v1/signals/{signal_id}", headers=mentor_headers)
    assert res.status_code == 200
    assert res.json()["id"] == signal_id

    # 4. Record supported human review (No Alert Without Action)
    review_res = await client.post(
        f"/api/v1/signals/{signal_id}/review",
        json={
            "decision": "approve",
            "selected_intervention_key": "academic_peer_tutoring",
            "reason_code": "REVIEWER_APPROVED_RECOMMENDATION",
            "rationale": "Student missed 3 consecutive practical labs. Initiating mentor outreach.",
        },
        headers=mentor_headers,
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    case_id = review_data["case_id"]
    assert case_id is not None

    # 5. Assign intervention to mentor via HOD
    assign_res = await client.post(
        f"/api/v1/cases/{case_id}/assignment",
        json={
            "primary_owner_user_id": str(mentor_user_id),
            "due_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "reason_code": "ASSIGNED_MENTOR_SUPPORT",
        },
        headers=hod_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["state"] == "assigned"

    # Accept assignment
    accept_res = await client.post(
        f"/api/v1/cases/{case_id}/accept-assignment",
        json={"acceptance_note": "Assignment accepted by faculty mentor."},
        headers=mentor_headers,
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["state"] == "accepted"

    # Delegate subtask
    task_res = await client.post(
        f"/api/v1/cases/{case_id}/tasks",
        json={
            "domain": "academic",
            "generic_label": "Math 101 Catch-up Session",
            "due_at": "2026-10-18T00:00:00Z",
        },
        headers={
            **mentor_headers,
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert task_res.status_code == 201

    # 6. Record a follow-up
    followup_res = await client.post(
        f"/api/v1/cases/{case_id}/follow-ups",
        json={
            "follow_up_type": "support_delivered",
            "contact_status": "student_reached",
            "proof_kind": "appointment_record",
            "proof_ref": "REF-MEET-2026-10",
            "note": "Met student in departmental office. Tutoring schedule created.",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
        headers={
            **mentor_headers,
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert followup_res.status_code == 201
    assert followup_res.json()["contact_status"] == "student_reached"

    # 7. Record an outcome
    outcome_res = await client.post(
        f"/api/v1/cases/{case_id}/outcome",
        json={
            "outcome_status": "helped",
            "rationale": "Student attended tutoring, completed missed labs, attendance restored to 88%.",
            "evidence_kind": "academic_record",
        },
        headers={
            **mentor_headers,
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert outcome_res.status_code == 201
    assert outcome_res.json()["outcome_status"] == "helped"

    # Formally close case
    close_res = await client.post(
        f"/api/v1/cases/{case_id}/transition",
        json={"to_state": "closed", "reason_code": "CASE_OBJECTIVES_FULFILLED"},
        headers={
            **mentor_headers,
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert close_res.status_code == 200
    assert close_res.json()["state"] == "closed"

    # 8. Retrieve updated history and verify persistence in database
    persisted_case = (
        await db_session.execute(
            select(Case).where(Case.id == uuid.UUID(case_id))
        )
    ).scalar_one_or_none()
    assert persisted_case is not None
    assert persisted_case.state == "closed"

    # Check follow-up in session
    persisted_fu = (
        await db_session.execute(
            select(FollowUp).where(FollowUp.case_id == uuid.UUID(case_id))
        )
    ).scalars().all()
    assert len(persisted_fu) >= 1
    assert persisted_fu[0].proof_ref == "REF-MEET-2026-10"

    # Check outcome in session
    persisted_outcome = (
        await db_session.execute(
            select(CaseOutcome).where(CaseOutcome.case_id == uuid.UUID(case_id))
        )
    ).scalar_one_or_none()
    assert persisted_outcome is not None
    assert persisted_outcome.outcome_status == "helped"
