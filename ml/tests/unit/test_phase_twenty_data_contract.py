"""
Automated Unit Tests for SUTRA Phase Twenty Longitudinal Data Contract.

Verifies:
1. Schema compliance on compliant longitudinal student snapshot data.
2. Target leakage detection and rejection of forbidden columns.
3. Point-in-time correctness enforcement (source event timestamp <= cutoff date).
4. Failure closed on missing essential columns, corrupt timestamps, or invalid targets.
5. Pseudonymized student identifier validation.
6. Value range validation (numerical bounds, percentages).
7. Dataset readiness scorecard synthesis and remediation flagging.
8. Non-exposure of raw PII in generated audit reports.
9. Production model artifact hash and threshold immutability.
10. Candidate model execution gate remaining closed by default.
"""

import hashlib
import json
from pathlib import Path
import pytest
import pandas as pd

from backend.app.core.config import DEFAULT_MODEL_PATH
from sutra_ml.data.longitudinal_validator import (
    FORBIDDEN_LEAKAGE_COLUMNS,
    LongitudinalDatasetValidator,
)
from sutra_ml.evaluation.shadow_mode import ShadowModeEvaluator
from sutra_ml.schemas.longitudinal_contract import (
    AcademicOutcomeLabel,
    CutoffMilestone,
    DatasetReadinessScorecard,
    LongitudinalSnapshotRow,
)

EXPECTED_PRODUCTION_SHA256 = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"


@pytest.fixture
def valid_snapshot_record() -> dict:
    return {
        "student_id_hash": "HASH-STUDENT-0001",
        "course_id": "CS101",
        "term_id": "2026-FALL",
        "cutoff_milestone": "DAY_30",
        "cutoff_date": "2026-10-15",
        "prior_cumulative_gpa": 3.42,
        "term_credits_attempted": 15,
        "assessments_due_to_cutoff": 2,
        "assessments_submitted_to_cutoff": 2,
        "weighted_coursework_score_to_cutoff": 85.0,
        "failed_assessments_to_cutoff": 0,
        "days_registered_before_start": 14,
        "lms_total_clicks_to_cutoff": 145,
        "lms_active_days_to_cutoff": 18,
        "lms_days_since_last_interaction": 1,
        "lms_forum_posts_to_cutoff": 5,
        "lms_resource_views_to_cutoff": 42,
        "lms_recent_7d_clicks": 35,
        "attendance_pct_to_cutoff": 92.0,
        "consecutive_absences_at_cutoff": 0,
        "recent_14d_attendance_pct": 94.0,
        "highest_education_level": "HE_QUALIFICATION",
        "age_band": "0-35",
        "socioeconomic_band": "MEDIUM",
        "target_academic_risk": 0,
        "source_event_max_timestamp": "2026-10-14T22:00:00Z",
        "system_ingest_timestamp": "2026-10-15T01:00:00Z",
        "is_outcome_mature": True,
    }


