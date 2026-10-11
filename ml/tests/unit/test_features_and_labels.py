"""
Unit tests for temporal cohort extraction, target building, and feature assembly.
"""

from pathlib import Path
import pandas as pd
import pytest

from sutra_ml.features.snapshots import extract_active_cohort
from sutra_ml.labels.build_labels import build_binary_target
from sutra_ml.features.build_features import (
    aggregate_vle_features,
    aggregate_assessment_features,
    assemble_feature_matrix,
)


def test_extract_active_cohort(sample_data_dir: Path):
    active_df, excluded_df, stats = extract_active_cohort(sample_data_dir, cutoff_day=30)

    # In sample data: 5 students total.
    # Student 1004 unregistered at day 15 (<= 30) -> Excluded
    # Student 1005 unregistered at day 45 (> 30) -> Active
    # Students 1001, 1002, 1003 have NULL unregistration -> Active
    assert stats["total_registrations"] == 5
    assert stats["excluded_records"] == 1
    assert stats["active_records"] == 4

    assert 1004 in excluded_df["id_student"].values
    assert 1004 not in active_df["id_student"].values
    assert 1005 in active_df["id_student"].values


def test_build_binary_target(sample_data_dir: Path):
    active_df, _, _ = extract_active_cohort(sample_data_dir, cutoff_day=30)
    labels_df, stats = build_binary_target(active_df)

    assert len(labels_df) == 4
    # Student 1001: Pass -> 0
    # Student 1002: Distinction -> 0
    # Student 1003: Fail -> 1
    # Student 1005: Withdrawn -> 1
    assert stats["positive_count_at_risk"] == 2
    assert stats["negative_count_on_track"] == 2

    s1001_target = labels_df.loc[labels_df["id_student"] == 1001, "target"].values[0]
    s1003_target = labels_df.loc[labels_df["id_student"] == 1003, "target"].values[0]
    s1005_target = labels_df.loc[labels_df["id_student"] == 1005, "target"].values[0]

    assert s1001_target == 0
    assert s1003_target == 1
    assert s1005_target == 1


def test_build_binary_target_unknown_class():
    bad_df = pd.DataFrame({
        "code_module": ["AAA"],
        "code_presentation": ["2013J"],
        "id_student": [9999],
        "final_result": ["Incomplete"],  # Unknown category
    })
    with pytest.raises(ValueError, match="Unexpected final_result"):
        build_binary_target(bad_df)


def test_assemble_feature_matrix_unengaged_student(sample_data_dir: Path):
    active_df, _, _ = extract_active_cohort(sample_data_dir, cutoff_day=30)
    vle_df = aggregate_vle_features(sample_data_dir, cutoff_day=30)
    asm_df = aggregate_assessment_features(sample_data_dir, cutoff_day=30)

    features = assemble_feature_matrix(
        cohort_df=active_df,
        vle_features_df=vle_df,
        assessment_features_df=asm_df,
        cutoff_day=30,
        unengaged_ceiling=60.0,
    )

    assert len(features) == len(active_df)

    # Student 1005 has no clicks in sample data
    s1005 = features[features["id_student"] == 1005].iloc[0]
    assert s1005["vle_total_clicks_d30"] == 0
    assert s1005["has_vle_activity_d30"] == 0
    assert s1005["vle_days_since_last_click"] == 60.0
    assert s1005["assessments_submitted_d30"] == 0

    # IMD band missingness handled
    s1003 = features[features["id_student"] == 1003].iloc[0]
    assert s1003["imd_band"] == "Unknown"

    # Leakage check: raw unregistration and final_result not in columns
    assert "date_unregistration" not in features.columns
    assert "final_result" not in features.columns
