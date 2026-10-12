"""
Integration and Unit Tests for Feature 1 & 2:
- Document Integrity & Exact Bytes SHA-256 Fingerprinting
- Base Sepolia Blockchain Anchoring (Chain ID 84532)
- Proof Verification (Matching vs Tampered Mismatch)
- Campus Tenancy Isolation & ADR-003/004 Privacy Bounds
- Zero PII Leakage on Blockchain
- SBI Digital Rupee (e₹ / CBDC) Milestone Reward Boundary
"""

import hashlib
import io
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentRecord
from app.models.institution import Institution, InstitutionMembership
from app.services.blockchain import base_sepolia_service
from app.services.cbdc.provider import (
    CBDCVoucherIssueRequest,
    sbi_cbdc_provider,
)
from app.services.document_integrity import (
    compute_exact_bytes_sha256,
    generate_intervention_pdf,
)
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_document_env(db_session: AsyncSession):
    """Sets up campus A (with faculty & leadership) and campus B (isolated tenant)."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Campus Alpha")
    inst_b = Institution(id=campus_b_id, name="Campus Beta")
    db_session.add_all([inst_a, inst_b])
    await db_session.flush()

    user_faculty_id = uuid.uuid4()
    user_lead_id = uuid.uuid4()
    user_campus_b_id = uuid.uuid4()

    mem_faculty = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=user_faculty_id,
        role="faculty",
        is_active=True,
    )
    mem_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=user_lead_id,
        role="leadership",
        is_active=True,
    )
    mem_b = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        user_id=user_campus_b_id,
        role="faculty",
        is_active=True,
    )
    db_session.add_all([mem_faculty, mem_lead, mem_b])
    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "user_faculty_id": user_faculty_id,
        "user_lead_id": user_lead_id,
        "user_campus_b_id": user_campus_b_id,
        "faculty_token": make_jwt(user_faculty_id),
        "lead_token": make_jwt(user_lead_id),
        "campus_b_token": make_jwt(user_campus_b_id),
    }


def test_hash_consistency_for_identical_bytes():
    """Verifies SHA-256 byte consistency and alteration sensitivity."""
    data_1 = b"SUTRA Academic Support Agreement 2026 for SYN-1007."
    data_2 = b"SUTRA Academic Support Agreement 2026 for SYN-1007."
    tampered = b"SUTRA Academic Support Agreement 2026 for SYN-1007. [MODIFIED]"

    h1 = compute_exact_bytes_sha256(data_1)
    h2 = compute_exact_bytes_sha256(data_2)
    h_tampered = compute_exact_bytes_sha256(tampered)

    assert h1 == h2
    assert len(h1) == 64
    assert h1 != h_tampered


def test_zero_pii_in_blockchain_payload():
    """
    CRITICAL PRIVACY INVARIANT:
    Ensures that doc_ref_to_bytes32 hashes internal reference so no student name,
    email, or roll number can ever be stored in plaintext on Base Sepolia.
    """
    doc_ref = "DOC-2026-SYN1007-ASHA-INTERVENTION"
    derived_bytes32 = base_sepolia_service.doc_ref_to_bytes32(doc_ref)

    assert len(derived_bytes32) == 32
    assert b"Asha" not in derived_bytes32
    assert b"SYN-1007" not in derived_bytes32


@pytest.mark.asyncio
async def test_document_generation_and_draft_state(client: AsyncClient, setup_document_env):
    """Generates a formal student intervention agreement PDF and confirms draft record creation."""
    env = setup_document_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    res = await client.post(
        "/api/v1/documents/generate",
        headers=headers,
        json={
            "title": "Asha Attendance & Milestone Support Agreement",
            "doc_type": "intervention_plan",
            "student_ref": "SYN-1007",
            "student_name": "Asha (synthetic)",
            "content_text": "Agreed to 14-day tutoring and recovery plan.",
            "metadata_payload": {"cohort": "CS-Y2", "term": "Fall 2026"},
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["title"] == "Asha Attendance & Milestone Support Agreement"
    assert data["status"] == "draft"
    assert len(data["sha256_hash"]) == 64
    assert data["file_size_bytes"] > 0
    assert data["mime_type"] == "application/pdf"
    assert data["chain_id"] == 84532


@pytest.mark.asyncio
async def test_document_finalization_and_anchoring_lifecycle(client: AsyncClient, setup_document_env):
    """
    Without a deployed registry, finalization must remain usable while anchoring fails
    explicitly instead of creating a simulated proof.
    """
    env = setup_document_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    # 1. Generate Draft
    gen_res = await client.post(
        "/api/v1/documents/generate",
        headers=headers,
        json={
            "title": "Intervention Agreement - Ira",
            "doc_type": "intervention_plan",
            "student_ref": "SYN-1009",
            "student_name": "Ira (synthetic)",
        },
    )
    assert gen_res.status_code == 200
    doc_id = gen_res.json()["id"]

    # 2. Cannot anchor a draft directly (must be finalized first)
    pre_anchor = await client.post(
        f"/api/v1/documents/{doc_id}/anchor",
        headers=headers,
        json={"tx_hash": "0x" + "1" * 64},
    )
    assert pre_anchor.status_code == 422
    err_body = pre_anchor.json()
    err_msg = (err_body.get("detail") or err_body.get("error", {}).get("message", "")).lower()
    assert "draft" in err_msg

    # 3. Finalize document
    fin_res = await client.post(f"/api/v1/documents/{doc_id}/finalize", headers=headers)
    assert fin_res.status_code == 200
    assert fin_res.json()["status"] == "finalized"

    # 4. Missing transaction details cannot create an anchor.
    missing_tx = await client.post(f"/api/v1/documents/{doc_id}/anchor", headers=headers, json={})
    assert missing_tx.status_code == 422

    # 5. No configured/deployed registry must fail visibly, with no simulated record.
    anchor_res = await client.post(
        f"/api/v1/documents/{doc_id}/anchor",
        headers=headers,
        json={"tx_hash": "0x" + "1" * 64},
    )
    assert anchor_res.status_code == 503
    current = await client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert current.status_code == 200
    assert current.json()["status"] == "finalized"
    assert current.json()["anchoring_mode"] == "unavailable"
    assert current.json()["tx_hash"] is None


@pytest.mark.asyncio
async def test_unanchored_document_cannot_be_claimed_verified(client: AsyncClient, setup_document_env):
    """
    Verification must require a confirmed chain anchor; DB-only fingerprints are not proofs.
    """
    env = setup_document_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    # 1. Create and finalize document
    gen_res = await client.post(
        "/api/v1/documents/generate?finalize_immediately=true",
        headers=headers,
        json={
            "title": "Student Retention Plan",
            "doc_type": "retention_contract",
            "student_ref": "SYN-1011",
        },
    )
    doc_id = gen_res.json()["id"]

    # 2. Download the exact authentic bytes
    dl_res = await client.get(f"/api/v1/documents/{doc_id}/download", headers=headers)
    assert dl_res.status_code == 200
    exact_pdf_bytes = dl_res.content

    # 3. Exact bytes still cannot be reported as verified without an on-chain anchor.
    verify_match_res = await client.post(
        f"/api/v1/documents/{doc_id}/verify",
        headers=headers,
        files={"candidate_file": ("authentic.pdf", io.BytesIO(exact_pdf_bytes), "application/pdf")},
    )
    assert verify_match_res.status_code == 422
    failure = verify_match_res.json()
    error_message = failure.get("detail") or failure.get("error", {}).get("message", "")
    assert "on-chain anchor" in error_message


@pytest.mark.asyncio
async def test_upload_accepts_arbitrary_file_and_preserves_exact_bytes(client: AsyncClient, setup_document_env, db_session: AsyncSession):
    env = setup_document_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    payload = b"\x00arbitrary binary proof\xff\x10"
    response = await client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": ("../proof.bin", io.BytesIO(payload), "application/octet-stream")},
    )
    assert response.status_code == 200
    record = response.json()
    assert record["file_name"] == "proof.bin"
    assert record["mime_type"] == "application/octet-stream"
    assert record["sha256_hash"] == hashlib.sha256(payload).hexdigest()
    assert record["status"] == "draft"
    assert record["anchoring_mode"] == "unavailable"

    download = await client.get(f"/api/v1/documents/{record['id']}/download", headers=headers)
    assert download.status_code == 200
    assert download.content == payload
    assert download.headers["x-document-sha256"] == hashlib.sha256(payload).hexdigest()

    stored_record = await db_session.get(DocumentRecord, uuid.UUID(record["id"]))
    assert stored_record is not None and stored_record.file_path
    with open(stored_record.file_path, "wb") as file_obj:
        file_obj.write(payload + b"tamper")
    finalize = await client.post(f"/api/v1/documents/{record['id']}/finalize", headers=headers)
    assert finalize.status_code == 409
    corrupted_download = await client.get(f"/api/v1/documents/{record['id']}/download", headers=headers)
    assert corrupted_download.status_code == 409


@pytest.mark.asyncio
async def test_tenant_isolation_and_leadership_authorization(client: AsyncClient, setup_document_env):
    """
    Verifies:
    1. Cross-tenant isolation: Campus B cannot access Campus A documents (404).
    2. Leadership privacy: Pure leadership role is forbidden from individual document queues (403).
    """
    env = setup_document_env
    faculty_headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    # Create document in Campus A
    doc_res = await client.post(
        "/api/v1/documents/generate",
        headers=faculty_headers,
        json={"title": "Confidential Student Support Notice"},
    )
    doc_id = doc_res.json()["id"]

    # Campus B attempts lookup -> MUST 404
    campus_b_headers = {
        "Authorization": f"Bearer {env['campus_b_token']}",
        "X-Campus-Id": str(env["campus_b_id"]),
    }
    leak_res = await client.get(f"/api/v1/documents/{doc_id}", headers=campus_b_headers)
    assert leak_res.status_code == 404

    # Leadership role attempts lookup in Campus A -> MUST 403
    lead_headers = {
        "Authorization": f"Bearer {env['lead_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    lead_res = await client.get("/api/v1/documents", headers=lead_headers)
    assert lead_res.status_code == 403
    assert "LEADERSHIP_DOCUMENT_ACCESS_DENIED" in lead_res.json()["error"]["code"]


@pytest.mark.asyncio
async def test_sbi_digital_rupee_cbdc_simulated_readiness(client: AsyncClient, setup_document_env):
    """
    Verifies the future SBI Digital Rupee (e₹) programmable incentive voucher boundary:
    Confirms issuance returns SIMULATED status and does not fabricate bank settlement.
    """
    env = setup_document_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    res = await client.post(
        "/api/v1/documents/cbdc/issue-voucher",
        headers=headers,
        json={
            "student_ref": "SYN-1007",
            "amount_inr": 500.0,
            "purpose_code": "ACADEMIC_PERSISTENCE_REWARD",
            "milestone_ref": "MILESTONE-W5-CHECKIN",
            "campus_id": str(env["campus_a_id"]),
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["is_simulated"] is True
    assert data["status"] == "SIMULATED_ISSUED"
    assert "SIMULATED ADAPTER" in data["disclaimer"]
    assert data["amount_inr"] == 500.0
    assert "eR-SIM-" in data["voucher_id"]
