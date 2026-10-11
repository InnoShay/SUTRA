import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import StudentObservation
from app.models.student import Student
from app.services.policy_engine import PolicyEngineService


@pytest.mark.asyncio
async def test_policy_evaluation_triggers_rules_and_preserves_digest(seed_data, db_session: AsyncSession):
    campus_id = seed_data["campus_1"].id

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-1007",
        display_name="Asha (synthetic)",
    )
    db_session.add(student)
    await db_session.flush()

    # Add observations from demo_seed.json
    obs1 = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.58},
        event_at=datetime(2026, 10, 2, 0, 0, tzinfo=timezone.utc),
        available_at=datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc),
        source_system="biometric",
        source_record_ref="att-1",
    )
    obs2 = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="academic",
        metric_key="missing_assignments_count",
        value={"val": 3},
        event_at=datetime(2026, 10, 5, 0, 0, tzinfo=timezone.utc),
        available_at=datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc),
        source_system="lms",
        source_record_ref="acad-1",
    )
    db_session.add_all([obs1, obs2])
    await db_session.commit()

    cutoff = datetime(2026, 10, 7, 0, 0, tzinfo=timezone.utc)
    signal_dto = await PolicyEngineService.evaluate_student(
        db=db_session,
        campus_id=campus_id,
        student_id=student.id,
        as_of_at=cutoff,
    )

    assert signal_dto.result == "attention_suggested"
    assert signal_dto.quality_state == "sufficient"
    assert signal_dto.evidence_digest is not None
    assert len(signal_dto.explanation["triggered_rules"]) == 2

    # Reproducibility check: Re-evaluating with identical input produces identical digest
    re_eval = await PolicyEngineService.evaluate_student(
        db=db_session,
        campus_id=campus_id,
        student_id=student.id,
        as_of_at=cutoff,
    )
    assert re_eval.evidence_digest == signal_dto.evidence_digest


@pytest.mark.asyncio
async def test_anti_leakage_future_observation_strictly_excluded(seed_data, db_session: AsyncSession):
    """Verifies that an observation available on 2026-10-10 is invisible to a 2026-10-07 cutoff."""
    campus_id = seed_data["campus_1"].id

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-LEAK",
        display_name="Leakage Test Student",
    )
    db_session.add(student)
    await db_session.flush()

    # Observation available before cutoff
    obs_early = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.85},
        event_at=datetime(2026, 10, 2, 0, 0, tzinfo=timezone.utc),
        available_at=datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc),
        source_system="biometric",
        source_record_ref="att-early",
    )

    # Future observation: event on 2026-10-03, but only available on 2026-10-10!
    obs_future = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="academic",
        metric_key="missing_assignments_count",
        value={"val": 5},
        event_at=datetime(2026, 10, 3, 0, 0, tzinfo=timezone.utc),
        available_at=datetime(2026, 10, 10, 12, 0, tzinfo=timezone.utc),
        source_system="lms",
        source_record_ref="acad-future",
    )
    db_session.add_all([obs_early, obs_future])
    await db_session.commit()

    # Evaluate as of 2026-10-07 (before obs_future was available)
    cutoff_d7 = datetime(2026, 10, 7, 0, 0, tzinfo=timezone.utc)
    sig_d7 = await PolicyEngineService.evaluate_student(
        db=db_session,
        campus_id=campus_id,
        student_id=student.id,
        as_of_at=cutoff_d7,
    )

    # obs_future must be excluded: missing_assignments_count is NOT in metrics evaluated!
    assert "missing_assignments_count" not in sig_d7.explanation["metrics"]
    assert sig_d7.result == "unknown"  # Since missing_assignments_count is not available yet

    # Evaluate as of 2026-10-11 (after obs_future became available)
    cutoff_d11 = datetime(2026, 10, 11, 0, 0, tzinfo=timezone.utc)
    sig_d11 = await PolicyEngineService.evaluate_student(
        db=db_session,
        campus_id=campus_id,
        student_id=student.id,
        as_of_at=cutoff_d11,
    )
    assert "missing_assignments_count" in sig_d11.explanation["metrics"]
    assert sig_d11.result == "attention_suggested"


@pytest.mark.asyncio
async def test_stale_data_never_becomes_silent_zero(seed_data, db_session: AsyncSession):
    """Verifies that missing or stale data produces 'unknown' / 'stale_source', never a silent zero."""
    campus_id = seed_data["campus_1"].id

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-STALE",
        display_name="Stale Data Student",
    )
    db_session.add(student)
    await db_session.flush()

    # Add a stale observation
    obs_stale = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=student.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.50},
        quality_state="stale",
        event_at=datetime(2026, 9, 15, 0, 0, tzinfo=timezone.utc),
        available_at=datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc),
        source_system="biometric",
        source_record_ref="att-stale",
    )
    db_session.add(obs_stale)
    await db_session.commit()

    sig = await PolicyEngineService.evaluate_student(
        db=db_session,
        campus_id=campus_id,
        student_id=student.id,
    )

    assert sig.result == "unknown"
    assert sig.quality_state == "stale_source"
