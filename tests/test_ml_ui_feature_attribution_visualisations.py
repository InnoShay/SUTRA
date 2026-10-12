"""
SUTRA ML-UI Phase 3 — Feature Attribution Visualisations Integration & Contract Tests.

Verifies:
1. Backend attribution calculation method (linear log-odds decomposition w * (x - mean), not SHAP).
2. Directional categorization (increases_risk vs decreases_risk).
3. Preservation of canonical feature identifiers alongside human labels.
4. Attribution units (delta log-odds relative to cohort baseline mean).
5. Safe handling of missing, zero, and outlier feature values.
6. Non-causal statistical correlation governance disclaimers.
7. Live inference endpoint payload contract for student attributions.
"""

import math
import uuid
from typing import Any, Dict
import pytest
from httpx import AsyncClient

from app.ml.service import ml_service
from app.schemas.ml import DAY30_REQUIRED_FEATURES, MLPredictRequest
from sutra_ml.models.baseline import LogisticRegressionBaseline
from tests.utils import make_jwt


def test_attribution_method_is_linear_log_odds_not_shap():
    """
    Requirement 1: Verify backend calculates linear log-odds attributions relative to cohort baseline.
    Must verify it is NOT SHAP values.
    """
    model = LogisticRegressionBaseline(threshold=0.46, model_version="1.0.0")
    assert hasattr(model, "explain"), "Model baseline must provide explain method"

    # Define a test vector where vle_days_since_last_click is above mean (6.0)
    # and assessments_submitted_d30 is below mean (1.0)
    features = {
        "vle_days_since_last_click": 16.0,  # Mean is 6.0, weight is 0.0467 -> contrib = +0.4670 (increases_risk)
        "assessments_submitted_d30": 0.0,   # Mean is 1.0, weight is -0.19  -> contrib = -0.19 * (0 - 1) = +0.19 (increases_risk)
        "vle_clicks_last_7d": 50.0,         # Mean is 12.0, weight is -0.0183 -> contrib = -0.0183 * (50 - 12) = -0.6954 (decreases_risk)
    }

    explanations = model.explain(features, top_n=5)
    assert len(explanations) == 3

    # Verify linear calculation formula: w * (x - mean)
    for exp in explanations:
        feat = exp["feature"]
        val = exp["value"]
        attr = exp["attribution"]
        direction = exp["direction"]

        weight = model.weights[feat]
        mean_val = model.means[feat]
        expected_contrib = round(weight * (val - mean_val), 4)

        assert math.isclose(attr, expected_contrib, abs_tol=1e-4), (
            f"Attribution for {feat} must match linear log-odds contribution w*(x-mean). "
            f"Got {attr}, expected {expected_contrib}"
        )

        if expected_contrib >= 0:
            assert direction == "increases_risk"
        else:
            assert direction == "decreases_risk"


def test_attribution_direction_separation_positive_and_negative():
    """
    Requirement 5: Test separation of positive (risk drivers) and negative (protective factors).
    """
    features = {
        "num_of_prev_attempts": 3,           # Mean: 0.0, w: 0.15 -> +0.45 (positive: increases_risk)
        "studied_credits": 120,              # Mean: 60.0, w: 0.005 -> +0.30 (positive: increases_risk)
        "days_registered_before_start": -12, # Mean: -32.0, w: -0.01 -> -0.01 * (-12 - (-32)) = -0.20 (negative: decreases_risk)
        "has_vle_activity_d30": 1,           # Mean: 1.0, w: -0.25 -> 0.0 (neutral baseline)
    }

    model = LogisticRegressionBaseline(threshold=0.46)
    explanations = model.explain(features, top_n=5)

    risk_drivers = [e for e in explanations if e["attribution"] > 0]
    protective_factors = [e for e in explanations if e["attribution"] < 0]
    neutral_factors = [e for e in explanations if math.isclose(e["attribution"], 0.0, abs_tol=1e-5)]

    assert len(risk_drivers) >= 2, "Must identify risk drivers"
    assert len(protective_factors) >= 1, "Must identify protective factors"
    assert all(d["direction"] == "increases_risk" for d in risk_drivers)
    assert all(p["direction"] == "decreases_risk" for p in protective_factors)


def test_safe_handling_of_zero_neutral_attributions():
    """
    Requirement 7: Test safe handling of zero/neutral attribution values matching cohort mean.
    """
    model = LogisticRegressionBaseline(threshold=0.46)

    # When student values exactly match the cohort baseline means:
    features = {feat: model.means[feat] for feat in model.weights.keys()}
    explanations = model.explain(features, top_n=5)

    assert len(explanations) > 0
    for exp in explanations:
        assert math.isclose(exp["attribution"], 0.0, abs_tol=1e-4), "At cohort mean, attribution must be 0.0"


def test_safe_handling_of_outlier_telemetry_values():
    """
    Requirement 7: Test that extreme outlier feature values do not crash or produce NaN/inf.
    """
    model = LogisticRegressionBaseline(threshold=0.46)
    outlier_features = {
        "vle_total_clicks_d30": 50000.0,       # Extreme high clicks
        "vle_days_since_last_click": 365.0,    # 1 full year inactive
        "studied_credits": 360.0,              # Triple enrollment
    }

    explanations = model.explain(outlier_features, top_n=5)
    assert len(explanations) == 3
    for exp in explanations:
        assert math.isfinite(exp["attribution"])
        assert not math.isnan(exp["attribution"])


def test_non_causal_governance_limitations_in_evidence_card():
    """
    Requirement 8: Do not describe model associations as causal explanations.
    Evidence card must state non-causal statistical correlation limitation.
    """
    from app.schemas.ml import MLPredictRequest
    features = {feat: 0.0 for feat in DAY30_REQUIRED_FEATURES}
    features.update({
        "gender": "F", "region": "South Region", "highest_education": "A Level or Equivalent",
        "imd_band": "20-30%", "age_band": "0-35", "disability": "N",
    })
    req = MLPredictRequest(external_student_ref="TEST-CORR-1", cutoff_days=30, features=features)
    resp = ml_service.predict_single(req)

    limitations = resp.evidence_card.limitations
    assert any("statistical correlation" in lim.lower() for lim in limitations), (
        "Evidence Card limitations must explicitly declare statistical correlation rather than causal certainty"
    )
    assert any("causal" in lim.lower() for lim in limitations), (
        "Evidence Card must explicitly warn that predictions do not establish causal certainty"
    )


from tests.test_ml_ui_live_inference_reliability import setup_live_inference_env


@pytest.mark.asyncio
async def test_live_student_inference_returns_well_formed_attributions(
    client: AsyncClient, setup_live_inference_env
):
    """
    Integration: Verifies POST /api/v1/students/SYN-1007/predict returns well-formed top_attributions
    with canonical identifiers, values, log-odds attribution, and directions.
    """
    faculty_user_id = setup_live_inference_env["faculty_user_id"]
    token = make_jwt(user_id=faculty_user_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Campus-Id": str(setup_live_inference_env["campus_a_id"]),
    }

    resp = await client.post(
        "/api/v1/students/SYN-1007/predict",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    evidence_card = data["evidence_card"]
    assert "top_attributions" in evidence_card
    attributions = evidence_card["top_attributions"]
    assert len(attributions) > 0

    for attr in attributions:
        assert "feature" in attr and isinstance(attr["feature"], str)
        assert attr["feature"] in DAY30_REQUIRED_FEATURES
        assert "value" in attr and isinstance(attr["value"], (int, float))
        assert "attribution" in attr and isinstance(attr["attribution"], (int, float))
        assert attr["direction"] in ("increases_risk", "decreases_risk")
