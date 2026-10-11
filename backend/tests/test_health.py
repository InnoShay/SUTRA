"""
Tests for health, readiness, and model-info inspection endpoints.
"""

from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """GET /health must return 200 with process health metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "sutra-ml-backend"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data


def test_ready_endpoint_when_model_loaded(client: TestClient):
    """GET /ready must confirm that the selected model is loaded and configured."""
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["model_loaded"] is True
    assert data["model_name"] == "Regularized Logistic Regression Baseline"
    assert data["model_version"] == "v1.0.0"
    assert data["operational_threshold"] == 0.46
    assert data["feature_count"] == 25


def test_ready_endpoint_returns_503_when_unloaded(client: TestClient):
    """GET /ready must return 503 Service Unavailable when model is not loaded."""
    client.app.state.predictor = None
    response = client.get("/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "not_ready"
    assert data["model_loaded"] is False


def test_model_info_returns_exact_contract(client: TestClient):
    """GET /model-info must describe model version, threshold, 25 features, and governance."""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()

    assert data["model_name"] == "Regularized Logistic Regression Baseline"
    assert data["model_version"] == "v1.0.0"
    assert "LogisticRegression" in data["model_type"]
    assert data["decision_threshold"] == 0.46
    assert "Withdrawn or Fail" in data["target_definition"]
    assert "Day 30" in data["observation_window"]

    # Feature breakdown assertions
    features = data["features"]
    assert features["total_count"] == 25
    assert features["numerical_count"] == 19
    assert features["categorical_count"] == 6
    assert len(features["numerical"]) == 19
    assert len(features["categorical"]) == 6

    # Specific key feature presence
    assert "vle_total_clicks_d30" in features["numerical"]
    assert "days_registered_before_start" in features["numerical"]
    assert "highest_education" in features["categorical"]
    assert "imd_band" in features["categorical"]

    # Governance guardrails
    gov = data["safety_governance"]
    assert "human_in_the_loop_mandate" in gov
    assert "assessment_latency_exclusion" in gov
    assert "non_causal_disclaimer" in gov
