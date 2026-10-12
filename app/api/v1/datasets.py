import csv
import json
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import PROJECT_ROOT
from app.core.database import get_db
from app.core.errors import ResourceNotFoundError
from app.core.security import CampusMembershipContext, get_campus_membership
from app.models.student import Student
from app.schemas.datasets import (
    DataSourceProvenance,
    ProvenanceOverviewResponse,
    ResearchRecordResponse,
)
from app.schemas.ml import DAY30_REQUIRED_FEATURES

router = APIRouter(prefix="/datasets", tags=["Datasets & Provenance"])

# In-memory cached lookup for OULAD Day-30 features
_oulad_by_id: Optional[Dict[str, List[Dict[str, str]]]] = None
_synthetic_cache: Optional[Dict[str, Dict[str, Any]]] = None


def _get_oulad_cache() -> Dict[str, List[Dict[str, str]]]:
    global _oulad_by_id
    if _oulad_by_id is None:
        path = PROJECT_ROOT / "ml" / "data" / "processed" / "day30_features.csv"
        cache: Dict[str, List[Dict[str, str]]] = {}
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    sid = row["id_student"].strip()
                    if sid not in cache:
                        cache[sid] = []
                    cache[sid].append(row)
        _oulad_by_id = cache
    return _oulad_by_id


