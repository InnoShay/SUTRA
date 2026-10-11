import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from tests.utils import make_jwt


@pytest.mark.asyncio
async def test_batch_ingestion_success(client: AsyncClient, seed_data, db_session: AsyncSession):
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # Create student SYN-1007
    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-1007",
        display_name="Asha (synthetic)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    db_session.add(student)
    await db_session.commit()

    import_payload = {
        "source_system": "canvas_lms_v2",
        "schema_version": "1.0",
        "observations": [
            {
                "external_student_ref": "SYN-1007",
                "domain": "attendance",
                "metric_key": "attendance_rate",
                "value": 0.58,
                "unit": "ratio",
                "quality_state": "valid",
                "event_at": "2026-10-02T00:00:00Z",
                "available_at": "2026-10-02T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "att_001",
                "source_version": 1,
            },
            {
                "external_student_ref": "SYN-1007",
                "domain": "academic",
                "metric_key": "missing_assignments_count",
                "value": 3,
                "unit": "count",
                "quality_state": "valid",
                "event_at": "2026-10-05T00:00:00Z",
                "available_at": "2026-10-05T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "acad_001",
                "source_version": 1,
            },
        ],
        "finance_observations": [
            {
                "external_student_ref": "SYN-1007",
                "fee_support_status": "review_requested",
                "quality_state": "valid",
                "event_at": "2026-10-04T00:00:00Z",
                "available_at": "2026-10-04T12:00:00Z",
                "source_system": "fee_portal",
                "source_record_ref": "fee_001",
                "source_version": 1,
            }
        ],
    }

    idemp_key = str(uuid.uuid4())
    response = await client.post(
        "/api/v1/imports",
        json=import_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": idemp_key,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "completed"
    assert data["rows_received"] == 3
    assert data["rows_accepted"] == 3
    assert data["rows_duplicate"] == 0
    assert data["rows_rejected"] == 0

    # Test idempotency: re-sending identical import returns cached result
    dup_response = await client.post(
        "/api/v1/imports",
        json=import_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": idemp_key,
        },
    )
    assert dup_response.status_code == 201
    assert dup_response.json()["import_id"] == data["import_id"]


@pytest.mark.asyncio
async def test_batch_ingestion_unknown_student_and_invalid_time(client: AsyncClient, seed_data):
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    payload = {
        "source_system": "canvas_lms_v2",
        "schema_version": "1.0",
        "observations": [
            {
                "external_student_ref": "UNKNOWN-9999",
                "domain": "attendance",
                "metric_key": "attendance_rate",
                "value": 0.50,
                "event_at": "2026-10-02T00:00:00Z",
                "available_at": "2026-10-02T12:00:00Z",
                "source_system": "canvas_lms_v2",
                "source_record_ref": "att_unknown",
                "source_version": 1,
            }
        ],
    }

    response = await client.post(
        "/api/v1/imports",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
            "Idempotency-Key": str(uuid.uuid4()),
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "failed"
    assert data["rows_rejected"] == 1
    assert data["row_errors"][0]["code"] == "UNKNOWN_STUDENT_REFERENCE"


@pytest.mark.asyncio
async def test_batch_ingestion_missing_idempotency_key(client: AsyncClient, seed_data):
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    response = await client.post(
        "/api/v1/imports",
        json={"source_system": "test", "schema_version": "1.0"},
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert response.status_code == 400
    assert "Idempotency-Key" in response.text
