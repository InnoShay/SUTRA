"""
Target label construction and validation for SUTRA ML early warning.

Constructs binary targets mapping academic outcomes to At-Risk (1) vs On-Track (0).
Kept strictly decoupled from feature engineering to prevent label leakage.
"""

from typing import Any, Optional
import pandas as pd


DEFAULT_POSITIVE_CLASSES = ["Fail", "Withdrawn"]
DEFAULT_NEGATIVE_CLASSES = ["Pass", "Distinction"]


def build_binary_target(
    cohort_df: pd.DataFrame,
    positive_classes: Optional[list[str]] = None,
    negative_classes: Optional[list[str]] = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Construct binary classification target from final_result.

    Positive Class (1): Fail or Withdrawn (Student experienced an adverse outcome)
    Negative Class (0): Pass or Distinction (Student successfully completed module)

    Returns:
        tuple of (labels_df, label_statistics_dict)
    """
    pos_set = set(positive_classes or DEFAULT_POSITIVE_CLASSES)
    neg_set = set(negative_classes or DEFAULT_NEGATIVE_CLASSES)

    key_cols = ["code_module", "code_presentation", "id_student"]
    for col in key_cols + ["final_result"]:
        if col not in cohort_df.columns:
            raise KeyError(f"Required column '{col}' missing from cohort DataFrame")

    results = cohort_df["final_result"].astype(str)

    # Validate that every class belongs to either pos_set or neg_set
    all_known = pos_set.union(neg_set)
    observed_classes = set(results.unique())
    unknown_classes = observed_classes - all_known
    if unknown_classes:
        raise ValueError(
            f"Unexpected final_result values found in cohort: {unknown_classes}. "
            f"Expected only: {all_known}"
        )

    # Binary assignment
    target_series = results.apply(lambda r: 1 if r in pos_set else 0).astype(int)
    target_name_series = results.apply(
        lambda r: "At_Risk" if r in pos_set else "On_Track"
    )

    labels_df = pd.DataFrame({
        "code_module": cohort_df["code_module"],
        "code_presentation": cohort_df["code_presentation"],
        "id_student": cohort_df["id_student"],
        "target": target_series,
        "target_name": target_name_series,
        "raw_final_result": results,
    })

    total_records = len(labels_df)
    pos_count = int((target_series == 1).sum())
    neg_count = int((target_series == 0).sum())

    stats = {
        "total_cohort_records": total_records,
        "positive_count_at_risk": pos_count,
        "positive_percentage": round((pos_count / max(1, total_records)) * 100, 2),
        "negative_count_on_track": neg_count,
        "negative_percentage": round((neg_count / max(1, total_records)) * 100, 2),
        "class_breakdown": results.value_counts().to_dict(),
        "positive_classes": sorted(list(pos_set)),
        "negative_classes": sorted(list(neg_set)),
    }

    return labels_df, stats
