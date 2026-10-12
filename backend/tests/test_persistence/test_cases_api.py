"""
Integration tests for SUTRA Phase 4 FastAPI Endpoints:
Authorization boundaries, Review Queue, Decisions, Tasks, Follow-ups, Outcomes, and Audit Verification.
"""

import os
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.orchestration.persistence.db import create_connection, init_db
from backend.app.orchestration.persistence.models import (
    AdvisorDecisionKind,
    OutcomeStatus,
    TaskStatus,
)


@pytest.fixture
def client(tmp_path):
    """Create test client backed by an isolated SQLite database file."""
    db_file = str(tmp_path / "test_api_ledger.db")
    os.environ["SUTRA_DB_PATH"] = db_file
    os.environ["SUTRA_ENV"] = "development"
    os.environ["SUTRA_DEMO_AUTH_ENABLED"] = "true"

    conn = create_connection(db_file)
    init_db(conn)

    app = create_app()
    app.state.db_conn = conn

    with TestClient(app) as test_client:
        yield test_client

    if "SUTRA_DB_PATH" in os.environ:
        del os.environ["SUTRA_DB_PATH"]


def test_auth_and_campus_isolation_boundary(client: TestClient):
    """
    Verify:
    1. Authorized advisor can access campus case.
    2. Remote advisor gets 403 Forbidden trying to access cross-campus case.
    3. Client-supplied headers cannot elevate privileges.
    """
    # 1. Seed a case on CAMPUS-MAIN
    seed_res = client.post(
        "/api/v1/cases/seed",
        json={"scenario_name": "LOW_ENGAGEMENT_AT_RISK", "campus_id": "CAMPUS-MAIN"},
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert seed_res.status_code == 200
    case_data = seed_res.json()
    case_id = case_data["case"]["case_id"]

    # 2. ADV-MAIN-01 accessing the case succeeds
    res_main = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert res_main.status_code == 200
    assert res_main.json()["case"]["case_id"] == case_id

    # 3. ADV-REMOTE-02 (CAMPUS-REMOTE) attempting to access CAMPUS-MAIN case gets 403 Forbidden
    res_remote = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": "Bearer demo-token-ADV-REMOTE-02"},
    )
    assert res_remote.status_code == 403
    assert "access denied" in res_remote.json()["detail"].lower()

    # 4. Attempting to spoof identity with client-supplied headers (e.g. X-Role, X-Campus) is ignored
    res_spoof = client.get(
        f"/api/v1/cases/{case_id}",
        headers={
            "Authorization": "Bearer demo-token-ADV-REMOTE-02",
            "X-Role": "SYSTEM_ADMIN",
            "X-Campus-ID": "CAMPUS-MAIN",
        },
    )
    assert res_spoof.status_code == 403

    # 5. SYSTEM_ADMIN (ADMIN-01) has cross-campus audit oversight
    res_admin = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": "Bearer demo-token-ADMIN-01"},
    )
    assert res_admin.status_code == 200


def test_mock_auth_refuses_external_hosts(client: TestClient):
    """Verify demo auth refuses requests originating from non-localhost Host header."""
    res = client.get(
        "/api/v1/cases",
        headers={
            "Host": "api.external-university.edu",
            "Authorization": "Bearer demo-token-ADV-MAIN-01",
        },
    )
    assert res.status_code == 403
    assert "localhost binding required" in res.json()["detail"].lower()


def test_production_auth_fails_closed_when_unconfigured(client: TestClient):
    """Verify system fails closed with 503 when SUTRA_ENV=production."""
    with patch.dict(os.environ, {"SUTRA_ENV": "production"}):
        res = client.get(
            "/api/v1/cases",
            headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
        )
        assert res.status_code == 503
        assert "fails closed" in res.json()["detail"].lower()


