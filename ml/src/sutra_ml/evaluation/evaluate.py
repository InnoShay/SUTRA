"""
Model comparison, subgroup error analysis, and selection logic for SUTRA ML.
"""

from typing import Any
import numpy as np
import pandas as pd

from sutra_ml.evaluation.metrics import compute_comprehensive_metrics


def perform_subgroup_error_analysis(
    df: pd.DataFrame,
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float,
    group_cols: list[str],
) -> dict[str, list[dict[str, Any]]]:
    """
    Examine false negatives and false positives across student subgroups.
    Avoids causal claims; reports purely empirical detection patterns.
    """
    analysis_df = df[group_cols].copy()
    analysis_df["y_true"] = y_true
    analysis_df["y_prob"] = y_prob
    analysis_df["y_pred"] = (y_prob >= threshold).astype(int)

    analysis_df["is_tp"] = (analysis_df["y_true"] == 1) & (analysis_df["y_pred"] == 1)
    analysis_df["is_fn"] = (analysis_df["y_true"] == 1) & (analysis_df["y_pred"] == 0)
    analysis_df["is_fp"] = (analysis_df["y_true"] == 0) & (analysis_df["y_pred"] == 1)
    analysis_df["is_tn"] = (analysis_df["y_true"] == 0) & (analysis_df["y_pred"] == 0)

    results = {}
    for col in group_cols:
        col_results = []
        for val, group in analysis_df.groupby(col):
            total = len(group)
            if total < 20:  # Skip tiny subgroups to avoid spurious rates
                continue
            actual_pos = int(group["y_true"].sum())
            actual_neg = total - actual_pos

            fn_count = int(group["is_fn"].sum())
            fp_count = int(group["is_fp"].sum())
            tp_count = int(group["is_tp"].sum())

            fnr = round((fn_count / max(1, actual_pos)) * 100, 2)
            fpr = round((fp_count / max(1, actual_neg)) * 100, 2)
            rec = round((tp_count / max(1, actual_pos)) * 100, 2)

            col_results.append({
                "subgroup": str(val),
                "total_students": total,
                "actual_at_risk": actual_pos,
                "missed_at_risk_fn": fn_count,
                "false_negative_rate_pct": fnr,
                "false_alarms_fp": fp_count,
                "false_positive_rate_pct": fpr,
                "recall_pct": rec,
            })
        results[col] = sorted(col_results, key=lambda x: x["total_students"], reverse=True)

    return results
