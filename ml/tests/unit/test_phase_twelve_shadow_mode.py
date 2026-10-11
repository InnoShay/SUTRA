"""
Unit tests for SUTRA Phase Twelve — Prospective Shadow-Mode Readiness.

Verifies:
1. Production v1.0.0 artifacts and threshold (0.46) remain strictly unmodified.
2. ShadowModeEvaluator performs dual read-only scoring with strict isolation.
3. Experimental candidate predictions are unconditionally blinded from intervention
   (is_shadow=True, intervention_eligible=False).
4. Target leakage columns and post-cutoff features are strictly rejected.
5. Schema validation rejects payloads missing required features.
6. Unseen course modules fall back to global statistics without failing.
7. Audit metadata (UUID run_id, timestamps, model hashes, record fingerprints) are generated.
"""

from pathlib import Path
import pandas as pd
import pytest

from sutra_ml.evaluation.shadow_mode import (
    DEFAULT_SERVING_THRESHOLD,
    EXPECTED_EXPERIMENTAL_SHA256,
    EXPECTED_PRODUCTION_SHA256,
    SUTRA_25_FEATURES,
    ShadowModeEvaluator,
)


@pytest.fixture
def sample_payload() -> pd.DataFrame:
    """Construct a clean 2-record synthetic DataFrame matching SUTRA's 25-feature schema."""
    records = [
        {
            "record_id": "STU_1001",
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
        },
        {
            "record_id": "STU_1002",
            "code_module": "BBB",
            "vle_total_clicks_d30": 10.0,
            "vle_active_days_d30": 1.0,
            "vle_clicks_precourse": 0.0,
            "vle_clicks_poststart_d30": 10.0,
            "vle_clicks_last_7d": 0.0,
            "vle_days_since_last_click": 12.0,
            "vle_clicks_forumng_d30": 0.0,
            "vle_clicks_oucontent_d30": 5.0,
            "vle_clicks_quiz_d30": 0.0,
            "vle_clicks_homepage_d30": 5.0,
            "vle_clicks_other_d30": 0.0,
            "studied_credits": 120,
            "num_of_prev_attempts": 1,
            "days_registered_before_start": -5.0,
            "has_missing_registration_date": 0,
            "has_vle_activity_d30": 1,
            "assessments_submitted_d30": 0,
            "assessment_banked_d30": 0,
            "has_early_assessment_submission_d30": 0,
            "gender": "F",
            "region": "London Region",
            "highest_education": "Lower Than A Level",
            "imd_band": "10-20",
            "age_band": "35-55",
            "disability": "Y",
        },
    ]
    return pd.DataFrame(records)


def test_production_hash_and_threshold_immutability():
    """Verify production baseline model hash and threshold 0.46 remain untouched."""
    evaluator = ShadowModeEvaluator()
    assert evaluator.prod_hash == EXPECTED_PRODUCTION_SHA256
    assert evaluator.exp_hash == EXPECTED_EXPERIMENTAL_SHA256
    assert evaluator.threshold == DEFAULT_SERVING_THRESHOLD


def test_shadow_evaluator_dual_scoring(sample_payload: pd.DataFrame):
    """Verify dual read-only scoring executes correctly and returns paired results."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    report = evaluator.evaluate_batch(sample_payload)

    assert report.total_records_submitted == 2
    assert report.valid_records_scored == 2
    assert report.rejected_records_count == 0
    assert len(report.records) == 2

    for rec in report.records:
        assert 0.0 <= rec.prod_risk_probability <= 1.0
        assert 0.0 <= rec.exp_risk_probability <= 1.0
        assert rec.prod_model_version == "v1.0.0"
        assert rec.exp_model_version == "phase_nine_module_relative"


def test_experimental_intervention_blinding(sample_payload: pd.DataFrame):
    """Verify experimental candidate predictions are strictly blocked from intervention."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    report = evaluator.evaluate_batch(sample_payload)

    for rec in report.records:
        # Experimental predictions MUST be blinded
        assert rec.exp_is_shadow is True
        assert rec.exp_intervention_eligible is False
        # Production predictions retain eligibility for standard human review
        assert rec.prod_intervention_eligible is True


def test_leakage_rejection(sample_payload: pd.DataFrame):
    """Verify any payload containing post-cutoff or target columns is immediately rejected."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    
    # Attempt to inject final_result
    leakage_df = sample_payload.copy()
    leakage_df["final_result"] = ["Fail", "Pass"]

    with pytest.raises(ValueError, match="target or post-cutoff leakage columns detected"):
        evaluator.evaluate_batch(leakage_df)

    # Attempt to inject date_unregistration
    leakage_df2 = sample_payload.copy()
    leakage_df2["date_unregistration"] = [15.0, None]

    with pytest.raises(ValueError, match="target or post-cutoff leakage columns detected"):
        evaluator.evaluate_batch(leakage_df2)


def test_missing_feature_rejection(sample_payload: pd.DataFrame):
    """Verify payloads missing any required feature column are rejected."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    incomplete_df = sample_payload.drop(columns=["vle_total_clicks_d30"])

    with pytest.raises(ValueError, match="missing required feature columns"):
        evaluator.evaluate_batch(incomplete_df)


def test_unseen_module_handling_in_shadow_mode(sample_payload: pd.DataFrame):
    """Verify unseen modules fall back gracefully and are tracked in audit statistics."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    unseen_df = sample_payload.copy()
    unseen_df.loc[0, "code_module"] = "COMPUTING_999"

    report = evaluator.evaluate_batch(unseen_df)
    assert report.valid_records_scored == 2
    assert report.unseen_module_count == 1
    assert 0.0 <= report.records[0].exp_risk_probability <= 1.0


def test_audit_metadata_and_idempotent_fingerprinting(sample_payload: pd.DataFrame):
    """Verify UUID run_id, timestamp, hashes, and record fingerprints are recorded."""
    evaluator = ShadowModeEvaluator(candidate_provenance_verified=True)
    report1 = evaluator.evaluate_batch(sample_payload)
    report2 = evaluator.evaluate_batch(sample_payload)

    # Each execution gets a fresh UUID run_id
    assert report1.run_id != report2.run_id
    assert report1.timestamp_utc is not None
    assert report1.production_model_hash == EXPECTED_PRODUCTION_SHA256
    assert report1.experimental_model_hash == EXPECTED_EXPERIMENTAL_SHA256

    # Record fingerprints for identical data payloads are deterministic
    assert report1.records[0].record_fingerprint == report2.records[0].record_fingerprint
    assert len(report1.records[0].record_fingerprint) == 16
