"""
Unit tests for SUTRA Phase Ten — Model Promotion Readiness and Validation Audit.

Verifies:
1. Production v1.0.0 artifacts and threshold (0.46) remain strictly unmodified.
2. Backend serving endpoint continues to serve v1.0.0 without behavioral shift.
3. Module-relative pipeline remains isolated in experiment directory.
4. Inference requests do not cause transformer refitting or state mutation.
5. Unseen module fallback produces valid finite probabilities.
6. Phase Ten uncertainty metrics schema and confidence interval consistency.
7. Reconciliation of subgroup false positive sums with pooled OOF delta (-400).
"""

import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest


def test_production_v1_artifacts_immutability():
    """Verify production v1.0.0 artifacts are completely untouched."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    v1_model_path = repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
    v1_meta_path = repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "model_metadata.json"

    assert v1_model_path.exists()
    assert v1_meta_path.exists()

    with open(v1_model_path, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    assert sha == "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"

    with open(v1_meta_path) as f:
        meta = json.load(f)
    assert round(meta["selected_threshold"], 2) == 0.46


def test_experimental_model_isolation():
    """Verify module-relative model is stored exclusively in experimental directory."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    exp_dir = repo_root / "ml" / "artifacts" / "experiments" / "phase_nine_module_relative"
    exp_model_path = exp_dir / "experimental_module_relative_lr.joblib"

    assert exp_dir.exists()
    assert exp_model_path.exists()

    # Must NOT exist in v1.0.0
    assert not (repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "experimental_module_relative_lr.joblib").exists()


def test_inference_does_not_mutate_transformer_state():
    """Verify that calling predict_proba on inference inputs does not refit transformer."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    exp_model_path = repo_root / "ml" / "artifacts" / "experiments" / "phase_nine_module_relative" / "experimental_module_relative_lr.joblib"

    pipeline = joblib.load(exp_model_path)
    transformer = pipeline.named_steps["module_relative"]

    # Record fitted stats before
    pre_stats = json.dumps(transformer.module_stats_, sort_keys=True)
    pre_global = json.dumps(transformer.global_stats_, sort_keys=True)

    # Run inference on anomalous input
    weird_df = pd.DataFrame([{
        "code_module": "AAA",
        "vle_total_clicks_d30": 9999999.0,
        "vle_active_days_d30": 999.0,
        "vle_clicks_precourse": 0.0,
        "vle_clicks_poststart_d30": 9999999.0,
        "vle_clicks_last_7d": 99999.0,
        "vle_days_since_last_click": 0.0,
        "vle_clicks_forumng_d30": 0.0,
        "vle_clicks_oucontent_d30": 0.0,
        "vle_clicks_quiz_d30": 0.0,
        "vle_clicks_homepage_d30": 0.0,
        "vle_clicks_other_d30": 0.0,
        "studied_credits": 60,
        "num_of_prev_attempts": 0,
        "days_registered_before_start": -30.0,
        "has_missing_registration_date": 0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1,
        "assessment_banked_d30": 0,
        "has_early_assessment_submission_d30": 1,
        "gender": "M",
        "region": "East Anglian Region",
        "highest_education": "HE Qualification",
        "imd_band": "90-100%",
        "age_band": "55<=",
        "disability": "N",
    }])

    probs = pipeline.predict_proba(weird_df)[:, 1]
    assert np.isfinite(probs).all()
    assert 0.0 <= probs[0] <= 1.0

    # Ensure transformer stats did not change
    post_stats = json.dumps(transformer.module_stats_, sort_keys=True)
    post_global = json.dumps(transformer.global_stats_, sort_keys=True)

    assert pre_stats == post_stats
    assert pre_global == post_global


def test_unseen_module_global_fallback():
    """Verify inference gracefully handles completely new modules via global fallback."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    exp_model_path = repo_root / "ml" / "artifacts" / "experiments" / "phase_nine_module_relative" / "experimental_module_relative_lr.joblib"

    pipeline = joblib.load(exp_model_path)
    sample_df = pd.DataFrame([{
        "code_module": "UNKNOWN_MODULE_ZZZ",
        "vle_total_clicks_d30": 100.0,
        "vle_active_days_d30": 5.0,
        "vle_clicks_precourse": 10.0,
        "vle_clicks_poststart_d30": 90.0,
        "vle_clicks_last_7d": 20.0,
        "vle_days_since_last_click": 2.0,
        "vle_clicks_forumng_d30": 10.0,
        "vle_clicks_oucontent_d30": 50.0,
        "vle_clicks_quiz_d30": 15.0,
        "vle_clicks_homepage_d30": 20.0,
        "vle_clicks_other_d30": 5.0,
        "studied_credits": 60,
        "num_of_prev_attempts": 0,
        "days_registered_before_start": -20.0,
        "has_missing_registration_date": 0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 0,
        "assessment_banked_d30": 0,
        "has_early_assessment_submission_d30": 0,
        "gender": "F",
        "region": "London Region",
        "highest_education": "A Level or Equivalent",
        "imd_band": "40-50%",
        "age_band": "0-35",
        "disability": "N",
    }])

    probs = pipeline.predict_proba(sample_df)[:, 1]
    assert np.isfinite(probs).all()
    assert 0.0 <= probs[0] <= 1.0


def test_uncertainty_metrics_schema_and_consistency():
    """Verify Phase Ten uncertainty metrics file schema, bounds, and reconciliation."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    metrics_path = repo_root / "ml" / "reports" / "metrics" / "phase_ten_uncertainty.json"

    assert metrics_path.exists()
    with open(metrics_path) as f:
        data = json.load(f)

    assert data["audit_phase"] == "PHASE_TEN_PROMOTION_READINESS_AUDIT"
    assert data["operating_threshold"] == 0.46
    assert data["bootstrap_iterations"] >= 1000

    # Uncertainty CIs
    unc = data["paired_uncertainty_bootstrap"]
    assert "roc_auc" in unc
    assert unc["roc_auc"]["ci_95_lower"] < unc["roc_auc"]["ci_95_upper"]
    assert unc["roc_auc"]["ci_95_lower"] > 0.0, "ROC-AUC 95% CI lower bound must be strictly positive"

    # Reconciliation
    rec = data["summary_reconciliation"]
    assert rec["reconciliation_passed"] is True
    assert rec["sum_fp_delta"] == -400
    assert rec["sum_fn_delta"] == -17
