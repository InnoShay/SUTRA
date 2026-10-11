"""
Unit tests for data splitting, scikit-learn pipelines, model training, and evaluation metrics.
"""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from sutra_ml.evaluation.metrics import (
    compute_comprehensive_metrics,
    find_threshold_for_target_recall,
)
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_xgboost_pipeline,
    build_preprocessor,
)
from sutra_ml.training.split import get_student_grouped_cv, make_temporal_split


@pytest.fixture
def sample_feature_df():
    """Create a minimal synthetic feature DataFrame for fast offline unit tests."""
    np.random.seed(42)
    n = 100
    return pd.DataFrame({
        "code_module": np.random.choice(["AAA", "BBB"], size=n),
        "code_presentation": np.random.choice(["2013J", "2014J"], size=n),
        "id_student": np.random.choice([1000 + i for i in range(25)], size=n),
        "num_of_prev_attempts": np.random.randint(0, 3, size=n),
        "studied_credits": np.random.choice([60, 120], size=n),
        "days_registered_before_start": np.random.uniform(-60, 0, size=n),
        "has_missing_registration_date": np.zeros(n, dtype=int),
        "vle_total_clicks_d30": np.random.randint(0, 500, size=n),
        "vle_active_days_d30": np.random.randint(0, 20, size=n),
        "vle_clicks_precourse": np.random.randint(0, 50, size=n),
        "vle_clicks_poststart_d30": np.random.randint(0, 450, size=n),
        "vle_clicks_last_7d": np.random.randint(0, 100, size=n),
        "vle_days_since_last_click": np.random.uniform(0, 30, size=n),
        "vle_clicks_forumng_d30": np.random.randint(0, 50, size=n),
        "vle_clicks_oucontent_d30": np.random.randint(0, 200, size=n),
        "vle_clicks_quiz_d30": np.random.randint(0, 50, size=n),
        "vle_clicks_homepage_d30": np.random.randint(0, 100, size=n),
        "vle_clicks_other_d30": np.random.randint(0, 50, size=n),
        "has_vle_activity_d30": np.ones(n, dtype=int),
        "assessments_submitted_d30": np.random.choice([0, 1], size=n),
        "assessment_banked_d30": np.zeros(n, dtype=int),
        "has_early_assessment_submission_d30": np.random.choice([0, 1], size=n),
        "gender": np.random.choice(["M", "F"], size=n),
        "region": np.random.choice(["London Region", "Scotland", "South Region"], size=n),
        "highest_education": np.random.choice(["A Level or Equivalent", "HE Qualification"], size=n),
        "imd_band": np.random.choice(["0-10%", "90-100%", "Unknown"], size=n),
        "age_band": np.random.choice(["0-35", "35-55"], size=n),
        "disability": np.random.choice(["N", "Y"], size=n),
        "target": np.random.choice([0, 1], size=n, p=[0.6, 0.4]),
        "target_name": "N/A",
        "raw_final_result": "N/A",
    })


def test_temporal_split(sample_feature_df):
    train_df, test_df, stats = make_temporal_split(
        sample_feature_df,
        train_presentations=["2013J"],
        test_presentation="2014J",
        ensure_disjoint_students=False,
    )
    assert len(train_df) + len(test_df) == len(sample_feature_df)
    assert (train_df["code_presentation"] == "2013J").all()
    assert (test_df["code_presentation"] == "2014J").all()
    assert "overlapping_students_count" in stats


def test_student_grouped_cv_no_leakage(sample_feature_df):
    train_df = sample_feature_df[sample_feature_df["code_presentation"] == "2013J"].reset_index(drop=True)
    splits = get_student_grouped_cv(train_df, n_splits=3, group_col="id_student")

    assert len(splits) == 3
    for train_idx, val_idx in splits:
        train_students = set(train_df.iloc[train_idx]["id_student"])
        val_students = set(train_df.iloc[val_idx]["id_student"])
        # Zero student overlap between train and validation folds
        assert len(train_students.intersection(val_students)) == 0


def test_logistic_regression_pipeline_fit_predict(sample_feature_df):
    num_cols = ["num_of_prev_attempts", "studied_credits", "vle_total_clicks_d30"]
    cat_cols = ["gender", "highest_education"]

    pipe = build_logistic_regression_pipeline(
        num_cols, cat_cols, {"C": 1.0, "max_iter": 200, "random_state": 42}
    )

    X = sample_feature_df[num_cols + cat_cols]
    y = sample_feature_df["target"].to_numpy()

    pipe.fit(X, y)
    probs = pipe.predict_proba(X)[:, 1]

    assert len(probs) == len(sample_feature_df)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()


def test_xgboost_pipeline_fit_predict(sample_feature_df):
    num_cols = ["num_of_prev_attempts", "studied_credits", "vle_total_clicks_d30"]
    cat_cols = ["gender", "highest_education"]

    pipe = build_xgboost_pipeline(
        num_cols, cat_cols, {"n_estimators": 10, "max_depth": 3, "random_state": 42}
    )

    X = sample_feature_df[num_cols + cat_cols]
    y = sample_feature_df["target"].to_numpy()

    pipe.fit(X, y)
    probs = pipe.predict_proba(X)[:, 1]

    assert len(probs) == len(sample_feature_df)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()


def test_compute_comprehensive_metrics():
    y_true = np.array([0, 0, 1, 1])
    y_prob = np.array([0.1, 0.4, 0.7, 0.9])

    metrics = compute_comprehensive_metrics(y_true, y_prob, threshold=0.5)

    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["f1_score"] == 1.0
    assert metrics["roc_auc"] == 1.0
    assert metrics["brier_score"] < 0.1
    assert metrics["confusion_matrix"]["tp"] == 2
    assert metrics["confusion_matrix"]["fp"] == 0


def test_find_threshold_for_target_recall():
    y_true = np.array([0, 0, 1, 1, 1])
    y_prob = np.array([0.1, 0.2, 0.6, 0.8, 0.9])

    thresh = find_threshold_for_target_recall(y_true, y_prob, target_recall=0.66)
    assert 0.10 <= thresh <= 0.90
