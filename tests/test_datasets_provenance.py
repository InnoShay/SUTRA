"""
Tests for Phase 10: Dataset Bridge and Data Provenance Isolation.

Verifies:
1. Explicit, auditable three-source provenance metadata.
2. OULAD research lookup with sanitized Day-30 features (anti-leakage guarantee).
3. Synthetic demonstration lookup with disclaimer enforcement.
4. Strict isolation: Institutional student endpoint (/api/v1/students) NEVER falls back to research or synthetic records.
5. Error handling for non-existent research/synthetic identifiers.
"""

import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.institution import Institution, InstitutionMembership
from app.models.student import Student
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_provenance_test_env(db_session):
    """Sets up an institutional campus with one live student for isolation testing."""
    campus_id = uuid.uuid4()
    inst = Institution(id=campus_id, name="State University")
    db_session.add(inst)
    await db_session.flush()

    user_id = uuid.uuid4()
    membership = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=user_id,
        role="faculty",
        is_active=True,
    )
    db_session.add(membership)

    # Live institutional student
    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="INST-REAL-001",
        display_name="Real Student",
        cohort_code="2026-CS",
        enrollment_status="active",
    )
    db_session.add(student)
    await db_session.commit()

    return {
        "campus_id": campus_id,
        "user_id": user_id,
        "student": student,
    }


@pytest.mark.asyncio
async def test_dataset_provenance_overview(client: AsyncClient, setup_provenance_test_env):
    """Verifies that the provenance overview endpoint returns the three distinct sources with their governance rules."""
    ctx = setup_provenance_test_env
    token = make_jwt(ctx["user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_id"])}

    response = await client.get("/api/v1/datasets/provenance", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "audited_and_isolated"
    sources = data["sources"]
    assert "institutional" in sources
    assert "oulad_research" in sources
    assert "synthetic_demo" in sources

    # Institutional checks
    inst = sources["institutional"]
    assert inst["entity_type"] == "Single Enrolled Student Profile"
    assert "UUID" in inst["key_schema"]

    # OULAD checks
    oulad = sources["oulad_research"]
    assert oulad["entity_type"] == "Student-Course Presentation Enrollment"
    assert "code_module" in oulad["key_schema"]
    assert oulad["record_count"] == 27466
    assert "OGL v2.0" in oulad["licensing"]

    # Synthetic checks
    synth = sources["synthetic_demo"]
    assert synth["entity_type"] == "Synthetic Test Vector / Persona Archetype"
    assert "Seed: 42" in synth["licensing"] or "Seed: 42" in synth["isolation_rule"]


@pytest.mark.asyncio
async def test_oulad_research_lookup_and_sanitization(client: AsyncClient, setup_provenance_test_env):
    """Verifies retrieval of an authentic OULAD record by integer student ID and compound key."""
    ctx = setup_provenance_test_env
    token = make_jwt(ctx["user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_id"])}

    # Lookup student 11391 (known first row in day30_features.csv: AAA-2013J-11391)
    response = await client.get("/api/v1/datasets/research/oulad/11391", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["source"] == "oulad_research"
    assert data["is_research"] is True
    assert data["is_institutional"] is False
    assert data["record_identifier"] == "AAA-2013J-11391"
    assert "OGL v2.0" in data["licensing"]
    assert "Does NOT represent a live institutional student" in data["disclaimer"]

    # Features check: exactly 25 Day-30 features, zero leakage fields
    features = data["features"]
    assert len(features) == 25
    assert "vle_total_clicks_d30" in features
    assert features["vle_total_clicks_d30"] == 424.0 or features["vle_total_clicks_d30"] == 424

    # Strict anti-leakage invariants: target and raw outcomes must never be present
    assert "target" not in features
    assert "target_name" not in features
    assert "raw_final_result" not in features
    assert "final_result" not in features


@pytest.mark.asyncio
async def test_oulad_research_compound_lookup(client: AsyncClient, setup_provenance_test_env):
    """Verifies compound lookup format AAA-2013J-28400."""
    ctx = setup_provenance_test_env
    token = make_jwt(ctx["user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_id"])}

    response = await client.get("/api/v1/datasets/research/oulad/AAA-2013J-28400", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["record_identifier"] == "AAA-2013J-28400"
    assert data["enrollment_context"]["code_module"] == "AAA"
    assert data["enrollment_context"]["code_presentation"] == "2013J"


@pytest.mark.asyncio
async def test_synthetic_demonstration_lookup(client: AsyncClient, setup_provenance_test_env):
    """Verifies retrieval of synthetic test records with prominent synthetic disclaimers."""
    ctx = setup_provenance_test_env
    token = make_jwt(ctx["user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_id"])}

    # 1. Lookup from demo_seed.json (SYN-1007)
    res_seed = await client.get("/api/v1/datasets/research/synthetic/SYN-1007", headers=headers)
    assert res_seed.status_code == 200
    data_seed = res_seed.json()
    assert data_seed["source"] == "synthetic_demo"
    assert data_seed["is_synthetic"] is True
    assert data_seed["is_institutional"] is False
    assert "fictional" in data_seed["disclaimer"].lower()
    assert len(data_seed["features"]) == 25

    # 2. Lookup from synthetic_batch_100.json (SYNTH-BATCH-001)
    res_batch = await client.get("/api/v1/datasets/research/synthetic/SYNTH-BATCH-001", headers=headers)
    assert res_batch.status_code == 200
    data_batch = res_batch.json()
    assert data_batch["source"] == "synthetic_demo"
    assert data_batch["record_identifier"] == "SYNTH-BATCH-001"
    assert len(data_batch["features"]) == 25


@pytest.mark.asyncio
async def test_strict_isolation_institutional_never_falls_back(client: AsyncClient, setup_provenance_test_env):
    """
    CRITICAL ISOLATION TEST:
    Querying OULAD id_student (11391) or synthetic reference (SYNTH-BATCH-001)
    on the institutional /api/v1/students endpoint MUST return 404 Not Found.
    It must NEVER accidentally fallback or resolve to research/synthetic data.
    """
    ctx = setup_provenance_test_env
    token = make_jwt(ctx["user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_id"])}

    # 1. Attempt to query OULAD ID via institutional student lookup
    res_oulad_leak = await client.get("/api/v1/students/11391", headers=headers)
    assert res_oulad_leak.status_code == 404
    assert res_oulad_leak.json()["error"]["code"] in ("RESOURCE_NOT_FOUND", "NOT_FOUND")

    # 2. Attempt to query synthetic batch ID via institutional student lookup
    res_synth_leak = await client.get("/api/v1/students/SYNTH-BATCH-001", headers=headers)
    assert res_synth_leak.status_code == 404
    assert res_synth_leak.json()["error"]["code"] in ("RESOURCE_NOT_FOUND", "NOT_FOUND")

    # 3. Legitimate institutional student DOES resolve
    res_real = await client.get(f"/api/v1/students/{ctx['student'].id}", headers=headers)
    assert res_real.status_code == 200
    assert res_real.json()["external_ref"] == "INST-REAL-001"


@pytest.mark.asyncio
async def test_unknown_research_identifiers_return_404(client: AsyncClient, setup_provenance_test_env):
    """Non-existent research or synthetic IDs cleanly return 404."""
    ctx = setup_provenance_test_env
    token = make_jwt(ctx["user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(ctx["campus_id"])}

    res_oulad = await client.get("/api/v1/datasets/research/oulad/999999999", headers=headers)
    assert res_oulad.status_code == 404

    res_synth = await client.get("/api/v1/datasets/research/synthetic/SYNTH-NONEXISTENT", headers=headers)
    assert res_synth.status_code == 404
