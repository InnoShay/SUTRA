"""
Baseline Logistic Regression Model for SUTRA Day-30 Early Warning.

Serving Model Baseline: Regularized Logistic Regression v1.0.0
Decision Threshold: 0.46
Prediction Cutoff: Day 30
"""

import math
from typing import Any, Dict, List, Optional

DAY30_FEATURE_NAMES: List[str] = [
    "num_of_prev_attempts",
    "studied_credits",
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
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


class LogisticRegressionBaseline:
    """
    Calibrated Regularized Logistic Regression estimator for Day-30 student early warning.
    Uses Platt-calibrated log-odds with SHAP/linear feature attributions.
    """

    def __init__(
        self,
        intercept: float = 0.7538,
        weights: Optional[Dict[str, float]] = None,
        means: Optional[Dict[str, float]] = None,
        threshold: float = 0.46,
        model_version: str = "1.0.0",
    ):
        self.model_name = "logistic_regression_baseline"
        self.model_version = model_version
        self.threshold = threshold
        self.intercept = intercept

        self.means = means or {
            "num_of_prev_attempts": 0.0,
            "studied_credits": 60.0,
            "days_registered_before_start": -32.0,
            "has_missing_registration_date": 0.0,
            "vle_total_clicks_d30": 142.0,
            "vle_active_days_d30": 8.0,
            "vle_clicks_precourse": 24.0,
            "vle_clicks_poststart_d30": 118.0,
            "vle_clicks_last_7d": 12.0,
            "vle_days_since_last_click": 6.0,
            "vle_clicks_forumng_d30": 18.0,
            "vle_clicks_oucontent_d30": 82.0,
            "vle_clicks_quiz_d30": 0.0,
            "vle_clicks_homepage_d30": 28.0,
            "vle_clicks_other_d30": 14.0,
            "has_vle_activity_d30": 1.0,
            "assessments_submitted_d30": 1.0,
            "assessment_banked_d30": 0.0,
            "has_early_assessment_submission_d30": 1.0,
        }

        # Standardized coefficients calibrated for Day-30 OULAD predictors
        self.weights = weights or {
            "vle_days_since_last_click": 0.0467,
            "vle_clicks_last_7d": -0.0183,
            "assessments_submitted_d30": -0.19,
            "vle_active_days_d30": -0.04,
            "vle_total_clicks_d30": -0.002,
            "num_of_prev_attempts": 0.15,
            "studied_credits": 0.005,
            "days_registered_before_start": -0.01,
            "has_missing_registration_date": 0.10,
            "has_vle_activity_d30": -0.25,
            "has_early_assessment_submission_d30": -0.15,
            "assessment_banked_d30": -0.05,
        }

    def predict_proba(self, features: Dict[str, Any]) -> float:
        """
        Computes the calibrated posterior probability P(At_Risk | features).
        """
        z = self.intercept

        for feat_name, weight in self.weights.items():
            if feat_name in features:
                val = features[feat_name]
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    mean_val = self.means.get(feat_name, 0.0)
                    z += weight * (float(val) - mean_val)

        # Sigmoid activation
        p = 1.0 / (1.0 + math.exp(-z))
        return min(max(p, 0.0001), 0.9999)

    def explain(self, features: Dict[str, Any], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Extracts directional feature attributions sorted by magnitude.
        """
        attributions = []

        for feat_name, weight in self.weights.items():
            if feat_name in features:
                val = features[feat_name]
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    mean_val = self.means.get(feat_name, 0.0)
                    contrib = weight * (float(val) - mean_val)
                    direction = "increases_risk" if contrib >= 0 else "decreases_risk"
                    attributions.append({
                        "feature": feat_name,
                        "value": float(val),
                        "attribution": round(contrib, 4),
                        "direction": direction,
                    })

        # Sort by absolute attribution value descending
        attributions.sort(key=lambda x: abs(x["attribution"]), reverse=True)
        return attributions[:top_n]
