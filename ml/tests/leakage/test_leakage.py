"""
Anti-leakage and temporal boundary enforcement tests for SUTRA ML.

Verifies:
1. Strict filtering at cutoff boundary: Day 30 events included, Day 31+ excluded.
2. No post-cutoff VLE click contributes to any feature.
3. No post-cutoff assessment submission contributes to submission counts.
4. Assessment scores are strictly excluded from the predictor matrix.
5. Pre-course orientation activity (negative dates) is preserved and accounted for.
6. Target outcomes and post-cutoff unregistrations do not appear in the feature matrix.
"""

from pathlib import Path
import pandas as pd
import pytest

from sutra_ml.features.build_features import (
    aggregate_vle_features,
    aggregate_assessment_features,
    assemble_feature_matrix,
)
from sutra_ml.features.snapshots import extract_active_cohort


def test_vle_temporal_boundary_and_leakage(sample_data_dir: Path):
    """
    In sample studentVle.csv:
    Student 1001 has:
      date = -10: 4 clicks (pre-course)
      date = 5:  12 clicks
      date = 30:  8 clicks (boundary test: exactly at cutoff)
      date = 35: 100 clicks (leakage test: post-cutoff)
    Total clicks up to Day 30 MUST BE: 4 + 12 + 8 = 24.
    The 100 clicks at Day 35 MUST BE DROPPED.
    """
    vle_features = aggregate_vle_features(sample_data_dir, cutoff_day=30)
    s1001 = vle_features[vle_features["id_student"] == 1001].iloc[0]

    # Total clicks strictly <= 30
    assert s1001["vle_total_clicks_d30"] == 24
    # Precourse clicks (date < 0)
    assert s1001["vle_clicks_precourse"] == 4
    # Post-start clicks up to Day 30 (0 <= date <= 30) -> 12 + 8 = 20
    assert s1001["vle_clicks_poststart_d30"] == 20
    # Day 30 boundary was included: max date is 30, so days since last click = 30 - 30 = 0.0
    assert s1001["vle_days_since_last_click"] == 0.0
    # Active dates <= 30: -10, 5, 30 -> 3 active days
    assert s1001["vle_active_days_d30"] == 3


def test_assessment_temporal_boundary_and_score_exclusion(sample_data_dir: Path):
    """
    In sample studentAssessment.csv:
    Student 1001 has:
      id_assessment 101: date_submitted = 18, score = 85.0
      id_assessment 102: date_submitted = 40 (post-cutoff), score = 78.0
    At cutoff Day 30:
      assessments_submitted_d30 MUST BE 1.
      The Day 40 submission MUST BE EXCLUDED.
      No score columns must exist.
    """
    asm_features = aggregate_assessment_features(sample_data_dir, cutoff_day=30)
    s1001 = asm_features[asm_features["id_student"] == 1001].iloc[0]

    assert s1001["assessments_submitted_d30"] == 1
    assert "score" not in asm_features.columns
    assert "early_assessment_score" not in asm_features.columns


def test_no_target_or_unregistration_in_feature_matrix(sample_data_dir: Path):
    """
    Ensure the assembled feature matrix does not contain final_result, target,
    or date_unregistration.
    """
    active_df, _, _ = extract_active_cohort(sample_data_dir, cutoff_day=30)
    vle_df = aggregate_vle_features(sample_data_dir, cutoff_day=30)
    asm_df = aggregate_assessment_features(sample_data_dir, cutoff_day=30)

    feature_matrix = assemble_feature_matrix(
        cohort_df=active_df,
        vle_features_df=vle_df,
        assessment_features_df=asm_df,
        cutoff_day=30,
    )

    forbidden_columns = [
        "target",
        "final_result",
        "raw_final_result",
        "target_name",
        "date_unregistration",
    ]
    for col in forbidden_columns:
        assert col not in feature_matrix.columns, f"Leakage: Forbidden column '{col}' in feature matrix!"


def test_zero_row_multiplication(sample_data_dir: Path):
    """
    Verify 1-to-1 relationship between active cohort and assembled feature rows.
    """
    active_df, _, _ = extract_active_cohort(sample_data_dir, cutoff_day=30)
    vle_df = aggregate_vle_features(sample_data_dir, cutoff_day=30)
    asm_df = aggregate_assessment_features(sample_data_dir, cutoff_day=30)

    feature_matrix = assemble_feature_matrix(
        cohort_df=active_df,
        vle_features_df=vle_df,
        assessment_features_df=asm_df,
        cutoff_day=30,
    )

    assert len(feature_matrix) == len(active_df)
    key_cols = ["code_module", "code_presentation", "id_student"]
    assert feature_matrix.duplicated(subset=key_cols).sum() == 0
