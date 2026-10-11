"""
Integration test verifying end-to-end Day-30 feature preparation on sample fixtures.
"""

from pathlib import Path
import pandas as pd

from sutra_ml.features.snapshots import extract_active_cohort
from sutra_ml.labels.build_labels import build_binary_target
from sutra_ml.features.build_features import (
    aggregate_vle_features,
    aggregate_assessment_features,
    assemble_feature_matrix,
)


def test_end_to_end_preparation_pipeline(sample_data_dir: Path):
    # 1. Extract cohort
    active_cohort, excluded_cohort, cohort_stats = extract_active_cohort(
        sample_data_dir, cutoff_day=30
    )
    assert len(active_cohort) == 4
    assert len(excluded_cohort) == 1

    # 2. Build target
    labels_df, label_stats = build_binary_target(active_cohort)
    assert len(labels_df) == 4
    assert label_stats["positive_count_at_risk"] == 2
    assert label_stats["negative_count_on_track"] == 2

    # 3. Aggregate features
    vle_features = aggregate_vle_features(sample_data_dir, cutoff_day=30)
    asm_features = aggregate_assessment_features(sample_data_dir, cutoff_day=30)

    # 4. Assemble matrix
    features_df = assemble_feature_matrix(
        cohort_df=active_cohort,
        vle_features_df=vle_features,
        assessment_features_df=asm_features,
        cutoff_day=30,
    )
    assert len(features_df) == 4

    # 5. Combine features and labels
    key_cols = ["code_module", "code_presentation", "id_student"]
    final_df = pd.merge(features_df, labels_df[key_cols + ["target"]], on=key_cols)
    assert len(final_df) == 4
    assert "target" in final_df.columns
    assert "date_unregistration" not in final_df.columns
    assert "final_result" not in final_df.columns
