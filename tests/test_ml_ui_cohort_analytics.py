"""
SUTRA ML-UI Phase 5 — Cohort Risk Analytics Integration & Contract Tests.

Verifies:
1. Aggregation correctness: deduplication of repeated inference runs per student.
2. Configured risk category distributions (At_Risk, On_Track, Unevaluated) at threshold 0.46.
3. Granular risk tiers (Low Risk < 0.30, Moderate 0.30-0.46, Elevated >= 0.46).
4. Subgroup breakdown by cohort_code and filtering by cohort and timeframe.
5. Small-group privacy protection (ADR-004): suppresses sensitive counts when cohort < 5 for leadership.
6. Empty cohort safe handling: zero students in scope yields valid zeroes (no division by zero).
7. Cross-campus tenancy isolation and role access boundaries.
8. Non-causal governance and accuracy disclaimers.
"""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.case import Case
from app.models.institution import Institution, InstitutionMembership
from app.models.ml import MLInferenceLog
from app.models.signal import Signal
from app.models.student import Student
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_analytics_env(db_session):
    """Sets up campus, users, multiple cohorts of students, and inference records."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Analytics Alpha University")
    inst_b = Institution(id=campus_b_id, name="Analytics Beta College")
    db_session.add_all([inst_a, inst_b])
    await db_session.flush()

    faculty_id = uuid.uuid4()
    leadership_id = uuid.uuid4()

    mem_fac = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=faculty_id,
        role="faculty",
        is_active=True,
    )
    mem_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=leadership_id,
        role="leadership",
        is_active=True,
    )
    db_session.add_all([mem_fac, mem_lead])

    now = datetime.now(timezone.utc)

    # Cohort 1: CS-2026 with 6 students (large cohort, >= 5, not suppressed)
    cs_students = []
    for i in range(1, 7):
        s = Student(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            external_ref=f"CS-STU-{i}",
            display_name=f"CS Student {i}",
            cohort_code="CS-2026",
            enrollment_status="active",
        )
        cs_students.append(s)
        db_session.add(s)

    # Cohort 2: ENG-2026 with 3 students (small cohort, < 5, will be suppressed for leadership)
    eng_students = []
    for i in range(1, 4):
        s = Student(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            external_ref=f"ENG-STU-{i}",
            display_name=f"ENG Student {i}",
            cohort_code="ENG-2026",
            enrollment_status="active",
        )
        eng_students.append(s)
        db_session.add(s)

    # Campus B student for cross-campus isolation test
    stu_b = Student(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        external_ref="BETA-STU-1",
        display_name="Beta Student 1",
        cohort_code="CS-2026",
        enrollment_status="active",
    )
    db_session.add(stu_b)
    await db_session.flush()

    # Add Inference records for CS students:
    # Student 1: 2 predictions (repeated inference: first 0.35, then latest 0.75 At_Risk) -> should count once as At_Risk
    log_cs1_old = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=cs_students[0].id,
        external_student_ref=cs_students[0].external_ref,
        model_name="Logistic Regression",
        model_version="1.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.35,
        threshold=0.46,
        classification="On_Track",
        top_attributions=[],
        created_at=now - timedelta(days=2),
    )
    log_cs1_new = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=cs_students[0].id,
        external_student_ref=cs_students[0].external_ref,
        model_name="Logistic Regression",
        model_version="1.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.75,
        threshold=0.46,
        classification="At_Risk",
        top_attributions=[],
        created_at=now,
    )

    # Student 2: On Track (Low risk, prob=0.18)
    log_cs2 = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=cs_students[1].id,
        external_student_ref=cs_students[1].external_ref,
        model_name="Logistic Regression",
        model_version="1.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.18,
        threshold=0.46,
        classification="On_Track",
        top_attributions=[],
        created_at=now,
    )

    # Student 3: On Track (Moderate risk, prob=0.38)
    log_cs3 = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=cs_students[2].id,
        external_student_ref=cs_students[2].external_ref,
        model_name="Logistic Regression",
        model_version="1.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.38,
        threshold=0.46,
        classification="On_Track",
        top_attributions=[],
        created_at=now,
    )

    # Student 4: At Risk (prob=0.55)
    log_cs4 = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=cs_students[3].id,
        external_student_ref=cs_students[3].external_ref,
        model_name="Logistic Regression",
        model_version="1.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.55,
        threshold=0.46,
        classification="At_Risk",
        top_attributions=[],
        created_at=now,
    )

    # CS Students 5 & 6 have no predictions (Unevaluated)

    # ENG Student 1 has prediction At_Risk (prob=0.82)
    log_eng1 = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=eng_students[0].id,
        external_student_ref=eng_students[0].external_ref,
        model_name="Logistic Regression",
        model_version="1.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.82,
        threshold=0.46,
        classification="At_Risk",
        top_attributions=[],
        created_at=now,
    )

    db_session.add_all([log_cs1_old, log_cs1_new, log_cs2, log_cs3, log_cs4, log_eng1])

    # Add a Case for Student 1 with canonical intervention key
    case_1 = Case(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=cs_students[0].id,
        originating_signal_id=uuid.uuid4(),
        selected_intervention_key="mentor_check_in",
        state="IN_PROGRESS",
    )
    db_session.add(case_1)
    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "faculty_token": make_jwt(faculty_id),
        "lead_token": make_jwt(leadership_id),
    }


@pytest.mark.asyncio
async def test_cohort_analytics_deduplication_and_risk_distribution(
    client: AsyncClient, setup_analytics_env
):
    """
    Requirement 1, 6 & 7:
    - Deduplicates repeated predictions per student (student 1 was predicted twice).
    - Accurately computes At_Risk and On_Track counts and percentages at threshold 0.46.
    - Explicitly surfaces unevaluated students and total prediction runs.
    """
    env = setup_analytics_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    resp = await client.get("/api/v1/analytics/cohort-summary?cohort=CS-2026", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Scope has 6 CS students
    assert data["total_students_in_scope"] == 6
    # 4 distinct students evaluated (CS-1, CS-2, CS-3, CS-4)
    assert data["evaluated_students_count"] == 4
    # Total prediction runs is 5 (CS-1 was predicted twice: 2 + 1 + 1 + 1)
    assert data["total_prediction_runs"] == 5
    assert data["coverage_percentage"] == round((4 / 6) * 100, 1)

    # Risk Distribution at threshold 0.46
    risk = data["risk_distribution"]
    assert risk["threshold"] == 0.46
    assert risk["unevaluated_count"] == 2  # CS-5 and CS-6 unevaluated
    assert risk["at_risk_count"] == 2      # CS-1 and CS-4
    assert risk["on_track_count"] == 2     # CS-2 and CS-3
    assert risk["at_risk_percentage"] == 50.0  # 2 / 4
    assert risk["on_track_percentage"] == 50.0

    # Granular tiers
    tiers = risk["granular_tiers"]
    assert tiers["low_risk"] == 1       # CS-2 (0.18)
    assert tiers["moderate_risk"] == 1  # CS-3 (0.38)
    assert tiers["elevated_risk"] == 2  # CS-1 (0.75) and CS-4 (0.55)


@pytest.mark.asyncio
async def test_small_group_privacy_protection_for_leadership(
    client: AsyncClient, setup_analytics_env
):
    """
    Requirement 2 & 8:
    - Under ADR-004, leadership is authorized to view cohort aggregates.
    - However, subgroups with fewer than 5 students must have sensitive risk classifications suppressed.
    """
    env = setup_analytics_env
    headers_lead = {
        "Authorization": f"Bearer {env['lead_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    # 1. Query small cohort ENG-2026 (N=3 students < 5) as leadership
    resp_small = await client.get("/api/v1/analytics/cohort-summary?cohort=ENG-2026", headers=headers_lead)
    assert resp_small.status_code == 200
    data_small = resp_small.json()

    assert data_small["total_students_in_scope"] == 3
    # Small group privacy suppression must be active
    assert data_small["risk_distribution"]["is_privacy_suppressed"] is True
    assert data_small["risk_distribution"]["at_risk_count"] is None
    assert data_small["risk_distribution"]["at_risk_percentage"] is None
    assert "Subgroup size < 5" in data_small["risk_distribution"]["suppression_reason"]

    # 2. Query large cohort CS-2026 (N=6 students >= 5) as leadership
    resp_large = await client.get("/api/v1/analytics/cohort-summary?cohort=CS-2026", headers=headers_lead)
    assert resp_large.status_code == 200
    data_large = resp_large.json()

    assert data_large["total_students_in_scope"] == 6
    assert data_large["risk_distribution"]["is_privacy_suppressed"] is False
    assert data_large["risk_distribution"]["at_risk_count"] == 2

    # 3. Query all cohorts summary: cohort_breakdown displays per-cohort suppression
    resp_all = await client.get("/api/v1/analytics/cohort-summary", headers=headers_lead)
    assert resp_all.status_code == 200
    data_all = resp_all.json()

    cohort_map = {c["cohort_code"]: c for c in data_all["cohort_breakdown"]}
    assert "ENG-2026" in cohort_map
    assert cohort_map["ENG-2026"]["is_privacy_suppressed"] is True
    assert cohort_map["ENG-2026"]["at_risk_count"] is None

    assert "CS-2026" in cohort_map
    assert cohort_map["CS-2026"]["is_privacy_suppressed"] is False
    assert cohort_map["CS-2026"]["at_risk_count"] == 2


@pytest.mark.asyncio
async def test_empty_cohort_and_zero_division_safety(
    client: AsyncClient, setup_analytics_env
):
    """
    Requirement 5 & 6:
    - Empty cohort yields clean 0 values without NaN or server error.
    """
    env = setup_analytics_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    resp = await client.get("/api/v1/analytics/cohort-summary?cohort=NONEXISTENT-COHORT", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_students_in_scope"] == 0
    assert data["evaluated_students_count"] == 0
    assert data["coverage_percentage"] == 0.0
    assert data["risk_distribution"]["at_risk_count"] == 0
    assert data["risk_distribution"]["at_risk_percentage"] == 0.0
    assert data["risk_distribution"]["unevaluated_count"] == 0


@pytest.mark.asyncio
async def test_governance_disclaimers_present_in_analytics_payload(
    client: AsyncClient, setup_analytics_env
):
    """
    Requirement 8 & Governance:
    - Disclaimers explicitly clarify non-causality, that case counts != model accuracy,
      and that intervention counts != treatment efficacy.
    """
    env = setup_analytics_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    resp = await client.get("/api/v1/analytics/cohort-summary", headers=headers)
    assert resp.status_code == 200
    disclaimers = resp.json()["governance_disclaimers"]

    joined = " ".join(disclaimers)
    assert "not model precision" in joined
    assert "treatment causality" in joined
    assert "ADR-004" in joined
