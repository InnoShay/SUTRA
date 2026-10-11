"""
Unit tests for Phase Four: Local & Global Explainability, Calibration Assessment,
and SUTRA Evidence Card schema validation.
"""

import numpy as np
import pandas as pd
import pytest
from pydantic import ValidationError

from sutra_ml.evaluation.calibration import compute_calibration_assessment
from sutra_ml.explainability.global_explanations import compute_global_feature_importance
from sutra_ml.explainability.local_explanations import (
    clean_feature_name_and_category,
    explain_prediction_linear,
    explain_prediction_trees,
)
from sutra_ml.schemas.evidence_card import (
    RiskTier,
    SutraEvidenceCard,
    build_evidence_card,
    determine_risk_tier,
)
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_xgboost_pipeline,
)


NUMERICAL_COLS = [
    "num_of_prev_attempts",
    "studied_credits",
    "days_registered_before_start",
    "has_missing_registration_date",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_precourse",
    "vle_clicks_poststart_d30",
    "vle_clicks_last_7d",
    "vle_days_since_last_click",
    "vle_clicks_forumng_d30",
    "vle_clicks_oucontent_d30",
    "vle_clicks_quiz_d30",
    "vle_clicks_homepage_d30",
    "vle_clicks_other_d30",
    "has_vle_activity_d30",
    "assessments_submitted_d30",
    "assessment_banked_d30",
    "has_early_assessment_submission_d30",
]

CATEGORICAL_COLS = [
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
]


@pytest.fixture
def synthetic_training_data():
    """Create a minimal synthetic feature dataset for fitting pipelines."""
    np.random.seed(42)
    n = 80
    df = pd.DataFrame({
        "code_module": np.random.choice(["AAA", "BBB", "CCC"], size=n),
        "code_presentation": np.random.choice(["2013J", "2014J"], size=n),
        "id_student": np.random.choice([1000 + i for i in range(20)], size=n),
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
        "region": np.random.choice(["London Region", "South Region"], size=n),
        "highest_education": np.random.choice(["A Level or Equivalent", "HE Qualification"], size=n),
        "imd_band": np.random.choice(["0-10%", "90-100%"], size=n),
        "age_band": np.random.choice(["0-35", "35-55", "55<="], size=n),
        "disability": np.random.choice(["N", "Y"], size=n),
        "target": np.random.choice([0, 1], size=n, p=[0.55, 0.45]),
    })
    return df


def test_feature_name_cleaning_and_mapping():
    """Verify that feature prefix cleaning maps transformed names to human-readable titles."""
    parent, cat, title = clean_feature_name_and_category("num__vle_active_days_d30")
    assert parent == "vle_active_days_d30"
    assert cat == ""
    assert "Active Learning Days" in title

    parent_cat, cat_val, title_cat = clean_feature_name_and_category("cat__age_band_55<=")
    assert parent_cat == "age_band"
    assert cat_val == "55<="
    assert "Age Band" in title_cat

    # Unmapped feature fallback
    p_fallback, c_fallback, t_fallback = clean_feature_name_and_category("num__custom_unmapped_stat")
    assert p_fallback == "custom_unmapped_stat"
    assert t_fallback == "custom_unmapped_stat"


def test_linear_explanation_additivity_and_decomposition(synthetic_training_data):
    """
    Verify Logistic Regression local explanations strictly adhere to additivity:
    margin = w_0 + sum(phi_j) and p = sigmoid(margin).
    """
    lr_pipe = build_logistic_regression_pipeline(
        NUMERICAL_COLS,
        CATEGORICAL_COLS,
        {"C": 1.0, "max_iter": 200, "random_state": 42},
    )
    feature_cols = NUMERICAL_COLS + CATEGORICAL_COLS
    X = synthetic_training_data[feature_cols]
    y = synthetic_training_data["target"]
    lr_pipe.fit(X, y)

    sample_row = X.iloc[0:1]
    res = explain_prediction_linear(sample_row, lr_pipe, feature_cols, top_n=5)

    assert "risk_probability" in res
    assert "log_odds_margin" in res
    assert "base_intercept" in res
    assert "top_risk_drivers" in res
    assert "top_protective_factors" in res

    # Additivity assertion
    all_attribs = res["all_contributions"]
    calculated_margin = res["base_intercept"] + sum(a["log_odds_contribution"] for a in all_attribs)
    assert abs(calculated_margin - res["log_odds_margin"]) < 1e-4

    # Sigmoid assertion
    expected_prob = 1.0 / (1.0 + np.exp(-res["log_odds_margin"]))
    assert abs(expected_prob - res["risk_probability"]) < 1e-4

    # Check top drivers polarity
    for driver in res["top_risk_drivers"]:
        assert driver["log_odds_contribution"] >= 0
    for factor in res["top_protective_factors"]:
        assert factor["log_odds_contribution"] <= 0


def test_trees_explanation_additivity_and_shap(synthetic_training_data):
    """
    Verify XGBoost native TreeSHAP local explanations satisfy efficiency axiom:
    margin = base_value + sum(SHAP_j) and p = sigmoid(margin).
    """
    xgb_pipe = build_xgboost_pipeline(
        NUMERICAL_COLS,
        CATEGORICAL_COLS,
        {"n_estimators": 10, "max_depth": 3, "random_state": 42},
    )
    feature_cols = NUMERICAL_COLS + CATEGORICAL_COLS
    X = synthetic_training_data[feature_cols]
    y = synthetic_training_data["target"]
    xgb_pipe.fit(X, y)

    sample_row = X.iloc[5:6]
    res = explain_prediction_trees(sample_row, xgb_pipe, feature_cols, top_n=5)

    assert "risk_probability" in res
    assert "margin" in res
    assert "base_bias" in res
    assert "top_risk_drivers" in res
    assert "top_protective_factors" in res

    # SHAP additivity
    all_attribs = res["all_contributions"]
    calculated_margin = res["base_bias"] + sum(a["shap_contribution"] for a in all_attribs)
    assert abs(calculated_margin - res["margin"]) < 1e-3

    expected_prob = 1.0 / (1.0 + np.exp(-res["margin"]))
    assert abs(expected_prob - res["risk_probability"]) < 1e-4


