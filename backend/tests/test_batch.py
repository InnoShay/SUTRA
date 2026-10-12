"""
Tests for bounded batch prediction endpoint /predict/batch.
"""

from typing import Any
from fastapi.testclient import TestClient


def test_batch_predict_valid_records(
    client: TestClient,
    valid_student_record: dict[str, Any],
    elevated_risk_student_record: dict[str, Any],
):
    """POST /predict/batch scores multiple records and provides aggregate counts."""
    payload = {
        "records": [
            valid_student_record,
            elevated_risk_student_record,
        ]
    }

    response = client.post("/predict/batch", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["total_records"] == 2
    assert data["review_recommended_count"] == 1
    assert len(data["predictions"]) == 2

    p0 = data["predictions"][0]
    p1 = data["predictions"][1]

    assert p0["review_recommended"] is False
    assert p1["review_recommended"] is True
    assert p0["risk_probability"] < 0.46
    assert p1["risk_probability"] >= 0.46


def test_batch_predict_rejects_empty_list(client: TestClient):
    """POST /predict/batch with empty records list must return 422."""
    payload = {"records": []}
    response = client.post("/predict/batch", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert any("records" in err["field"] for err in data["detail"])


def test_batch_predict_rejects_over_limit(
    client: TestClient,
    valid_student_record: dict[str, Any],
):
    """POST /predict/batch with more than 100 records must return 422."""
    payload = {"records": [dict(valid_student_record) for _ in range(101)]}
    response = client.post("/predict/batch", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert any("records" in err["field"] for err in data["detail"])


def test_batch_predict_rejects_if_any_record_invalid(
    client: TestClient,
    valid_student_record: dict[str, Any],
):
    """If any record in the batch violates the schema, the request must fail with 422."""
    bad_record = dict(valid_student_record)
    del bad_record["highest_education"]

    payload = {
        "records": [
            valid_student_record,
            bad_record,
        ]
    }
    response = client.post("/predict/batch", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert any("highest_education" in err["field"] for err in data["detail"])
