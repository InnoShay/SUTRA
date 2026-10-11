"""
Local prediction explanation engine for SUTRA ML models.

Computes exact feature attributions for individual student risk predictions:
- Linear log-odds decomposition for Logistic Regression.
- Exact native TreeSHAP attributions for XGBoost.
Maps low-level encoded feature representations back to readable human explanations.
"""

from typing import Any
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
import xgboost as xgb


FEATURE_LABEL_MAP = {
    "num_of_prev_attempts": "Prior Module Attempts",
    "studied_credits": "Registered Credit Load",
    "days_registered_before_start": "Course Registration Lead Time",
    "has_missing_registration_date": "Missing Registration Timestamp Flag",
    "vle_total_clicks_d30": "Total VLE Activity Clicks (Day <= 30)",
    "vle_active_days_d30": "Active Learning Days on Platform",
    "vle_clicks_precourse": "Pre-Course Orientation Engagement (Day < 0)",
    "vle_clicks_poststart_d30": "Post-Start Study Engagement (Day 0-30)",
    "vle_clicks_last_7d": "Recent Activity Velocity (Last 7 Days)",
    "vle_days_since_last_click": "Days Inactive Since Last VLE Access",
    "vle_clicks_forumng_d30": "Discussion Forum Interactions",
    "vle_clicks_oucontent_d30": "Core Course Material Reading",
    "vle_clicks_quiz_d30": "Practice Quiz Interactions",
    "vle_clicks_homepage_d30": "Course Homepage Visits",
    "vle_clicks_other_d30": "Supplementary Resource Access",
    "has_vle_activity_d30": "Virtual Learning Platform Access Flag",
    "assessments_submitted_d30": "Formative Assessment Submissions by Day 30",
    "assessment_banked_d30": "Prior Credit / Banked Submissions",
    "has_early_assessment_submission_d30": "Early Assignment Submission Flag",
    "gender": "Gender",
    "region": "Geographic Region",
    "highest_education": "Highest Prior Education",
    "imd_band": "Index of Multiple Deprivation Band",
    "age_band": "Age Band",
    "disability": "Declared Disability Indicator",
}


def clean_feature_name_and_category(raw_transformed_name: str) -> tuple[str, str, str]:
    """
    Decompose scikit-learn transformed name (e.g., 'cat__imd_band_0-10%')
    into parent feature, category value, and human-readable title.
    """
    if raw_transformed_name.startswith("num__"):
        feat_name = raw_transformed_name[5:]
        title = FEATURE_LABEL_MAP.get(feat_name, feat_name)
        return feat_name, "", title
    elif raw_transformed_name.startswith("cat__"):
        rest = raw_transformed_name[5:]
        # Find which categorical feature matches the prefix
        for cat_feat in ["gender", "region", "highest_education", "imd_band", "age_band", "disability"]:
            prefix = cat_feat + "_"
            if rest.startswith(prefix):
                category_val = rest[len(prefix):]
                title = f"{FEATURE_LABEL_MAP.get(cat_feat, cat_feat)}: {category_val}"
                return cat_feat, category_val, title
        return rest, "", rest
    return raw_transformed_name, "", raw_transformed_name


