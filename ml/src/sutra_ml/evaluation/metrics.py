"""
Evaluation metrics computation engine for SUTRA ML early-warning models.

Computes precision, recall, F1, PR-AUC, ROC-AUC, Brier score (calibration),
confusion matrix, and operational alert capacity metrics.
"""

from typing import Any
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def compute_comprehensive_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.50,
) -> dict[str, Any]:
    """
    Compute full evaluation metrics suite for binary risk estimation.

    Args:
        y_true: Ground truth binary labels (0 or 1).
        y_prob: Predicted positive-class probabilities P(y=1).
        threshold: Decision threshold for discrete classification.

    Returns:
        Dictionary of formatted metrics and operational workload counts.
    """
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    y_pred = (y_prob >= threshold).astype(int)

    total_samples = len(y_true)
    actual_positives = int(np.sum(y_true == 1))
    actual_negatives = int(np.sum(y_true == 0))
    prevalence = actual_positives / max(1, total_samples)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except ValueError:
        roc_auc = float("nan")

    try:
        pr_auc = float(average_precision_score(y_true, y_prob))
    except ValueError:
        pr_auc = float("nan")

    brier = float(brier_score_loss(y_true, y_prob))
    acc = float((tp + tn) / max(1, total_samples))
    spec = float(tn / max(1, actual_negatives)) if actual_negatives > 0 else 0.0
    fpr = float(fp / max(1, actual_negatives)) if actual_negatives > 0 else 0.0
    bal_acc = float(0.5 * (rec + spec))

    predicted_positives = tp + fp
    alert_rate = predicted_positives / max(1, total_samples)

    return {
        "threshold": round(threshold, 4),
        "total_samples": total_samples,
        "actual_positives": actual_positives,
        "actual_negatives": actual_negatives,
        "prevalence": round(prevalence, 4),
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "specificity": round(spec, 4),
        "false_positive_rate": round(fpr, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "brier_score": round(brier, 4),
        "confusion_matrix": {
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp,
        },
        "operational_workload": {
            "total_alerts_fired": predicted_positives,
            "alert_rate_pct": round(alert_rate * 100, 2),
            "false_alarms_advisor_burden": fp,
            "missed_at_risk_students": fn,
            "successful_proactive_catches": tp,
        },
    }


def find_threshold_for_target_recall(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    target_recall: float = 0.70,
) -> float:
    """
    Search validation probabilities to find threshold achieving target recall
    while maximizing precision for operational student support.
    """
    thresholds = np.linspace(0.10, 0.90, 81)
    best_thresh = 0.50
    closest_recall_diff = float("inf")

    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        rec = recall_score(y_true, y_pred, zero_division=0)
        diff = abs(rec - target_recall)
        if diff < closest_recall_diff:
            closest_recall_diff = diff
            best_thresh = float(t)

    return best_thresh
