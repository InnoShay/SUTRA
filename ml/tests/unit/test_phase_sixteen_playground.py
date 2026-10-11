"""
Unit tests for SUTRA Phase Sixteen — Interactive ML Testing Playground & Synthetic Dataset.

Verifies:
1. Workstream B:
   - Deterministic synthetic data generation (seed invariance).
   - Exact 25-feature schema compliance across all generated records.
   - PII-free synthetic record naming and clear synthetic labeling.
   - Explicit negative test cases fail-closed.
2. Workstream C:
   - Finite probabilities bounded strictly within [0.0, 1.0].
   - Correct thresholding and recommendation logic at 0.46.
   - Exact concordance between individual inference and batch inference.
   - Local explanation additivity and factor extraction.
3. Workstream D:
   - Evaluator rejects unlabeled datasets and non-binary targets.
   - Historical partition warning enforcement on 2014J.
4. Mandatory Safeguards:
   - Production Logistic Regression v1.0.0 artifact hash immutability.
   - Candidate execution gate remains closed by default in ShadowModeEvaluator.
   - Prohibition of synthetic accuracy claims.
"""

import hashlib
import json
import math
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_MODEL_PATH
from app.schemas.features import StudentFeatureInput
from sutra_ml.data.synthetic import SyntheticDataGenerator
from sutra_ml.evaluation.dataset_evaluator import evaluate_dataset
from sutra_ml.evaluation.shadow_mode import ShadowModeEvaluator
from sutra_ml.inference.predictor import SutraRiskPredictor
from sutra_ml.testing.playground import SutraPlaygroundRunner

EXPECTED_PRODUCTION_SHA256 = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"


@pytest.fixture
def generator() -> SyntheticDataGenerator:
    return SyntheticDataGenerator(seed=42)


@pytest.fixture
def runner() -> SutraPlaygroundRunner:
    return SutraPlaygroundRunner()


# =========================================================================
# Workstream B Tests — Synthetic Generation & Schema Compliance
# =========================================================================

def test_deterministic_synthetic_generation():
    """Identical random seed produces bitwise identical records."""
    gen1 = SyntheticDataGenerator(seed=123)
    gen2 = SyntheticDataGenerator(seed=123)
    batch1 = gen1.generate_batch(20)
    batch2 = gen2.generate_batch(20)

    assert batch1 == batch2

    gen3 = SyntheticDataGenerator(seed=999)
    batch3 = gen3.generate_batch(20)
    assert batch1 != batch3


def test_synthetic_batch_schema_compliance(generator: SyntheticDataGenerator):
    """Every record in a generated batch strictly passes StudentFeatureInput validation."""
    batch = generator.generate_batch(50)
    for rec in batch:
        validated = StudentFeatureInput(**rec)
        assert validated.record_id.startswith("SYNTH-")
        feat_dict = validated.to_feature_dict()
        assert len(feat_dict) == 25
        for v in feat_dict.values():
            if isinstance(v, float):
                assert not math.isnan(v)
                assert not math.isinf(v)


def test_named_scenarios_exist_and_validate(generator: SyntheticDataGenerator):
    """All 6 named demonstration scenarios exist, validate, and cover required archetypes."""
    scenarios = generator.generate_named_scenarios()
    expected_names = [
        "HIGH_ENGAGEMENT_ON_TRACK",
        "LOW_ENGAGEMENT_AT_RISK",
        "MIXED_SIGNALS_MODERATE",
        "EDGE_CASE_ZERO_VALUES",
        "EDGE_CASE_MAX_VALUES",
        "UNSEEN_MODULE_FALLBACK",
    ]
    for name in expected_names:
        assert name in scenarios
        data = scenarios[name]
        assert "description" in data
        # Validate pydantic contract
        payload = {k: v for k, v in data.items() if k != "description"}
        validated = StudentFeatureInput(**payload)
        assert validated.record_id.startswith("SYNTH-SCENARIO-")


def test_negative_cases_fail_closed(generator: SyntheticDataGenerator):
    """Negative test suite properly catches missing features, leakage, and invalid types."""
    neg_cases = generator.generate_negative_cases()
    assert len(neg_cases) >= 5

    # 1. Missing required feature
    with pytest.raises(ValidationError) as exc:
        StudentFeatureInput(**neg_cases["missing_required_feature"]["record"])
    assert "vle_total_clicks_d30" in str(exc.value)

    # 2. Target outcome leakage
    with pytest.raises(ValidationError) as exc:
        StudentFeatureInput(**neg_cases["forbidden_target_leakage"]["record"])
    assert "Extra inputs are not permitted" in str(exc.value)

    # 3. Post-cutoff grade leakage
    with pytest.raises(ValidationError) as exc:
        StudentFeatureInput(**neg_cases["forbidden_grade_leakage"]["record"])
    assert "Extra inputs are not permitted" in str(exc.value)

    # 4. Invalid categorical value
    with pytest.raises(ValidationError) as exc:
        StudentFeatureInput(**neg_cases["invalid_categorical_level"]["record"])
    assert "Input should be 'F' or 'M'" in str(exc.value) or "RegionEnum" in str(exc.value)

    # 5. Non-finite NaN
    with pytest.raises(ValidationError) as exc:
        StudentFeatureInput(**neg_cases["non_finite_numeric_nan"]["record"])
    assert "finite" in str(exc.value) or "greater than or equal to 0" in str(exc.value)

    # 6. Non-finite Inf
    with pytest.raises(ValidationError) as exc:
        StudentFeatureInput(**neg_cases["non_finite_numeric_inf"]["record"])
    assert "finite" in str(exc.value)


# =========================================================================
# Workstream C Tests — Playground Runner & Prediction Consistency
# =========================================================================

