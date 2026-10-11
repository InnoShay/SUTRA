"""
Unit tests for SUTRA Phase Nine — Module-Relative Engagement Feature Experiment.

Verifies:
1. Training-fold-only statistic fitting (no validation leakage).
2. Unseen modules and low-support fallback behavior.
3. Zero-variance and near-zero variance fallback.
4. Missing and non-finite values handling.
5. Output feature naming stability and dimensions.
6. Pipeline save/reload deterministic inference equivalence (< 1e-6).
7. Student-grouped fold separation integrity.
8. Production v1.0.0 artifacts and threshold immutability.
"""

import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

from sutra_ml.features.module_relative import (
    DEFAULT_ENGAGEMENT_FEATURES,
    ModuleRelativeTransformer,
)
from sutra_ml.training.pipeline import (
    build_module_relative_lr_pipeline,
    build_module_relative_xgboost_pipeline,
)
from sutra_ml.training.split import get_student_grouped_cv


def test_training_fold_only_statistic_fitting_no_leakage():
    """Verify transformer statistics are computed strictly on training data."""
    train_data = pd.DataFrame({
        "code_module": ["AAA", "AAA", "AAA", "BBB", "BBB", "BBB"],
        "vle_total_clicks_d30": [10.0, 20.0, 30.0, 100.0, 200.0, 300.0],
        "vle_active_days_d30": [1.0, 2.0, 3.0, 10.0, 20.0, 30.0],
    })
    val_data = pd.DataFrame({
        "code_module": ["AAA", "BBB"],
        "vle_total_clicks_d30": [9999.0, 9999.0],  # Outliers in validation
        "vle_active_days_d30": [999.0, 999.0],
    })

    transformer = ModuleRelativeTransformer(
        module_col="code_module",
        engagement_features=["vle_total_clicks_d30", "vle_active_days_d30"],
        min_module_samples=3,
    )
    transformer.fit(train_data)

    # Learned stats should reflect ONLY train_data
    assert transformer.module_stats_["AAA"]["vle_total_clicks_d30"]["mean"] == 20.0
    assert transformer.module_stats_["BBB"]["vle_total_clicks_d30"]["mean"] == 200.0

    # Transforming val_data must not alter transformer's learned statistics
    _ = transformer.transform(val_data)
    assert transformer.module_stats_["AAA"]["vle_total_clicks_d30"]["mean"] == 20.0
    assert transformer.module_stats_["BBB"]["vle_total_clicks_d30"]["mean"] == 200.0


def test_unseen_module_and_low_support_fallback():
    """Verify unseen modules and modules below min_module_samples use global fallback."""
    train_data = pd.DataFrame({
        "code_module": ["AAA", "AAA", "AAA", "AAA", "BBB"],  # BBB has only 1 sample
        "vle_total_clicks_d30": [10.0, 20.0, 30.0, 40.0, 100.0],
    })
    transformer = ModuleRelativeTransformer(
        module_col="code_module",
        engagement_features=["vle_total_clicks_d30"],
        min_module_samples=3,
    )
    transformer.fit(train_data)

    global_mean = transformer.global_stats_["vle_total_clicks_d30"]["mean"]
    global_std = transformer.global_stats_["vle_total_clicks_d30"]["std"]

    # Low support module BBB should flag fallback
    assert transformer.module_stats_["BBB"]["vle_total_clicks_d30"]["fallback_used"] is True
    assert transformer.module_stats_["BBB"]["vle_total_clicks_d30"]["mean"] == global_mean

    # Unseen module during transform
    test_data = pd.DataFrame({
        "code_module": ["UNSEEN_MODULE"],
        "vle_total_clicks_d30": [global_mean],
    })
    transformed = transformer.transform(test_data)
    # Since value equals global mean, z-score should be 0.0
    assert pytest.approx(transformed["vle_total_clicks_d30_module_z"].iloc[0], abs=1e-5) == 0.0


def test_zero_variance_feature_fallback():
    """Verify constant features do not cause division by zero or non-finite values."""
    train_data = pd.DataFrame({
        "code_module": ["AAA", "AAA", "AAA"],
        "vle_total_clicks_d30": [50.0, 50.0, 50.0],  # Constant feature
    })
    transformer = ModuleRelativeTransformer(
        module_col="code_module",
        engagement_features=["vle_total_clicks_d30"],
        min_module_samples=2,
    )
    transformer.fit(train_data)

    transformed = transformer.transform(train_data)
    assert np.isfinite(transformed["vle_total_clicks_d30_module_z"]).all()
    assert (transformed["vle_total_clicks_d30_module_z"] == 0.0).all()


