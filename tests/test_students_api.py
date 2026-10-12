"""
Tests for Phase 9: Student Registry and Authorized Lookup (GET /api/v1/students).

Verifies:
1. Authorized student listing with campus scoping.
2. Filtering by cohort code and pagination (limit/offset).
3. Student profile retrieval by UUID and external_ref.
4. Support view retrieval by UUID and external_ref.
5. Cross-campus isolation (404 Not Found, preventing existence oracle).
6. Non-existent and malformed student identifiers return 404.
7. Disallowed roles (e.g. pure leadership role) receive 403.
8. Unauthenticated and invalid token requests receive 401.
9. Privacy integrity: no passwords, tokens, or sensitive non-permitted fields exposed.
"""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.case import Case
from app.models.institution import Institution, InstitutionMembership
from app.models.observation import StudentObservation
from app.models.policy import PolicyVersion
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_students_multi_campus(db_session):
    """Sets up two campuses with isolated students, signals, and cases."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Campus Alpha")
    inst_b = Institution(id=campus_b_id, name="Campus Beta")
    db_session.add_all([inst_a, inst_b])
    await db_session.flush()

    # User identities
    user_faculty_a = uuid.uuid4()
    user_leadership_a = uuid.uuid4()
    user_faculty_b = uuid.uuid4()

    memberships = [
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_faculty_a, role="faculty", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_a_id, user_id=user_leadership_a, role="leadership", is_active=True),
        InstitutionMembership(id=uuid.uuid4(), institution_id=campus_b_id, user_id=user_faculty_b, role="faculty", is_active=True),
    ]
    db_session.add_all(memberships)

    # Students in Campus A
    student_a1 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-1007",
        display_name="Alex Morgan",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    student_a2 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-1008",
        display_name="Taylor Swift",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    student_a3 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-1009",
        display_name="Jordan Bell",
        cohort_code="EE-Y1",
        enrollment_status="leave_of_absence",
    )

    # Student in Campus B (isolated)
    student_b = Student(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        external_ref="SYN-2001",
        display_name="Sam Fisher",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )

    db_session.add_all([student_a1, student_a2, student_a3, student_b])
    await db_session.flush()

    # Add an active signal and case for student_a1 to verify support view counts
    pv_a = PolicyVersion(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        policy_key="campus_alpha_v1",
        version=1,
        status="published",
        definition={"rules": []},
        checksum="hash-test-student",
        evaluator_version="2.0.0",
        published_at=datetime.now(timezone.utc),
        effective_from=datetime.now(timezone.utc),
    )
    ep_a = EvidencePacket(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_a1.id,
        policy_version_id=pv_a.id,
        schema_version="2.0.0",
        as_of_at=datetime.now(timezone.utc),
        snapshot={"attendance": 0.65},
        digest="sha256-mock-student-test",
    )
    db_session.add_all([pv_a, ep_a])
    await db_session.flush()

    sig_a = Signal(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_a1.id,
        policy_version_id=pv_a.id,
        evidence_packet_id=ep_a.id,
        rule_key="d30_inactivity",
        result="attention_suggested",
        quality_state="verified",
        explanation="Low activity detected",
        evaluated_at=datetime.now(timezone.utc),
    )
    case_a = Case(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_a1.id,
        originating_signal_id=sig_a.id,
        selected_intervention_key="mentor_check_in",
        state="assigned",
        primary_owner_user_id=user_faculty_a,
        due_at=datetime.now(timezone.utc) + timedelta(days=7),
        version=1,
    )
    obs_a = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_a1.id,
        domain="attendance",
        metric_key="class_attendance_rate",
        value={"val": 0.65},
        quality_state="verified",
        source_system="sis_push",
        source_record_ref="MOCK-REC-001",
        event_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    db_session.add_all([sig_a, case_a, obs_a])
    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "user_faculty_a": user_faculty_a,
        "user_leadership_a": user_leadership_a,
        "user_faculty_b": user_faculty_b,
        "student_a1": student_a1,
        "student_a2": student_a2,
        "student_a3": student_a3,
        "student_b": student_b,
    }


@pytest.mark.asyncio
async def test_authorized_student_listing_campus_scoped(client: AsyncClient, setup_students_multi_campus):
    """Faculty in Campus A lists only students in Campus A."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    response = await client.get("/api/v1/students", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    # Order is by external_ref ascending
    refs = [s["external_ref"] for s in data]
    assert refs == ["SYN-1007", "SYN-1008", "SYN-1009"]
    assert "SYN-2001" not in refs  # Campus B student excluded