def explain_prediction_linear(
    student_row: pd.Series | pd.DataFrame,
    pipeline: Pipeline,
    feature_cols: list[str],
    top_n: int = 5,
) -> dict[str, Any]:
    """
    Compute exact linear log-odds feature contributions for regularized Logistic Regression.

    Formula:
        margin = w_0 + sum(w_j * z_j)
        phi_j = w_j * z_j
        P(y=1) = 1 / (1 + exp(-margin))

    Guarantees strict additivity: bias + sum(contributions) == logit(p).
    """
    if isinstance(student_row, pd.Series):
        X_single = pd.DataFrame([student_row[feature_cols]])
        raw_row = student_row
    else:
        X_single = student_row[feature_cols].iloc[[0]]
        raw_row = student_row.iloc[0]

    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]

    # Transform to design vector
    Z = preprocessor.transform(X_single)
    # Impute any NaN that passed through to standardized zero mean
    Z = np.nan_to_num(Z, nan=0.0)
    transformed_names = preprocessor.get_feature_names_out()

    weights = classifier.coef_[0]
    bias = float(classifier.intercept_[0])

    contributions = weights * Z[0]
    calculated_margin = bias + float(np.sum(contributions))
    model_margin = float(classifier.decision_function(Z)[0])

    # Assert mathematical additivity
    if not np.isclose(calculated_margin, model_margin, atol=1e-5):
        raise ValueError(f"Additivity error in linear attribution: {calculated_margin} vs {model_margin}")

    risk_prob = float(1.0 / (1.0 + np.exp(-model_margin)))

    # Build attribution records
    records = []
    for i, name in enumerate(transformed_names):
        weight = float(weights[i])
        val_trans = float(Z[0, i])
        contrib = float(contributions[i])
        parent_col, category_val, display_title = clean_feature_name_and_category(name)

        observed_raw = raw_row.get(parent_col, "-")

        records.append({
            "feature_key": name,
            "parent_feature": parent_col,
            "display_title": display_title,
            "observed_raw_value": str(observed_raw),
            "transformed_value": round(val_trans, 4),
            "model_coefficient": round(weight, 4),
            "log_odds_contribution": round(contrib, 4),
        })

    # Sort positive (risk drivers) vs negative (protective factors)
    pos_drivers = sorted([r for r in records if r["log_odds_contribution"] > 0], key=lambda x: x["log_odds_contribution"], reverse=True)[:top_n]
    neg_drivers = sorted([r for r in records if r["log_odds_contribution"] < 0], key=lambda x: x["log_odds_contribution"])[:top_n]

    return {
        "model_type": "LogisticRegression",
        "risk_probability": round(risk_prob, 4),
        "log_odds_margin": round(model_margin, 4),
        "base_intercept": round(bias, 4),
        "top_risk_drivers": pos_drivers,
        "top_protective_factors": neg_drivers,
        "all_contributions": records,
    }


def explain_prediction_trees(
    student_row: pd.Series | pd.DataFrame,
    pipeline: Pipeline,
    feature_cols: list[str],
    top_n: int = 5,
) -> dict[str, Any]:
    """
    Compute exact TreeSHAP feature contributions for XGBoost using native C++ tree traversal.

    Guarantees strict additivity: base_margin + sum(shap_values) == output_margin.
    """
    if isinstance(student_row, pd.Series):
        X_single = pd.DataFrame([student_row[feature_cols]])
        raw_row = student_row
    else:
        X_single = student_row[feature_cols].iloc[[0]]
        raw_row = student_row.iloc[0]

    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]

    Z = preprocessor.transform(X_single)
    # Impute any NaN that passed through to zero
    Z = np.nan_to_num(Z, nan=0.0)
    transformed_names = list(preprocessor.get_feature_names_out())

    booster = classifier.get_booster()
    dmat = xgb.DMatrix(Z)

    # Native TreeSHAP via pred_contribs=True
    # Returns vector of length (num_features + 1), where last element is bias
    tree_contribs = booster.predict(dmat, pred_contribs=True)[0]
    shap_vals = tree_contribs[:-1]
    base_bias = float(tree_contribs[-1])

    calculated_margin = base_bias + float(np.sum(shap_vals))
    model_margin = float(classifier.predict(Z, output_margin=True)[0])

    if not np.isclose(calculated_margin, model_margin, atol=1e-4):
        raise ValueError(f"Additivity error in TreeSHAP: {calculated_margin} vs {model_margin}")

    risk_prob = float(1.0 / (1.0 + np.exp(-model_margin)))

    records = []
    for i, name in enumerate(transformed_names):
        shap_v = float(shap_vals[i])
        val_trans = float(Z[0, i])
        parent_col, category_val, display_title = clean_feature_name_and_category(name)
        observed_raw = raw_row.get(parent_col, "-")

        records.append({
            "feature_key": name,
            "parent_feature": parent_col,
            "display_title": display_title,
            "observed_raw_value": str(observed_raw),
            "transformed_value": round(val_trans, 4),
            "shap_contribution": round(shap_v, 4),
        })

    pos_drivers = sorted([r for r in records if r["shap_contribution"] > 0], key=lambda x: x["shap_contribution"], reverse=True)[:top_n]
    neg_drivers = sorted([r for r in records if r["shap_contribution"] < 0], key=lambda x: x["shap_contribution"])[:top_n]

    return {
        "model_type": "XGBClassifier",
        "risk_probability": round(risk_prob, 4),
        "margin": round(model_margin, 4),
        "base_bias": round(base_bias, 4),
        "top_risk_drivers": pos_drivers,
        "top_protective_factors": neg_drivers,
        "all_contributions": records,
    }
