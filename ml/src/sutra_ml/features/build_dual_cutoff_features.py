"""
Dual-cutoff feature engineering pipeline for SUTRA ML Phase Twenty-Two.

Builds separate, strictly time-bounded feature datasets for Day 30 and Day 60.
Enforces non-negotiable temporal constraints:
1. Assessment scores are strictly EXCLUDED because OULAD records date_submitted
   but records no grade return / mark publication timestamp.
2. Future unregistration dates, post-cutoff VLE interactions, and final course outcomes
   are strictly excluded from predictors.
3. Pre-cutoff withdrawals (withdrawn on or before cutoff) are excluded from the active cohort
   to prevent retrodiction and survivor bias.
"""

from collections import defaultdict
from pathlib import Path
from typing import Any, Optional
import numpy as np
import pandas as pd

from sutra_ml.data.loaders import iter_csv_chunks, load_csv
from sutra_ml.features.snapshots import extract_active_cohort
from sutra_ml.labels.build_labels import build_binary_target


def aggregate_vle_cutoff(
    raw_dir: Path,
    cutoff_day: int,
    chunksize: int = 500_000,
) -> pd.DataFrame:
    """
    Aggregate Virtual Learning Environment interaction logs strictly for date <= cutoff_day.
    """
    vle_metadata_path = raw_dir / "vle.csv"
    student_vle_path = raw_dir / "studentVle.csv"

    vle_df = load_csv(vle_metadata_path, usecols=["id_site", "activity_type"])
    site_activity_map = dict(zip(vle_df["id_site"], vle_df["activity_type"]))

    recent_threshold = cutoff_day - 7
    unengaged_ceiling = 60.0 if cutoff_day == 30 else 90.0

    agg_state = defaultdict(lambda: {
        "total_clicks": 0,
        "precourse_clicks": 0,
        "poststart_clicks": 0,
        "month1_clicks": 0,
        "month2_clicks": 0,
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
        # Strict point-in-time filter
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
                if date <= 30:
                    st["month1_clicks"] += clicks
                elif date <= 60:
                    st["month2_clicks"] += clicks

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

    records = []
    for (mod, pres, sid), st in agg_state.items():
        days_since_click = (
            float(cutoff_day - st["max_date"]) if st["max_date"] != -999 else unengaged_ceiling
        )
        rec = {
            "code_module": mod,
            "code_presentation": pres,
            "id_student": sid,
            "vle_total_clicks": st["total_clicks"],
            "vle_active_days": len(st["active_dates"]),
            "vle_clicks_precourse": st["precourse_clicks"],
            "vle_clicks_poststart": st["poststart_clicks"],
            "vle_clicks_last_7d": st["recent_clicks"],
            "vle_days_since_last_click": days_since_click,
            "vle_clicks_forumng": st["forumng_clicks"],
            "vle_clicks_oucontent": st["oucontent_clicks"],
            "vle_clicks_quiz": st["quiz_clicks"],
            "vle_clicks_homepage": st["homepage_clicks"],
            "vle_clicks_other": st["other_clicks"],
            "has_vle_activity": 1,
        }
        if cutoff_day == 60:
            rec["vle_clicks_month1"] = st["month1_clicks"]
            rec["vle_clicks_month2"] = st["month2_clicks"]
            rec["vle_trend_clicks"] = st["month2_clicks"] - st["month1_clicks"]

        records.append(rec)

    return pd.DataFrame(records)


def aggregate_assessment_cutoff(
    raw_dir: Path,
    cutoff_day: int,
) -> pd.DataFrame:
    """
    Aggregate assessment submissions strictly submitted on or before cutoff_day.
    
    CRITICAL INVARIANT: ASSESSMENT MARKS/SCORES ARE EXCLUDED.
    OULAD records date_submitted, but records NO grade return / publication timestamp.
    Using marks would assume instantaneous feedback turnaround and leak future evaluation.
    Only submission volume, timing relative to scheduled due date, and missed deadlines are used.
    """
    sa_path = raw_dir / "studentAssessment.csv"
    asm_path = raw_dir / "assessments.csv"

    sa_df = load_csv(sa_path)
    asm_df = load_csv(asm_path)
    asm_df["due_day"] = pd.to_numeric(asm_df["date"], errors="coerce")

    # Inner join to associate submissions with module presentation and schedule
    merged = pd.merge(
        sa_df[["id_assessment", "id_student", "date_submitted", "is_banked"]],
        asm_df[["id_assessment", "code_module", "code_presentation", "assessment_type", "due_day"]],
        on="id_assessment",
        how="inner",
    )

    # HARD TEMPORAL FILTER: only submissions on or before cutoff_day
    early_subs = merged[merged["date_submitted"] <= cutoff_day].copy()

    if early_subs.empty:
        cols = [
            "code_module", "code_presentation", "id_student",
            "assessments_submitted", "assessment_banked",
            "has_assessment_submission", "late_submissions", "on_time_submissions",
        ]
        if cutoff_day == 60:
            cols.extend(["assessments_submitted_month2", "missed_assessments"])
        return pd.DataFrame(columns=cols)

    early_subs["is_late"] = (
        (early_subs["due_day"].notnull()) & (early_subs["date_submitted"] > early_subs["due_day"])
    ).astype(int)
    early_subs["is_on_time"] = (
        (early_subs["due_day"].notnull()) & (early_subs["date_submitted"] <= early_subs["due_day"])
    ).astype(int)

    agg_dict = {
        "assessments_submitted": ("id_assessment", "count"),
        "assessment_banked": ("is_banked", "sum"),
        "late_submissions": ("is_late", "sum"),
        "on_time_submissions": ("is_on_time", "sum"),
    }
    if cutoff_day == 60:
        early_subs["is_month2"] = (early_subs["date_submitted"] > 30).astype(int)
        agg_dict["assessments_submitted_month2"] = ("is_month2", "sum")

    grouped = early_subs.groupby(
        ["code_module", "code_presentation", "id_student"], as_index=False
    ).agg(**agg_dict)
    grouped["has_assessment_submission"] = 1

    if cutoff_day == 60:
        # Compute missed assessments: scheduled assessments due <= 60 minus submitted
        scheduled_d60 = (
            asm_df[(asm_df["due_day"] <= 60) & (asm_df["assessment_type"].isin(["TMA", "CMA"]))]
            .groupby(["code_module", "code_presentation"])["id_assessment"]
            .count()
            .reset_index()
            .rename(columns={"id_assessment": "scheduled_assessments_d60"})
        )
        grouped = pd.merge(grouped, scheduled_d60, on=["code_module", "code_presentation"], how="left")
        grouped["scheduled_assessments_d60"] = grouped["scheduled_assessments_d60"].fillna(0)
        grouped["missed_assessments"] = np.maximum(
            0, grouped["scheduled_assessments_d60"] - grouped["assessments_submitted"]
        ).astype(int)
        grouped.drop(columns=["scheduled_assessments_d60"], inplace=True)

    return grouped


def assemble_dual_cutoff_dataset(
    raw_dir: Path,
    cutoff_day: int,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Extract active cohort, aggregate observable VLE and assessment features,
    and assemble complete dataset for the given cutoff (30 or 60).
    """
    if cutoff_day not in (30, 60):
        raise ValueError(f"cutoff_day must be 30 or 60, got {cutoff_day}")

    # 1. Active Cohort Extraction (excludes pre-cutoff withdrawals)
    active_cohort, excluded_cohort, cohort_stats = extract_active_cohort(
        raw_dir=raw_dir, cutoff_day=cutoff_day
    )

    # 2. Target Construction (1 = Fail/Withdrawn, 0 = Pass/Distinction)
    labels_df, label_stats = build_binary_target(
        active_cohort,
        positive_classes=["Fail", "Withdrawn"],
        negative_classes=["Pass", "Distinction"],
    )

    # 3. VLE Aggregations
    vle_features_df = aggregate_vle_cutoff(raw_dir=raw_dir, cutoff_day=cutoff_day)

    # 4. Assessment Aggregations (zero scores, purely submission timing & counts)
    asm_features_df = aggregate_assessment_cutoff(raw_dir=raw_dir, cutoff_day=cutoff_day)

    # 5. Assemble Predictor Matrix
    key_cols = ["code_module", "code_presentation", "id_student"]
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

    base = active_cohort[key_cols + demographic_cols + ["date_registration"]].copy()

    # Join VLE
    merged = pd.merge(base, vle_features_df, on=key_cols, how="left")
    vle_fill_zeros = [
        "vle_total_clicks", "vle_active_days", "vle_clicks_precourse",
        "vle_clicks_poststart", "vle_clicks_last_7d", "vle_clicks_forumng",
        "vle_clicks_oucontent", "vle_clicks_quiz", "vle_clicks_homepage",
        "vle_clicks_other", "has_vle_activity",
    ]
    if cutoff_day == 60:
        vle_fill_zeros.extend(["vle_clicks_month1", "vle_clicks_month2", "vle_trend_clicks"])

    for col in vle_fill_zeros:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    unengaged_ceiling = 60.0 if cutoff_day == 30 else 90.0
    merged["vle_days_since_last_click"] = (
        merged["vle_days_since_last_click"].fillna(unengaged_ceiling).astype(float)
    )

    # Join Assessments
    merged = pd.merge(merged, asm_features_df, on=key_cols, how="left")
    asm_fill_zeros = [
        "assessments_submitted", "assessment_banked", "has_assessment_submission",
        "late_submissions", "on_time_submissions",
    ]
    if cutoff_day == 60:
        asm_fill_zeros.extend(["assessments_submitted_month2", "missed_assessments"])

    for col in asm_fill_zeros:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0).astype(int)

    # Registration timing
    reg_clean = pd.to_numeric(merged["date_registration"], errors="coerce")
    median_reg = float(reg_clean.median()) if not reg_clean.dropna().empty else -50.0
    merged["has_missing_registration_date"] = merged["date_registration"].isnull().astype(int)
    merged["days_registered_before_start"] = reg_clean.fillna(median_reg).astype(float)
    merged.drop(columns=["date_registration"], inplace=True)

    # Demographic imputation
    merged["imd_band"] = merged["imd_band"].fillna("Unknown").astype(str)

    # Attach verified target columns
    merged["target"] = labels_df["target"].values
    merged["target_name"] = labels_df["target_name"].values
    merged["raw_final_result"] = active_cohort["final_result"].values

    # Validation
    if len(merged) != len(active_cohort):
        raise ValueError(
            f"Row count mismatch! Merged rows: {len(merged)}, Active cohort: {len(active_cohort)}"
        )

    # Verify no target leakage columns in features
    leakage_candidates = ["date_unregistration", "score", "final_result"]
    for lk in leakage_candidates:
        if lk in merged.columns:
            raise ValueError(f"CRITICAL TARGET LEAKAGE DETECTED: Column '{lk}' found in dataset!")

    metadata = {
        "cutoff_day": cutoff_day,
        "total_registrations": cohort_stats["total_registrations"],
        "excluded_pre_cutoff": cohort_stats["excluded_records"],
        "active_records": len(merged),
        "unique_students": int(merged["id_student"].nunique()),
        "at_risk_count": int((merged["target"] == 1).sum()),
        "on_track_count": int((merged["target"] == 0).sum()),
        "at_risk_prevalence": round(float((merged["target"] == 1).mean()), 4),
        "feature_count": len([c for c in merged.columns if c not in key_cols + ["target", "target_name", "raw_final_result"]]),
    }

    return merged, metadata