def test_missing_values_handled_in_explanations(synthetic_training_data):
    """Verify that sample rows with missing values are cleanly imputed and explained."""
    lr_pipe = build_logistic_regression_pipeline(
        NUMERICAL_COLS,
        CATEGORICAL_COLS,
        {"C": 1.0, "max_iter": 200, "random_state": 42},
    )
    feature_cols = NUMERICAL_COLS + CATEGORICAL_COLS
    X = synthetic_training_data[feature_cols]
    y = synthetic_training_data["target"]
    lr_pipe.fit(X, y)

    sample_with_nan = X.iloc[0:1].copy()
    sample_with_nan.loc[:, "days_registered_before_start"] = np.nan
    sample_with_nan.loc[:, "imd_band"] = np.nan

    res = explain_prediction_linear(sample_with_nan, lr_pipe, feature_cols, top_n=3)
    assert res["risk_probability"] >= 0.0
    assert len(res["top_risk_drivers"]) <= 3


def test_calibration_assessment_metrics():
    """Verify Brier score, ECE, MCE, and reliability curve generation."""
    np.random.seed(42)
    y_true = np.array([0, 0, 0, 1, 1, 1, 0, 1, 1, 0])
    y_prob = np.array([0.1, 0.2, 0.15, 0.8, 0.9, 0.7, 0.3, 0.85, 0.65, 0.25])

    res = compute_calibration_assessment(y_true, y_prob, n_bins=5)

    assert "brier_score" in res
    assert "expected_calibration_error_ece" in res
    assert "maximum_calibration_error_mce" in res
    assert "reliability_bins" in res

    # Brier score bounds
    assert 0.0 <= res["brier_score"] <= 1.0
    assert 0.0 <= res["expected_calibration_error_ece"] <= 1.0
    assert 0.0 <= res["maximum_calibration_error_mce"] <= 1.0
    assert len(res["reliability_bins"]) > 0


def test_evidence_card_schema_and_tiers():
    """Verify SUTRA Evidence Card tier assignments and Pydantic schema validation."""
    assert determine_risk_tier(0.15) == RiskTier.LOW
    assert determine_risk_tier(0.35) == RiskTier.MODERATE
    assert determine_risk_tier(0.55) == RiskTier.ELEVATED
    assert determine_risk_tier(0.85) == RiskTier.HIGH

    card = build_evidence_card(
        record_id="SYNTH-STU-001",
        module_code="BBB",
        presentation_code="2014J",
        risk_prob=0.582,
        top_pos_factors=[
            {"display_title": "Days Inactive Since Last Click", "observed_raw_value": "18", "log_odds_contribution": 0.42}
        ],
        top_neg_factors=[
            {"display_title": "Early Assessments Submitted", "observed_raw_value": "1", "log_odds_contribution": -0.31}
        ],
        threshold=0.46,
    )

    assert isinstance(card, SutraEvidenceCard)
    assert card.risk_tier == RiskTier.ELEVATED
    assert card.alert_triggered is True
    assert card.course_context.snapshot_day == 30
    assert "No Alert Without Action" in card.governance_notices.human_in_the_loop_mandate

    # Schema JSON serialization
    card_dict = card.model_dump()
    assert card_dict["risk_probability"] == 0.582
    assert len(card_dict["top_risk_drivers"]) == 1

    # Schema validation rejection of out-of-bounds probability
    with pytest.raises(ValidationError):
        SutraEvidenceCard(
            record_id="FAIL-01",
            course_context={"module_code": "BBB", "presentation_code": "2014J", "snapshot_day": 30},
            model_metadata={"model_name": "LR", "model_version": "v1", "training_cohort": "2013"},
            risk_probability=1.25,  # Invalid prob > 1.0
            risk_tier=RiskTier.HIGH,
            operational_threshold=0.46,
            alert_triggered=True,
            top_risk_drivers=[],
            top_protective_factors=[],
        )


def test_global_feature_importance_generation(synthetic_training_data):
    """Verify global feature ranking extraction for both Logistic Regression and XGBoost."""
    feature_cols = NUMERICAL_COLS + CATEGORICAL_COLS
    X = synthetic_training_data[feature_cols]
    y = synthetic_training_data["target"]

    lr_pipe = build_logistic_regression_pipeline(
        NUMERICAL_COLS,
        CATEGORICAL_COLS,
        {"C": 1.0, "max_iter": 200, "random_state": 42},
    )
    lr_pipe.fit(X, y)

    xgb_pipe = build_xgboost_pipeline(
        NUMERICAL_COLS,
        CATEGORICAL_COLS,
        {"n_estimators": 10, "max_depth": 3, "random_state": 42},
    )
    xgb_pipe.fit(X, y)

    global_res = compute_global_feature_importance(lr_pipe, xgb_pipe, X.head(30), feature_cols)

    assert "logistic_regression" in global_res
    assert "xgboost" in global_res
    assert len(global_res["logistic_regression"]["top_parent_features"]) > 0
    assert len(global_res["xgboost"]["top_parent_features"]) > 0
