"""
SUTRA Longitudinal Dataset Validator & Ingestion Integrity Guard.

Validates historical dataset extracts against the Phase Twenty Longitudinal Data Contract:
1. Rejects target leakage and forbidden columns.
2. Enforces point-in-time correctness (source events <= cutoff date).
3. Validates schema compliance, numerical bounds, and label definitions.
4. Generates a machine-readable Dataset Readiness Scorecard without exposing student PII.
5. Fails closed on corrupted timestamps, unparseable outcomes, or missing provenance.
"""

from datetime import datetime
import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd
from pydantic import ValidationError

from sutra_ml.schemas.longitudinal_contract import (
    AcademicOutcomeLabel,
    CutoffMilestone,
    DatasetReadinessScorecard,
    LongitudinalSnapshotRow,
)

logger = logging.getLogger("sutra.data.longitudinal_validator")

# Explicit list of forbidden columns that leak target outcomes or future events
FORBIDDEN_LEAKAGE_COLUMNS: Set[str] = {
    "final_result",
    "final_grade",
    "final_score",
    "exam_score",
    "final_exam_grade",
    "date_unregistered",
    "withdrawal_date",
    "withdrawal_reason",
    "post_cutoff_clicks",
    "post_cutoff_assessments",
    "post_cutoff_gpa",
    "future_attendance_pct",
    "disciplinary_record",
    "financial_hold_active",  # Ethically excluded from ML feature set
    "fee_balance_amount",     # Ethically excluded from ML feature set
}

# Required columns for a longitudinal snapshot table
REQUIRED_SNAPSHOT_COLUMNS: Set[str] = {
    "student_id_hash",
    "course_id",
    "term_id",
    "cutoff_milestone",
    "cutoff_date",
    "term_credits_attempted",
    "assessments_due_to_cutoff",
    "assessments_submitted_to_cutoff",
    "lms_total_clicks_to_cutoff",
    "lms_active_days_to_cutoff",
    "lms_days_since_last_interaction",
    "target_academic_risk",
    "source_event_max_timestamp",
    "system_ingest_timestamp",
}


class LongitudinalValidationReport:
    """Detailed validation results and audit diagnostics."""

    def __init__(self):
        self.is_valid: bool = True
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.total_rows_inspected: int = 0
        self.valid_rows_count: int = 0
        self.rejected_rows_count: int = 0
        self.leakage_columns_found: List[str] = []
        self.point_in_time_violations: int = 0
        self.scorecard: Optional[DatasetReadinessScorecard] = None

    def add_error(self, message: str) -> None:
        self.is_valid = False
        self.errors.append(message)

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "total_rows_inspected": self.total_rows_inspected,
            "valid_rows_count": self.valid_rows_count,
            "rejected_rows_count": self.rejected_rows_count,
            "leakage_columns_found": self.leakage_columns_found,
            "point_in_time_violations": self.point_in_time_violations,
            "scorecard": self.scorecard.model_dump(mode="json") if self.scorecard else None,
        }


