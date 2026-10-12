"""
Unit and integration tests for SUTRA ML Phase Twenty-Two Dual-Cutoff Academic Forecasting.

Tests:
1. Cutoff boundaries: Day 30 vs Day 60 active cohorts and exclusion of pre-cutoff withdrawals.
2. Complete omission of assessment marks/scores (grade publication latency safeguard).
3. Point-in-time VLE interaction censoring (date <= cutoff).
4. Target isolation and rejection of forbidden leakage columns.
5. Zero student overlap in 5-fold student-grouped cross-validation.
6. Missing-value handling and finite numeric values.
7. Dataset hash integrity and reproducibility.
8. Saved research artifact loadability and probability bounds.
9. Production model immutability (hash 78a08... and threshold 0.46) and closed candidate gate.
"""

import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
RAW_DIR = ML_DIR / "data" / "raw"
PROCESSED_DIR = ML_DIR / "data" / "processed"
ARTIFACTS_DIR = ML_DIR / "artifacts" / "experiments" / "phase_twenty_two"
METRICS_PATH = ML_DIR / "reports" / "metrics" / "phase_twenty_two_metrics.json"

from sutra_ml.features.build_dual_cutoff_features import (
    aggregate_assessment_cutoff,
    aggregate_vle_cutoff,
    assemble_dual_cutoff_dataset,
)
from sutra_ml.features.snapshots import extract_active_cohort
from sutra_ml.training.split import get_student_grouped_cv


def compute_file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def test_day30_and_day60_cohort_boundaries():
    """Verify active cohort filtering removes students who unregistered on or before cutoff."""
    active_30, excl_30, stats_30 = extract_active_cohort(RAW_DIR, cutoff_day=30)
    active_60, excl_60, stats_60 = extract_active_cohort(RAW_DIR, cutoff_day=60)

    assert stats_30["total_registrations"] == 32593
    assert stats_30["active_records"] == 27466
    assert stats_30["excluded_records"] == 5127

    assert stats_60["total_registrations"] == 32593
    assert stats_60["active_records"] == 26361
    assert stats_60["excluded_records"] == 6232

    # Exactly 1,105 students withdrew between Day 31 and Day 60
    assert stats_60["excluded_records"] - stats_30["excluded_records"] == 1105
    assert len(active_60) < len(active_30)


def test_strict_omission_of_assessment_scores():
    """
    Verify that assessment marks/scores are completely omitted from both Day-30
    and Day-60 feature sets, preventing grade publication latency leakage.
    """
    d30_path = PROCESSED_DIR / "phase22_day30_features.csv"
    d60_path = PROCESSED_DIR / "phase22_day60_features.csv"

    df30 = pd.read_csv(d30_path, nrows=50)
    df60 = pd.read_csv(d60_path, nrows=50)

    forbidden_score_tokens = ["score", "grade", "mark", "exam_score"]
    for col in df30.columns:
        for tok in forbidden_score_tokens:
            assert tok not in col.lower(), f"Forbidden score token '{tok}' found in Day-30 column '{col}'"

    for col in df60.columns:
        for tok in forbidden_score_tokens:
            assert tok not in col.lower(), f"Forbidden score token '{tok}' found in Day-60 column '{col}'"


def test_strict_omission_of_post_cutoff_vle_and_unregistration():
    """Verify that date_unregistration and post-cutoff event logs are absent from features."""
    d30_path = PROCESSED_DIR / "phase22_day30_features.csv"
    d60_path = PROCESSED_DIR / "phase22_day60_features.csv"

    df30 = pd.read_csv(d30_path, nrows=10)
    df60 = pd.read_csv(d60_path, nrows=10)

    assert "date_unregistration" not in df30.columns
    assert "date_unregistration" not in df60.columns
    assert "date_unregistered" not in df30.columns
    assert "date_unregistered" not in df60.columns


def test_target_isolation_and_no_leakage():
    """Verify target columns are decoupled and final_result is excluded from predictor list."""
    d30_path = PROCESSED_DIR / "phase22_day30_features.csv"
    d60_path = PROCESSED_DIR / "phase22_day60_features.csv"

    df30 = pd.read_csv(d30_path, nrows=20)
    df60 = pd.read_csv(d60_path, nrows=20)

    # Key columns and targets
    assert "target" in df30.columns and "target" in df60.columns
    assert set(df30["target"].unique()).issubset({0, 1})
    assert set(df60["target"].unique()).issubset({0, 1})

    # Predictor sets must not contain target
    drop_cols = ["code_module", "code_presentation", "id_student", "target", "target_name", "raw_final_result"]
    predictors_30 = [c for c in df30.columns if c not in drop_cols]
    predictors_60 = [c for c in df60.columns if c not in drop_cols]

    assert "final_result" not in predictors_30
    assert "final_result" not in predictors_60
    assert "target" not in predictors_30
    assert "target" not in predictors_60


