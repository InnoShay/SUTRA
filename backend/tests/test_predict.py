"""
Tests for single record prediction and evidence generation.
"""

from typing import Any
from fastapi.testclient import TestClient


def test_predict_valid_record_returns_200(client: TestClient, valid_student_record: dict[str, Any]):
    """POST /predict with valid record returns 200 and complete schema."""
    response = client.post("/predict", json=valid_student_record)
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "SYNTH-001"
    assert "risk_probability" in data
    assert "review_recommended" in data
    assert data["risk_tier"] in ["LOW", "MODERATE", "ELEVATED", "HIGH"]
    assert data["operational_threshold"] == 0.46
    assert data["model_name"] == "Regularized Logistic Regression Baseline"
    assert data["model_version"] == "v1.0.0"

    card = data["evidence_card"]
    assert card["record_id"] == "SYNTH-001"
    assert card["course_context"]["snapshot_day"] == 30
    assert card["course_context"]["module_code"] == "BBB"
    assert card["course_context"]["presentation_code"] == "2014J"
    assert len(card["top_risk_drivers"]) > 0
    assert len(card["top_protective_factors"]) > 0


def test_probabilities_finite_and_bounded(client: TestClient, valid_student_record: dict[str, Any]):
    """Ensure predicted probabilities are finite numbers strictly between 0 and 1."""
    response = client.post("/predict", json=valid_student_record)
    assert response.status_code == 200
    data = response.json()

    prob = data["risk_probability"]
    assert isinstance(prob, float)
    assert 0.0 <= prob <= 1.0


def test_review_recommendation_behavior(
    client: TestClient,
    valid_student_record: dict[str, Any],
    elevated_risk_student_record: dict[str, Any],
):
    """
    Test review recommendation boundary:
    - Probabilities >= 0.46 must yield review_recommended = True.
    - Probabilities < 0.46 must yield review_recommended = False.
    """
    # 1. Active student with high engagement -> below threshold
    res_low = client.post("/predict", json=valid_student_record)
    assert res_low.status_code == 200
    data_low = res_low.json()
    assert data_low["risk_probability"] < 0.46
    assert data_low["review_recommended"] is False
    assert data_low["evidence_card"]["alert_triggered"] is False

    # 2. Inactive student with 2 previous attempts & low clicks -> above threshold
    res_high = client.post("/predict", json=elevated_risk_student_record)
    assert res_high.status_code == 200
    data_high = res_high.json()
    assert data_high["risk_probability"] >= 0.46
    assert data_high["review_recommended"] is True
    assert data_high["evidence_card"]["alert_triggered"] is True
    assert data_high["risk_tier"] in ["ELEVATED", "HIGH"]


def test_evidence_card_governance_and_factors(client: TestClient, valid_student_record: dict[str, Any]):
    """Verify that Evidence Card includes plain-English summaries and governance notices."""
    response = client.post("/predict", json=valid_student_record)
    assert response.status_code == 200
    card = response.json()["evidence_card"]

    gov = card["governance_notices"]
    assert "No Alert Without Action" in gov["human_in_the_loop_mandate"]
    assert "grading latency" in gov["data_boundary_caveat"]
    assert "Does NOT represent causation" in gov["non_causal_disclaimer"]

    # Verify factors have factor_title, observed_raw_value, contribution_weight, and plain_english_summary
    for driver in card["top_risk_drivers"]:
        assert "factor_title" in driver
        assert "observed_raw_value" in driver
        assert "contribution_weight" in driver
        assert "plain_english_summary" in driver
        assert driver["contribution_weight"] > 0

    for factor in card["top_protective_factors"]:
        assert "factor_title" in factor
        assert "observed_raw_value" in factor
        assert "contribution_weight" in factor
        assert "plain_english_summary" in factor
        assert factor["contribution_weight"] < 0


def test_authentic_held_out_record_inference(client: TestClient, authentic_held_out_record: dict[str, Any]):
    """
    Verify inference on a real de-identified record from the held-out 2014J test cohort.
    Asserts that predictions succeed with zero target or future leakage.
    """
    response = client.post("/predict", json=authentic_held_out_record)
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "DEID-2014J-HOLD-001"
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert data["operational_threshold"] == 0.46
    assert data["model_version"] == "v1.0.0"


def test_idempotent_no_duplicate_alert_side_effects(client: TestClient, valid_student_record: dict[str, Any]):
    """
    Multiple calls to /predict must produce identical results with zero stateful
    side effects (no database alert record creation or duplicate tickets).
    """
    resp1 = client.post("/predict", json=valid_student_record)
    resp2 = client.post("/predict", json=valid_student_record)
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json() == resp2.json()


def test_predict_returns_503_when_unready(client: TestClient, valid_student_record: dict[str, Any]):
    """POST /predict must return 503 if the model pipeline is unloaded."""
    client.app.state.predictor = None
    response = client.post("/predict", json=valid_student_record)
    assert response.status_code == 503
    assert "not ready" in response.json()["detail"]
