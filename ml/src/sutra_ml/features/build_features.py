"""
Feature engineering engine for SUTRA ML Day-30 early warning.

Builds strictly time-bounded features observable on or before Day 30.
Excludes assessment scores (due to unverified grading latency) and
future unregistration/outcome data.
"""

from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from sutra_ml.data.loaders import iter_csv_chunks, load_csv


def aggregate_vle_features(
    raw_dir: Path,
    cutoff_day: int = 30,
    recent_window_days: int = 7,
    chunksize: int = 200_000,
    unengaged_ceiling: float = 60.0,
) -> pd.DataFrame:
    """
    Aggregate Virtual Learning Environment interaction logs strictly for date <= cutoff_day.

    Temporal boundaries:
        - All logs: date <= cutoff_day
        - Pre-course activity: date < 0
        - Post-start activity: 0 <= date <= cutoff_day
        - Recent activity: (cutoff_day - recent_window_days) < date <= cutoff_day
        - Days since last click: cutoff_day - max(date)
    """
    vle_metadata_path = raw_dir / "vle.csv"
    student_vle_path = raw_dir / "studentVle.csv"

    # Map id_site -> activity_type
    vle_df = load_csv(vle_metadata_path, usecols=["id_site", "activity_type"])
    site_activity_map = dict(zip(vle_df["id_site"], vle_df["activity_type"]))

    recent_threshold = cutoff_day - recent_window_days

    # Aggregation dictionary keyed by (code_module, code_presentation, id_student)
    # Storing: [total_clicks, precourse_clicks, poststart_clicks, recent_clicks,
    #           forum_clicks, content_clicks, quiz_clicks, home_clicks, other_clicks,
    #           max_date, active_dates_set]
    agg_state = defaultdict(lambda: {
        "total_clicks": 0,
        "precourse_clicks": 0,
        "poststart_clicks": 0,
        "recent_clicks": 0,
        "forumng_clicks": 0,
        "oucontent_clicks": 0,
        "quiz_clicks": 0,
        "homepage_clicks": 0,
        "other_clicks": 0,
        "max_date": -999,
        "active_dates": set(),
    })

    for chunk in iter_csv_chunks(student_vle_path, chunksize=chunksize):
        # HARD TEMPORAL FILTER: Exclude any interaction occurring after cutoff
        filtered = chunk[chunk["date"] <= cutoff_day]
        if filtered.empty:
            continue

        for row in filtered.itertuples(index=False):
            key = (row.code_module, row.code_presentation, row.id_student)
            st = agg_state[key]
            clicks = int(row.sum_click)
            date = int(row.date)

            st["total_clicks"] += clicks
            st["active_dates"].add(date)

            if date > st["max_date"]:
                st["max_date"] = date

            if date < 0:
                st["precourse_clicks"] += clicks
            else:
                st["poststart_clicks"] += clicks

            if date > recent_threshold:
                st["recent_clicks"] += clicks

            act_type = site_activity_map.get(row.id_site, "other")
            if act_type == "forumng":
                st["forumng_clicks"] += clicks
            elif act_type == "oucontent":
                st["oucontent_clicks"] += clicks
            elif act_type == "quiz":
                st["quiz_clicks"] += clicks
            elif act_type == "homepage":
                st["homepage_clicks"] += clicks
            else:
                st["other_clicks"] += clicks

    # Convert aggregated dictionary into DataFrame
    records = []
    for (mod, pres, sid), st in agg_state.items():
        days_since_click = float(cutoff_day - st["max_date"]) if st["max_date"] != -999 else unengaged_ceiling
        records.append({
            "code_module": mod,
            "code_presentation": pres,
            "id_student": sid,
            "vle_total_clicks_d30": st["total_clicks"],
            "vle_active_days_d30": len(st["active_dates"]),
            "vle_clicks_precourse": st["precourse_clicks"],
            "vle_clicks_poststart_d30": st["poststart_clicks"],
            "vle_clicks_last_7d": st["recent_clicks"],
            "vle_days_since_last_click": days_since_click,
            "vle_clicks_forumng_d30": st["forumng_clicks"],
            "vle_clicks_oucontent_d30": st["oucontent_clicks"],
            "vle_clicks_quiz_d30": st["quiz_clicks"],
            "vle_clicks_homepage_d30": st["homepage_clicks"],
            "vle_clicks_other_d30": st["other_clicks"],
            "has_vle_activity_d30": 1,
        })

    vle_features_df = pd.DataFrame(records)
    if vle_features_df.empty:
        # Return empty structured dataframe
        vle_features_df = pd.DataFrame(columns=[
            "code_module", "code_presentation", "id_student",
            "vle_total_clicks_d30", "vle_active_days_d30", "vle_clicks_precourse",
            "vle_clicks_poststart_d30", "vle_clicks_last_7d", "vle_days_since_last_click",
            "vle_clicks_forumng_d30", "vle_clicks_oucontent_d30", "vle_clicks_quiz_d30",
            "vle_clicks_homepage_d30", "vle_clicks_other_d30", "has_vle_activity_d30",
        ])
    return vle_features_df


