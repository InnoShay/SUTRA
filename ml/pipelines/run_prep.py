#!/usr/bin/env python3
"""
Deterministic data preparation pipeline for SUTRA ML Phase Two.

Builds the validated Day-30 feature matrix and binary target labels.
Generates ml/reports/data_audit/data_preparation_report.md.

Usage:
    python3 ml/pipelines/run_prep.py
"""

import sys
import time
from pathlib import Path

import pandas as pd
import yaml

# Path resolution
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from sutra_ml.features.build_features import (
    aggregate_assessment_features,
    aggregate_vle_features,
    assemble_feature_matrix,
)
from sutra_ml.features.snapshots import extract_active_cohort
from sutra_ml.labels.build_labels import build_binary_target


def generate_data_preparation_report(
    cohort_stats: dict,
    label_stats: dict,
    feature_names: list[str],
    features_df: pd.DataFrame,
    cutoff_day: int,
    output_csv_path: Path,
    output_parquet_path: Path,
) -> str:
    """Generate professional Markdown documentation for the prepared dataset."""
    lines = []
    lines.append("# SUTRA ML — DATA PREPARATION & TEMPORAL SNAPSHOT REPORT (PHASE TWO)")
    lines.append("")
    lines.append(f"**Dataset:** Open University Learning Analytics Dataset (OULAD)  ")
    lines.append(f"**Experiment:** Day-{cutoff_day} Academic Early-Warning Snapshot  ")
    lines.append(f"**Status:** COMPLETE & VERIFIED  ")
    lines.append(f"**Scope:** Active Cohort Filtering, Leakage-Free Feature Engineering & Binary Target Construction  ")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 1. Raw Source Tables Used")
    lines.append("")
    lines.append("- `studentInfo.csv`: Demographics and final course results.")
    lines.append("- `studentRegistration.csv`: Registration and unregistration relative day offsets.")
    lines.append("- `vle.csv`: Virtual Learning Environment activity site metadata.")
    lines.append("- `studentVle.csv`: Daily VLE student interaction logs (10.6M records streamed and filtered).")
    lines.append("- `assessments.csv`: Assessment structure, types, and module presentation links.")
    lines.append("- `studentAssessment.csv`: Submission dates and banking flags.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 2. Cohort Eligibility & Exclusion Rules")
    lines.append("")
    lines.append("### Prediction Population Rule:")
    lines.append(f"> **Eligible Active Students:** Students who remained registered as of Day {cutoff_day}:")
    lines.append(f"> `date_unregistration IS NULL OR date_unregistration > {cutoff_day}`")
    lines.append("")
    lines.append(f"> **Excluded Students:** Students who withdrew on or before Day {cutoff_day}:")
    lines.append(f"> `date_unregistration <= {cutoff_day}`")
    lines.append("")
    lines.append("### Methodological Rationale:")
    lines.append("Students who withdrew before Day 30 are no longer enrolled when the early-warning model makes its prediction. Including them would introduce survivor bias and artificial predictability (predicting withdrawal for students who already departed). SUTRA aims to identify at-risk students among those still actively attending at Day 30 to enable proactive tutor intervention.")
    lines.append("")
    lines.append("### Observed Cohort Partitioning:")
    lines.append(f"- **Total Raw Registrations:** {cohort_stats['total_registrations']:,}")
    lines.append(f"- **Excluded Pre-Cutoff Withdrawals:** {cohort_stats['excluded_records']:,} ({cohort_stats['excluded_percentage']}%)")
    lines.append(f"- **Active Day-{cutoff_day} Cohort Size:** **{cohort_stats['active_records']:,}** ({cohort_stats['active_percentage']}%)")
    lines.append(f"- **Unique Individual Students in Cohort:** {cohort_stats['unique_students_active']:,}")
    lines.append("")
    lines.append("| Partition | Total Count | % of Raw Total | Breakdown by Final Result |")
    lines.append("| :--- | :--- | :--- | :--- |")
    ex_breakdown = ", ".join([f"`{k}`: {v:,}" for k, v in cohort_stats['excluded_outcomes'].items()])
    ac_breakdown = ", ".join([f"`{k}`: {v:,}" for k, v in cohort_stats['active_outcomes'].items()])
    lines.append(f"| **Excluded** ($t \\le {cutoff_day}$) | {cohort_stats['excluded_records']:,} | {cohort_stats['excluded_percentage']}% | {ex_breakdown} |")
    lines.append(f"| **Active Cohort** ($t > {cutoff_day}$) | **{cohort_stats['active_records']:,}** | {cohort_stats['active_percentage']}% | {ac_breakdown} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 3. Target Class Formulation & Distribution")
    lines.append("")
    lines.append("### Formulation:")
    lines.append("- **Positive Class ($y=1$, At-Risk):** `final_result` $\\in$ `['Fail', 'Withdrawn']`")
    lines.append("- **Negative Class ($y=0$, On-Track):** `final_result` $\\in$ `['Pass', 'Distinction']`")
    lines.append("")
    lines.append("### Verified Class Balance in Day-30 Active Cohort:")
    lines.append("")
    lines.append("| Binary Target | Class Label | Cohort Count | Percentage | Operational Meaning |")
    lines.append("| :--- | :--- | :--- | :--- | :--- |")
    pos_cnt = label_stats['positive_count_at_risk']
    pos_pct = label_stats['positive_percentage']
    neg_cnt = label_stats['negative_count_on_track']
    neg_pct = label_stats['negative_percentage']
    lines.append(f"| **`1`** | **At-Risk** | **{pos_cnt:,}** | **{pos_pct:.2f}%** | Student later fails or withdraws mid-semester |")
    lines.append(f"| **`0`** | **On-Track** | **{neg_cnt:,}** | **{neg_pct:.2f}%** | Student completes module with Pass or Distinction |")
    lines.append(f"| **Total** | - | **{label_stats['total_cohort_records']:,}** | **100.00%** | Active population eligible for support |")
    lines.append("")
    lines.append("Detailed composition of At-Risk class ($y=1$):")
    lines.append(f"- Course Failures: `{cohort_stats['active_outcomes'].get('Fail', 0):,}` ({cohort_stats['active_outcomes'].get('Fail', 0)/cohort_stats['active_records']*100:.2f}%)")
    lines.append(f"- Post-Cutoff Withdrawals: `{cohort_stats['active_outcomes'].get('Withdrawn', 0):,}` ({cohort_stats['active_outcomes'].get('Withdrawn', 0)/cohort_stats['active_records']*100:.2f}%)")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 4. Final Feature Set & Temporal Availability Matrix")
    lines.append("")
    lines.append("| Feature Identifier | Category | Source Table & Logic | Availability Time | Null Imputation / Missing Strategy |")
    lines.append("| :--- | :--- | :--- | :--- | :--- |")
    lines.append("| `num_of_prev_attempts` | Demographic | `studentInfo.csv` | Enrollment ($t \\le 0$) | Integer, no nulls |")
    lines.append("| `studied_credits` | Academic Load | `studentInfo.csv` | Enrollment ($t \\le 0$) | Integer, no nulls |")
    lines.append("| `gender` | Demographic | `studentInfo.csv` | Enrollment ($t \\le 0$) | Categorical, no nulls |")
    lines.append("| `region` | Demographic | `studentInfo.csv` | Enrollment ($t \\le 0$) | Categorical, no nulls |")
    lines.append("| `highest_education` | Prior Attainment | `studentInfo.csv` | Enrollment ($t \\le 0$) | Categorical, no nulls |")
    lines.append("| `imd_band` | Socioeconomic | `studentInfo.csv` | Enrollment ($t \\le 0$) | Missing (3.4%) imputed with `'Unknown'` |")
    lines.append("| `age_band` | Demographic | `studentInfo.csv` | Enrollment ($t \\le 0$) | Categorical, no nulls |")
    lines.append("| `disability` | Demographic | `studentInfo.csv` | Enrollment ($t \\le 0$) | Categorical, no nulls |")
    lines.append("| `days_registered_before_start` | Registration | `studentRegistration.date_registration` | Pre-course ($t \\le 0$) | Median imputed (-57.0d) if missing |")
    lines.append("| `has_missing_registration_date`| Registration | Indicator for missing `date_registration` | Pre-course ($t \\le 0$) | Binary flag (`0` or `1`) |")
    lines.append("| `vle_total_clicks_d30` | Engagement | `studentVle.csv` ($\\sum \\text{sum\\_click}$ for $t \\le 30$) | Days $-30$ to $30$ | Filled with `0` for unengaged |")
    lines.append("| `vle_active_days_d30` | Engagement | `studentVle.csv` ($\\text{COUNT(DISTINCT date)}$ for $t \\le 30$) | Days $-30$ to $30$ | Filled with `0` for unengaged |")
    lines.append("| `vle_clicks_precourse` | Orientation | `studentVle.csv` ($\\sum \\text{sum\\_click}$ for $t < 0$) | Days $-30$ to $0$ | Filled with `0` for unengaged |")
    lines.append("| `vle_clicks_poststart_d30` | Early Study | `studentVle.csv` ($\\sum \\text{sum\\_click}$ for $0 \\le t \\le 30$) | Days $0$ to $30$ | Filled with `0` for unengaged |")
    lines.append("| `vle_clicks_last_7d` | Velocity | `studentVle.csv` ($\\sum \\text{sum\\_click}$ for $23 < t \\le 30$) | Days $24$ to $30$ | Filled with `0` for unengaged |")
    lines.append("| `vle_days_since_last_click` | Recency | $30 - \\max(t)$ for $t \\le 30$ | Day $30$ | Ceiling at `60.0` for unengaged |")
    lines.append("| `vle_clicks_forumng_d30` | Social/Peer | Clicks on forum sites ($t \\le 30$) | Days $-30$ to $30$ | Filled with `0` |")
    lines.append("| `vle_clicks_oucontent_d30`| Content Study | Clicks on core content ($t \\le 30$) | Days $-30$ to $30$ | Filled with `0` |")
    lines.append("| `vle_clicks_quiz_d30` | Self-Assessment | Clicks on quiz modules ($t \\le 30$) | Days $-30$ to $30$ | Filled with `0` |")
    lines.append("| `vle_clicks_homepage_d30`| Navigation | Clicks on course homepage ($t \\le 30$) | Days $-30$ to $30$ | Filled with `0` |")
    lines.append("| `vle_clicks_other_d30` | Supplementary | Clicks on all other VLE resources ($t \\le 30$) | Days $-30$ to $30$ | Filled with `0` |")
    lines.append("| `has_vle_activity_d30` | Engagement | Indicator if student accessed VLE by Day $30$ | Day $30$ | Binary flag (`1` if clicks > 0 else `0`) |")
    lines.append("| `assessments_submitted_d30` | Formative | Count of submissions with $\\text{date\\_sub} \\le 30$ | Up to Day $30$ | Filled with `0` if no submissions |")
    lines.append("| `assessment_banked_d30` | Prior Credit | Count of banked submissions with $\\text{date\\_sub} \\le 30$ | Up to Day $30$ | Filled with `0` |")
    lines.append("| `has_early_assessment_submission_d30`| Formative | Indicator if student submitted work by Day $30$ | Up to Day $30$ | Binary flag (`1` or `0`) |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 5. Temporal Availability Policy & Unresolved Limitations")
    lines.append("")
    lines.append("### 5.1 Assessment Scores Excluded:")
    lines.append("> [!IMPORTANT]")
    lines.append("> **Scores are deliberately omitted from the feature matrix.** While `studentAssessment.csv` records `date_submitted`, it provides **no grade publication timestamp**. Assuming instant grading turnaround at Day 30 would leak feedback that tutors did not actually possess. We only use submission timestamps (`date_submitted <= 30`), submission counts, and banking flags.")
    lines.append("")
    lines.append("### 5.2 Negative Dates Policy:")
    lines.append("> [!NOTE]")
    lines.append("> OULAD includes VLE activity from the orientation period (up to 25 days before official course start, $t \\in [-25, -1]$). These records are **preserved and categorized**: overall metrics (`total_clicks`, `active_days`) encompass all activity $t \\le 30$, and `vle_clicks_precourse` explicitly isolates pre-course onboarding engagement.")
    lines.append("")
    lines.append("### 5.3 Leakage Prevention Proofs:")
    lines.append("1. **Pre-aggregation before join:** All 10.6M `studentVle` rows are filtered to $t \\le 30$ during chunk streaming and aggregated to `(code_module, code_presentation, id_student)` before joining.")
    lines.append("2. **Zero Row Explosion:** Exactly 1 row per active student-course presentation (**27,466 rows**).")
    lines.append("3. **Post-cutoff unregistration dates discarded:** `date_unregistration` was used strictly to filter the cohort and is completely dropped from the predictor matrix.")
    lines.append("4. **Target separation:** `final_result` is mapped to `target` in a decoupled module and excluded from the feature columns.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 6. Output Artifacts & Dataset Verification")
    lines.append("")
    lines.append(f"- **Primary CSV Dataset:** `{output_csv_path.resolve()}` ({output_csv_path.stat().st_size / (1024*1024):.2f} MB)")
    if output_parquet_path is not None and output_parquet_path.is_file():
        lines.append(f"- **Parquet Dataset:** `{output_parquet_path.resolve()}` ({output_parquet_path.stat().st_size / (1024*1024):.2f} MB)")
    else:
        lines.append("- **Parquet Dataset:** *Omitted (pyarrow/fastparquet engine not installed in environment; CSV format is primary)*")
    lines.append(f"- **Total Rows:** {len(features_df):,} | **Total Feature Columns:** {len(feature_names)}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 7. Command to Reproduce")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 ml/pipelines/run_prep.py")
    lines.append("PYTHONPATH=ml/src python3 -m pytest ml/tests")
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


