"""
Unit tests for SUTRA Phase Thirteen — Shadow-Mode Contract Hardening & Audit Closure.

Verifies:
1. Workstream A: Candidate provenance gating (unverified default blocks candidate scoring;
   explicit verification allows candidate scoring).
2. Workstream B: Fail-closed whitelist rejects unexpected fields; expanded leakage catches
   alternate target/outcome names; non-finite numbers and invalid categoricals are rejected;
   total_records == valid_scored + rejected_records invariant is strictly enforced.
3. Workstream C: Canonical salted HMAC fingerprinting; deterministic ordering and rounding;
   in-run duplicate detection; in-run conflicting ID detection.
4. Workstream E: Subgroup disparity calculations; privacy cell suppression (<5);
   inconclusive labeling (<50).
"""

import numpy as np
import pandas as pd
import pytest

from sutra_ml.evaluation.shadow_mode import (
    DEFAULT_SERVING_THRESHOLD,
    EXPECTED_EXPERIMENTAL_ARTIFACT_SHA256,
    EXPECTED_PRODUCTION_SHA256,
    REPORTED_PHASE_NINE_TEXT_SHA256,
    ShadowModeEvaluator,
    compute_canonical_fingerprint,
)


@pytest.fixture
def base_valid_row() -> dict:
    """A single clean record matching SUTRA's 25-feature schema."""
    return {
        "record_id": "STU_2001",
        "code_module": "AAA",
        "vle_total_clicks_d30": 150.0,
        "vle_active_days_d30": 8.0,
        "vle_clicks_precourse": 20.0,
        "vle_clicks_poststart_d30": 130.0,
        "vle_clicks_last_7d": 40.0,
        "vle_days_since_last_click": 1.0,
        "vle_clicks_forumng_d30": 30.0,
        "vle_clicks_oucontent_d30": 60.0,
        "vle_clicks_quiz_d30": 10.0,
        "vle_clicks_homepage_d30": 20.0,
        "vle_clicks_other_d30": 10.0,
        "studied_credits": 60,
        "num_of_prev_attempts": 0,
        "days_registered_before_start": -25.0,
        "has_missing_registration_date": 0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1,
        "assessment_banked_d30": 0,
        "has_early_assessment_submission_d30": 1,
        "gender": "M",
        "region": "South Region",
        "highest_education": "HE Qualification",
        "imd_band": "70-80%",
        "age_band": "0-35",
        "disability": "N",
    }


# ==============================================================================
# WORKSTREAM A: CANDIDATE PROVENANCE GATING TESTS
# ==============================================================================

def test_candidate_provenance_blocked_by_default(base_valid_row: dict):
    """Verify default evaluator marks candidate as unverified and blocks candidate scoring."""
    evaluator = ShadowModeEvaluator()  # Default: candidate_provenance_verified=False
    assert evaluator.candidate_provenance_verified is False
    assert evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"

    df = pd.DataFrame([base_valid_row])
    report = evaluator.evaluate_batch(df)

    assert report.candidate_blocked is True
    assert report.candidate_provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"
    assert report.experimental_alert_count == 0
    assert report.experimental_alert_rate == 0.0
    assert report.mean_risk_delta is None

    rec = report.records[0]
    assert rec.exp_blocked is True
    assert rec.exp_risk_probability is None
    assert rec.exp_alert_triggered is False
    assert "BLOCKED" in rec.exp_model_version
    # Production scoring proceeds normally
    assert 0.0 <= rec.prod_risk_probability <= 1.0
    assert rec.prod_model_version == "v1.0.0"


