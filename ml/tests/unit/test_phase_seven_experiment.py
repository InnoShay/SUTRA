"""
Automated unit tests for Phase Seven Constrained XGBoost Experiment (EXP-C).
"""

from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
EXP_DIR = ML_DIR / "artifacts" / "experiments" / "exp_c_depth3_xgboost"
V1_DIR = ML_DIR / "artifacts" / "models" / "v1.0.0"


def test_candidate_artifact_exists_and_loads():
    """Verify that constrained XGBoost artifact exists and is loadable."""
    artifact_path = EXP_DIR / "candidate_constrained_xgboost.joblib"
    assert artifact_path.exists(), f"Experiment artifact missing at {artifact_path}"

    model = joblib.load(artifact_path)
    assert hasattr(model, "predict_proba")
    assert hasattr(model, "named_steps")
    assert "preprocessor" in model.named_steps
    assert "classifier" in model.named_steps

    # Check hyperparameters
    clf = model.named_steps["classifier"]
    assert clf.max_depth == 3
    assert np.isclose(clf.colsample_bytree, 0.70)


def test_candidate_config_metadata():
    """Verify candidate config metadata file."""
    config_path = EXP_DIR / "config.yaml"
    assert config_path.exists()

    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    assert cfg["experiment_id"] == "EXP-C-DEPTH3-XGBOOST"
    assert cfg["hyperparameters"]["max_depth"] == 3
    assert cfg["hyperparameters"]["colsample_bytree"] == 0.70
    assert cfg["status"] == "RESEARCH_CANDIDATE_UNPROMOTED"


def test_v1_baseline_artifacts_unmodified():
    """Assert that v1.0.0 model files remain strictly intact and unchanged."""
    v1_lr = V1_DIR / "baseline_logistic_regression.joblib"
    v1_xgb = V1_DIR / "candidate_xgboost.joblib"
    v1_meta = V1_DIR / "model_metadata.json"

    assert v1_lr.exists() and v1_lr.stat().st_size == 7105
    assert v1_xgb.exists() and v1_xgb.stat().st_size == 270054
    assert v1_meta.exists() and v1_meta.stat().st_size == 6758


def test_candidate_prediction_bounds_and_validity():
    """Verify that candidate model scores de-identified features with finite bounded probabilities."""
    artifact_path = EXP_DIR / "candidate_constrained_xgboost.joblib"
    model = joblib.load(artifact_path)

    sample_record = {
        "num_of_prev_attempts": 1,
        "studied_credits": 120,
        "days_registered_before_start": -15.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 80.0,
        "vle_active_days_d30": 6.0,
        "vle_clicks_precourse": 10.0,
        "vle_clicks_poststart_d30": 70.0,
        "vle_clicks_last_7d": 15.0,
        "vle_days_since_last_click": 8.0,
        "vle_clicks_forumng_d30": 10.0,
        "vle_clicks_oucontent_d30": 30.0,
        "vle_clicks_quiz_d30": 5.0,
        "vle_clicks_homepage_d30": 20.0,
        "vle_clicks_other_d30": 5.0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1.0,
        "assessment_banked_d30": 0.0,
        "has_early_assessment_submission_d30": 1,
        "gender": "M",
        "region": "Scotland",
        "highest_education": "A Level or Equivalent",
        "imd_band": "20-30%",
        "age_band": "0-35",
        "disability": "N",
    }

    df = pd.DataFrame([sample_record])
    prob = float(model.predict_proba(df)[0, 1])

    assert np.isfinite(prob)
    assert 0.0 <= prob <= 1.0