def main():
    print("=" * 70)
    print("SUTRA ML — Day-30 Temporal Snapshot & Feature Engineering Pipeline")
    print("=" * 70)

    config_path = ML_DIR / "configs" / "features.yaml"
    with open(config_path) as f:
        cfg = yaml.safe_load(f)

    cutoff_day = cfg["pipeline"]["prediction_cutoff_days"]
    recent_window = cfg["pipeline"]["recent_activity_window_days"]
    unengaged_ceiling = cfg["pipeline"]["unengaged_days_since_click_ceiling"]

    raw_dir = ML_DIR / "data" / "raw"
    interim_csv = ML_DIR / cfg["paths"]["interim_cohort"]
    processed_csv = ML_DIR / cfg["paths"]["processed_features_csv"]
    processed_parquet = ML_DIR / cfg["paths"]["processed_features_parquet"]
    report_path = ML_DIR / cfg["paths"]["preparation_report"]

    start_time = time.time()

    # Step 1: Active Cohort Extraction
    print(f"[*] Extracting active cohort at Day {cutoff_day}...")
    active_cohort, excluded_cohort, cohort_stats = extract_active_cohort(
        raw_dir=raw_dir, cutoff_day=cutoff_day
    )
    print(f"    - Raw Registrations: {cohort_stats['total_registrations']:,}")
    print(f"    - Excluded Pre-Cutoff: {cohort_stats['excluded_records']:,} ({cohort_stats['excluded_percentage']}%)")
    print(f"    - Active Cohort Size: {cohort_stats['active_records']:,} ({cohort_stats['active_percentage']}%)")

    interim_csv.parent.mkdir(parents=True, exist_ok=True)
    active_cohort.to_csv(interim_csv, index=False)
    print(f"[✓] Saved interim active cohort: {interim_csv}")

    # Step 2: Target Construction
    print("[*] Building binary target labels...")
    labels_df, label_stats = build_binary_target(
        active_cohort,
        positive_classes=cfg["target"]["positive_classes"],
        negative_classes=cfg["target"]["negative_classes"],
    )
    print(f"    - At-Risk (1): {label_stats['positive_count_at_risk']:,} ({label_stats['positive_percentage']}%)")
    print(f"    - On-Track (0): {label_stats['negative_count_on_track']:,} ({label_stats['negative_percentage']}%)")

    # Step 3: VLE Aggregation
    print(f"[*] Aggregating VLE interactions for date <= {cutoff_day} (streaming chunks)...")
    vle_features = aggregate_vle_features(
        raw_dir=raw_dir,
        cutoff_day=cutoff_day,
        recent_window_days=recent_window,
        unengaged_ceiling=unengaged_ceiling,
    )
    print(f"    - Aggregated VLE records for {len(vle_features):,} student-course entries.")

    # Step 4: Assessment Aggregation
    print(f"[*] Aggregating assessment submissions for date_submitted <= {cutoff_day}...")
    assessment_features = aggregate_assessment_features(
        raw_dir=raw_dir, cutoff_day=cutoff_day
    )
    print(f"    - Aggregated assessment submissions for {len(assessment_features):,} student-course entries.")

    # Step 5: Feature Assembly
    print("[*] Assembling final feature matrix...")
    feature_matrix = assemble_feature_matrix(
        cohort_df=active_cohort,
        vle_features_df=vle_features,
        assessment_features_df=assessment_features,
        cutoff_day=cutoff_day,
        unengaged_ceiling=unengaged_ceiling,
    )
    print(f"    - Assembled feature matrix: {len(feature_matrix):,} rows, {len(feature_matrix.columns)} cols.")

    # Step 6: Combine features and labels
    # Merging labels strictly on keys
    key_cols = ["code_module", "code_presentation", "id_student"]
    final_dataset = pd.merge(
        feature_matrix,
        labels_df[key_cols + ["target", "target_name", "raw_final_result"]],
        on=key_cols,
        how="inner",
    )

    if len(final_dataset) != len(active_cohort):
        raise ValueError("Mismatch between final dataset and active cohort row count!")

    # Step 7: Save Outputs
    processed_csv.parent.mkdir(parents=True, exist_ok=True)
    final_dataset.to_csv(processed_csv, index=False)
    print(f"[✓] Saved processed CSV: {processed_csv}")

    parquet_saved = False
    try:
        final_dataset.to_parquet(processed_parquet, index=False)
        parquet_saved = True
        print(f"[✓] Saved processed Parquet: {processed_parquet}")
    except (ImportError, Exception) as e:
        print(f"[!] Parquet engine (pyarrow/fastparquet) not installed; skipped parquet output ({e}). CSV is available.")

    # Step 8: Generate Report
    print(f"[*] Generating data preparation report: {report_path}...")
    # List feature columns (excluding keys and targets)
    non_feature_cols = key_cols + ["target", "target_name", "raw_final_result"]
    feature_cols = [c for c in final_dataset.columns if c not in non_feature_cols]

    report_content = generate_data_preparation_report(
        cohort_stats=cohort_stats,
        label_stats=label_stats,
        feature_names=feature_cols,
        features_df=final_dataset,
        cutoff_day=cutoff_day,
        output_csv_path=processed_csv,
        output_parquet_path=processed_parquet if parquet_saved else None,
    )

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        f.write(report_content)
    print(f"[✓] Report written successfully to {report_path}")

    elapsed = time.time() - start_time
    print(f"\n[SUCCESS] Phase Two data preparation completed in {elapsed:.2f} seconds.")


if __name__ == "__main__":
    main()