def test_missing_and_non_finite_values_handling():
    """Verify NaNs in engagement features are handled without crashing."""
    train_data = pd.DataFrame({
        "code_module": ["AAA", "AAA", "AAA", "AAA"],
        "vle_total_clicks_d30": [10.0, np.nan, 30.0, 40.0],
    })
    transformer = ModuleRelativeTransformer(
        module_col="code_module",
        engagement_features=["vle_total_clicks_d30"],
        min_module_samples=2,
    )
    transformer.fit(train_data)

    test_data = pd.DataFrame({
        "code_module": ["AAA", "AAA"],
        "vle_total_clicks_d30": [np.nan, 25.0],
    })
    transformed = transformer.transform(test_data)
    assert np.isnan(transformed["vle_total_clicks_d30_module_z"].iloc[0])
    assert np.isfinite(transformed["vle_total_clicks_d30_module_z"].iloc[1])


def test_stable_output_feature_names_and_dimensions():
    """Verify transformer appends exact number of relative columns with proper suffix."""
    train_data = pd.DataFrame({
        "code_module": ["AAA", "AAA", "AAA"],
        "vle_total_clicks_d30": [10.0, 20.0, 30.0],
        "vle_active_days_d30": [1.0, 2.0, 3.0],
        "other_feature": [1, 2, 3],
    })
    eng_feats = ["vle_total_clicks_d30", "vle_active_days_d30"]
    transformer = ModuleRelativeTransformer(
        module_col="code_module",
        engagement_features=eng_feats,
        min_module_samples=2,
    )
    transformer.fit(train_data)
    transformed = transformer.transform(train_data)

    expected_cols = list(train_data.columns) + [f"{f}_module_z" for f in eng_feats]
    assert list(transformed.columns) == expected_cols
    assert len(transformed.columns) == len(train_data.columns) + len(eng_feats)


def test_save_reload_inference_equivalence(tmp_path):
    """Verify saved experimental pipeline produces identical probabilities after disk reload."""
    df = pd.DataFrame({
        "code_module": ["AAA", "AAA", "BBB", "BBB"] * 25,
        "vle_total_clicks_d30": np.random.uniform(10, 500, 100),
        "vle_active_days_d30": np.random.uniform(1, 25, 100),
        "studied_credits": np.random.choice([30, 60, 120], 100),
        "gender": np.random.choice(["M", "F"], 100),
        "target": np.random.binomial(1, 0.45, 100),
    })

    pipe = build_module_relative_lr_pipeline(
        numerical_features=["vle_total_clicks_d30", "vle_active_days_d30", "studied_credits"],
        categorical_features=["gender"],
        engagement_features=["vle_total_clicks_d30", "vle_active_days_d30"],
        params={"penalty": "l2", "C": 1.0, "solver": "lbfgs", "max_iter": 500, "random_state": 42},
    )

    feature_cols = ["code_module", "vle_total_clicks_d30", "vle_active_days_d30", "studied_credits", "gender"]
    pipe.fit(df[feature_cols], df["target"])

    saved_file = tmp_path / "exp_model.joblib"
    joblib.dump(pipe, saved_file)

    reloaded_pipe = joblib.load(saved_file)

    test_sample = df.iloc[:10][feature_cols]
    orig_probs = pipe.predict_proba(test_sample)[:, 1]
    reloaded_probs = reloaded_pipe.predict_proba(test_sample)[:, 1]

    max_delta = np.max(np.abs(orig_probs - reloaded_probs))
    assert max_delta < 1e-6
    assert all(0.0 <= p <= 1.0 for p in reloaded_probs)


def test_student_grouped_fold_integrity():
    """Verify GroupKFold enforces 100% student group segregation without overlap."""
    df = pd.DataFrame({
        "id_student": [1, 1, 2, 3, 3, 4, 5, 6, 7, 8],
        "target": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1],
        "feature": range(10),
    })
    splits = get_student_grouped_cv(df, n_splits=3, group_col="id_student")
    assert len(splits) == 3

    for t_idx, v_idx in splits:
        t_students = set(df.iloc[t_idx]["id_student"])
        v_students = set(df.iloc[v_idx]["id_student"])
        assert len(t_students.intersection(v_students)) == 0


def test_production_v1_baseline_and_threshold_immutability():
    """Verify that Phase Nine did not modify v1.0.0 artifacts or default backend threshold."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    v1_baseline_path = repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
    v1_metadata_path = repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "model_metadata.json"

    assert v1_baseline_path.exists(), "Production baseline_logistic_regression.joblib missing!"
    assert v1_metadata_path.exists(), "Production model_metadata.json missing!"

    # Verify SHA-256 matches verified v1.0.0 hash
    with open(v1_baseline_path, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    assert sha == "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"

    with open(v1_metadata_path, "r") as f:
        meta = json.load(f)
    assert round(meta["selected_threshold"], 2) == 0.46
