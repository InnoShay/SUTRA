"""
Tests for strict input validation, data type contracts, and rejection of invalid data.
"""

from typing import Any
from fastapi.testclient import TestClient


def test_missing_required_feature_returns_422(client: TestClient, valid_student_record: dict[str, Any]):
    """Omitting any of the 25 required features must return 422 Unprocessable Entity."""
    incomplete = dict(valid_student_record)
    del incomplete["vle_total_clicks_d30"]

    response = client.post("/predict", json=incomplete)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    assert any("vle_total_clicks_d30" in err["field"] for err in data["detail"])


def test_invalid_numeric_type_returns_422(client: TestClient, valid_student_record: dict[str, Any]):
    """Passing a non-numeric string for a numeric feature must return 422."""
    bad_type = dict(valid_student_record)
    bad_type["studied_credits"] = "one_hundred_and_twenty"

    response = client.post("/predict", json=bad_type)
    assert response.status_code == 422
    data = response.json()
    assert any("studied_credits" in err["field"] for err in data["detail"])


def test_non_finite_numeric_values_rejected_422(client: TestClient):
    """Passing non-finite numeric values (Inf or -Inf) in JSON payload must be rejected."""
    raw_payload = '{"vle_total_clicks_d30": 1e9999}'
    response = client.post(
        "/predict",
        content=raw_payload,
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422


def test_malformed_categorical_gender_returns_422(client: TestClient, valid_student_record: dict[str, Any]):
    """Passing an unpermitted gender category must return 422."""
    bad_gender = dict(valid_student_record)
    bad_gender["gender"] = "NON_BINARY_UNREGISTERED"

    response = client.post("/predict", json=bad_gender)
    assert response.status_code == 422
    data = response.json()
    assert any("gender" in err["field"] for err in data["detail"])


def test_malformed_categorical_region_returns_422(client: TestClient, valid_student_record: dict[str, Any]):
    """Passing an unpermitted geographic region must return 422."""
    bad_region = dict(valid_student_record)
    bad_region["region"] = "Fictional Valley Region"

    response = client.post("/predict", json=bad_region)
    assert response.status_code == 422
    data = response.json()
    assert any("region" in err["field"] for err in data["detail"])


def test_malformed_categorical_imd_band_returns_422(client: TestClient, valid_student_record: dict[str, Any]):
    """Passing an unpermitted deprivation decile must return 422."""
    bad_imd = dict(valid_student_record)
    bad_imd["imd_band"] = "Top 1%"

    response = client.post("/predict", json=bad_imd)
    assert response.status_code == 422
    data = response.json()
    assert any("imd_band" in err["field"] for err in data["detail"])


def test_extra_fields_target_leakage_rejected_422(client: TestClient, valid_student_record: dict[str, Any]):
    """
    Passing target labels, future outcomes, or unpermitted fields must return 422.
    Strict extra='forbid' prevents accidental target leakage into inference.
    """
    leakage_payload = dict(valid_student_record)
    leakage_payload["target"] = 1
    leakage_payload["final_result"] = "Fail"
    leakage_payload["date_unregistration"] = 45

    response = client.post("/predict", json=leakage_payload)
    assert response.status_code == 422
    data = response.json()
    fields_flagged = [err["field"] for err in data["detail"]]
    assert any("target" in f for f in fields_flagged)


def test_never_substitutes_fabricated_student_data(client: TestClient):
    """An invalid request must fail explicitly and never return a fabricated prediction."""
    invalid_payload = {"some_bogus_key": 123}
    response = client.post("/predict", json=invalid_payload)
    assert response.status_code == 422
    data = response.json()
    assert "risk_probability" not in data
    assert "evidence_card" not in data
    assert "detail" in data
