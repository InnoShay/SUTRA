import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import PermissionDeniedError, ResourceNotFoundError
from app.core.security import CampusMembershipContext, get_campus_membership
from app.models.case import Case
from app.models.observation import FinanceObservation, StudentObservation
from app.models.signal import Signal
from app.models.student import Student
from app.schemas.student import (
    FinanceObservationDTO,
    FinanceViewResponse,
    FreshnessMetricsDTO,
    ObservationDTO,
    StudentSummary,
    SupportViewResponse,
)

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=List[StudentSummary])
async def list_students(
    cohort: Optional[str] = Query(None, description="Optional cohort code filter"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists pseudonymous students belonging to the active campus."""
    query = select(Student).where(Student.institution_id == membership.campus_id)
    if cohort:
        query = query.where(Student.cohort_code == cohort)
    result = await db.execute(query)
    students = result.scalars().all()
    return [
        StudentSummary(
            id=s.id,
            external_ref=s.external_ref,
            display_name=s.display_name,
            cohort_code=s.cohort_code,
            enrollment_status=s.enrollment_status,
        )
        for s in students
    ]


@router.get("/{student_id}", response_model=StudentSummary)
async def get_student(
    student_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves basic profile header for a specific student."""
    student = await db.get(Student, student_id)
    if not student or student.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Student {student_id} not found in active campus")

    return StudentSummary(
        id=student.id,
        external_ref=student.external_ref,
        display_name=student.display_name,
        cohort_code=student.cohort_code,
        enrollment_status=student.enrollment_status,
    )


@router.get("/{student_id}/support-view", response_model=SupportViewResponse)
async def get_student_support_view(
    student_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Returns role-filtered 360° support view with data freshness metrics (strictly omitting fee records)."""
    student = await db.get(Student, student_id)
    if not student or student.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Student {student_id} not found in active campus")

    # Observations query
    obs_query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student_id,
    ).order_by(StudentObservation.event_at.desc())
    obs_res = await db.execute(obs_query)
    observations = obs_res.scalars().all()

    # Active signals count
    sig_count_query = select(func.count(Signal.id)).where(
        Signal.institution_id == membership.campus_id,
        Signal.student_id == student_id,
        Signal.reviewed_decision.is_(None),
    )
    sig_count = (await db.execute(sig_count_query)).scalar() or 0

    # Active cases count
    case_count_query = select(func.count(Case.id)).where(
        Case.institution_id == membership.campus_id,
        Case.student_id == student_id,
        Case.state.notin_(["closed", "dismissed"]),
    )
    case_count = (await db.execute(case_count_query)).scalar() or 0

    domains = list({o.domain for o in observations})
    last_event = observations[0].event_at if observations else None
    last_avail = observations[0].available_at if observations else None

    # Check staleness
    is_stale = any(o.quality_state in ("stale", "missing") for o in observations)

    freshness = FreshnessMetricsDTO(
        total_observations=len(observations),
        domains_represented=domains,
        last_observation_event_at=last_event,
        last_observation_available_at=last_avail,
        is_stale=is_stale,
    )

    obs_dtos = [
        ObservationDTO(
            id=o.id,
            domain=o.domain,
            metric_key=o.metric_key,
            value=o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
            unit=o.unit,
            quality_state=o.quality_state,
            event_at=o.event_at,
            available_at=o.available_at,
            ingested_at=o.ingested_at,
            source_system=o.source_system,
        )
        for o in observations[:20]
    ]

    return SupportViewResponse(
        student=StudentSummary(
            id=student.id,
            external_ref=student.external_ref,
            display_name=student.display_name,
            cohort_code=student.cohort_code,
            enrollment_status=student.enrollment_status,
        ),
        freshness_metrics=freshness,
        active_signals_count=sig_count,
        active_cases_count=case_count,
        recent_observations=obs_dtos,
    )


@router.get("/{student_id}/observations", response_model=List[ObservationDTO])
async def list_student_observations(
    student_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists chronological general observations across the 5 standard educational domains."""
    student = await db.get(Student, student_id)
    if not student or student.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Student {student_id} not found in active campus")

    query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student_id,
    ).order_by(StudentObservation.event_at.desc())
    res = await db.execute(query)
    observations = res.scalars().all()

    return [
        ObservationDTO(
            id=o.id,
            domain=o.domain,
            metric_key=o.metric_key,
            value=o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
            unit=o.unit,
            quality_state=o.quality_state,
            event_at=o.event_at,
            available_at=o.available_at,
            ingested_at=o.ingested_at,
            source_system=o.source_system,
        )
        for o in observations
    ]


@router.get("/{student_id}/finance", response_model=FinanceViewResponse)
async def get_student_finance_view(
    student_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves restricted fee-support observations. Strictly gated to finance and leadership roles (ADR-003)."""
    # Domain capability check: only finance or leadership roles may access
    if not any(r in ("finance", "leadership") for r in membership.roles):
        raise PermissionDeniedError(
            "Access to financial aid observations requires 'finance' or 'leadership' role",
            code="FINANCE_DOMAIN_RESTRICTED",
        )

    student = await db.get(Student, student_id)
    if not student or student.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Student {student_id} not found in active campus")

    query = select(FinanceObservation).where(
        FinanceObservation.institution_id == membership.campus_id,
        FinanceObservation.student_id == student_id,
    ).order_by(FinanceObservation.event_at.desc())
    res = await db.execute(query)
    fin_obs = res.scalars().all()

    dtos = [
        FinanceObservationDTO(
            id=f.id,
            fee_support_status=f.fee_support_status,
            quality_state=f.quality_state,
            event_at=f.event_at,
            available_at=f.available_at,
            ingested_at=f.ingested_at,
            source_system=f.source_system,
        )
        for f in fin_obs
    ]

    return FinanceViewResponse(
        student=StudentSummary(
            id=student.id,
            external_ref=student.external_ref,
            display_name=student.display_name,
            cohort_code=student.cohort_code,
            enrollment_status=student.enrollment_status,
        ),
        finance_observations=dtos,
    )