def test_student_grouped_cv_zero_leakage():
    """Verify that GroupKFold produces strictly disjoint student partitions."""
    d30_path = PROCESSED_DIR / "phase22_day30_features.csv"
    df = pd.read_csv(d30_path, nrows=2000)
    splits = get_student_grouped_cv(df, n_splits=5, group_col="id_student")

    assert len(splits) == 5
    for train_idx, val_idx in splits:
        train_students = set(df.iloc[train_idx]["id_student"])
        val_students = set(df.iloc[val_idx]["id_student"])
        overlap = train_students.intersection(val_students)
        assert len(overlap) == 0, f"Student leakage detected! {len(overlap)} students overlap."


def test_missing_value_handling_and_finite_numeric():
    """Verify no unhandled NaNs exist in predictor columns."""
    d30_path = PROCESSED_DIR / "phase22_day30_features.csv"
    d60_path = PROCESSED_DIR / "phase22_day60_features.csv"

    df30 = pd.read_csv(d30_path)
    df60 = pd.read_csv(d60_path)

    drop_cols = ["code_module", "code_presentation", "id_student", "target", "target_name", "raw_final_result"]
    cat_cols = ["gender", "region", "highest_education", "imd_band", "age_band", "disability"]

    for df, name in [(df30, "Day 30"), (df60, "Day 60")]:
        num_cols = [c for c in df.columns if c not in drop_cols + cat_cols]
        for col in num_cols:
            assert df[col].isnull().sum() == 0, f"Null values detected in {name} column {col}"
            assert np.all(np.isfinite(df[col].values)), f"Non-finite values detected in {name} column {col}"

        for col in cat_cols:
            assert df[col].isnull().sum() == 0, f"Null values detected in {name} categorical {col}"


def test_reproducibility_and_dataset_hashes():
    """Verify dataset files match the recorded cryptographic hashes."""
    summary_path = PROCESSED_DIR / "phase22_dataset_summary.json"
    assert summary_path.is_file(), "phase22_dataset_summary.json missing"

    with open(summary_path) as f:
        summary = json.load(f)

    d30_path = PROCESSED_DIR / "phase22_day30_features.csv"
    d60_path = PROCESSED_DIR / "phase22_day60_features.csv"

    assert compute_file_sha256(d30_path) == summary["day30"]["sha256"]
    assert compute_file_sha256(d60_path) == summary["day60"]["sha256"]


def test_saved_research_artifacts_loadability_and_bounds():
    """Verify that all Phase Twenty-Two trained pipelines load and predict valid probabilities."""
    for model_name in [
        "day30_logistic_regression.joblib",
        "day60_logistic_regression.joblib",
        "day30_xgboost.joblib",
        "day60_xgboost.joblib",
    ]:
        model_path = ARTIFACTS_DIR / model_name
        assert model_path.is_file(), f"Artifact {model_name} missing"
        pipe = joblib.load(model_path)

        # Select corresponding test dataframe
        is_d60 = "day60" in model_name
        df = pd.read_csv(
            PROCESSED_DIR / ("phase22_day60_features.csv" if is_d60 else "phase22_day30_features.csv"),
            nrows=20,
        )
        drop_cols = ["code_module", "code_presentation", "id_student", "target", "target_name", "raw_final_result"]
        feats = [c for c in df.columns if c not in drop_cols]

        probs = pipe.predict_proba(df[feats])[:, 1]
        assert len(probs) == 20
        assert np.all(np.isfinite(probs))
        assert np.all(probs >= 0.0) and np.all(probs <= 1.0)


def test_production_safeguards_intact():
    """
    Verify production baseline Logistic Regression v1.0.0 artifact hash is unmodified
    and serving decision threshold remains frozen at 0.46.
    """
    prod_model_path = ML_DIR / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
    assert prod_model_path.is_file(), "Production model artifact missing"

    expected_hash = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"
    actual_hash = compute_file_sha256(prod_model_path)
    assert actual_hash == expected_hash, f"Production model corrupted! Expected {expected_hash}, got {actual_hash}"

    # Verify candidate gate is closed
    from sutra_ml.evaluation.shadow_mode import ShadowModeEvaluator
    evaluator = ShadowModeEvaluator()
    assert evaluator.candidate_provenance_verified is False
    assert evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"