class LongitudinalDatasetValidator:
    """
    Ingestion validator ensuring datasets adhere to longitudinal contracts before training.
    """

    def __init__(
        self,
        min_terms: int = 4,
        min_unique_students: int = 5000,
        target_prevalence_range: Tuple[float, float] = (15.0, 55.0),
    ):
        self.min_terms = min_terms
        self.min_unique_students = min_unique_students
        self.target_prevalence_range = target_prevalence_range

    def validate_dataframe(
        self,
        df: pd.DataFrame,
        governance_certified: bool = False,
    ) -> LongitudinalValidationReport:
        """
        Execute comprehensive validation across a pandas DataFrame.
        """
        report = LongitudinalValidationReport()
        report.total_rows_inspected = len(df)

        if df.empty:
            report.add_error("Dataset is empty; zero rows provided for validation.")
            return report

        # 1. Target Leakage & Forbidden Columns Check
        present_cols = set(df.columns)
        leakage = [col for col in present_cols if col.lower() in FORBIDDEN_LEAKAGE_COLUMNS]
        if leakage:
            report.leakage_columns_found = sorted(leakage)
            report.add_error(
                f"TARGET LEAKAGE DETECTED! Dataset contains forbidden columns: {leakage}. "
                "These fields expose post-cutoff outcomes or sensitive exclusions."
            )

        # 2. Required Column Verification
        missing_required = [col for col in REQUIRED_SNAPSHOT_COLUMNS if col not in present_cols]
        if missing_required:
            report.add_error(
                f"Missing required longitudinal contract columns: {sorted(missing_required)}"
            )

        # Fail early if foundational structural columns are missing
        if not report.is_valid and missing_required:
            return report

        # 3. Row-Level Point-in-Time & Value Range Validation
        valid_rows = 0
        pit_violations = 0
        row_errors = 0

        for idx, row in df.iterrows():
            row_dict = row.to_dict()
            # Clean NaN to None for Pydantic
            cleaned_dict = {k: (None if pd.isna(v) else v) for k, v in row_dict.items()}

            # Point-in-time timestamp comparison
            try:
                cutoff_str = str(cleaned_dict.get("cutoff_date", ""))
                max_event_str = str(cleaned_dict.get("source_event_max_timestamp", ""))
                if cutoff_str and max_event_str:
                    # Truncate to date comparison YYYY-MM-DD
                    cutoff_d = cutoff_str[:10]
                    max_event_d = max_event_str[:10]
                    if max_event_d > cutoff_d:
                        pit_violations += 1
                        if pit_violations <= 5:
                            report.add_error(
                                f"Row {idx}: Point-in-time violation! Event timestamp '{max_event_str}' "
                                f"exceeds snapshot cutoff date '{cutoff_str}'."
                            )
            except Exception as e:
                report.add_error(f"Row {idx}: Timestamp parsing failure: {e}")

            # Pydantic schema validation
            try:
                LongitudinalSnapshotRow.model_validate(cleaned_dict)
                valid_rows += 1
            except ValidationError as ve:
                row_errors += 1
                if row_errors <= 3:
                    report.add_error(f"Row {idx} schema validation error: {ve.errors()[0]['msg']}")

        report.point_in_time_violations = pit_violations
        report.valid_rows_count = valid_rows
        report.rejected_rows_count = len(df) - valid_rows

        if pit_violations > 0:
            report.add_error(f"Total point-in-time violations detected: {pit_violations}")

        # 4. Synthesize Dataset Readiness Scorecard
        unique_students = int(df["student_id_hash"].nunique()) if "student_id_hash" in df.columns else 0
        unique_courses = int(df["course_id"].nunique()) if "course_id" in df.columns else 0
        terms_covered = sorted([str(t) for t in df["term_id"].unique()]) if "term_id" in df.columns else []
        term_count = len(terms_covered)

        # Target outcome metrics
        target_col = df["target_academic_risk"] if "target_academic_risk" in df.columns else pd.Series()
        pos_count = int((target_col == 1).sum())
        neg_count = int((target_col == 0).sum())
        total_targets = pos_count + neg_count
        prev_pct = (pos_count / total_targets * 100.0) if total_targets > 0 else 0.0

        # Milestone counts
        milestone_col = df["cutoff_milestone"] if "cutoff_milestone" in df.columns else pd.Series()
        d30_count = int((milestone_col == "DAY_30").sum())
        d60_count = int((milestone_col == "DAY_60").sum())

        # Domain coverage
        acad_cov = (1.0 - df["assessments_submitted_to_cutoff"].isnull().mean()) * 100.0 if "assessments_submitted_to_cutoff" in df.columns else 0.0
        lms_cov = (1.0 - df["lms_total_clicks_to_cutoff"].isnull().mean()) * 100.0 if "lms_total_clicks_to_cutoff" in df.columns else 0.0
        att_cov = (1.0 - df["attendance_pct_to_cutoff"].isnull().mean()) * 100.0 if "attendance_pct_to_cutoff" in df.columns else 0.0
        mature_cov = (df["is_outcome_mature"] == True).mean() * 100.0 if "is_outcome_mature" in df.columns else 0.0

        remediation_notes = []
        if term_count < self.min_terms:
            remediation_notes.append(
                f"Term count ({term_count}) is below minimum planning target of {self.min_terms} contiguous terms."
            )
        if unique_students < self.min_unique_students:
            remediation_notes.append(
                f"Unique student cohort ({unique_students}) is below planning benchmark of {self.min_unique_students}."
            )
        if not (self.target_prevalence_range[0] <= prev_pct <= self.target_prevalence_range[1]):
            remediation_notes.append(
                f"Target prevalence ({prev_pct:.1f}%) is outside expected operational range ({self.target_prevalence_range[0]}% - {self.target_prevalence_range[1]}%)."
            )
        if mature_cov < 100.0:
            remediation_notes.append(
                f"Outcome maturity is {mature_cov:.1f}%. Historical training datasets must have 100% finalized grades."
            )
        if not governance_certified:
            remediation_notes.append("Formal DUA and institutional ethics certification pending.")
        if pit_violations > 0:
            remediation_notes.append(f"Eliminate {pit_violations} point-in-time timestamp leakage violations.")

        # Determine overall scorecard verdict
        if report.is_valid and not remediation_notes and governance_certified:
            verdict = "READY_FOR_TRAINING"
        elif not report.is_valid or leakage or pit_violations > 0:
            verdict = "REJECTED_LEAKAGE_OR_SCHEMA_FAILURE"
        else:
            verdict = "NEEDS_REMEDIATION_BEFORE_TRAINING"

        scorecard = DatasetReadinessScorecard(
            total_records=len(df),
            unique_students=unique_students,
            unique_courses=unique_courses,
            terms_covered=terms_covered,
            term_count=term_count,
            positive_outcome_count=pos_count,
            negative_outcome_count=neg_count,
            outcome_prevalence_pct=round(prev_pct, 2),
            day_30_record_count=d30_count,
            day_60_record_count=d60_count,
            academic_coverage_pct=round(acad_cov, 1),
            lms_coverage_pct=round(lms_cov, 1),
            attendance_coverage_pct=round(att_cov, 1),
            outcome_maturity_pct=round(mature_cov, 1),
            has_leakage_fields=len(leakage) > 0,
            leakage_fields_detected=leakage,
            has_point_in_time_violations=pit_violations > 0,
            point_in_time_violation_count=pit_violations,
            governance_approved=governance_certified,
            overall_readiness_verdict=verdict,
            remediation_notes=remediation_notes,
        )

        report.scorecard = scorecard
        return report

    def validate_file(
        self,
        file_path: Path,
        governance_certified: bool = False,
    ) -> LongitudinalValidationReport:
        """
        Load and validate CSV or JSON dataset from disk.
        """
        report = LongitudinalValidationReport()
        if not file_path.exists():
            report.add_error(f"Dataset file does not exist at '{file_path}'.")
            return report

        try:
            if file_path.suffix.lower() == ".csv":
                df = pd.read_csv(file_path)
            elif file_path.suffix.lower() == ".json":
                df = pd.read_json(file_path)
            else:
                report.add_error(f"Unsupported file format '{file_path.suffix}'. Expected .csv or .json.")
                return report
        except Exception as exc:
            report.add_error(f"Failed to read dataset file '{file_path}': {exc}")
            return report

        return self.validate_dataframe(df, governance_certified=governance_certified)
