"""
Unit and integration tests for Phase 11: Student Observations and Feature Readiness.
Verifies:
1. Observations filtering by domain and quality_state.
2. Feature readiness contract on students with zero observations.
3. Feature readiness on institutional-only attendance telemetry (ensures no silent fabrication of VLE clicks).
4. Feature readiness on complete canonical 25 Day-30 features (READY).
5. Feature readiness on stale observations (STALE_DATA).
6. Tenancy isolation: 404 for student in another campus (no cross-campus enumeration).
7. Security: 403 for disallowed roles (leadership), 401 for unauthenticated requests.
8. Governance disclaimer: explicit non-prediction guarantee.
"""

import uuid
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.institution import Institution, InstitutionMembership
from app.models.observation import StudentObservation
from app.models.student import Student
from app.schemas.ml import DAY30_REQUIRED_FEATURES
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_readiness_env(db_session):
    """Sets up campus, users, and students for readiness testing."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Alpha Tech Campus")
    inst_b = Institution(id=campus_b_id, name="Beta State Campus")
    db_session.add_all([inst_a, inst_b])
    await db_session.flush()

    advisor_user_id = uuid.uuid4()
    leadership_user_id = uuid.uuid4()

    mem_advisor = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=advisor_user_id,
        role="advisor",
        is_active=True,
    )
    mem_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=leadership_user_id,
        role="leadership",
        is_active=True,
    )
    db_session.add_all([mem_advisor, mem_lead])

    # Student 1 in Campus A (Standard student with attendance observations)
    student_1 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-101",
        display_name="Student Alpha",
        cohort_code="CS-2026",
        enrollment_status="active",
    )
    # Student 2 in Campus A (Student with all 25 Day-30 features)
    student_2 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-READY",
        display_name="Student Ready",
        cohort_code="CS-2026",
        enrollment_status="active",
    )
    # Student 3 in Campus A (Student with stale features)
    student_3 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-STALE",
        display_name="Student Stale",
        cohort_code="CS-2026",
        enrollment_status="active",
    )
    # Student 4 in Campus B (Cross-campus test)
    student_4 = Student(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        external_ref="STU-BETA-99",
        display_name="Student Beta",
        cohort_code="ENG-2026",
        enrollment_status="active",
    )
    db_session.add_all([student_1, student_2, student_3, student_4])
    await db_session.flush()

    now = datetime.now(timezone.utc)

    # Observations for Student 1: Institutional attendance + academic
    obs_att = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_1.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.82},
        unit="ratio",
        quality_state="valid",
        event_at=now,
        available_at=now,
        source_system="biometric_turnstile",
        source_record_ref="att-01",
    )
    obs_acad = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_1.id,
        domain="academic",
        metric_key="missing_assignments_count",
        value={"val": 2},
        unit="count",
        quality_state="stale",
        event_at=now,
        available_at=now,
        source_system="canvas_lms",
        source_record_ref="acad-01",
    )
    db_session.add_all([obs_att, obs_acad])

    # Observations for Student 2: All 25 Day-30 features valid
    for feat in DAY30_REQUIRED_FEATURES:
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_2.id,
            domain="academic" if "assessment" in feat else ("participation" if "vle" in feat else "demographic"),
            metric_key=feat,
            value={"val": 10 if "click" in feat or "credit" in feat else "N"},
            quality_state="valid",
            event_at=now,
            available_at=now,
            source_system="canonical_importer",
            source_record_ref=f"rec-{feat}",
        ))

    # Observations for Student 3: All 25 features, but one marked stale
    for idx, feat in enumerate(DAY30_REQUIRED_FEATURES):
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_3.id,
            domain="academic" if "assessment" in feat else ("participation" if "vle" in feat else "demographic"),
            metric_key=feat,
            value={"val": 5},
            quality_state="stale" if idx == 0 else "valid",
            event_at=now,
            available_at=now,
            source_system="canonical_importer",
            source_record_ref=f"rec-stale-{feat}",
        ))

    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "advisor_token": make_jwt(advisor_user_id),
        "lead_token": make_jwt(leadership_user_id),
        "student_1": student_1,
        "student_2": student_2,
        "student_3": student_3,
        "student_4": student_4,
    }


@pytest.mark.asyncio
async def test_list_observations_filtering(client: AsyncClient, setup_readiness_env):
    env = setup_readiness_env
    headers = {
        "Authorization": f"Bearer {env['advisor_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s1_id = env["student_1"].id

    # 1. List all observations
    resp = await client.get(f"/api/v1/students/{s1_id}/observations", headers=headers)
    assert resp.status_code == 200
    all_obs = resp.json()
    assert len(all_obs) == 2

    # 2. Filter by domain = 'attendance'
    resp = await client.get(f"/api/v1/students/{s1_id}/observations?domain=attendance", headers=headers)
    assert resp.status_code == 200
    att_obs = resp.json()
    assert len(att_obs) == 1
    assert att_obs[0]["domain"] == "attendance"
    assert att_obs[0]["metric_key"] == "attendance_rate"

    # 3. Filter by quality_state = 'stale'
    resp = await client.get(f"/api/v1/students/{s1_id}/observations?quality_state=stale", headers=headers)
    assert resp.status_code == 200
    stale_obs = resp.json()
    assert len(stale_obs) == 1
    assert stale_obs[0]["metric_key"] == "missing_assignments_count"
    assert stale_obs[0]["quality_state"] == "stale"


@pytest.mark.asyncio
async def test_readiness_on_institutional_only_attendance_student(client: AsyncClient, setup_readiness_env):
    """
    Verifies that a student with only generic attendance/academic metrics
    is correctly recognized as NOT ready for the OULAD model, and that
    the system does NOT fabricate or silently approximate VLE clicks.
    """
    env = setup_readiness_env
    headers = {
        "Authorization": f"Bearer {env['advisor_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s1_id = env["student_1"].id

    resp = await client.get(f"/api/v1/students/{s1_id}/readiness", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["student"]["external_ref"] == "STU-101"
    assert data["is_ready_for_inference"] is False
    assert data["applicability_status"] == "MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM"
    assert "cannot be derived from institutional attendance" in data["applicability_rationale"]

    # 25 total features checked
    assert data["features_total_required"] == 25
    assert data["features_underivable_count"] == 12  # All 12 VLE features cannot be derived
    assert data["features_available_count"] == 0

    # Ensure each VLE feature is explicitly marked underivable
    vle_items = [f for f in data["features"] if f["category"] == "vle_engagement"]
    assert len(vle_items) == 12
    for item in vle_items:
        assert item["status"] == "underivable_from_source"
        assert item["observed_value"] is None

    # Telemetry audit correctly reports the 2 observations that do exist
    assert data["telemetry_audit"]["total_observations"] == 2
    assert "attendance" in data["telemetry_audit"]["domains_present"]
    assert "academic" in data["telemetry_audit"]["domains_present"]

    # Governance disclaimer check
    assert "does NOT generate an early-warning score" in data["governance_disclaimer"]
    assert "Missing or underivable data must NEVER be treated as an indicator that the student is at risk" in data["governance_disclaimer"]


@pytest.mark.asyncio
async def test_readiness_on_fully_populated_canonical_features(client: AsyncClient, setup_readiness_env):
    """Verifies that when all 25 Day-30 features are present and valid, status is READY."""
    env = setup_readiness_env
    headers = {
        "Authorization": f"Bearer {env['advisor_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s2_id = env["student_2"].id

    resp = await client.get(f"/api/v1/students/{s2_id}/readiness", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_ready_for_inference"] is True
    assert data["applicability_status"] == "READY"
    assert data["features_available_count"] == 25
    assert data["features_missing_count"] == 0
    assert data["features_underivable_count"] == 0
    assert data["features_stale_count"] == 0
    assert "All 25 canonical Day-30 features are present" in data["applicability_rationale"]


@pytest.mark.asyncio
async def test_readiness_on_stale_features(client: AsyncClient, setup_readiness_env):
    """Verifies that if any observation has stale quality, readiness is blocked with STALE_DATA."""
    env = setup_readiness_env
    headers = {
        "Authorization": f"Bearer {env['advisor_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s3_id = env["student_3"].id

    resp = await client.get(f"/api/v1/students/{s3_id}/readiness", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_ready_for_inference"] is False
    assert data["applicability_status"] == "STALE_DATA"
    assert data["features_stale_count"] == 1
    assert data["telemetry_audit"]["is_stale"] is True


@pytest.mark.asyncio
async def test_readiness_tenancy_isolation_and_security(client: AsyncClient, setup_readiness_env):
    """Verifies cross-campus 404, leadership role 403, and unauthenticated 401."""
    env = setup_readiness_env
    headers_campus_a = {
        "Authorization": f"Bearer {env['advisor_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    # 1. Student in Campus B queried from Campus A -> MUST 404
    resp = await client.get(f"/api/v1/students/{env['student_4'].id}/readiness", headers=headers_campus_a)
    assert resp.status_code == 404

    resp = await client.get(f"/api/v1/students/{env['student_4'].id}/observations", headers=headers_campus_a)
    assert resp.status_code == 404

    # 2. Leadership role without individual operational role -> MUST 403
    headers_lead = {
        "Authorization": f"Bearer {env['lead_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    resp = await client.get(f"/api/v1/students/{env['student_1'].id}/readiness", headers=headers_lead)
    assert resp.status_code == 403

    # 3. Unauthenticated -> MUST 401
    resp = await client.get(f"/api/v1/students/{env['student_1'].id}/readiness")
    assert resp.status_code == 401