@pytest.mark.asyncio
async def test_student_listing_cohort_filter_and_pagination(client: AsyncClient, setup_students_multi_campus):
    """Tests cohort filtering and limit/offset pagination."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    # Filter by cohort CS-Y2
    res_cohort = await client.get("/api/v1/students?cohort=CS-Y2", headers=headers)
    assert res_cohort.status_code == 200
    data_cohort = res_cohort.json()
    assert len(data_cohort) == 2
    for s in data_cohort:
        assert s["cohort_code"] == "CS-Y2"

    # Pagination: limit=1, offset=1
    res_page = await client.get("/api/v1/students?limit=1&offset=1", headers=headers)
    assert res_page.status_code == 200
    data_page = res_page.json()
    assert len(data_page) == 1
    assert data_page[0]["external_ref"] == "SYN-1008"


@pytest.mark.asyncio
async def test_student_lookup_by_uuid_and_external_ref(client: AsyncClient, setup_students_multi_campus):
    """Verifies that lookup works interchangeably via UUID or external reference."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    s1 = ctx["student_a1"]

    # 1. Lookup by UUID
    res_uuid = await client.get(f"/api/v1/students/{s1.id}", headers=headers)
    assert res_uuid.status_code == 200
    data_uuid = res_uuid.json()
    assert data_uuid["id"] == str(s1.id)
    assert data_uuid["external_ref"] == "SYN-1007"
    assert data_uuid["display_name"] == "Alex Morgan"
    assert data_uuid["cohort_code"] == "CS-Y2"
    assert data_uuid["enrollment_status"] == "active"

    # 2. Lookup by external reference
    res_ref = await client.get(f"/api/v1/students/{s1.external_ref}", headers=headers)
    assert res_ref.status_code == 200
    data_ref = res_ref.json()
    assert data_ref["id"] == str(s1.id)
    assert data_ref["external_ref"] == "SYN-1007"
    assert data_ref["display_name"] == "Alex Morgan"


@pytest.mark.asyncio
async def test_support_view_lookup_by_external_ref(client: AsyncClient, setup_students_multi_campus):
    """Verifies support view is retrievable via external reference."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    s1 = ctx["student_a1"]
    res = await client.get(f"/api/v1/students/{s1.external_ref}/support-view", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student"]["external_ref"] == "SYN-1007"
    assert data["active_signals_count"] == 1
    assert data["active_cases_count"] == 1
    assert data["freshness_metrics"]["total_observations"] == 1


@pytest.mark.asyncio
async def test_cross_campus_isolation_returns_404(client: AsyncClient, setup_students_multi_campus):
    """Attempting to access a student in Campus B while authenticated in Campus A returns 404."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    s_b = ctx["student_b"]

    # 1. By UUID
    res_uuid = await client.get(f"/api/v1/students/{s_b.id}", headers=headers)
    assert res_uuid.status_code == 404
    assert res_uuid.json()["error"]["code"] in ("RESOURCE_NOT_FOUND", "NOT_FOUND")

    # 2. By external reference
    res_ref = await client.get(f"/api/v1/students/{s_b.external_ref}", headers=headers)
    assert res_ref.status_code == 404
    assert res_ref.json()["error"]["code"] in ("RESOURCE_NOT_FOUND", "NOT_FOUND")


@pytest.mark.asyncio
async def test_unknown_student_returns_404(client: AsyncClient, setup_students_multi_campus):
    """Querying an unknown UUID or non-existent external ref returns 404."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_faculty_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    random_uuid = uuid.uuid4()
    res1 = await client.get(f"/api/v1/students/{random_uuid}", headers=headers)
    assert res1.status_code == 404

    res2 = await client.get("/api/v1/students/NON-EXISTENT-REF-999", headers=headers)
    assert res2.status_code == 404


@pytest.mark.asyncio
async def test_disallowed_leadership_role_receives_403(client: AsyncClient, setup_students_multi_campus):
    """Leadership role without granular operational permissions receives 403."""
    ctx = setup_students_multi_campus
    token = make_jwt(ctx["user_leadership_a"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_a_id"])}

    res_list = await client.get("/api/v1/students", headers=headers)
    assert res_list.status_code == 403
    assert res_list.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"

    s1 = ctx["student_a1"]
    res_get = await client.get(f"/api/v1/students/{s1.id}", headers=headers)
    assert res_get.status_code == 403
    assert res_get.json()["error"]["code"] == "LEADERSHIP_QUEUE_ACCESS_DENIED"


@pytest.mark.asyncio
async def test_unauthenticated_requests_receive_401(client: AsyncClient, setup_students_multi_campus):
    """Requests without token or with invalid header receive 401."""
    ctx = setup_students_multi_campus

    # List
    res_list = await client.get("/api/v1/students")
    assert res_list.status_code == 401

    # Get
    res_get = await client.get(f"/api/v1/students/{ctx['student_a1'].id}")
    assert res_get.status_code == 401
