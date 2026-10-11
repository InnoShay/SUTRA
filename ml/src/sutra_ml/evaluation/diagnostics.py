"""
Comprehensive diagnostic evaluation and error analysis engine for SUTRA ML models.

Implements rigorous diagnostic auditing:
- Multi-dataset baseline evaluation (Full holdout, Disjoint holdout, Training CV)
- Row-level error categorization (TP, FP, TN, FN) and probability margin analysis
- Subgroup and module error decomposition with confidence intervals
- Feature attribution and collinearity diagnostics
- Threshold-sweep trade-off analysis
"""

from typing import Any, Optional
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline

from sutra_ml.evaluation.calibration import compute_calibration_assessment
from sutra_ml.evaluation.metrics import compute_comprehensive_metrics


def wilson_score_interval(
    successes: int,
    trials: int,
    confidence: float = 0.95,
) -> tuple[float, float]:
    """
    Calculate Wilson score confidence interval for binomial proportion.
    Robust for small sample sizes and proportions near 0 or 1.
    """
    if trials <= 0:
        return 0.0, 0.0

    z = stats.norm.ppf(1.0 - (1.0 - confidence) / 2.0)
    p_hat = successes / trials

    denominator = 1.0 + (z**2) / trials
    centre_adjusted_probability = p_hat + (z**2) / (2.0 * trials)
    adjusted_standard_deviation = np.sqrt(
        (p_hat * (1.0 - p_hat) + (z**2) / (4.0 * trials)) / trials
    )

    lower_bound = (centre_adjusted_probability - z * adjusted_standard_deviation) / denominator
    upper_bound = (centre_adjusted_probability + z * adjusted_standard_deviation) / denominator

    if successes == 0:
        lower_bound = 0.0
    if successes == trials:
        upper_bound = 1.0

    return max(0.0, float(lower_bound)), min(1.0, float(upper_bound))


def evaluate_model_on_dataset(
    model: Pipeline,
    X: pd.DataFrame,
    y: np.ndarray,
    threshold: float = 0.46,
    dataset_name: str = "dataset",
) -> tuple[np.ndarray, dict[str, Any]]:
    """
    Generate predictions and compute metrics for a model pipeline on given data.
    """
    y_true = np.asarray(y).astype(int)
    probs = model.predict_proba(X)[:, 1]

    metrics = compute_comprehensive_metrics(y_true, probs, threshold=threshold)
    calib = compute_calibration_assessment(y_true, probs)
    metrics["calibration"] = calib
    metrics["dataset_name"] = dataset_name

    return probs, metrics


def categorize_row_level_errors(
    df: pd.DataFrame,
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.46,
) -> pd.DataFrame:
    """
    Assign error categories (TP, FP, TN, FN) and probability margins to records.
    """
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    y_pred = (y_prob >= threshold).astype(int)

    result_df = df.copy()
    result_df["actual_target"] = y_true
    result_df["predicted_probability"] = np.round(y_prob, 4)
    result_df["predicted_class"] = y_pred
    result_df["margin_from_threshold"] = np.round(y_prob - threshold, 4)

    # Classify error category
    conditions = [
        (y_true == 1) & (y_pred == 1),
        (y_true == 0) & (y_pred == 1),
        (y_true == 0) & (y_pred == 0),
        (y_true == 1) & (y_pred == 0),
    ]
    choices = ["TP", "FP", "TN", "FN"]
    result_df["error_category"] = np.select(conditions, choices, default="UNKNOWN")

    return result_df


