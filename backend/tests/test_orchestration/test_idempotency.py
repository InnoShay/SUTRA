"""
Unit tests for InMemoryRunRepository and request-level idempotency in SUTRA Phase 1.

Tests duplicate request caching, payload conflict detection, actor scoping,
and distinct run handling.
"""

import pytest

from backend.app.orchestration.contracts import (
    OrchestrationResult,
    RunStatus,
    ValidationSummary,
)
from backend.app.orchestration.repository import (
    IdempotencyConflictError,
    InMemoryRunRepository,
)
from sutra_ml.schemas.evidence_card import SutraEvidenceCard


def create_dummy_result(run_id: str, sample_evidence_card: SutraEvidenceCard) -> OrchestrationResult:
    """Helper to create dummy OrchestrationResult."""
    return OrchestrationResult(
        run_id=run_id,
        record_id="SYNTH-TEST-001",
        status=RunStatus.SUCCESS,
        evidence_card=sample_evidence_card,
        stages={},
        validation_summary=ValidationSummary(
            passed=True,
            findings=[],
            error_count=0,
            warning_count=0,
        ),
        total_duration_ms=120.0,
        retries_used=0,
    )


def test_idempotency_identical_payload_returns_cached_result(
    in_memory_repo: InMemoryRunRepository,
    sample_evidence_card: SutraEvidenceCard,
):
    """Submitting an identical request with the same idempotency key returns the prior result."""
    payload = {"student_record_id": "SYNTH-TEST-001", "snapshot_day": 30, "campus_id": "CAMPUS-MAIN"}
    result_1 = create_dummy_result("RUN-001", sample_evidence_card)

    # First execution stores the result
    in_memory_repo.save_run(
        actor_id="ADV-01",
        operation="run_triage_pipeline",
        idempotency_key="IDEMP-KEY-ABC",
        payload=payload,
        result=result_1,
    )

    # Second execution checks idempotency with identical key and payload
    cached = in_memory_repo.check_or_reserve_idempotency(
        actor_id="ADV-01",
        operation="run_triage_pipeline",
        idempotency_key="IDEMP-KEY-ABC",
        payload=payload,
    )

    assert cached is not None
    assert cached.run_id == "RUN-001"
    assert cached.status == RunStatus.SUCCESS


def test_idempotency_conflicting_payload_raises_error(
    in_memory_repo: InMemoryRunRepository,
    sample_evidence_card: SutraEvidenceCard,
):
    """Reusing the same idempotency key with a modified payload raises IdempotencyConflictError."""
    payload_original = {"student_record_id": "SYNTH-TEST-001", "snapshot_day": 30}
    payload_modified = {"student_record_id": "SYNTH-TEST-001", "snapshot_day": 45}  # Changed snapshot day!
    result = create_dummy_result("RUN-001", sample_evidence_card)

    in_memory_repo.save_run(
        actor_id="ADV-01",
        operation="run_triage_pipeline",
        idempotency_key="IDEMP-REUSED-KEY",
        payload=payload_original,
        result=result,
    )

    with pytest.raises(IdempotencyConflictError) as exc_info:
        in_memory_repo.check_or_reserve_idempotency(
            actor_id="ADV-01",
            operation="run_triage_pipeline",
            idempotency_key="IDEMP-REUSED-KEY",
            payload=payload_modified,
        )

    assert "Idempotency conflict" in str(exc_info.value)
    assert "IDEMP-REUSED-KEY" in str(exc_info.value)


def test_idempotency_scoped_by_actor_and_operation(
    in_memory_repo: InMemoryRunRepository,
    sample_evidence_card: SutraEvidenceCard,
):
    """
    Idempotency keys are strictly scoped by (actor_id, operation, key).
    Different actors or different operations using the same key string do not collide.
    """
    payload = {"student_record_id": "SYNTH-TEST-001"}
    result_actor_a = create_dummy_result("RUN-A", sample_evidence_card)

    in_memory_repo.save_run(
        actor_id="ACTOR-A",
        operation="run_triage_pipeline",
        idempotency_key="COMMON-KEY-001",
        payload=payload,
        result=result_actor_a,
    )

    # Actor B using the same key string should NOT collide or see Actor A's run
    cached_actor_b = in_memory_repo.check_or_reserve_idempotency(
        actor_id="ACTOR-B",
        operation="run_triage_pipeline",
        idempotency_key="COMMON-KEY-001",
        payload=payload,
    )
    assert cached_actor_b is None

    # Actor A performing a different operation should also NOT collide
    cached_diff_op = in_memory_repo.check_or_reserve_idempotency(
        actor_id="ACTOR-A",
        operation="reevaluate_risk",
        idempotency_key="COMMON-KEY-001",
        payload=payload,
    )
    assert cached_diff_op is None


def test_fresh_evidence_snapshot_creates_new_run(
    in_memory_repo: InMemoryRunRepository,
    sample_evidence_card: SutraEvidenceCard,
):
    """A fresh reassessment with new key and fresh snapshot is treated as a new run."""
    day30_payload = {"student_record_id": "SYNTH-TEST-001", "snapshot_day": 30}
    day60_payload = {"student_record_id": "SYNTH-TEST-001", "snapshot_day": 60}

    result_d30 = create_dummy_result("RUN-DAY-30", sample_evidence_card)
    result_d60 = create_dummy_result("RUN-DAY-60", sample_evidence_card)

    in_memory_repo.save_run(
        actor_id="ADV-01",
        operation="run_triage_pipeline",
        idempotency_key="KEY-DAY-30",
        payload=day30_payload,
        result=result_d30,
    )
    in_memory_repo.save_run(
        actor_id="ADV-01",
        operation="run_triage_pipeline",
        idempotency_key="KEY-DAY-60",
        payload=day60_payload,
        result=result_d60,
    )

    assert in_memory_repo.get_run("RUN-DAY-30").run_id == "RUN-DAY-30"
    assert in_memory_repo.get_run("RUN-DAY-60").run_id == "RUN-DAY-60"
