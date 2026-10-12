"""
Research Forecast Inference & Explanation Engine for SUTRA Phase Twenty-Three.

Loads frozen Phase Twenty-Two OULAD research artifacts and generates dual-cutoff
forecasting comparisons with exact log-odds attributions and strict research labeling.

CRITICAL INVARIANTS:
1. This module serves development and research evaluation ONLY.
2. Production Logistic Regression v1.0.0 and its serving threshold (0.46) remain completely isolated.
3. Differences between Day-30 and Day-60 probabilities are labeled as 'changes in research-model estimate',
   with explicit disclaimers that statistical associations are non-causal.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd

from sutra_ml.explainability.local_explanations import explain_prediction_linear

curr = Path(__file__).resolve()
# Traverse up until we find repo root containing 'ml'
repo_root = curr.parents[4] if len(curr.parents) >= 5 else Path.cwd()
for p in curr.parents:
    if (p / "ml" / "artifacts").exists():
        repo_root = p
        break

REPO_ROOT = repo_root
ML_DIR = REPO_ROOT / "ml"
EXPERIMENTS_DIR = ML_DIR / "artifacts" / "experiments" / "phase_twenty_two"
PROCESSED_DIR = ML_DIR / "data" / "processed"

RESEARCH_MODELS: Dict[str, Any] = {}
D30_CACHE: Optional[pd.DataFrame] = None
D60_CACHE: Optional[pd.DataFrame] = None


def _load_research_models() -> Dict[str, Any]:
    global RESEARCH_MODELS
    if not RESEARCH_MODELS:
        RESEARCH_MODELS["d30_lr"] = joblib.load(EXPERIMENTS_DIR / "day30_logistic_regression.joblib")
        RESEARCH_MODELS["d60_lr"] = joblib.load(EXPERIMENTS_DIR / "day60_logistic_regression.joblib")
        RESEARCH_MODELS["d30_xgb"] = joblib.load(EXPERIMENTS_DIR / "day30_xgboost.joblib")
        RESEARCH_MODELS["d60_xgb"] = joblib.load(EXPERIMENTS_DIR / "day60_xgboost.joblib")
    return RESEARCH_MODELS


def _load_data_caches() -> tuple[pd.DataFrame, pd.DataFrame]:
    global D30_CACHE, D60_CACHE
    if D30_CACHE is None:
        D30_CACHE = pd.read_csv(PROCESSED_DIR / "phase22_day30_features.csv")
    if D60_CACHE is None:
        D60_CACHE = pd.read_csv(PROCESSED_DIR / "phase22_day60_features.csv")
    return D30_CACHE, D60_CACHE


def get_available_sample_registrations(limit: int = 50) -> List[Dict[str, Any]]:
    """Return list of sample registrations that exist in both Day 30 and Day 60 datasets."""
    d30_df, d60_df = _load_data_caches()
    keys = ["code_module", "code_presentation", "id_student"]

    # Select common registrations across presentations
    common = pd.merge(
        d60_df[keys + ["raw_final_result", "target", "vle_total_clicks", "missed_assessments"]].head(limit * 2),
        d30_df[keys + ["vle_total_clicks"]],
        on=keys,
        suffixes=("_d60", "_d30"),
    ).head(limit)

    results = []
    for _, row in common.iterrows():
        results.append({
            "code_module": str(row["code_module"]),
            "code_presentation": str(row["code_presentation"]),
            "id_student": int(row["id_student"]),
            "raw_final_result": str(row["raw_final_result"]),
            "target": int(row["target"]),
            "target_label": "At-Risk (Fail/Withdrawn)" if row["target"] == 1 else "On-Track (Pass/Distinction)",
            "d30_total_clicks": int(row["vle_total_clicks_d30"]),
            "d60_total_clicks": int(row["vle_total_clicks_d60"]),
            "d60_missed_assessments": int(row["missed_assessments"]),
        })
    return results


def get_registration_snapshots(
    code_module: str,
    code_presentation: str,
    id_student: int,
) -> Dict[str, Any]:
    """Retrieve raw feature values for Day 30 and Day 60 snapshots."""
    d30_df, d60_df = _load_data_caches()
    keys = ["code_module", "code_presentation", "id_student"]
    drop_cols = keys + ["target", "target_name", "raw_final_result"]

    q30 = d30_df[
        (d30_df["code_module"] == code_module)
        & (d30_df["code_presentation"] == code_presentation)
        & (d30_df["id_student"] == id_student)
    ]
    q60 = d60_df[
        (d60_df["code_module"] == code_module)
        & (d60_df["code_presentation"] == code_presentation)
        & (d60_df["id_student"] == id_student)
    ]

    if q30.empty or q60.empty:
        raise ValueError(
            f"Registration ({code_module}, {code_presentation}, {id_student}) not found in common cohort."
        )

    row30 = q30.iloc[0]
    row60 = q60.iloc[0]

    feats30 = {k: v for k, v in row30.to_dict().items() if k not in drop_cols}
    feats60 = {k: v for k, v in row60.to_dict().items() if k not in drop_cols}

    return {
        "registration": {
            "code_module": code_module,
            "code_presentation": code_presentation,
            "id_student": id_student,
            "raw_final_result": str(row60["raw_final_result"]),
            "target": int(row60["target"]),
        },
        "day30_snapshot": {
            "cutoff_day": 30,
            "features": feats30,
        },
        "day60_snapshot": {
            "cutoff_day": 60,
            "features": feats60,
        },
    }


def score_research_forecast(
    code_module: str,
    code_presentation: str,
    id_student: int,
) -> Dict[str, Any]:
    """
    Score a single registration across all 4 research models (Day 30 and Day 60 LR & XGB),
    compute linear explanations, and return comparison metadata with research caveats.
    """
    models = _load_research_models()
    d30_df, d60_df = _load_data_caches()
    keys = ["code_module", "code_presentation", "id_student"]
    drop_cols = keys + ["target", "target_name", "raw_final_result"]

    q30 = d30_df[
        (d30_df["code_module"] == code_module)
        & (d30_df["code_presentation"] == code_presentation)
        & (d30_df["id_student"] == id_student)
    ]
    q60 = d60_df[
        (d60_df["code_module"] == code_module)
        & (d60_df["code_presentation"] == code_presentation)
        & (d60_df["id_student"] == id_student)
    ]

    if q30.empty or q60.empty:
        raise ValueError(f"Registration ({code_module}, {code_presentation}, {id_student}) not found.")

    row30 = q30.iloc[0]
    row60 = q60.iloc[0]

    feats30_cols = [c for c in d30_df.columns if c not in drop_cols]
    feats60_cols = [c for c in d60_df.columns if c not in drop_cols]

    X30 = pd.DataFrame([row30[feats30_cols]])
    X60 = pd.DataFrame([row60[feats60_cols]])

    # Logistic Regression Predictions
    prob_30_lr = float(models["d30_lr"].predict_proba(X30)[0, 1])
    prob_60_lr = float(models["d60_lr"].predict_proba(X60)[0, 1])

    # XGBoost Predictions
    prob_30_xgb = float(models["d30_xgb"].predict_proba(X30)[0, 1])
    prob_60_xgb = float(models["d60_xgb"].predict_proba(X60)[0, 1])

    # Explanations for Logistic Regression
    expl_30 = explain_prediction_linear(row30, models["d30_lr"], feats30_cols, top_n=4)
    expl_60 = explain_prediction_linear(row60, models["d60_lr"], feats60_cols, top_n=4)

    delta_lr = prob_60_lr - prob_30_lr
    delta_xgb = prob_60_xgb - prob_30_xgb

    return {
        "registration": {
            "code_module": code_module,
            "code_presentation": code_presentation,
            "id_student": id_student,
            "actual_outcome": str(row60["raw_final_result"]),
            "target": int(row60["target"]),
        },
        "governance_metadata": {
            "is_research_model": True,
            "prohibition_operational_use": True,
            "evidence_classification": "HISTORICAL_DEVELOPMENT_DIAGNOSTIC",
            "production_baseline_isolated": True,
            "disclaimer": "Predicted probabilities represent research-model estimates under historical OULAD feature schemas. Statistical associations do not imply causal intervention efficacy.",
            "probability_shift_interpretation": "Score difference reflects updated observation window and additional midterm information, NOT a confirmed individualized clinical trajectory.",
        },
        "forecasts": {
            "logistic_regression": {
                "day30": {
                    "cutoff_day": 30,
                    "model_version": "research_lr_d30_v22.0.0",
                    "predicted_probability": round(prob_30_lr, 4),
                    "threshold_046_alert": bool(prob_30_lr >= 0.46),
                    "threshold_optimal_alert": bool(prob_30_lr >= 0.42),
                    "top_risk_drivers": expl_30["top_risk_drivers"],
                    "top_protective_factors": expl_30["top_protective_factors"],
                },
                "day60": {
                    "cutoff_day": 60,
                    "model_version": "research_lr_d60_v22.0.0",
                    "predicted_probability": round(prob_60_lr, 4),
                    "threshold_046_alert": bool(prob_60_lr >= 0.46),
                    "threshold_optimal_alert": bool(prob_60_lr >= 0.41),
                    "threshold_realigned_alert": bool(prob_60_lr >= 0.40),
                    "top_risk_drivers": expl_60["top_risk_drivers"],
                    "top_protective_factors": expl_60["top_protective_factors"],
                },
                "estimate_delta": round(delta_lr, 4),
                "trend_direction": "INCREASED_ESTIMATE" if delta_lr > 0.05 else ("DECREASED_ESTIMATE" if delta_lr < -0.05 else "STABLE_ESTIMATE"),
            },
            "xgboost": {
                "day30": {
                    "cutoff_day": 30,
                    "model_version": "research_xgb_d30_v22.0.0",
                    "predicted_probability": round(prob_30_xgb, 4),
                },
                "day60": {
                    "cutoff_day": 60,
                    "model_version": "research_xgb_d60_v22.0.0",
                    "predicted_probability": round(prob_60_xgb, 4),
                },
                "estimate_delta": round(delta_xgb, 4),
                "trend_direction": "INCREASED_ESTIMATE" if delta_xgb > 0.05 else ("DECREASED_ESTIMATE" if delta_xgb < -0.05 else "STABLE_ESTIMATE"),
            },
        },
    }