def test_review_queue_and_decision_lifecycle_via_api(client: TestClient):
    """
    Full end-to-end API lifecycle:
    Seed Case -> Review Queue -> Detail -> Approve Decision -> Complete Task -> Separate Outcome -> Verify Audit.
    """
    # 1. Seed Case
    seed_res = client.post(
        "/api/v1/cases/seed",
        json={"scenario_name": "LOW_ENGAGEMENT_AT_RISK", "campus_id": "CAMPUS-MAIN"},
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert seed_res.status_code == 200
    case_id = seed_res.json()["case"]["case_id"]

    # 2. Screen A: Review Queue
    queue_res = client.get(
        "/api/v1/cases",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert queue_res.status_code == 200
    queue_items = queue_res.json()
    assert len(queue_items) >= 1
    target_summary = next(q for q in queue_items if q["case_id"] == case_id)
    assert target_summary["risk_tier"] == "HIGH"
    assert target_summary["validation_passed"] is True
    assert target_summary["challenge_flags_count"] >= 1
    assert target_summary["status"] == "DRAFT_AWAITING_REVIEW"

    # 3. Screen B: Case Detail
    detail_res = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["evidence_card"]["record_id"] == "SYNTH-SCENARIO-LOW-02"
    assert detail["signal_interpretation"] is not None
    assert detail["intervention_proposal"] is not None
    assert detail["current_plan"]["version_number"] == 1
    assert detail["evidence_challenge"] is not None
    assert len(detail["tasks"]) == 0  # No tasks prior to approval

    # 4. Screen C: Submit APPROVE Decision
    dec_res = client.post(
        f"/api/v1/cases/{case_id}/decision",
        json={
            "decision_kind": "APPROVE",
            "reviewed_plan_version": 1,
            "notes": "Plan approved following advisor consultation.",
            "idempotency_key": "KEY-DEMO-001",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert dec_res.status_code == 200
    approved_detail = dec_res.json()
    assert approved_detail["case"]["status"] == "APPROVED"
    assert len(approved_detail["tasks"]) == 3  # 3 tasks created from plan

    # 5. Fetch Tasks Endpoint
    tasks_res = client.get(
        f"/api/v1/cases/{case_id}/tasks",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()
    assert len(tasks) == 3
    task_1 = tasks[0]

    # 6. Screen D: Update Task Execution Status
    task_up_res = client.patch(
        f"/api/v1/tasks/{task_1['task_id']}/status",
        json={
            "status": "COMPLETED",
            "completion_note": "Advisor conducted diagnostic phone check-in.",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert task_up_res.status_code == 200
    assert task_up_res.json()["status"] == "COMPLETED"

    # CRITICAL CHECK: Case outcome remains UNOBSERVED after task completion
    check_case = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    ).json()
    assert check_case["case"]["outcome_status"] == "UNOBSERVED"

    # 7. Record Follow-up Note
    fu_res = client.post(
        f"/api/v1/cases/{case_id}/follow-up",
        json={
            "task_id": task_1["task_id"],
            "observation_note": "Student stated work schedule conflicted with early morning sessions.",
            "evidence_reference": "vle_active_days_d30",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert fu_res.status_code == 200
    assert fu_res.json()["follow_up_id"].startswith("FU-")

    # 8. Record Student Outcome Separately
    outcome_res = client.post(
        f"/api/v1/cases/{case_id}/outcome",
        json={
            "outcome_status": "RECORDED",
            "outcome_summary": "Passed Module BBB on final assessment with 68% score.",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert outcome_res.status_code == 200
    assert outcome_res.json()["outcome_status"] == "RECORDED"

    # 9. Verify Audit Ledger
    audit_res = client.get(
        f"/api/v1/audit/verify?case_id={case_id}",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert audit_res.status_code == 200
    audit_ver = audit_res.json()
    assert audit_ver["is_valid"] is True
    assert audit_ver["total_events"] >= 6
    assert audit_ver["corrupted_seq_id"] is None


def test_static_review_interface_served(client: TestClient):
    """Verify frontend single-page advisor review interface is served at /app/ and /."""
    res_root = client.get("/", follow_redirects=False)
    assert res_root.status_code in (307, 302)
    assert res_root.headers["location"] == "/app/"

    res_app = client.get("/app/")
    assert res_app.status_code == 200
    assert "SUTRA Support Evidence Ledger" in res_app.text
    assert "Screen A: Review Queue" in res_app.text

