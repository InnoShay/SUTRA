import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.institution import Institution, InstitutionMembership
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_perf_env(db_session):
    campus_id = uuid.uuid4()
    inst = Institution(id=campus_id, name="Performance Model University")
    db_session.add(inst)
    await db_session.flush()

    faculty_id = uuid.uuid4()
    leadership_id = uuid.uuid4()
    student_id = uuid.uuid4()

    mem_fac = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=faculty_id,
        role="faculty",
        is_active=True,
    )
    mem_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=leadership_id,
        role="leadership",
        is_active=True,
    )
    mem_stu = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=student_id,
        role="student",
        is_active=True,
    )
    db_session.add_all([mem_fac, mem_lead, mem_stu])
    await db_session.commit()

    return {
        "campus_id": campus_id,
        "faculty_token": make_jwt(faculty_id),
        "lead_token": make_jwt(leadership_id),
        "student_token": make_jwt(student_id),
    }


@pytest.mark.asyncio
async def test_verified_model_performance_metric_correctness(client: AsyncClient, setup_perf_env):
    """
    Requirements 1, 2, 4, 6:
    Validates that model performance metrics match the verified held-out evaluation
    of the frozen Logistic Regression v1.0.0 model at threshold 0.46 on Presentation 2014J.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/ml/performance?model_version=v1.0.0", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # 1. Model Identity
    assert data["model_name"] == "Regularized Logistic Regression Baseline"
    assert data["model_version"] == "v1.0.0"
    assert data["operational_threshold"] == 0.46
    assert data["evaluation_environment"] == "offline_held_out_benchmark"

    # 2. Dataset Provenance
    ds = data["dataset_provenance"]
    assert ds["dataset_label"] == "OULAD Day-30 Processed Dataset"
    assert "2014J" in ds["partition"]
    assert ds["sample_size"] == 9203
    assert ds["unique_students"] == 8857
    assert ds["class_prevalence"] == 0.4070
    assert ds["actual_at_risk_count"] == 3746
    assert ds["actual_on_track_count"] == 5457
    assert "HISTORICAL PARTITION NOTICE" in ds["provenance_warning"]

    # 3. Threshold-Independent Metrics
    ti = data["threshold_independent_metrics"]
    assert ti["roc_auc"] == 0.7216
    assert ti["pr_auc"] == 0.6502
    assert ti["brier_score"] == 0.2103
    assert ti["expected_calibration_error_ece"] == 0.0681
    assert ti["maximum_calibration_error_mce"] == 0.0967

    # 4. Threshold-Dependent Metrics (at 0.46)
    td = data["threshold_dependent_metrics"]
    assert td["threshold"] == 0.46
    assert td["accuracy"] == 0.6498
    assert td["balanced_accuracy"] == 0.6573
    assert td["precision"] == 0.5556
    assert td["recall"] == 0.6978
    assert td["specificity"] == 0.6168
    assert td["false_positive_rate"] == 0.3832
    assert td["f1_score"] == 0.6186

    # 5. Confusion Matrix
    cm = td["confusion_matrix"]
    assert cm["tp"] == 2614
    assert cm["fp"] == 2091
    assert cm["tn"] == 3366
    assert cm["fn"] == 1132
    assert cm["tp"] + cm["fp"] + cm["tn"] + cm["fn"] == 9203

    # 6. Operational Workload
    wl = td["operational_workload"]
    assert wl["total_alerts_fired"] == 4705
    assert wl["alert_rate_pct"] == 51.12
    assert wl["false_alarms_advisor_burden"] == 2091
    assert wl["missed_at_risk_students"] == 1132


@pytest.mark.asyncio
async def test_reliability_calibration_plot_and_roc_points(client: AsyncClient, setup_perf_env):
    """
    Requirements 3, 7:
    Validates reliability bins and empirical ROC/PR curve points derived from genuine per-record scores.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/ml/performance", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # Calibration table (10 bins)
    bins = data["reliability_table"]
    assert len(bins) == 10
    total_bin_samples = sum(b["samples_count"] for b in bins)
    assert total_bin_samples == 9203
    assert bins[0]["bin_range"] == "[0.0, 0.1)"
    assert bins[9]["bin_range"] == "[0.9, 1.0)"

    # Empirical ROC curve points
    roc_pts = data["roc_curve_points"]
    assert roc_pts is not None
    assert len(roc_pts) >= 10
    assert roc_pts[0]["fpr"] == 0.0
    assert roc_pts[-1]["fpr"] >= 0.95 or roc_pts[-1]["tpr"] >= 0.95


@pytest.mark.asyncio
async def test_model_version_mismatch_rejection(client: AsyncClient, setup_perf_env):
    """
    Requirements 1, 9:
    Querying an unverified, mismatched, or nonexistent model version is cleanly rejected
    without fabricating metrics.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/ml/performance?model_version=v2.0.0", headers=headers)
    assert resp.status_code in (404, 422)
    err = resp.json()
    assert "mismatch" in str(err).lower() or "not found" in str(err).lower()


@pytest.mark.asyncio
async def test_offline_vs_live_telemetry_distinction(client: AsyncClient, setup_perf_env):
    """
    Requirement 5:
    Clearly distinguishes offline held-out evaluation from live production telemetry.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['lead_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/ml/performance", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["evaluation_environment"] == "offline_held_out_benchmark"
    telemetry = data["live_telemetry"]
    assert telemetry is not None
    assert "total_inferences_logged" in telemetry
    assert "average_latency_ms" in telemetry
    assert "telemetry_notice" in telemetry
    assert "does not represent measured model accuracy" in telemetry["telemetry_notice"]


@pytest.mark.asyncio
async def test_subgroup_metrics_confidence_flags_and_fairness_disclaimer(client: AsyncClient, setup_perf_env):
    """
    Requirement 8:
    Validates that subgroup metrics include sample sizes, confidence flags (flagging N<100 as low confidence),
    and mandatory fairness & non-causal disclaimers.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/ml/performance", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    subgroups = data["subgroup_metrics"]
    assert len(subgroups) > 0
    dimensions = {sg["dimension"] for sg in subgroups}
    assert "code_module" in dimensions
    assert "gender" in dimensions
    assert "age_band" in dimensions

    low_conf = [sg for sg in subgroups if sg["confidence_flag"] == "LOW_CONFIDENCE (<100)"]
    assert len(low_conf) > 0
    for lc in low_conf:
        assert lc["sample_size"] < 100

    assert "FAIRNESS & PARITY NOTICE" in data["fairness_disclaimer"]
    assert "does NOT demonstrate that the model is fair" in data["fairness_disclaimer"]
    assert "NON-CAUSAL GOVERNANCE NOTICE" in data["non_causal_disclaimer"]


@pytest.mark.asyncio
async def test_analytics_model_performance_alias_endpoint(client: AsyncClient, setup_perf_env):
    """
    Validates the /api/v1/analytics/model-performance endpoint path symmetry.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/analytics/model-performance?model_version=v1.0.0", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["model_version"] == "v1.0.0"
    assert data["threshold_dependent_metrics"]["confusion_matrix"]["tp"] == 2614


@pytest.mark.asyncio
async def test_unauthorized_student_access_blocked(client: AsyncClient, setup_perf_env):
    """
    Role-based access check: Students cannot access model performance evaluation internals.
    """
    env = setup_perf_env
    headers = {
        "Authorization": f"Bearer {env['student_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    resp = await client.get("/api/v1/ml/performance", headers=headers)
    assert resp.status_code == 403