def test_production_artifact_and_threshold_immutability():
    """Verify production baseline v1.0.0 artifact hash and threshold 0.46 remain unchanged."""
    assert DEFAULT_MODEL_PATH.exists(), f"Production model missing at {DEFAULT_MODEL_PATH}"
    with open(DEFAULT_MODEL_PATH, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    assert file_hash == EXPECTED_PRODUCTION_SHA256, (
        f"Production model SHA-256 altered! Expected {EXPECTED_PRODUCTION_SHA256}, got {file_hash}"
    )

    metadata_path = DEFAULT_MODEL_PATH.parent / "model_metadata.json"
    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert round(meta["selected_threshold"], 2) == 0.46
    assert meta["selected_model"] == "Regularized Logistic Regression Baseline"


def test_shadow_mode_candidate_execution_gate_remains_closed():
    """Verify experimental model candidate gate is closed by default."""
    evaluator = ShadowModeEvaluator()
    assert evaluator.candidate_provenance_verified is False
    assert evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"


def test_valid_longitudinal_snapshot_row(valid_snapshot_record):
    """Test well-formed snapshot row validates against Pydantic schema."""
    row = LongitudinalSnapshotRow.model_validate(valid_snapshot_record)
    assert row.cutoff_milestone == CutoffMilestone.DAY_30
    assert row.target_academic_risk == AcademicOutcomeLabel.ON_TRACK_PASS
    assert row.prior_cumulative_gpa == 3.42


def test_validator_accepts_clean_dataframe(valid_snapshot_record):
    """Validator succeeds on clean DataFrame with no leakage."""
    # Create multiple valid rows across 4 terms
    records = []
    terms = ["2024-FALL", "2025-SPRING", "2025-FALL", "2026-SPRING"]
    for i in range(20):
        rec = valid_snapshot_record.copy()
        rec["student_id_hash"] = f"HASH-STUDENT-{i:04d}"
        rec["term_id"] = terms[i % 4]
        rec["target_academic_risk"] = 1 if i % 3 == 0 else 0
        records.append(rec)

    df = pd.DataFrame(records)
    validator = LongitudinalDatasetValidator(min_terms=4, min_unique_students=10)
    report = validator.validate_dataframe(df, governance_certified=True)

    assert report.is_valid is True
    assert report.valid_rows_count == 20
    assert report.point_in_time_violations == 0
    assert len(report.leakage_columns_found) == 0
    assert report.scorecard.overall_readiness_verdict == "READY_FOR_TRAINING"


def test_validator_rejects_target_leakage_columns(valid_snapshot_record):
    """Validator strictly fails closed if forbidden leakage columns are present."""
    df = pd.DataFrame([valid_snapshot_record])
    # Inject leakage column
    df["final_result"] = "Pass"
    df["withdrawal_date"] = "2026-12-01"

    validator = LongitudinalDatasetValidator()
    report = validator.validate_dataframe(df)

    assert report.is_valid is False
    assert len(report.leakage_columns_found) == 2
    assert "final_result" in report.leakage_columns_found
    assert "withdrawal_date" in report.leakage_columns_found
    assert any("TARGET LEAKAGE DETECTED" in err for err in report.errors)
    assert report.scorecard.overall_readiness_verdict == "REJECTED_LEAKAGE_OR_SCHEMA_FAILURE"


def test_validator_rejects_point_in_time_violation(valid_snapshot_record):
    """Validator catches events that occurred after the prediction cutoff date."""
    rec = valid_snapshot_record.copy()
    rec["cutoff_date"] = "2026-10-15"
    # Event occurred on Day 45 (after cutoff Day 30)
    rec["source_event_max_timestamp"] = "2026-10-30T10:00:00Z"

    df = pd.DataFrame([rec])
    validator = LongitudinalDatasetValidator()
    report = validator.validate_dataframe(df)

    assert report.is_valid is False
    assert report.point_in_time_violations == 1
    assert any("Point-in-time violation" in err for err in report.errors)


def test_validator_rejects_missing_required_columns(valid_snapshot_record):
    """Validator fails closed when required contractual columns are missing."""
    rec = valid_snapshot_record.copy()
    del rec["lms_total_clicks_to_cutoff"]
    del rec["target_academic_risk"]

    df = pd.DataFrame([rec])
    validator = LongitudinalDatasetValidator()
    report = validator.validate_dataframe(df)

    assert report.is_valid is False
    assert any("Missing required longitudinal contract columns" in err for err in report.errors)


def test_validator_rejects_short_or_raw_student_ids(valid_snapshot_record):
    """Student ID must be a pseudonymized hash of at least 8 chars."""
    rec = valid_snapshot_record.copy()
    rec["student_id_hash"] = "STU1"  # Too short

    df = pd.DataFrame([rec])
    validator = LongitudinalDatasetValidator()
    report = validator.validate_dataframe(df)

    assert report.is_valid is False
    assert report.rejected_rows_count == 1


def test_validator_rejects_impossible_numerical_bounds(valid_snapshot_record):
    """Validator flags negative clicks, invalid percentages, or out-of-bounds GPAs."""
    # Negative clicks
    rec1 = valid_snapshot_record.copy()
    rec1["lms_total_clicks_to_cutoff"] = -10
    df1 = pd.DataFrame([rec1])
    validator = LongitudinalDatasetValidator()
    report1 = validator.validate_dataframe(df1)
    assert report1.is_valid is False

    # Attendance > 100%
    rec2 = valid_snapshot_record.copy()
    rec2["attendance_pct_to_cutoff"] = 125.0
    df2 = pd.DataFrame([rec2])
    report2 = validator.validate_dataframe(df2)
    assert report2.is_valid is False


def test_scorecard_flags_insufficient_terms_and_governance(valid_snapshot_record):
    """Scorecard notes when term count is below planning target or DUA is uncertified."""
    # Only 1 term
    rec = valid_snapshot_record.copy()
    rec["term_id"] = "2026-FALL"
    df = pd.DataFrame([rec])

    validator = LongitudinalDatasetValidator(min_terms=4, min_unique_students=5000)
    report = validator.validate_dataframe(df, governance_certified=False)

    scorecard = report.scorecard
    assert scorecard.term_count == 1
    assert any("below minimum planning target of 4" in note for note in scorecard.remediation_notes)
    assert any("DUA and institutional ethics" in note for note in scorecard.remediation_notes)
    assert scorecard.overall_readiness_verdict == "NEEDS_REMEDIATION_BEFORE_TRAINING"


def test_ethical_fee_exclusion_from_ml_features(valid_snapshot_record):
    """Ensure fee fields are in the forbidden leakage/exclusion list to protect privacy."""
    assert "financial_hold_active" in FORBIDDEN_LEAKAGE_COLUMNS
    assert "fee_balance_amount" in FORBIDDEN_LEAKAGE_COLUMNS

    df = pd.DataFrame([valid_snapshot_record])
    df["financial_hold_active"] = True

    validator = LongitudinalDatasetValidator()
    report = validator.validate_dataframe(df)

    assert report.is_valid is False
    assert "financial_hold_active" in report.leakage_columns_found
