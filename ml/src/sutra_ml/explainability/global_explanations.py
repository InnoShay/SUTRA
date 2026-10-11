"""
Global feature importance and comparative attribution analysis for SUTRA ML.
"""

from collections import defaultdict
from typing import Any
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
try:
    import xgboost as xgb
except Exception:
    xgb = None


from sutra_ml.explainability.local_explanations import FEATURE_LABEL_MAP, clean_feature_name_and_category


def compute_global_feature_importance(
    base_pipeline: Pipeline,
    xgb_pipeline: Pipeline,
    sample_df: pd.DataFrame,
    feature_cols: list[str],
) -> dict[str, Any]:
    """
    Compute global feature rankings for both models:
    - Logistic Regression: standardized coefficients & odds ratios.
    - XGBoost: mean absolute TreeSHAP values across sample records.
    """
    preprocessor = base_pipeline.named_steps["preprocessor"]
    transformed_names = list(preprocessor.get_feature_names_out())

    # --- 1. Logistic Regression Global Importances ---
    lr_clf = base_pipeline.named_steps["classifier"]
    lr_weights = lr_clf.coef_[0]

    lr_features = []
    lr_parent_importance = defaultdict(float)

    for i, name in enumerate(transformed_names):
        w = float(lr_weights[i])
        parent_col, category_val, display_title = clean_feature_name_and_category(name)
        odds_ratio = float(np.exp(w))

        lr_features.append({
            "feature_key": name,
            "parent_feature": parent_col,
            "display_title": display_title,
            "coefficient": round(w, 4),
            "odds_ratio": round(odds_ratio, 4),
            "abs_weight": round(abs(w), 4),
            "direction": "RISK_INCREASING" if w > 0 else "PROTECTIVE",
        })
        lr_parent_importance[parent_col] += abs(w)

    lr_features_sorted = sorted(lr_features, key=lambda x: x["abs_weight"], reverse=True)
    lr_parent_sorted = sorted(
        [
            {"parent_feature": k, "display_title": FEATURE_LABEL_MAP.get(k, k), "total_weight": round(v, 4)}
            for k, v in lr_parent_importance.items()
        ],
        key=lambda x: x["total_weight"],
        reverse=True,
    )

    # --- 2. XGBoost Global TreeSHAP Importances ---
    xgb_clf = xgb_pipeline.named_steps["classifier"]
    Z_sample = preprocessor.transform(sample_df[feature_cols])

    booster = xgb_clf.get_booster()
    dmat = xgb.DMatrix(Z_sample)

    # Compute TreeSHAP values for sample
    shap_matrix = booster.predict(dmat, pred_contribs=True)[:, :-1]  # drop bias column
    mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)

    xgb_features = []
    xgb_parent_importance = defaultdict(float)

    for i, name in enumerate(transformed_names):
        val = float(mean_abs_shap[i])
        parent_col, category_val, display_title = clean_feature_name_and_category(name)

        xgb_features.append({
            "feature_key": name,
            "parent_feature": parent_col,
            "display_title": display_title,
            "mean_abs_shap": round(val, 4),
        })
        xgb_parent_importance[parent_col] += val

    xgb_features_sorted = sorted(xgb_features, key=lambda x: x["mean_abs_shap"], reverse=True)
    xgb_parent_sorted = sorted(
        [
            {"parent_feature": k, "display_title": FEATURE_LABEL_MAP.get(k, k), "total_shap": round(v, 4)}
            for k, v in xgb_parent_importance.items()
        ],
        key=lambda x: x["total_shap"],
        reverse=True,
    )

    return {
        "logistic_regression": {
            "top_transformed_features": lr_features_sorted[:15],
            "top_parent_features": lr_parent_sorted,
        },
        "xgboost": {
            "top_transformed_features": xgb_features_sorted[:15],
            "top_parent_features": xgb_parent_sorted,
        },
    }
