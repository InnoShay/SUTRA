import uuid
from datetime import datetime
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import Institution, InstitutionMembership
from app.models.student import Student
from app.models.observation import StudentObservation, FinanceObservation


@pytest.mark.asyncio
async def test_database_student_crud(db_session: AsyncSession):
    inst_id = uuid.uuid4()
    inst = Institution(id=inst_id, name="Test Campus", status="active")
    db_session.add(inst)
    await db_session.flush()

    student = Student(
        id=uuid.uuid4(),
        institution_id=inst_id,
        external_ref="STU-001",
        display_name="Aarav Sharma",
        cohort_code="CS-2026",
        enrollment_status="active",
    )
    db_session.add(student)
    await db_session.commit()

    # Query back
    result = await db_session.execute(select(Student).where(Student.external_ref == "STU-001"))
    fetched = result.scalar_one_or_none()
    assert fetched is not None
    assert fetched.display_name == "Aarav Sharma"
    assert fetched.institution_id == inst_id


@pytest.mark.asyncio
async def test_database_duplicate_external_ref_rejected(db_session: AsyncSession):
    inst_id = uuid.uuid4()
    inst = Institution(id=inst_id, name="Test Campus", status="active")
    db_session.add(inst)
    await db_session.flush()

    s1 = Student(
        id=uuid.uuid4(),
        institution_id=inst_id,
        external_ref="STU-DUPLICATE",
        display_name="Student One",
    )
    db_session.add(s1)
    await db_session.flush()

    s2 = Student(
        id=uuid.uuid4(),
        institution_id=inst_id,
        external_ref="STU-DUPLICATE",
        display_name="Student Two",
    )
    db_session.add(s2)
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_sensitive_domain_separation_models(db_session: AsyncSession):
    """Verifies that StudentObservation and FinanceObservation are strictly distinct models (ADR-003)."""
    inst_id = uuid.uuid4()
    student_id = uuid.uuid4()
    now = datetime.utcnow()

    inst = Institution(id=inst_id, name="Test Campus", status="active")
    student = Student(id=student_id, institution_id=inst_id, external_ref="STU-FEE", display_name="Rohan")
    db_session.add_all([inst, student])
    await db_session.flush()

    # Academic observation
    academic_obs = StudentObservation(
        id=uuid.uuid4(),
        institution_id=inst_id,
        student_id=student_id,
        domain="attendance",
        metric_key="lecture_attendance_pct",
        value={"percentage": 68.5},
        event_at=now,
        source_system="biometric_gate",
        source_record_ref="att-001",
        source_version=1,
    )

    # Finance observation (segregated table)
    fin_obs = FinanceObservation(
        id=uuid.uuid4(),
        institution_id=inst_id,
        student_id=student_id,
        fee_support_status="review_requested",
        event_at=now,
        source_system="fee_portal",
        source_record_ref="fee-001",
        source_version=1,
    )

    db_session.add_all([academic_obs, fin_obs])
    await db_session.commit()

    # Assert they are stored in separate tables
    academic_rows = (await db_session.execute(select(StudentObservation))).scalars().all()
    finance_rows = (await db_session.execute(select(FinanceObservation))).scalars().all()

    assert len(academic_rows) == 1
    assert len(finance_rows) == 1
    assert academic_rows[0].domain == "attendance"
    assert finance_rows[0].fee_support_status == "review_requested"