def analyze_error_subsets(
    error_df: pd.DataFrame,
    numerical_cols: list[str],
) -> dict[str, Any]:
    """
    Compute aggregate statistical profiles for TP, FP, TN, FN error groups.
    """
    counts = error_df["error_category"].value_counts().to_dict()
    total = len(error_df)

    category_stats = {}
    for cat in ["TP", "FP", "TN", "FN"]:
        subset = error_df[error_df["error_category"] == cat]
        cat_count = len(subset)
        cat_pct = round((cat_count / max(1, total)) * 100, 2)

        feature_means = {}
        for num_c in numerical_cols:
            if num_c in subset.columns:
                feature_means[num_c] = round(float(subset[num_c].mean()), 2)

        prob_series = subset["predicted_probability"]
        prob_summary = {
            "mean": round(float(prob_series.mean()), 4) if cat_count > 0 else 0.0,
            "std": round(float(prob_series.std()), 4) if cat_count > 1 else 0.0,
            "min": round(float(prob_series.min()), 4) if cat_count > 0 else 0.0,
            "p25": round(float(prob_series.quantile(0.25)), 4) if cat_count > 0 else 0.0,
            "median": round(float(prob_series.median()), 4) if cat_count > 0 else 0.0,
            "p75": round(float(prob_series.quantile(0.75)), 4) if cat_count > 0 else 0.0,
            "max": round(float(prob_series.max()), 4) if cat_count > 0 else 0.0,
        }

        category_stats[cat] = {
            "count": cat_count,
            "percentage": cat_pct,
            "probability_distribution": prob_summary,
            "feature_means": feature_means,
        }

    # False Negative near-threshold analysis
    fn_subset = error_df[error_df["error_category"] == "FN"]
    fn_total = len(fn_subset)
    fn_borderline = int((fn_subset["predicted_probability"] >= 0.35).sum()) if fn_total > 0 else 0
    fn_deep_miss = int((fn_subset["predicted_probability"] < 0.20).sum()) if fn_total > 0 else 0

    return {
        "total_records": total,
        "counts": counts,
        "categories": category_stats,
        "false_negative_deep_dive": {
            "total_missed_students": fn_total,
            "borderline_misses_p35_to_p46": fn_borderline,
            "borderline_pct": round((fn_borderline / max(1, fn_total)) * 100, 2) if fn_total > 0 else 0.0,
            "deep_misses_under_p20": fn_deep_miss,
            "deep_misses_pct": round((fn_deep_miss / max(1, fn_total)) * 100, 2) if fn_total > 0 else 0.0,
        },
    }


def compute_comprehensive_subgroup_diagnostics(
    df: pd.DataFrame,
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.46,
    subgroup_cols: Optional[list[str]] = None,
) -> pd.DataFrame:
    """
    Compute rigorous subgroup evaluation metrics with sample confidence indicators.
    """
    if subgroup_cols is None:
        subgroup_cols = [
            "code_module",
            "gender",
            "age_band",
            "disability",
            "highest_education",
            "imd_band",
        ]

    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    y_pred = (y_prob >= threshold).astype(int)

    eval_df = df.copy()
    eval_df["y_true"] = y_true
    eval_df["y_prob"] = y_prob
    eval_df["y_pred"] = y_pred

    records = []

    for dim in subgroup_cols:
        if dim not in eval_df.columns:
            continue

        for group_val, grp in eval_df.groupby(dim, observed=True):
            n_sub = len(grp)
            if n_sub == 0:
                continue

            grp_y = grp["y_true"].to_numpy()
            grp_prob = grp["y_prob"].to_numpy()
            grp_pred = grp["y_pred"].to_numpy()

            pos_actual = int(np.sum(grp_y == 1))
            neg_actual = int(np.sum(grp_y == 0))
            prevalence = pos_actual / max(1, n_sub)

            cm = confusion_matrix(grp_y, grp_pred, labels=[0, 1])
            tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

            rec = float(recall_score(grp_y, grp_pred, zero_division=0))
            prec = float(precision_score(grp_y, grp_pred, zero_division=0))
            spec = float(tn / max(1, neg_actual)) if neg_actual > 0 else 0.0
            fpr = float(fp / max(1, neg_actual)) if neg_actual > 0 else 0.0
            fnr = float(fn / max(1, pos_actual)) if pos_actual > 0 else 0.0
            f1 = float(f1_score(grp_y, grp_pred, zero_division=0))

            # Wilson score interval for Recall and FPR
            rec_ci_low, rec_ci_high = wilson_score_interval(tp, pos_actual)
            fpr_ci_low, fpr_ci_high = wilson_score_interval(fp, neg_actual)

            # Discrimination metrics (require at least 1 positive and 1 negative)
            if pos_actual > 0 and neg_actual > 0:
                try:
                    roc_auc = float(roc_auc_score(grp_y, grp_prob))
                except Exception:
                    roc_auc = float("nan")
                try:
                    pr_auc = float(average_precision_score(grp_y, grp_prob))
                except Exception:
                    pr_auc = float("nan")
            else:
                roc_auc = float("nan")
                pr_auc = float("nan")

            alerts_fired = tp + fp
            alert_rate_pct = round((alerts_fired / max(1, n_sub)) * 100, 2)

            is_low_sample = n_sub < 100

            records.append({
                "dimension": dim,
                "subgroup": str(group_val),
                "sample_size": n_sub,
                "confidence_flag": "LOW_CONFIDENCE (<100)" if is_low_sample else "STABLE",
                "positives_count": pos_actual,
                "negatives_count": neg_actual,
                "prevalence": round(prevalence, 4),
                "true_positives": tp,
                "false_positives": fp,
                "true_negatives": tn,
                "false_negatives": fn,
                "recall": round(rec, 4),
                "recall_ci_95": f"[{rec_ci_low:.4f}, {rec_ci_high:.4f}]",
                "precision": round(prec, 4),
                "specificity": round(spec, 4),
                "false_positive_rate": round(fpr, 4),
                "fpr_ci_95": f"[{fpr_ci_low:.4f}, {fpr_ci_high:.4f}]",
                "false_negative_rate": round(fnr, 4),
                "f1_score": round(f1, 4),
                "roc_auc": round(roc_auc, 4) if not np.isnan(roc_auc) else None,
                "pr_auc": round(pr_auc, 4) if not np.isnan(pr_auc) else None,
                "alerts_fired": alerts_fired,
                "alert_rate_pct": alert_rate_pct,
            })

    subgroup_df = pd.DataFrame(records)
    return subgroup_df


