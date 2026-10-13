"""
SUTRA ML-UI Phase 7 — Historical Risk Trends and Monitoring Tests.

Verifies:
1. Chronological ordering of historical snapshots and distinction between unique students vs repeated prediction runs.
2. Anti-fabrication safeguard on missing history (no fake synthetic interpolations when < 2 snapshots).
3. Incompatible model-version and cutoff detection (rejects silent comparison across differing model families).
4. Retention boundaries and cross-campus tenancy isolation.
5. Small-group privacy suppression (ADR-004) for leadership personas when N < 5.
6. Role-based permission boundaries (students 403 on cohort trends & performance monitoring; restricted to own trajectory).
7. Student risk trajectory score delta computation and model transition warnings.
8. Historical performance monitoring separating labeled validation holdouts from live pending term completion.
"""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.institution import Institution, InstitutionMembership
from app.models.ml import MLInferenceLog
from app.models.student import Student
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_phase7_env(db_session):
    """Sets up campus A and B, leadership, faculty, student users, and multi-date inference logs."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Phase 7 Trend University A")
    inst_b = Institution(id=campus_b_id, name="Phase 7 Trend College B")
    db_session.add_all([inst_a, inst_b])
    await db_session.flush()

    faculty_id = uuid.uuid4()
    leadership_id = uuid.uuid4()
    student_1_id = uuid.uuid4()
    student_2_id = uuid.uuid4()

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
    mem_stu1 = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=student_1_id,
        role="student",
        is_active=True,
    )
    mem_stu2 = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=student_2_id,
        role="student",
        is_active=True,
    )
    db_session.add_all([mem_fac, mem_lead, mem_stu1, mem_stu2])

    # Add Students in Campus A
    stu1 = Student(
        id=student_1_id,
        institution_id=campus_a_id,
        external_ref="STU-001",
        display_name="Student 001",
        cohort_code="CS-2026",
    )
    stu2 = Student(
        id=student_2_id,
        institution_id=campus_a_id,
        external_ref="STU-002",
        display_name="Student 002",
        cohort_code="CS-2026",
    )
    stu3 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-003",
        display_name="Student 003",
        cohort_code="CS-2026",
    )
    stu4 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-004",
        display_name="Student 004",
        cohort_code="CS-2026",
    )
    stu5 = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-005",
        display_name="Student 005",
        cohort_code="CS-2026",
    )
    # Campus B student (isolated)
    stu_b = Student(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        external_ref="STU-B-001",
        display_name="Student B 001",
        cohort_code="CS-2026",
    )
    db_session.add_all([stu1, stu2, stu3, stu4, stu5, stu_b])
    await db_session.flush()

    now = datetime.now(timezone.utc)
    t_minus_10 = (now - timedelta(days=10)).replace(hour=12, minute=0, second=0, microsecond=0)
    t_minus_5 = (now - timedelta(days=5)).replace(hour=12, minute=0, second=0, microsecond=0)
    t_minus_1 = (now - timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
    t_old = (now - timedelta(days=400)).replace(hour=12, minute=0, second=0, microsecond=0)  # Beyond 365d retention

    # Snapshot 1: 10 days ago (5 students evaluated, 1 rescore on STU-001) -> Total runs = 6, Unique = 5
    logs = [
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu1.id,
            external_student_ref="STU-001",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.52,
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=t_minus_10 - timedelta(hours=2),
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu1.id,
            external_student_ref="STU-001",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.48,  # rescore later that day
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=t_minus_10,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu2.id,
            external_student_ref="STU-002",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.22,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_10,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu3.id,
            external_student_ref="STU-003",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.35,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_10,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu4.id,
            external_student_ref="STU-004",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.60,
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=t_minus_10,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu5.id,
            external_student_ref="STU-005",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.28,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_10,
        ),
        # Snapshot 2: 5 days ago (Same 5 students rescored) -> Total runs = 5, Unique = 5
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu1.id,
            external_student_ref="STU-001",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.42,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_5,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu2.id,
            external_student_ref="STU-002",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.18,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_5,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu3.id,
            external_student_ref="STU-003",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.31,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_5,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu4.id,
            external_student_ref="STU-004",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.55,
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=t_minus_5,
        ),
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu5.id,
            external_student_ref="STU-005",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.25,
            threshold=0.46,
            classification="On_Track",
            top_attributions=[],
            created_at=t_minus_5,
        ),
        # Expired log beyond 365d retention
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=stu1.id,
            external_student_ref="STU-001",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.70,
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=t_old,
        ),
        # Campus B log (should NEVER leak to Campus A)
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_b_id,
            student_id=stu_b.id,
            external_student_ref="STU-B-001",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.99,
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=t_minus_1,
        ),
    ]
    db_session.add_all(logs)
    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "faculty_token": make_jwt(faculty_id),
        "lead_token": make_jwt(leadership_id),
        "student_1_token": make_jwt(student_1_id),
        "student_2_token": make_jwt(student_2_id),
        "fac_headers": {"Authorization": f"Bearer {make_jwt(faculty_id)}", "X-Campus-Id": str(campus_a_id)},
        "lead_headers": {"Authorization": f"Bearer {make_jwt(leadership_id)}", "X-Campus-Id": str(campus_a_id)},
        "stu1_headers": {"Authorization": f"Bearer {make_jwt(student_1_id)}", "X-Campus-Id": str(campus_a_id)},
        "stu2_headers": {"Authorization": f"Bearer {make_jwt(student_2_id)}", "X-Campus-Id": str(campus_a_id)},
        "student_1_ref": "STU-001",
        "student_2_ref": "STU-002",
    }


@pytest.mark.asyncio
async def test_historical_ordering_and_unique_students_vs_rescores(client: AsyncClient, setup_phase7_env):
    """
    Requirements 2, 3, 4:
    Validates chronological ordering of snapshots, distinct tracking of total runs vs unique students,
    and identification of model version and prediction timestamps.
    """
    env = setup_phase7_env
    res = await client.get(
        "/api/v1/analytics/risk-trends",
        headers=env["fac_headers"],
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["has_comparable_history"] is True
    assert len(data["snapshots"]) == 2

    # Snapshots are in chronological ascending order
    snap_1 = data["snapshots"][0]
    snap_2 = data["snapshots"][1]
    assert snap_1["snapshot_id"] < snap_2["snapshot_id"]

    # In Snapshot 1: 6 runs, 5 unique students, 1 repeated rescore
    assert snap_1["total_prediction_runs"] == 6
    assert snap_1["unique_students_evaluated"] == 5
    assert snap_1["repeated_rescores_count"] == 1
    assert snap_1["model_version"] == "v1.0.0"
    assert snap_1["is_comparable"] is True
    assert snap_1["prediction_cutoff"] == "Day 30"

    # In Snapshot 2: 5 runs, 5 unique students, 0 repeated rescores
    assert snap_2["total_prediction_runs"] == 5
    assert snap_2["unique_students_evaluated"] == 5
    assert snap_2["repeated_rescores_count"] == 0

    # Overall totals (excluding expired 400d log and campus B log)
    assert data["total_historical_runs"] == 11
    assert data["total_unique_students"] == 5
    assert data["rescore_frequency"] == 2.2  # 11 runs / 5 students = 2.2 runs/student


@pytest.mark.asyncio
async def test_anti_fabrication_on_missing_history(client: AsyncClient, setup_phase7_env):
    """
    Requirements 2, 7:
    When comparable snapshots are < 2, the system must set has_comparable_history = False
    and return an anti-fabrication data gap notice rather than generating fake points.
    """
    env = setup_phase7_env
    # Query with retention_days = 7, so Snapshot 1 (10 days ago) is omitted, leaving only 1 snapshot
    res = await client.get(
        "/api/v1/analytics/risk-trends?retention_days=7",
        headers=env["fac_headers"],
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["has_comparable_history"] is False
    assert len(data["snapshots"]) == 1
    assert data["data_gap_notice"] is not None
    assert "SUTRA requires at least two comparable evaluation snapshots" in data["data_gap_notice"]
    assert "does not synthesize fake predictions" in data["data_gap_notice"]


@pytest.mark.asyncio
async def test_incompatible_model_version_detection(client: AsyncClient, db_session, setup_phase7_env):
    """
    Requirement 8:
    Scores generated from incompatible model versions must NOT be silently compared.
    System must flag is_comparable = False and surface incompatibility reason.
    """
    env = setup_phase7_env
    # Inject a snapshot with an incompatible model version v2.0.0
    now = datetime.now(timezone.utc)
    incompat_log = MLInferenceLog(
        id=uuid.uuid4(),
        institution_id=env["campus_a_id"],
        external_student_ref="STU-001",
        model_name="experimental_xgboost_candidate",
        model_version="v2.0.0",
        prediction_cutoff="Day 30",
        risk_probability=0.75,
        threshold=0.46,
        classification="At_Risk",
        top_attributions=[],
        created_at=now,
    )
    db_session.add(incompat_log)
    await db_session.commit()

    res = await client.get(
        "/api/v1/analytics/risk-trends",
        headers=env["fac_headers"],
    )
    assert res.status_code == 200
    data = res.json()

    # Incompatible snapshot is flagged
    assert data["incompatible_snapshots_detected"] >= 1
    incompat_snap = [s for s in data["snapshots"] if not s["is_comparable"]][0]
    assert incompat_snap["model_version"] == "v2.0.0"
    assert "Incompatible Model Version" in incompat_snap["incompatibility_reason"]


@pytest.mark.asyncio
async def test_retention_and_tenancy_boundary_enforcement(client: AsyncClient, setup_phase7_env):
    """
    Requirement 9:
    Validates that:
    1. Records older than retention_days (400d log) are omitted.
    2. Campus B records (99% probability) are never returned in Campus A's trend response.
    """
    env = setup_phase7_env
    res = await client.get(
        "/api/v1/analytics/risk-trends?retention_days=365",
        headers=env["fac_headers"],
    )
    assert res.status_code == 200
    data = res.json()

    # The 400-day-old log (which had prob 0.70) is excluded
    all_runs = data["total_historical_runs"]
    assert all_runs == 11  # exactly the 6 from day 10 + 5 from day 5

    # Campus B student STU-B-001 must not appear anywhere
    for snap in data["snapshots"]:
        assert snap["mean_risk_probability"] < 0.90  # STU-B-001 has 0.99


@pytest.mark.asyncio
async def test_small_group_privacy_suppression_under_adr004(client: AsyncClient, db_session, setup_phase7_env):
    """
    Requirements 5, 9:
    When unique students evaluated in a snapshot < 5 and user is leadership,
    sensitive risk counts must be suppressed under ADR-004.
    """
    env = setup_phase7_env
    # Create a small cohort with only 3 students
    campus_id = env["campus_a_id"]
    now = datetime.now(timezone.utc)
    small_logs = [
        MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=campus_id,
            external_student_ref=f"SMALL-STU-{i}",
            model_name="logistic_regression_baseline",
            model_version="v1.0.0",
            prediction_cutoff="Day 30",
            risk_probability=0.65,
            threshold=0.46,
            classification="At_Risk",
            top_attributions=[],
            created_at=now - timedelta(days=2),
        )
        for i in range(3)
    ]
    db_session.add_all(small_logs)
    await db_session.commit()

    # Query as Leadership
    res_lead = await client.get(
        "/api/v1/analytics/risk-trends",
        headers=env["lead_headers"],
    )
    assert res_lead.status_code == 200
    data_lead = res_lead.json()
    small_snap = [s for s in data_lead["snapshots"] if s["unique_students_evaluated"] == 3][0]

    assert small_snap["is_privacy_suppressed"] is True
    assert small_snap["at_risk_count"] is None
    assert small_snap["on_track_count"] is None
    assert "Protected under ADR-004" in small_snap["suppression_reason"]

    # Query as Faculty (should NOT be suppressed)
    res_fac = await client.get(
        "/api/v1/analytics/risk-trends",
        headers=env["fac_headers"],
    )
    assert res_fac.status_code == 200
    data_fac = res_fac.json()
    fac_snap = [s for s in data_fac["snapshots"] if s["unique_students_evaluated"] == 3][0]
    assert fac_snap["is_privacy_suppressed"] is False
    assert fac_snap["at_risk_count"] == 3


@pytest.mark.asyncio
async def test_student_role_permission_boundaries(client: AsyncClient, setup_phase7_env):
    """
    Requirement 9:
    Students cannot access cohort risk trends or performance monitoring (403).
    Students can access their own student risk trajectory, but not another student's (403).
    """
    env = setup_phase7_env

    # 1. Student blocked from cohort trends
    res1 = await client.get(
        "/api/v1/analytics/risk-trends",
        headers=env["stu1_headers"],
    )
    assert res1.status_code == 403

    # 2. Student blocked from performance monitoring
    res2 = await client.get(
        "/api/v1/analytics/performance-monitoring",
        headers=env["stu1_headers"],
    )
    assert res2.status_code == 403

    # 3. Student 1 allowed to view own trajectory
    res3 = await client.get(
        f"/api/v1/analytics/student-risk-trajectory/{env['student_1_ref']}",
        headers=env["stu1_headers"],
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["external_student_ref"] == env["student_1_ref"]
    assert len(data3["trajectory"]) >= 2

    # 4. Student 1 forbidden from viewing Student 2 trajectory
    res4 = await client.get(
        f"/api/v1/analytics/student-risk-trajectory/{env['student_2_ref']}",
        headers=env["stu1_headers"],
    )
    assert res4.status_code == 403


@pytest.mark.asyncio
async def test_student_risk_trajectory_deltas_and_version_alert(client: AsyncClient, setup_phase7_env):
    """
    Requirements 3, 4, 8:
    Validates chronological trajectory, score delta calculation, and non-causal notice.
    """
    env = setup_phase7_env
    res = await client.get(
        f"/api/v1/analytics/student-risk-trajectory/{env['student_1_ref']}",
        headers=env["fac_headers"],
    )
    assert res.status_code == 200
    data = res.json()

    traj = data["trajectory"]
    assert len(traj) >= 3  # Initial 0.52 -> Rescore 0.48 -> Rescore 0.42

    # Point 1: initial score
    assert traj[0]["risk_probability"] == 0.52
    assert traj[0]["score_delta_from_previous"] is None

    # Point 2: rescore later that day
    assert traj[1]["risk_probability"] == 0.48
    assert traj[1]["score_delta_from_previous"] == -0.04  # 0.48 - 0.52

    # Point 3: rescore 5 days ago
    assert traj[2]["risk_probability"] == 0.42
    assert traj[2]["score_delta_from_previous"] == -0.06  # 0.42 - 0.48

    # Non-causal notice present
    assert "A decrease in score does not guarantee course completion" in data["causality_notice"]


@pytest.mark.asyncio
async def test_historical_performance_monitoring_labeled_vs_pending(client: AsyncClient, setup_phase7_env):
    """
    Requirement 6:
    Separate process for evaluating predictions against ground-truth outcomes over time.
    Distinguishes historical validation holdouts from active live campus term.
    """
    env = setup_phase7_env
    res = await client.get(
        "/api/v1/analytics/performance-monitoring",
        headers=env["fac_headers"],
    )
    assert res.status_code == 200
    data = res.json()

    assert data["total_labeled_cohorts"] == 4
    evals = data["evaluations"]
    assert len(evals) == 5  # 4 historical holdouts + 1 active live term

    # Historical holdouts have ground-truth metrics
    holdout_2014j = [e for e in evals if "2014J" in e["cohort_label"]][0]
    assert holdout_2014j["ground_truth_status"] == "AVAILABLE_HISTORICAL"
    assert holdout_2014j["realized_roc_auc"] == 0.7216
    assert holdout_2014j["realized_recall"] == 0.6978
    assert holdout_2014j["realized_precision"] == 0.5556
    assert holdout_2014j["drift_status"] == "STABLE"

    # Active live term has pending outcomes
    live_term = [e for e in evals if "Active Campus Cohort" in e["cohort_label"]][0]
    assert live_term["ground_truth_status"] == "PENDING_TERM_COMPLETION"
    assert live_term["realized_roc_auc"] is None
    assert live_term["drift_status"] == "LABELS_PENDING"
    assert "Official student outcome labels are pending term completion" in live_term["drift_warning"]