def aggregate_assessment_features(
    raw_dir: Path,
    cutoff_day: int = 30,
) -> pd.DataFrame:
    """
    Aggregate assessment submissions strictly submitted on or before cutoff_day.
    SCORES ARE EXCLUDED due to unverified grading turnaround latency.
    """
    sa_path = raw_dir / "studentAssessment.csv"
    asm_path = raw_dir / "assessments.csv"

    sa_df = load_csv(sa_path)
    asm_df = load_csv(asm_path)

    # Join to obtain module and presentation context
    merged = pd.merge(
        sa_df[["id_assessment", "id_student", "date_submitted", "is_banked"]],
        asm_df[["id_assessment", "code_module", "code_presentation", "assessment_type"]],
        on="id_assessment",
        how="inner",
    )

    # HARD TEMPORAL FILTER: only submissions on or before cutoff_day
    early_subs = merged[merged["date_submitted"] <= cutoff_day].copy()

    if early_subs.empty:
        return pd.DataFrame(columns=[
            "code_module", "code_presentation", "id_student",
            "assessments_submitted_d30", "assessment_banked_d30",
            "has_early_assessment_submission_d30",
        ])

    grouped = early_subs.groupby(
        ["code_module", "code_presentation", "id_student"], as_index=False
    ).agg(
        assessments_submitted_d30=("id_assessment", "count"),
        assessment_banked_d30=("is_banked", "sum"),
    )
    grouped["has_early_assessment_submission_d30"] = 1
    return grouped


def assemble_feature_matrix(
    cohort_df: pd.DataFrame,
    vle_features_df: pd.DataFrame,
    assessment_features_df: pd.DataFrame,
    cutoff_day: int = 30,
    unengaged_ceiling: float = 60.0,
) -> pd.DataFrame:
    """
    Assemble the final Day-30 predictor matrix by joining active cohort
    demographics with pre-aggregated VLE and assessment features.

    Ensures:
        1. Exactly 1 row per active student-course.
        2. Imputes zero activity with explicit indicators.
        3. Excludes target outcome (final_result) and unregistration dates from predictors.
    """
    key_cols = ["code_module", "code_presentation", "id_student"]

    # Select demographic predictors from cohort
    demographic_cols = [
        "num_of_prev_attempts",
        "studied_credits",
        "gender",
        "region",
        "highest_education",
        "imd_band",
        "age_band",
        "disability",
    ]

    base = cohort_df[key_cols + demographic_cols + ["date_registration"]].copy()

    # Join VLE features
    merged = pd.merge(base, vle_features_df, on=key_cols, how="left")

    # Fill unengaged VLE students
    vle_click_cols = [
        "vle_total_clicks_d30",
        "vle_active_days_d30",
        "vle_clicks_precourse",
        "vle_clicks_poststart_d30",
        "vle_clicks_last_7d",
        "vle_clicks_forumng_d30",
        "vle_clicks_oucontent_d30",
        "vle_clicks_quiz_d30",
        "vle_clicks_homepage_d30",
        "vle_clicks_other_d30",
    ]
    for c in vle_click_cols:
        merged[c] = merged[c].fillna(0).astype(int)

    merged["has_vle_activity_d30"] = merged["has_vle_activity_d30"].fillna(0).astype(int)
    merged["vle_days_since_last_click"] = (
        merged["vle_days_since_last_click"].fillna(unengaged_ceiling).astype(float)
    )

    # Join Assessment features
    merged = pd.merge(merged, assessment_features_df, on=key_cols, how="left")
    merged["assessments_submitted_d30"] = (
        merged["assessments_submitted_d30"].fillna(0).astype(int)
    )
    merged["assessment_banked_d30"] = (
        merged["assessment_banked_d30"].fillna(0).astype(int)
    )
    merged["has_early_assessment_submission_d30"] = (
        merged["has_early_assessment_submission_d30"].fillna(0).astype(int)
    )

    # Registration timing feature
    reg_clean = pd.to_numeric(merged["date_registration"], errors="coerce")
    median_reg = float(reg_clean.median()) if not reg_clean.dropna().empty else -50.0

    merged["has_missing_registration_date"] = merged["date_registration"].isnull().astype(int)
    merged["days_registered_before_start"] = reg_clean.fillna(median_reg).astype(float)
    merged.drop(columns=["date_registration"], inplace=True)

    # Impute missing categorical IMD band with explicit 'Unknown' category
    merged["imd_band"] = merged["imd_band"].fillna("Unknown").astype(str)

    # Integrity check: row count must exactly equal active cohort
    if len(merged) != len(cohort_df):
        raise ValueError(
            f"Row count explosion detected! Merged rows: {len(merged)}, Cohort rows: {len(cohort_df)}"
        )

    return merged
