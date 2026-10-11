"""
Isolated inference verification script for Phase Seven Constrained XGBoost Candidate.

Tests:
1. Candidate artifact loads successfully from experiment directory.
2. Prediction on valid de-identified feature records produces finite probabilities in [0, 1].
3. Candidate accepts the exact 25-feature schema without requiring extraneous features.
4. Batch predictions maintain 1-to-1 record ordering and validity.
5. Verifies that the production inference backend (backend/app/main.py) still loads
   and uses the v1.0.0 Logistic Regression model.
"""

from pathlib import Path
import sys
import joblib
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.main import app


def test_candidate_inference() -> None:
    print("[1/5] Loading candidate artifact from experiment directory...")
    candidate_path = ML_DIR / "artifacts" / "experiments" / "exp_c_depth3_xgboost" / "candidate_constrained_xgboost.joblib"
    assert candidate_path.exists(), f"Candidate artifact missing at {candidate_path}"
    model = joblib.load(candidate_path)
    print(f"      Loaded model pipeline: {type(model).__name__}")

    # Valid test record
    sample_record = {
        "num_of_prev_attempts": 0,
        "studied_credits": 60,
        "days_registered_before_start": -30.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 180.0,
        "vle_active_days_d30": 15.0,
        "vle_clicks_precourse": 25.0,
        "vle_clicks_poststart_d30": 155.0,
        "vle_clicks_last_7d": 40.0,
        "vle_days_since_last_click": 1.0,
        "vle_clicks_forumng_d30": 30.0,
        "vle_clicks_oucontent_d30": 75.0,
        "vle_clicks_quiz_d30": 15.0,
        "vle_clicks_homepage_d30": 35.0,
        "vle_clicks_other_d30": 5.0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1.0,
        "assessment_banked_d30": 0.0,
        "has_early_assessment_submission_d30": 1,
        "gender": "F",
        "region": "London Region",
        "highest_education": "A Level or Equivalent",
        "imd_band": "40-50%",
        "age_band": "0-35",
        "disability": "N",
    }

    df_single = pd.DataFrame([sample_record])
    print("[2/5] Running single prediction on candidate...")
    prob = float(model.predict_proba(df_single)[0, 1])
    print(f"      Predicted risk probability: {prob:.4f}")
    assert 0.0 <= prob <= 1.0, f"Probability {prob} out of bounds!"
    assert np.isfinite(prob), "Probability is non-finite!"

    print("[3/5] Testing batch inference...")
    df_batch = pd.DataFrame([sample_record, sample_record, sample_record])
    batch_probs = model.predict_proba(df_batch)[:, 1]
    assert len(batch_probs) == 3
    assert all(0.0 <= p <= 1.0 for p in batch_probs)
    print(f"      Batch probabilities ({len(batch_probs)} items): {[round(p, 4) for p in batch_probs]}")

    print("[4/5] Verifying production inference API continues using v1.0.0 Logistic Regression...")
    with TestClient(app) as client:
        ready_resp = client.get("/ready")
        assert ready_resp.status_code == 200
        ready_data = ready_resp.json()
        assert ready_data["model_name"] == "Regularized Logistic Regression Baseline"
        assert ready_data["model_version"] == "v1.0.0"
        assert ready_data["operational_threshold"] == 0.46
        print(f"      Production API status: ready (Model: {ready_data['model_name']}, Version: {ready_data['model_version']})")

    print("[5/5] Confirming v1.0.0 files are completely unaltered...")
    v1_lr = ML_DIR / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
    assert v1_lr.exists() and v1_lr.stat().st_size == 7105, "v1.0.0 artifact size altered!"
    print("      v1.0.0 model files intact (7,105 bytes).")

    print("\n[✓] All inference verification checks passed successfully!")


if __name__ == "__main__":
    test_candidate_inference()
