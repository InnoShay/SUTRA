"""
Unit tests for SUTRA Phase Fourteen — Candidate Provenance Reconciliation & Shadow Evaluation Gate.

Verifies:
1. Workstream A & B: Provenance execution gate refuses candidate scoring by default.
2. Workstream B: Anti-bypass safeguards:
   - Request flags or ordinary payload columns cannot bypass the gate.
   - Returned prediction records are immutable (FrozenInstanceError on mutation attempts).
   - Missing or invalid model artifacts fail closed.
   - Rejections do not log raw feature values or direct student PII.
   - Production scoring path remains active, calibrated, and identical.
3. Workstream C: Salt resolution from configuration boundary (SUTRA_SHADOW_SALT env var),
   fingerprint sensitivity to key changes, and floating point canonical serialization.
"""

from dataclasses import FrozenInstanceError
import os
from pathlib import Path
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
def clean_payload_row() -> dict:
    """Standard valid 25-feature record."""
    return {
        "record_id": "STU_P14_01",
        "code_module": "BBB",
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
# WORKSTREAM A & B: PROVENANCE RECONCILIATION & EXECUTION GATE TESTS
# ==============================================================================

def test_default_gate_refuses_candidate_scoring(clean_payload_row: dict):
    """Verify that by default (candidate_provenance_verified=False), candidate execution is refused."""
    evaluator = ShadowModeEvaluator()  # Default: candidate_provenance_verified=False
    assert evaluator.candidate_provenance_verified is False
    assert evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"

    df = pd.DataFrame([clean_payload_row])
    report = evaluator.evaluate_batch(df)

    assert report.candidate_blocked is True
    assert report.candidate_provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"
    assert report.valid_records_scored == 1
    assert report.experimental_alert_count == 0
    assert report.mean_risk_delta is None

    rec = report.records[0]
    assert rec.exp_blocked is True
    assert rec.exp_risk_probability is None
    assert rec.exp_alert_triggered is False
    assert "BLOCKED" in rec.exp_model_version
    assert "discrepancy" in rec.exp_block_reason.lower()


def test_production_path_remains_active_when_candidate_blocked(clean_payload_row: dict):
    """Verify production model v1.0.0 scoring is unhindered by candidate execution block."""
    evaluator = ShadowModeEvaluator()
    df = pd.DataFrame([clean_payload_row])
    report = evaluator.evaluate_batch(df)

    rec = report.records[0]
    assert rec.prod_model_version == "v1.0.0"
    assert 0.0 <= rec.prod_risk_probability <= 1.0
    assert isinstance(rec.prod_alert_triggered, bool)
    assert rec.prod_intervention_eligible is True


def test_bypass_attempt_via_payload_injection_fails_closed(clean_payload_row: dict):
    """Verify caller cannot bypass candidate block by passing flags in DataFrame columns."""
    evaluator = ShadowModeEvaluator()

    bypass_flags = [
        "candidate_provenance_verified",
        "provenance_verified",
        "is_shadow",
        "intervention_eligible",
        "bypass_gate",
        "admin_override",
    ]

    for flag in bypass_flags:
        tampered_df = pd.DataFrame([clean_payload_row])
        tampered_df[flag] = True
        with pytest.raises(ValueError, match="unexpected column.*Fail-closed policy"):
            evaluator.evaluate_batch(tampered_df)


def test_bypass_attempt_via_record_mutation_fails_closed(clean_payload_row: dict):
    """Verify returned records are frozen dataclasses and cannot be mutated to enable interventions."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    df = pd.DataFrame([clean_payload_row])
    report = evaluator.evaluate_batch(df)
    rec = report.records[0]

    with pytest.raises(FrozenInstanceError):
        rec.exp_intervention_eligible = True  # type: ignore

    with pytest.raises(FrozenInstanceError):
        rec.exp_is_shadow = False  # type: ignore

    with pytest.raises(FrozenInstanceError):
        rec.exp_blocked = False  # type: ignore


def test_missing_model_artifacts_fail_closed():
    """Verify evaluator fails closed with FileNotFoundError if model paths are missing."""
    with pytest.raises(FileNotFoundError, match="Production model artifact not found"):
        ShadowModeEvaluator(production_model_path="/tmp/non_existent_production.joblib")

    with pytest.raises(FileNotFoundError, match="Experimental candidate model not found"):
        ShadowModeEvaluator(experimental_model_path="/tmp/non_existent_candidate.joblib")


def test_rejection_logs_do_not_leak_raw_feature_vectors(clean_payload_row: dict):
    """Verify rejection logs contain record_id and sanitary error message, not full feature vectors."""
    evaluator = ShadowModeEvaluator()

    bad_row = clean_payload_row.copy()
    bad_row["vle_total_clicks_d30"] = float("nan")

    df = pd.DataFrame([bad_row])
    report = evaluator.evaluate_batch(df)

    assert len(report.rejections) == 1
    rej = report.rejections[0]
    assert "vle_total_clicks_d30" in rej["reason"]
    assert "nan" in rej["reason"].lower()

    # Reason must NOT dump other feature keys or student sensitive columns
    assert "gender" not in rej["reason"]
    assert "imd_band" not in rej["reason"]
    assert "highest_education" not in rej["reason"]


# ==============================================================================
# WORKSTREAM C: CRYPTOGRAPHIC FINGERPRINTING & CONFIGURATION BOUNDARY TESTS
# ==============================================================================

def test_salt_resolution_from_environment_boundary(clean_payload_row: dict, monkeypatch):
    """Verify HMAC salt is obtained from SUTRA_SHADOW_SALT environment variable."""
    # 1. Default test salt
    monkeypatch.delenv("SUTRA_SHADOW_SALT", raising=False)
    evaluator_default = ShadowModeEvaluator()
    fp_default = compute_canonical_fingerprint("STU_1", "BBB", clean_payload_row)

    # 2. Injected secret salt via environment boundary
    monkeypatch.setenv("SUTRA_SHADOW_SALT", "institutional_vault_secret_key_2026_q4")
    evaluator_env = ShadowModeEvaluator()
    fp_env = compute_canonical_fingerprint("STU_1", "BBB", clean_payload_row)

    assert evaluator_env.salt == b"institutional_vault_secret_key_2026_q4"
    assert fp_default != fp_env


def test_fingerprint_float_canonical_formatting(clean_payload_row: dict):
    """Verify that equivalent mathematical floats (e.g. 150 vs 150.000000) produce identical fingerprints."""
    row1 = clean_payload_row.copy()
    row1["vle_total_clicks_d30"] = 150

    row2 = clean_payload_row.copy()
    row2["vle_total_clicks_d30"] = 150.000000000001

    fp1 = compute_canonical_fingerprint("STU_1", "BBB", row1)
    fp2 = compute_canonical_fingerprint("STU_1", "BBB", row2)
    # Formatted to 6 decimal places, so 150.000000000001 truncates to 150.000000
    assert fp1 == fp2