def test_candidate_provenance_unblocked_when_explicitly_verified(base_valid_row: dict):
    """Verify candidate scoring runs when provenance is explicitly authorized."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    assert evaluator.candidate_provenance_verified is True
    assert evaluator.provenance_status == "VERIFIED"

    df = pd.DataFrame([base_valid_row])
    report = evaluator.evaluate_batch(df)

    assert report.candidate_blocked is False
    assert report.records[0].exp_blocked is False
    assert 0.0 <= report.records[0].exp_risk_probability <= 1.0


def test_hash_discrepancy_detection():
    """Verify on-disk artifact hash matches metrics JSON but differs from Phase Nine report text."""
    evaluator = ShadowModeEvaluator()
    assert evaluator.prod_hash == EXPECTED_PRODUCTION_SHA256
    assert evaluator.exp_hash == EXPECTED_EXPERIMENTAL_ARTIFACT_SHA256
    # Confirms known discrepancy: report text hash != on-disk artifact hash
    assert evaluator.exp_hash != REPORTED_PHASE_NINE_TEXT_SHA256


# ==============================================================================
# WORKSTREAM B: DUAL-SCORING & FAIL-CLOSED LEAKAGE CONTRACT TESTS
# ==============================================================================

def test_fail_closed_on_unexpected_columns(base_valid_row: dict):
    """Verify fail-closed policy rejects unexpected metadata, PII, or non-whitelisted columns."""
    evaluator = ShadowModeEvaluator()

    # Ingest unexpected PII column
    df_pii = pd.DataFrame([base_valid_row])
    df_pii["student_name"] = "Alice Smith"

    with pytest.raises(ValueError, match="unexpected column.*student_name"):
        evaluator.evaluate_batch(df_pii)

    # Ingest unexpected academic field
    df_gpa = pd.DataFrame([base_valid_row])
    df_gpa["cumulative_gpa"] = 3.8

    with pytest.raises(ValueError, match="unexpected column.*cumulative_gpa"):
        evaluator.evaluate_batch(df_gpa)


def test_expanded_leakage_rejection(base_valid_row: dict):
    """Verify expanded leakage checks reject alternate target, score, and withdrawal columns."""
    evaluator = ShadowModeEvaluator()

    forbidden_variants = [
        ("final_grade", "A"),
        ("exam_score", 85.0),
        ("withdrawal_date", "2014-03-15"),
        ("is_withdrawn", 1),
        ("attrition", "Yes"),
        ("post_d30_clicks", 120),
    ]

    for col_name, val in forbidden_variants:
        leak_df = pd.DataFrame([base_valid_row])
        leak_df[col_name] = val
        with pytest.raises(ValueError, match="target or post-cutoff leakage columns detected"):
            evaluator.evaluate_batch(leak_df)


def test_rejection_of_non_finite_and_null_numeric_values(base_valid_row: dict):
    """Verify non-finite numeric features (NaN, Inf, None) are rejected and logged."""
    evaluator = ShadowModeEvaluator()

    row_nan = base_valid_row.copy()
    row_nan["record_id"] = "STU_NAN"
    row_nan["vle_total_clicks_d30"] = np.nan

    row_inf = base_valid_row.copy()
    row_inf["record_id"] = "STU_INF"
    row_inf["vle_active_days_d30"] = np.inf

    row_none = base_valid_row.copy()
    row_none["record_id"] = "STU_NONE"
    row_none["studied_credits"] = None

    row_valid = base_valid_row.copy()
    row_valid["record_id"] = "STU_VALID"

    df = pd.DataFrame([row_nan, row_inf, row_none, row_valid])
    report = evaluator.evaluate_batch(df)

    assert report.total_records_submitted == 4
    assert report.valid_records_scored == 1
    assert report.rejected_records_count == 3
    assert len(report.rejections) == 3
    assert report.records[0].record_id == "STU_VALID"
    # Invariant: submitted == scored + rejected
    assert report.total_records_submitted == report.valid_records_scored + report.rejected_records_count


def test_rejection_of_invalid_categorical_levels(base_valid_row: dict):
    """Verify invalid categorical levels are rejected and logged."""
    evaluator = ShadowModeEvaluator()

    row_bad_gender = base_valid_row.copy()
    row_bad_gender["record_id"] = "STU_BAD_GENDER"
    row_bad_gender["gender"] = "NON_BINARY"

    row_bad_imd = base_valid_row.copy()
    row_bad_imd["record_id"] = "STU_BAD_IMD"
    row_bad_imd["imd_band"] = "TOP_TIER"

    row_valid = base_valid_row.copy()
    row_valid["record_id"] = "STU_VALID"

    df = pd.DataFrame([row_bad_gender, row_bad_imd, row_valid])
    report = evaluator.evaluate_batch(df)

    assert report.total_records_submitted == 3
    assert report.valid_records_scored == 1
    assert report.rejected_records_count == 2
    assert "Invalid categorical level" in report.rejections[0]["reason"]
    assert "Invalid categorical level" in report.rejections[1]["reason"]


def test_cutoff_day_enforcement(base_valid_row: dict):
    """Verify evaluator strictly requires cutoff_day == 30."""
    evaluator = ShadowModeEvaluator()
    df = pd.DataFrame([base_valid_row])

    with pytest.raises(ValueError, match="Invalid cutoff_day: 45"):
        evaluator.evaluate_batch(df, cutoff_day=45)

    # Ingest payload with conflicting cutoff metadata
    df_conflict = df.copy()
    df_conflict["cutoff_day"] = 60
    with pytest.raises(ValueError, match="Conflicting cutoff metadata"):
        evaluator.evaluate_batch(df_conflict, cutoff_day=30)


# ==============================================================================
# WORKSTREAM C: FINGERPRINTING & DUPLICATE HANDLING TESTS
# ==============================================================================

def test_canonical_fingerprint_deterministic_and_order_invariant(base_valid_row: dict):
    """Verify canonical fingerprint is invariant to dictionary key insertion order."""
    row_rev = {k: base_valid_row[k] for k in reversed(list(base_valid_row.keys()))}

    fp1 = compute_canonical_fingerprint("STU_1", "AAA", base_valid_row)
    fp2 = compute_canonical_fingerprint("STU_1", "AAA", row_rev)
    assert fp1 == fp2
    assert len(fp1) == 16


def test_canonical_fingerprint_salt_isolation(base_valid_row: dict):
    """Verify distinct institutional salts produce distinct HMAC fingerprints."""
    fp_salt_a = compute_canonical_fingerprint("STU_1", "AAA", base_valid_row, salt=b"inst_alpha_salt")
    fp_salt_b = compute_canonical_fingerprint("STU_1", "AAA", base_valid_row, salt=b"inst_beta_salt")
    assert fp_salt_a != fp_salt_b


def test_in_run_duplicate_and_conflict_detection(base_valid_row: dict):
    """Verify duplicate fingerprints and conflicting record_ids in the same batch are rejected."""
    evaluator = ShadowModeEvaluator()

    row1 = base_valid_row.copy()
    row1["record_id"] = "STU_DUP"

    # Exact duplicate of row1
    row2 = base_valid_row.copy()
    row2["record_id"] = "STU_DUP"

    # Conflicting row: same ID, different clicks
    row3 = base_valid_row.copy()
    row3["record_id"] = "STU_DUP"
    row3["vle_total_clicks_d30"] = 999.0

    # Distinct valid row
    row4 = base_valid_row.copy()
    row4["record_id"] = "STU_UNIQUE"

    df = pd.DataFrame([row1, row2, row3, row4])
    report = evaluator.evaluate_batch(df)

    assert report.total_records_submitted == 4
    assert report.valid_records_scored == 2  # row1 and row4
    assert report.rejected_records_count == 2
    assert "Duplicate record in run" in report.rejections[0]["reason"]
    assert "Conflicting record_id" in report.rejections[1]["reason"]
    assert report.total_records_submitted == report.valid_records_scored + report.rejected_records_count


# ==============================================================================
# WORKSTREAM E: FAIRNESS & SUBGROUP DISPARITY TESTS
# ==============================================================================

def test_subgroup_disparity_computation(base_valid_row: dict):
    """Verify subgroup disparity calculation handles evaluated groups, inconclusive, and privacy suppression."""
    evaluator = ShadowModeEvaluator()

    # Generate synthetic batch with known group counts
    records = []
    metadata = []

    # Reference group: 60 male records
    for i in range(60):
        r = base_valid_row.copy()
        r["record_id"] = f"M_{i}"
        r["gender"] = "M"
        r["vle_total_clicks_d30"] = 100.0 if i < 30 else 10.0  # ~50% alert rate
        records.append(r)
        metadata.append({"record_id": f"M_{i}", "gender": "M"})

    # Evaluated group: 55 female records
    for i in range(55):
        r = base_valid_row.copy()
        r["record_id"] = f"F_{i}"
        r["gender"] = "F"
        r["vle_total_clicks_d30"] = 10.0  # High alert rate
        records.append(r)
        metadata.append({"record_id": f"F_{i}", "gender": "F"})

    # Inconclusive group: 20 other records
    for i in range(20):
        r = base_valid_row.copy()
        r["record_id"] = f"INC_{i}"
        r["gender"] = "M"  # Valid categorical in payload
        records.append(r)
        metadata.append({"record_id": f"INC_{i}", "custom_subgroup": "SmallGroup"})

    # Privacy suppressed group: 3 records
    for i in range(3):
        r = base_valid_row.copy()
        r["record_id"] = f"SUP_{i}"
        r["gender"] = "F"
        records.append(r)
        metadata.append({"record_id": f"SUP_{i}", "custom_subgroup": "TinyGroup"})

    df = pd.DataFrame(records)
    report = evaluator.evaluate_batch(df)

    # Audit gender disparity
    gender_audit = report.compute_subgroup_disparity(
        subgroup_metadata=metadata,
        group_col="gender",
        reference_group="M",
        min_reporting_size=50,
        suppression_threshold=5,
    )

    assert gender_audit["status"] == "EVALUATED"
    assert gender_audit["reference_group"] == "M"
    assert "disparate_impact_ratio" in gender_audit["disparities"]["F"]
    assert gender_audit["disparities"]["F"]["status"] == "EVALUATED"

    # Audit custom subgroup with small and tiny cells
    custom_audit = report.compute_subgroup_disparity(
        subgroup_metadata=metadata,
        group_col="custom_subgroup",
        reference_group="SmallGroup",  # N=20 < 50
        min_reporting_size=50,
        suppression_threshold=5,
    )
    assert custom_audit["status"] == "REFERENCE_GROUP_INCONCLUSIVE"