def compute_threshold_operating_curve(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    thresholds: Optional[list[float]] = None,
) -> list[dict[str, Any]]:
    """
    Evaluate operational workload trade-offs across candidate decision thresholds.
    """
    if thresholds is None:
        thresholds = [
            0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40,
            0.45, 0.46, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90
        ]

    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    total = len(y_true)
    actual_pos = int(np.sum(y_true == 1))
    actual_neg = int(np.sum(y_true == 0))

    curve_rows = []
    for t in sorted(thresholds):
        y_pred = (y_prob >= t).astype(int)
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

        rec = float(recall_score(y_true, y_pred, zero_division=0))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        acc = float((tp + tn) / max(1, total))
        fpr = float(fp / max(1, actual_neg)) if actual_neg > 0 else 0.0

        curve_rows.append({
            "threshold": round(t, 2),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(acc, 4),
            "false_positive_rate": round(fpr, 4),
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn,
            "total_alerts": tp + fp,
            "alert_rate_pct": round(((tp + fp) / max(1, total)) * 100, 2),
        })

    return curve_rows


def extract_deidentified_error_samples(
    error_df: pd.DataFrame,
    n_per_category: int = 10,
) -> pd.DataFrame:
    """
    Extract a de-identified sample of error cases with pseudonymous IDs.
    Excludes student IDs, personal names, and extraneous columns.
    """
    cols_to_keep = [
        "code_module",
        "code_presentation",
        "predicted_probability",
        "actual_target",
        "error_category",
        "margin_from_threshold",
        "num_of_prev_attempts",
        "studied_credits",
        "vle_total_clicks_d30",
        "vle_active_days_d30",
        "vle_days_since_last_click",
        "vle_clicks_last_7d",
        "assessments_submitted_d30",
        "has_early_assessment_submission_d30",
        "highest_education",
        "imd_band",
        "age_band",
    ]

    available_cols = [c for c in cols_to_keep if c in error_df.columns]

    samples = []
    for cat in ["FN", "FP", "TP", "TN"]:
        cat_df = error_df[error_df["error_category"] == cat][available_cols]
        if cat == "FN":
            # Sample both borderline and deep misses
            sub_sample = cat_df.sort_values("predicted_probability", ascending=True).iloc[:n_per_category]
        elif cat == "FP":
            # Sample high-confidence false alarms
            sub_sample = cat_df.sort_values("predicted_probability", ascending=False).iloc[:n_per_category]
        else:
            sub_sample = cat_df.iloc[:n_per_category]

        for idx, (_, row) in enumerate(sub_sample.iterrows()):
            row_dict = row.to_dict()
            row_dict["pseudonymous_id"] = f"DIAG-{cat}-{idx+1:03d}"
            samples.append(row_dict)

    sample_df = pd.DataFrame(samples)
    # Reorder pseudonymous_id to front
    cols = ["pseudonymous_id"] + [c for c in sample_df.columns if c != "pseudonymous_id"]
    return sample_df[cols]