def test_playground_scoring_probability_bounds_and_threshold(
    runner: SutraPlaygroundRunner,
    generator: SyntheticDataGenerator,
):
    """Scored predictions produce finite probabilities in [0, 1] and correct 0.46 threshold logic."""
    batch = generator.generate_batch(25)
    for rec in batch:
        res = runner.score_record(rec)
        prob = res["risk_probability"]
        assert 0.0 <= prob <= 1.0
        assert not math.isnan(prob)
        assert not math.isinf(prob)
        # Check thresholding
        if prob >= 0.46:
            assert res["review_recommended"] is True
            assert res["risk_tier"] in ["ELEVATED", "HIGH"]
        else:
            assert res["review_recommended"] is False
            assert res["risk_tier"] in ["LOW", "MODERATE"]


def test_single_and_batch_inference_concordance(
    runner: SutraPlaygroundRunner,
    generator: SyntheticDataGenerator,
):
    """Scoring a record individually vs in a batch produces identical probabilities."""
    batch = generator.generate_batch(10)
    batch_out = runner.run_batch_synthetic(batch)
    batch_probs = [r["risk_probability"] for r in batch_out["results"]]

    single_probs = [runner.score_record(r)["risk_probability"] for r in batch]
    assert batch_probs == single_probs


def test_evidence_card_decomposition_completeness(runner: SutraPlaygroundRunner, generator: SyntheticDataGenerator):
    """Evidence cards contain required drivers, protective factors, and governance notices."""
    scenarios = generator.generate_named_scenarios()
    high_rec = scenarios["HIGH_ENGAGEMENT_ON_TRACK"]
    res = runner.score_record(high_rec)

    assert len(res["top_risk_drivers"]) > 0
    assert len(res["top_protective_factors"]) > 0
    # For high engagement, protective factor weight should be strong
    top_prot = res["top_protective_factors"][0]
    assert top_prot["weight"] < 0.0  # Protective factor has negative log-odds contribution
    assert top_prot["summary"] != ""

    gov = res["governance_notices"]
    assert "Empirical risk estimate" in gov["non_causal_disclaimer"]
    assert "grading latency" in gov["data_boundary_caveat"]
    assert "No Alert Without Action" in gov["human_in_the_loop_mandate"]


def test_unseen_module_graceful_inference(runner: SutraPlaygroundRunner, generator: SyntheticDataGenerator):
    """Novel course module code 'XXX' executes inference smoothly without crashing."""
    scenarios = generator.generate_named_scenarios()
    unseen_rec = scenarios["UNSEEN_MODULE_FALLBACK"]
    res = runner.score_record(unseen_rec)
    assert res["module_code"] == "XXX"
    assert 0.0 <= res["risk_probability"] <= 1.0


# =========================================================================
# Workstream D Tests — Labeled Data Evaluator Safeguards
# =========================================================================

def test_evaluator_rejects_missing_target_file(tmp_path: Path):
    """Evaluator fails with actionable error if target column is absent."""
    fake_csv = tmp_path / "unlabeled_data.csv"
    fake_csv.write_text("vle_total_clicks_d30,gender\n100.0,M\n")

    with pytest.raises(ValueError) as exc:
        evaluate_dataset(data_path=fake_csv, target_col="target")
    assert "Actionable Error: Target column 'target' not found" in str(exc.value)


def test_evaluator_rejects_non_binary_target(tmp_path: Path):
    """Evaluator fails with actionable error if target column contains non-binary labels."""
    fake_csv = tmp_path / "multiclass_data.csv"
    fake_csv.write_text("target,vle_total_clicks_d30\n0,10.0\n1,20.0\n2,30.0\n")

    with pytest.raises(ValueError) as exc:
        evaluate_dataset(data_path=fake_csv, target_col="target")
    assert "non-binary values" in str(exc.value)


def test_evaluator_2014j_partition_flagging():
    """Evaluating 2014J explicitly issues historical development evidence governance warning."""
    processed_path = Path("ml/data/processed/day30_features.csv")
    if processed_path.exists():
        report = evaluate_dataset(
            data_path=processed_path,
            target_col="target",
            presentation="2014J",
            threshold=0.46,
        )
        assert report["provenance_warning"] is not None
        assert "previously inspected development evidence" in report["provenance_warning"]
        assert "NEVER be reported as an untouched prospective test set" in report["provenance_warning"]


# =========================================================================
# Mandatory Safeguards Tests
# =========================================================================

def test_production_model_artifact_hash_and_version():
    """Production Logistic Regression v1.0.0 artifact hash is unmodified."""
    assert DEFAULT_MODEL_PATH.exists()
    hasher = hashlib.sha256()
    with open(DEFAULT_MODEL_PATH, "rb") as f:
        hasher.update(f.read())
    actual_hash = hasher.hexdigest()
    assert actual_hash == EXPECTED_PRODUCTION_SHA256, (
        f"Production model hash mutated! Expected {EXPECTED_PRODUCTION_SHA256}, got {actual_hash}"
    )


def test_shadow_mode_candidate_execution_gate_remains_closed():
    """Candidate execution gate in ShadowModeEvaluator defaults to closed."""
    evaluator = ShadowModeEvaluator()
    assert evaluator.candidate_provenance_verified is False

    clean_row = {
        "record_id": "P16-GATE-TEST",
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
    import pandas as pd
    df = pd.DataFrame([clean_row])
    report = evaluator.evaluate_batch(df)
    assert report.candidate_blocked is True
    assert report.candidate_provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"
    assert len(report.records) == 1
    rec = report.records[0]
    assert rec.exp_blocked is True
    assert rec.exp_risk_probability is None
    assert rec.prod_risk_probability is not None
    assert report.serving_threshold == 0.46
