"""
Automated unit tests for Phase Six diagnostic evaluation and error analysis.
"""

import numpy as np
import pandas as pd
import pytest

from sutra_ml.evaluation.diagnostics import (
    analyze_error_subsets,
    categorize_row_level_errors,
    compute_comprehensive_subgroup_diagnostics,
    compute_threshold_operating_curve,
    extract_deidentified_error_samples,
    wilson_score_interval,
)


def test_wilson_score_interval():
    """Verify Wilson confidence interval computation and boundary edge cases."""
    # Standard case
    low, high = wilson_score_interval(successes=70, trials=100, confidence=0.95)
    assert 0.0 <= low < 0.70 < high <= 1.0

    # Zero successes
    low_0, high_0 = wilson_score_interval(successes=0, trials=50)
    assert low_0 == 0.0
    assert 0.0 < high_0 < 0.10

    # 100% successes
    low_1, high_1 = wilson_score_interval(successes=50, trials=50)
    assert 0.90 < low_1 < 1.0
    assert high_1 == 1.0

    # Zero trials edge case
    assert wilson_score_interval(0, 0) == (0.0, 0.0)


def test_categorize_row_level_errors_sums_correctly():
    """Verify that row-level error categories partition exactly into TP, FP, TN, FN."""
    y_true = np.array([1, 1, 0, 0, 1, 0])
    y_prob = np.array([0.8, 0.3, 0.7, 0.2, 0.46, 0.45])
    df = pd.DataFrame({"feat1": [10, 20, 30, 40, 50, 60]})

    res = categorize_row_level_errors(df, y_true, y_prob, threshold=0.46)

    assert len(res) == 6
    counts = res["error_category"].value_counts().to_dict()

    # Breakdown at t=0.46:
    # 0: Actual 1, Prob 0.8  -> TP
    # 1: Actual 1, Prob 0.3  -> FN
    # 2: Actual 0, Prob 0.7  -> FP
    # 3: Actual 0, Prob 0.2  -> TN
    # 4: Actual 1, Prob 0.46 -> TP
    # 5: Actual 0, Prob 0.45 -> TN
    assert counts.get("TP", 0) == 2
    assert counts.get("FN", 0) == 1
    assert counts.get("FP", 0) == 1
    assert counts.get("TN", 0) == 2
    assert sum(counts.values()) == 6


def test_analyze_error_subsets_metrics():
    """Verify statistical aggregation across error subsets."""
    y_true = np.array([1, 1, 0, 0])
    y_prob = np.array([0.9, 0.3, 0.8, 0.1])
    df = pd.DataFrame({
        "vle_total_clicks_d30": [100.0, 20.0, 80.0, 10.0],
    })

    err_df = categorize_row_level_errors(df, y_true, y_prob, threshold=0.46)
    stats = analyze_error_subsets(err_df, ["vle_total_clicks_d30"])

    assert stats["total_records"] == 4
    assert stats["counts"]["TP"] == 1
    assert stats["counts"]["FN"] == 1
    assert stats["counts"]["FP"] == 1
    assert stats["counts"]["TN"] == 1

    # Probability summary check
    assert stats["categories"]["TP"]["probability_distribution"]["mean"] == 0.9
    assert stats["categories"]["FN"]["probability_distribution"]["mean"] == 0.3


def test_subgroup_diagnostics_confidence_flags():
    """Verify subgroup diagnostics correctly flags small sample sizes."""
    data = {
        "code_module": ["AAA"] * 50 + ["BBB"] * 150,
        "y_true": [1] * 25 + [0] * 25 + [1] * 75 + [0] * 75,
        "y_prob": [0.6] * 100 + [0.3] * 100,
    }
    df = pd.DataFrame(data)

    res = compute_comprehensive_subgroup_diagnostics(
        df,
        y_true=df["y_true"].to_numpy(),
        y_prob=df["y_prob"].to_numpy(),
        threshold=0.46,
        subgroup_cols=["code_module"],
    )

    aaa_row = res[res["subgroup"] == "AAA"].iloc[0]
    bbb_row = res[res["subgroup"] == "BBB"].iloc[0]

    assert aaa_row["sample_size"] == 50
    assert "LOW_CONFIDENCE" in aaa_row["confidence_flag"]

    assert bbb_row["sample_size"] == 150
    assert bbb_row["confidence_flag"] == "STABLE"


def test_threshold_operating_curve_monotonicity():
    """Verify that higher thresholds decrease or maintain recall and increase precision trend."""
    y_true = np.array([0, 0, 0, 1, 1, 1])
    y_prob = np.array([0.1, 0.2, 0.4, 0.6, 0.8, 0.9])

    curve = compute_threshold_operating_curve(y_true, y_prob, thresholds=[0.20, 0.50, 0.85])

    rec_02 = curve[0]["recall"]
    rec_05 = curve[1]["recall"]
    rec_85 = curve[2]["recall"]

    assert rec_02 >= rec_05 >= rec_85


def test_deidentified_error_sample_privacy():
    """Ensure de-identified export contains pseudonymous IDs and no raw personal data."""
    df = pd.DataFrame({
        "id_student": [12345, 67890],
        "code_module": ["BBB", "FFF"],
        "code_presentation": ["2014J", "2014J"],
        "predicted_probability": [0.25, 0.85],
        "actual_target": [1, 0],
        "error_category": ["FN", "FP"],
        "margin_from_threshold": [-0.21, 0.39],
        "num_of_prev_attempts": [0, 1],
        "studied_credits": [60, 120],
        "vle_total_clicks_d30": [50.0, 10.0],
        "vle_active_days_d30": [5.0, 2.0],
        "vle_days_since_last_click": [12.0, 25.0],
        "vle_clicks_last_7d": [0.0, 0.0],
        "assessments_submitted_d30": [1.0, 0.0],
        "has_early_assessment_submission_d30": [1, 0],
        "highest_education": ["A Level", "Lower Than A Level"],
        "imd_band": ["40-50%", "0-10%"],
        "age_band": ["0-35", "35-55"],
    })

    samples = extract_deidentified_error_samples(df, n_per_category=5)

    assert "id_student" not in samples.columns
    assert "pseudonymous_id" in samples.columns
    assert samples["pseudonymous_id"].iloc[0].startswith("DIAG-")
