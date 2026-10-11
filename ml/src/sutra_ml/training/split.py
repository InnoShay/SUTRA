"""
Temporal and group-aware data splitting utilities for SUTRA ML.

Ensures strict student-grouped cross-validation to prevent identical students
from appearing across both train and validation folds.
"""

from typing import Any, Generator
import pandas as pd
from sklearn.model_selection import GroupKFold


def make_temporal_split(
    df: pd.DataFrame,
    train_presentations: list[str],
    test_presentation: str,
    ensure_disjoint_students: bool = False,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    """
    Split dataset temporally by course presentation.

    Args:
        df: Processed feature dataset.
        train_presentations: List of presentation codes for training (e.g. ['2013B', '2013J', '2014B']).
        test_presentation: Presentation code for holdout test (e.g. '2014J').
        ensure_disjoint_students: If True, removes students in test_presentation who previously
            appeared in train_presentations, guaranteeing 100% student-level independence.

    Returns:
        tuple of (train_df, test_df, split_statistics)
    """
    train_mask = df["code_presentation"].isin(train_presentations)
    test_mask = df["code_presentation"] == test_presentation

    train_df = df[train_mask].copy().reset_index(drop=True)
    test_raw_df = df[test_mask].copy().reset_index(drop=True)

    train_students = set(train_df["id_student"].unique())
    test_students_all = set(test_raw_df["id_student"].unique())
    overlapping_students = train_students.intersection(test_students_all)

    if ensure_disjoint_students:
        test_df = test_raw_df[~test_raw_df["id_student"].isin(overlapping_students)].copy().reset_index(drop=True)
    else:
        test_df = test_raw_df

    stats = {
        "train_presentations": train_presentations,
        "test_presentation": test_presentation,
        "train_rows": len(train_df),
        "train_unique_students": len(train_students),
        "train_at_risk_count": int((train_df["target"] == 1).sum()),
        "train_at_risk_pct": round(((train_df["target"] == 1).sum() / len(train_df)) * 100, 2),
        "test_rows": len(test_df),
        "test_unique_students": int(test_df["id_student"].nunique()),
        "test_at_risk_count": int((test_df["target"] == 1).sum()),
        "test_at_risk_pct": round(((test_df["target"] == 1).sum() / len(test_df)) * 100, 2),
        "overlapping_students_count": len(overlapping_students),
        "overlapping_students_in_test_pct": round((len(overlapping_students) / max(1, len(test_students_all))) * 100, 2),
        "disjoint_filtered": ensure_disjoint_students,
    }

    return train_df, test_df, stats


def get_student_grouped_cv(
    train_df: pd.DataFrame,
    n_splits: int = 5,
    group_col: str = "id_student",
) -> list[tuple[list[int], list[int]]]:
    """
    Generate n_splits train/val index splits ensuring that no student
    appears in both the train and validation sets of any fold.
    """
    gkf = GroupKFold(n_splits=n_splits)
    groups = train_df[group_col]

    splits = []
    for train_idx, val_idx in gkf.split(train_df, groups=groups):
        train_s = set(train_df.iloc[train_idx][group_col])
        val_s = set(train_df.iloc[val_idx][group_col])
        overlap = train_s.intersection(val_s)
        if overlap:
            raise ValueError(f"Cross-fold student leakage detected! {len(overlap)} students in both train and val.")
        splits.append((list(train_idx), list(val_idx)))

    return splits
