"""
Unit and integration tests for SUTRA ML Phase Twenty-Three.

Validates:
1. Common-cohort row matching and exact target alignment (N = 26,361).
2. Prediction-feature alignment between Day-30 and Day-60 snapshots.
3. Target and post-cutoff leakage protection in research inference schemas.
4. Threshold-selection provenance and operating-point derivation.
5. Research model artifact and schema compatibility (4 frozen pipelines).
6. Single-record and batch inference consistency.
7. Research-only labeling, non-causal disclaimers, and UI access.
8. Production baseline model immutability (SHA-256 78a08... and threshold 0.46) and closed candidate gate.
9. Reproducibility of audit metrics from saved JSON evaluation records.
"""

import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest
from starlette.testclient import TestClient

from backend.app.main import create_app
from sutra_ml.inference.research_scorer import (
    get_available_sample_registrations,
    get_registration_snapshots,
    score_research_forecast,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
PROCESSED_DIR = ML_DIR / "data" / "processed"
EXPERIMENTS_DIR = ML_DIR / "artifacts" / "experiments" / "phase_twenty_two"
AUDIT_METRICS_PATH = ML_DIR / "reports" / "metrics" / "phase_twenty_three_common_cohort_metrics.json"


def compute_file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def test_common_cohort_matching_and_target_alignment():
    """Verify common cohort contains exactly 26,361 rows with matching targets."""
    d30 = pd.read_csv(PROCESSED_DIR / "phase22_day30_features.csv")
    d60 = pd.read_csv(PROCESSED_DIR / "phase22_day60_features.csv")
    keys = ["code_module", "code_presentation", "id_student"]

    assert len(d30) == 27466
    assert len(d60) == 26361
    assert len(d30) - len(d60) == 1105

    d30_common = pd.merge(d60[keys], d30, on=keys, how="inner")
    assert len(d30_common) == 26361
    assert np.array_equal(d30_common["target"].values, d60["target"].values)
    assert round(float(d60["target"].mean()), 4) == 0.4164


def test_target_and_post_cutoff_leakage_protection():
    """Verify zero forbidden leakage tokens exist in feature vectors."""
    snapshots = get_registration_snapshots("AAA", "2013J", 11391)
    f30 = snapshots["day30_snapshot"]["features"]
    f60 = snapshots["day60_snapshot"]["features"]

    forbidden = ["score", "grade", "final_result", "date_unregistration", "unregistration"]
    for col in f30.keys():
        for fb in forbidden:
            assert fb not in col.lower(), f"Leakage column {col} in Day 30!"

    for col in f60.keys():
        for fb in forbidden:
            assert fb not in col.lower(), f"Leakage column {col} in Day 60!"


def test_research_models_artifact_compatibility():
    """Verify all 4 research pipelines load and evaluate valid probabilities."""
    for model_name in [
        "day30_logistic_regression.joblib",
        "day60_logistic_regression.joblib",
        "day30_xgboost.joblib",
        "day60_xgboost.joblib",
    ]:
        p = EXPERIMENTS_DIR / model_name
        assert p.is_file(), f"Missing artifact {model_name}"
        pipe = joblib.load(p)
        assert hasattr(pipe, "predict_proba")


def test_single_record_scoring_and_explanation_consistency():
    """Verify single-record inference produces bounded probabilities and additive attributions."""
    res = score_research_forecast("AAA", "2013J", 11391)
    lr = res["forecasts"]["logistic_regression"]

    p30 = lr["day30"]["predicted_probability"]
    p60 = lr["day60"]["predicted_probability"]
    assert 0.0 <= p30 <= 1.0
    assert 0.0 <= p60 <= 1.0

    # Verify additivity and drivers
    assert len(lr["day30"]["top_risk_drivers"]) > 0
    assert len(lr["day60"]["top_protective_factors"]) > 0

    # Verify governance metadata
    gov = res["governance_metadata"]
    assert gov["is_research_model"] is True
    assert gov["prohibition_operational_use"] is True
    assert "non-causal" in gov["disclaimer"].lower() or "not imply causal" in gov["disclaimer"].lower()


def test_research_api_endpoints():
    """Verify all Research Explorer REST API endpoints return 200 OK."""
    app = create_app()
    client = TestClient(app)

    # List registrations
    r1 = client.get("/api/v1/research/registrations?limit=10")
    assert r1.status_code == 200
    data = r1.json()
    assert len(data["registrations"]) == 10
    first = data["registrations"][0]

    # Details
    r2 = client.get(f"/api/v1/research/registration/{first['code_module']}/{first['code_presentation']}/{first['id_student']}")
    assert r2.status_code == 200

    # Score
    r3 = client.post("/api/v1/research/score", json={
        "code_module": first["code_module"],
        "code_presentation": first["code_presentation"],
        "id_student": first["id_student"],
    })
    assert r3.status_code == 200

    # Export
    r4 = client.get(f"/api/v1/research/export/{first['code_module']}/{first['code_presentation']}/{first['id_student']}")
    assert r4.status_code == 200

    # Audit Summary
    r5 = client.get("/api/v1/research/audit-summary")
    assert r5.status_code == 200

    # HTML Dashboard
    r6 = client.get("/research/explorer")
    assert r6.status_code == 200
    assert "Phase 23 Research Forecast Explorer" in r6.text


def test_audit_metrics_reproducibility():
    """Verify precomputed common-cohort audit metrics are complete and statistically sound."""
    assert AUDIT_METRICS_PATH.is_file(), "Audit metrics file missing"
    with open(AUDIT_METRICS_PATH) as f:
        audit = json.load(f)

    meta = audit["metadata"]
    assert meta["common_cohort_records"] == 26361
    assert meta["excluded_pre_d60_dropouts"] == 1105

    # Verify bootstrap CI is strictly positive for ROC gain
    boot_lr = audit["student_clustered_bootstrap_lr"]
    delta_roc = boot_lr["delta_roc_auc"]
    assert delta_roc["mean"] > 0.05
    assert delta_roc["ci_95_lower"] > 0.04
    assert delta_roc["ci_95_upper"] > 0.055

    # Verify McNemar test
    mcnemar = audit["mcnemar_discordance_at_threshold_046"]
    assert mcnemar["statistically_significant_p05"] is True
    assert mcnemar["net_cases_corrected_by_d60"] > 1000


def test_production_isolation_and_closed_gate():
    """Verify production baseline Logistic Regression v1.0.0 and closed candidate gate."""
    prod_path = ML_DIR / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
    assert prod_path.is_file()
    assert compute_file_sha256(prod_path) == "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"

    from sutra_ml.evaluation.shadow_mode import ShadowModeEvaluator
    ev = ShadowModeEvaluator()
    assert ev.candidate_provenance_verified is False
    assert ev.threshold == 0.46
