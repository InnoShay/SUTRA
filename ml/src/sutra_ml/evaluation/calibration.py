"""
Probability calibration assessment engine for SUTRA ML early warning.

Computes reliability tables, Expected Calibration Error (ECE),
Maximum Calibration Error (MCE), and Brier calibration scores.
"""

from typing import Any
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss


def compute_calibration_assessment(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> dict[str, Any]:
    """
    Assess probability calibration on a held-out dataset.

    Returns:
        Dictionary containing Brier score, ECE, MCE, and binned reliability table.
    """
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).astype(float)
    total_n = len(y_true)

    brier = float(brier_score_loss(y_true, y_prob))

    # Compute binned empirical vs predicted probabilities
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="uniform")

    # Manually compute exact bin counts to calculate Expected Calibration Error (ECE)
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_assignments = np.digitize(y_prob, bins) - 1
    # Clip to valid bin index [0, n_bins - 1]
    bin_assignments = np.clip(bin_assignments, 0, n_bins - 1)

    bin_rows = []
    ece = 0.0
    mce = 0.0

    for b in range(n_bins):
        mask = bin_assignments == b
        count_in_bin = int(np.sum(mask))
        if count_in_bin == 0:
            continue

        mean_predicted = float(np.mean(y_prob[mask]))
        actual_observed = float(np.mean(y_true[mask]))
        gap = abs(actual_observed - mean_predicted)

        ece += (count_in_bin / total_n) * gap
        mce = max(mce, gap)

        bin_rows.append({
            "bin_range": f"[{bins[b]:.1f}, {bins[b+1]:.1f})",
            "samples_count": count_in_bin,
            "mean_predicted_prob": round(mean_predicted, 4),
            "observed_positive_rate": round(actual_observed, 4),
            "calibration_gap": round(gap, 4),
        })

    return {
        "brier_score": round(brier, 4),
        "expected_calibration_error_ece": round(ece, 4),
        "maximum_calibration_error_mce": round(mce, 4),
        "reliability_bins": bin_rows,
    }
