"""
Temporal snapshot extraction and active-cohort filtering.

Extracts students who remain actively enrolled past the prediction cutoff date.
Excludes students who unregistered on or before the cutoff date to eliminate
survivor bias and trivial retrodiction.
"""

from pathlib import Path
from typing import Any

import pandas as pd

from sutra_ml.data.loaders import load_csv


def extract_active_cohort(
    raw_dir: Path,
    cutoff_day: int = 30,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    """
    Extract the active student cohort as of cutoff_day.

    Eligibility Rule:
        Active: date_unregistration IS NULL or date_unregistration > cutoff_day
        Excluded: date_unregistration <= cutoff_day

    Returns:
        tuple of (active_cohort_df, excluded_cohort_df, cohort_statistics_dict)
    """
    reg_path = raw_dir / "studentRegistration.csv"
    info_path = raw_dir / "studentInfo.csv"

    reg_df = load_csv(reg_path)
    info_df = load_csv(info_path)

    key_cols = ["code_module", "code_presentation", "id_student"]

    # Verify key integrity before merging
    if reg_df.duplicated(subset=key_cols).sum() > 0:
        raise ValueError("Duplicate keys detected in studentRegistration.csv")
    if info_df.duplicated(subset=key_cols).sum() > 0:
        raise ValueError("Duplicate keys detected in studentInfo.csv")

    merged = pd.merge(info_df, reg_df, on=key_cols, how="inner")
    if len(merged) != len(info_df):
        raise ValueError(
            f"Merge row count mismatch: {len(merged)} vs {len(info_df)} in studentInfo"
        )

    # Active vs Excluded partitioning
    # Note: date_unregistration is numeric relative offset (e.g. -15, 12, 100)
    has_unregistered = merged["date_unregistration"].notnull()
    is_early_withdrawal = has_unregistered & (merged["date_unregistration"] <= cutoff_day)

    excluded_df = merged[is_early_withdrawal].copy()
    active_df = merged[~is_early_withdrawal].copy()

    total_records = len(merged)
    num_excluded = len(excluded_df)
    num_active = len(active_df)

    stats = {
        "cutoff_day": cutoff_day,
        "total_registrations": total_records,
        "excluded_records": num_excluded,
        "excluded_percentage": round((num_excluded / max(1, total_records)) * 100, 2),
        "active_records": num_active,
        "active_percentage": round((num_active / max(1, total_records)) * 100, 2),
        "unique_students_active": int(active_df["id_student"].nunique()),
        "excluded_outcomes": excluded_df["final_result"].value_counts().to_dict(),
        "active_outcomes": active_df["final_result"].value_counts().to_dict(),
    }

    return active_df, excluded_df, stats