def _get_synthetic_cache() -> Dict[str, Dict[str, Any]]:
    global _synthetic_cache
    if _synthetic_cache is None:
        cache: Dict[str, Dict[str, Any]] = {}

        # 1. Load demo_seed.json
        seed_path = PROJECT_ROOT / "docs" / "fixtures" / "demo_seed.json"
        if os.path.exists(seed_path):
            try:
                with open(seed_path, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
                    if "ml_day30_test_vector" in seed_data:
                        tv = seed_data["ml_day30_test_vector"]
                        student_ref = tv.get("student", "SYN-1007")
                        cache[student_ref] = {
                            "record_id": student_ref,
                            "features": tv.get("features", {}),
                            "notes": "demo_seed.json canonical test vector",
                        }
            except Exception:
                pass

        # 2. Load synthetic_batch_100.json
        synth_batch_path = PROJECT_ROOT / "ml" / "data" / "synthetic" / "synthetic_batch_100.json"
        if os.path.exists(synth_batch_path):
            try:
                with open(synth_batch_path, "r", encoding="utf-8") as f:
                    batch = json.load(f)
                    for item in batch:
                        rec_id = item.get("record_id")
                        if rec_id:
                            # Extract only 25 canonical features
                            features = {k: item[k] for k in DAY30_REQUIRED_FEATURES if k in item}
                            cache[rec_id] = {
                                "record_id": rec_id,
                                "features": features,
                                "notes": f"synthetic_batch_100 item (module={item.get('code_module')})",
                            }
            except Exception:
                pass

        _synthetic_cache = cache
    return _synthetic_cache


@router.get("/provenance", response_model=ProvenanceOverviewResponse)
async def get_dataset_provenance(
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns auditable boundaries, schemas, licensing, and key definitions
    across all three data sources in SUTRA.
    """
    # Count institutional students for caller's campus
    count_stmt = select(func.count(Student.id)).where(Student.institution_id == membership.campus_id)
    inst_count = (await db.execute(count_stmt)).scalar() or 0

    sources = {
        "institutional": DataSourceProvenance(
            name="Institutional Operational Student Records",
            description="Live institutional pseudonymous student profiles and engagement telemetry.",
            entity_type="Single Enrolled Student Profile",
            key_schema="id (UUID Primary Key), institution_id (Campus UUID Partition), external_ref (University ID)",
            record_count=inst_count,
            storage_location="PostgreSQL / Supabase Operational Database (students table)",
            purpose="Live student risk triage, 10-state intervention case coordination, educator review.",
            licensing="Proprietary / Institutional Campus Tenancy (FERPA / GDPR Compliant Scoping)",
            isolation_rule="Strictly partitioned by institution_id. Never matched against research/synthetic records without explicit authorization.",
        ),
        "oulad_research": DataSourceProvenance(
            name="Open University Learning Analytics Dataset (OULAD)",
            description="Historical, anonymized course-presentation enrollment interactions from 2013-2014.",
            entity_type="Student-Course Presentation Enrollment",
            key_schema="Compound Key: (code_module, code_presentation, id_student: integer)",
            record_count=27466,
            storage_location="ml/data/processed/day30_features.csv (derived from ml/data/raw/)",
            purpose="Retrospective ML model training, Platt calibration, baseline evaluation.",
            licensing="Open Government Licence v2.0 (OGL v2.0) — Crown Copyright (DOI 10.6084/m9.figshare.5081998.v1)",
            isolation_rule="id_student is an anonymized 2013 UK research ID. Strictly forbidden from being assumed equal to a SUTRA student UUID or external ref.",
        ),
        "synthetic_demo": DataSourceProvenance(
            name="SUTRA Synthetic Demonstration Fixtures",
            description="Fictional engagement vectors generated for developer testing and pipeline verification.",
            entity_type="Synthetic Test Vector / Persona Archetype",
            key_schema="record_id (e.g. SYNTH-BATCH-001) or fixture key (e.g. SYN-1007)",
            record_count=106,
            storage_location="docs/fixtures/demo_seed.json, ml/data/synthetic/synthetic_batch_100.json",
            purpose="Software mechanics testing, schema validation, latency smoke testing, playground demos.",
            licensing="MIT License / Project Internal Synthetic Seed (Seed: 42)",
            isolation_rule="All entities are fictional. Explicit prohibition against computing accuracy, precision, or clinical claims.",
        ),
    }

    return ProvenanceOverviewResponse(
        status="audited_and_isolated",
        governance_framework="SUTRA ADR-005: Strict Three-Source Data Provenance Isolation",
        sources=sources,
    )


@router.get("/research/oulad/{identifier}", response_model=ResearchRecordResponse)
async def lookup_oulad_research_record(
    identifier: str = Path(..., description="OULAD id_student (e.g. 11391) or compound MODULE-PRESENTATION-ID"),
    module: Optional[str] = Query(None, description="Optional course module code (e.g. AAA)"),
    presentation: Optional[str] = Query(None, description="Optional presentation semester (e.g. 2013J)"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Explicitly retrieves a historical OULAD research enrollment record.
    Returns the sanitized 25 Day-30 features with explicit research provenance disclaimers.
    Never exposes target outcomes (final_result) into inference.
    """
    clean_id = identifier.strip()
    cache = _get_oulad_cache()

    # Parse compound identifier if formatted as MODULE-PRESENTATION-ID or MODULE/PRESENTATION/ID
    target_id = clean_id
    target_mod = module
    target_pres = presentation

    if "/" in clean_id:
        parts = clean_id.split("/")
        if len(parts) == 3:
            target_mod, target_pres, target_id = parts[0], parts[1], parts[2]
    elif "-" in clean_id and not clean_id.isdigit():
        parts = clean_id.split("-")
        if len(parts) == 3:
            target_mod, target_pres, target_id = parts[0], parts[1], parts[2]

    candidates = cache.get(target_id)
    if not candidates:
        raise ResourceNotFoundError(
            f"OULAD research enrollment '{clean_id}' not found in day30_features.csv benchmark."
        )

    # Filter by module / presentation if supplied
    selected_row = candidates[0]
    if target_mod or target_pres:
        matched = [
            r for r in candidates
            if (not target_mod or r["code_module"].upper() == target_mod.upper())
            and (not target_pres or r["code_presentation"].upper() == target_pres.upper())
        ]
        if matched:
            selected_row = matched[0]

    # Sanitize 25 Day-30 features strictly omitting target outcomes and leakage fields
    features: Dict[str, Any] = {}
    for feat in DAY30_REQUIRED_FEATURES:
        val = selected_row.get(feat)
        if val is not None:
            # Parse numerical vs categorical
            try:
                features[feat] = float(val) if "." in val or "e" in val.lower() else int(val)
            except ValueError:
                features[feat] = val

    enrollment_context = {
        "code_module": selected_row.get("code_module"),
        "code_presentation": selected_row.get("code_presentation"),
        "id_student": selected_row.get("id_student"),
        "total_enrollments_for_student": len(candidates),
        "available_presentations": [
            f"{r.get('code_module')}-{r.get('code_presentation')}" for r in candidates
        ],
    }

    return ResearchRecordResponse(
        source="oulad_research",
        record_identifier=f"{selected_row.get('code_module')}-{selected_row.get('code_presentation')}-{selected_row.get('id_student')}",
        entity_type="Student-Course Presentation Enrollment",
        provenance_label="OULAD 2015 Benchmark (OGL v2.0)",
        licensing="Open Government Licence v2.0 (OGL v2.0) — DOI 10.6084/m9.figshare.5081998.v1",
        purpose="Historical Academic Research & Benchmark Evaluation",
        disclaimer="Historical 2013-2014 Open University research record. Does NOT represent a live institutional student.",
        enrollment_context=enrollment_context,
        features=features,
        is_synthetic=False,
        is_research=True,
        is_institutional=False,
    )


@router.get("/research/synthetic/{identifier}", response_model=ResearchRecordResponse)
async def lookup_synthetic_demo_record(
    identifier: str = Path(..., description="Synthetic record_id (e.g. SYNTH-BATCH-001) or demo key (e.g. SYN-1007)"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Explicitly retrieves a synthetic demonstration record for software testing or demos.
    Clearly labels output as non-causal, synthetic data with zero real clinical claims.
    """
    clean_id = identifier.strip()
    cache = _get_synthetic_cache()

    rec = cache.get(clean_id)
    if not rec:
        raise ResourceNotFoundError(
            f"Synthetic demonstration record '{clean_id}' not found in demo fixtures."
        )

    return ResearchRecordResponse(
        source="synthetic_demo",
        record_identifier=clean_id,
        entity_type="Synthetic Demonstration Profile",
        provenance_label="SUTRA Synthetic Demonstration Fixture (Seed: 42)",
        licensing="MIT License / Project Internal Synthetic Fixture",
        purpose="Developer Testing, Pipeline Verification & Interactive Playground Demonstrations",
        disclaimer="Synthetic demonstration record. All entities and events are fictional. Expressly prohibited for clinical/academic claims.",
        enrollment_context={"notes": rec.get("notes")},
        features=rec.get("features", {}),
        is_synthetic=True,
        is_research=False,
        is_institutional=False,
    )
