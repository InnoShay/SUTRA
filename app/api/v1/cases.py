import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import PermissionDeniedError, ResourceNotFoundError
from app.core.security import CampusMembershipContext, get_campus_membership, require_roles
from app.models.case import Case, CaseEvent, CaseTask, RestrictedTaskDetail
from app.models.followup import CaseOutcome, FollowUp
from app.schemas.case import (
    AcceptAssignmentRequest,
    CaseAssignmentRequest,
    CaseDetailDTO,
    CaseEventDTO,
    CaseOutcomeDTO,
    CaseOverrideRequest,
    CaseReopenRequest,
    CaseTaskDTO,
    CaseTransitionRequest,
    CreateTaskRequest,
    FollowUpDTO,
    FollowUpRequest,
    OutcomeRequest,
)
from app.services.case_service import CaseService
from app.services.idempotency import IdempotencyService, compute_request_hash

router = APIRouter(prefix="/cases", tags=["Cases"])


def check_leadership_access(membership: CampusMembershipContext):
    """Restricts leadership role to cohort aggregates only (disallowing individual queues)."""
    if "leadership" in membership.roles and not any(
        r in ("hod", "mentor", "faculty", "institution_admin", "counsellor", "finance", "placement")
        for r in membership.roles
    ):
        raise PermissionDeniedError(
            "Leadership role is restricted to cohort aggregates and cannot access individual student case records",
            code="LEADERSHIP_QUEUE_ACCESS_DENIED",
        )


@router.get("", response_model=List[CaseDetailDTO])
async def list_cases(
    state: Optional[str] = Query(None, description="Optional filter by case state"),
    owner_id: Optional[uuid.UUID] = Query(None, description="Optional filter by primary owner user ID"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists cases in the active campus with state and owner filters."""
    check_leadership_access(membership)

    query = select(Case.id).where(Case.institution_id == membership.campus_id)
    if state:
        query = query.where(Case.state == state)
    if owner_id:
        query = query.where(Case.primary_owner_user_id == owner_id)

    query = query.order_by(Case.updated_at.desc())
    case_ids = (await db.execute(query)).scalars().all()

    results = []
    for cid in case_ids:
        c_dto = await CaseService.get_case_detail(db, membership.campus_id, cid)
        results.append(c_dto)
    return results


@router.get("/{case_id}", response_model=CaseDetailDTO)
async def get_case(
    case_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full case coordination record, tasks, follow-ups, and outcome."""
    check_leadership_access(membership)
    return await CaseService.get_case_detail(db, membership.campus_id, case_id)


@router.post("/{case_id}/transition", response_model=CaseDetailDTO)
async def transition_case_state(
    case_id: uuid.UUID = Path(...),
    body: CaseTransitionRequest = ...,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Applies valid state machine transition to a case."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return CaseDetailDTO(**cached.response_json)

    await CaseService.apply_transition(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        user_roles=membership.roles,
        to_state=body.to_state,
        reason_code=body.reason_code,
        metadata=body.metadata,
        idempotency_key=idempotency_key,
        expected_version=body.expected_version,
    )
    result = await CaseService.get_case_detail(db, membership.campus_id, case_id)
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/cases/{case_id}/transition",
            request_hash=req_hash,
            response_status_code=200,
            response_json=result.model_dump(mode="json"),
        )
        await db.commit()
    return result


@router.post("/{case_id}/assignment", response_model=CaseDetailDTO)
async def assign_case_owner(
    case_id: uuid.UUID = Path(...),
    body: CaseAssignmentRequest = ...,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(require_roles(["hod", "mentor", "institution_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Assigns or reassigns primary accountable owner and deadline."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return CaseDetailDTO(**cached.response_json)

    await CaseService.assign_owner(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        assigner_user_id=membership.user.id,
        new_owner_user_id=body.primary_owner_user_id,
        due_at=body.due_at,
        reason_code=body.reason_code,
        idempotency_key=idempotency_key,
        expected_version=body.expected_version,
    )
    result = await CaseService.get_case_detail(db, membership.campus_id, case_id)
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/cases/{case_id}/assignment",
            request_hash=req_hash,
            response_status_code=200,
            response_json=result.model_dump(mode="json"),
        )
        await db.commit()
    return result


@router.post("/{case_id}/accept-assignment", response_model=CaseDetailDTO)
async def accept_case_assignment(
    case_id: uuid.UUID = Path(...),
    body: AcceptAssignmentRequest = AcceptAssignmentRequest(),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Explicitly accepts assigned case responsibility (assigned primary owner only)."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return CaseDetailDTO(**cached.response_json)

    await CaseService.apply_transition(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        user_roles=membership.roles,
        to_state="accepted",
        reason_code="OWNER_ACCEPTED_ASSIGNMENT",
        metadata={"acceptance_note": body.acceptance_note},
        idempotency_key=idempotency_key,
    )
    result = await CaseService.get_case_detail(db, membership.campus_id, case_id)
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/cases/{case_id}/accept-assignment",
            request_hash=req_hash,
            response_status_code=200,
            response_json=result.model_dump(mode="json"),
        )
        await db.commit()
    return result


@router.post("/{case_id}/tasks", response_model=CaseTaskDTO, status_code=status.HTTP_201_CREATED)
async def create_case_task(
    case_id: uuid.UUID = Path(...),
    body: CreateTaskRequest = ...,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Delegates a specialized support subtask to a domain specialist."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return CaseTaskDTO(**cached.response_json)

    task = await CaseService.create_task(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        domain=body.domain,
        generic_label=body.generic_label,
        assignee_user_id=body.assignee_user_id,
        due_at=body.due_at,
        restricted_details=body.restricted_details,
        idempotency_key=idempotency_key,
    )
    result = CaseTaskDTO(
        id=task.id,
        domain=task.domain,
        generic_label=task.generic_label,
        state=task.state,
        assignee_user_id=task.assignee_user_id,
        due_at=task.due_at,
        accepted_at=task.accepted_at,
        completed_at=task.completed_at,
        deadline_version=task.deadline_version,
    )
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/cases/{case_id}/tasks",
            request_hash=req_hash,
            response_status_code=201,
            response_json=result.model_dump(mode="json"),
        )
        await db.commit()
    return result


@router.get("/{case_id}/tasks/{task_id}/restricted", response_model=Dict[str, Any])
async def get_restricted_task_details(
    case_id: uuid.UUID = Path(...),
    task_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves sensitive subtask details. Strictly gated to domain specialists (ADR-003)."""
    task = await db.get(CaseTask, task_id)
    if not task or task.institution_id != membership.campus_id or task.case_id != case_id:
        raise ResourceNotFoundError("Task not found in active campus case")

    # Domain capability check
    required_role = "counsellor" if task.domain == "counselling" else "finance" if task.domain == "finance" else None
    if required_role and required_role not in membership.roles and "institution_admin" not in membership.roles:
        raise PermissionDeniedError(
            f"Access to restricted {task.domain} details requires role '{required_role}'",
            code="RESTRICTED_DOMAIN_PERMISSION_DENIED",
        )

    query = select(RestrictedTaskDetail).where(
        RestrictedTaskDetail.institution_id == membership.campus_id,
        RestrictedTaskDetail.task_id == task_id,
    )
    res = await db.execute(query)
    detail = res.scalar_one_or_none()
    if not detail:
        raise ResourceNotFoundError("No restricted details stored for this task")

    return {
        "task_id": detail.task_id,
        "restricted_domain": detail.restricted_domain,
        "details": detail.details,
        "purpose_key": detail.purpose_key,
        "created_at": detail.created_at,
    }


@router.post("/{case_id}/follow-ups", response_model=FollowUpDTO, status_code=status.HTTP_201_CREATED)
async def record_case_follow_up(
    case_id: uuid.UUID = Path(...),
    body: FollowUpRequest = ...,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Records an outreach attempt, student response, or support delivery evidence."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return FollowUpDTO(**cached.response_json)

    fu = await CaseService.record_follow_up(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        follow_up_type=body.follow_up_type,
        contact_status=body.contact_status,
        proof_kind=body.proof_kind,
        occurred_at=body.occurred_at,
        note=body.note,
        proof_ref=body.proof_ref,
        idempotency_key=idempotency_key,
    )
    result = FollowUpDTO(
        id=fu.id,
        follow_up_type=fu.follow_up_type,
        contact_status=fu.contact_status,
        proof_kind=fu.proof_kind,
        occurred_at=fu.occurred_at,
        recorded_by=fu.recorded_by,
        sanitized_note=fu.sanitized_note,
        proof_ref=fu.proof_ref,
        created_at=fu.created_at,
    )
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/cases/{case_id}/follow-ups",
            request_hash=req_hash,
            response_status_code=201,
            response_json=result.model_dump(mode="json"),
        )
        await db.commit()
    return result


@router.post("/{case_id}/outcome", response_model=CaseOutcomeDTO, status_code=status.HTTP_201_CREATED)
async def record_case_outcome(
    case_id: uuid.UUID = Path(...),
    body: OutcomeRequest = ...,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Records post-support observed student outcome (helped, not_helped, mixed, unknown)."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return CaseOutcomeDTO(**cached.response_json)

    outcome = await CaseService.record_outcome(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        outcome_status=body.outcome_status,
        rationale=body.rationale,
        evidence_kind=body.evidence_kind,
        follow_up_window_end=body.follow_up_window_end,
    )
    result = CaseOutcomeDTO(
        id=outcome.id,
        outcome_status=outcome.outcome_status,
        rationale=outcome.rationale,
        evidence_kind=outcome.evidence_kind,
        follow_up_window_start=outcome.follow_up_window_start,
        follow_up_window_end=outcome.follow_up_window_end,
        recorded_by=outcome.recorded_by,
        recorded_at=outcome.recorded_at,
    )
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/cases/{case_id}/outcome",
            request_hash=req_hash,
            response_status_code=201,
            response_json=result.model_dump(mode="json"),
        )
        await db.commit()
    return result


@router.get("/{case_id}/history", response_model=List[CaseEventDTO])
async def get_case_history(
    case_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves immutable audit timeline of case state transitions and actions."""
    check_leadership_access(membership)

    case = await db.get(Case, case_id)
    if not case or case.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Case {case_id} not found in active campus")

    query = select(CaseEvent).where(
        CaseEvent.institution_id == membership.campus_id,
        CaseEvent.case_id == case_id,
    ).order_by(CaseEvent.created_at.asc())
    events = (await db.execute(query)).scalars().all()

    return [
        CaseEventDTO(
            id=e.id,
            event_type=e.event_type,
            actor_user_id=e.actor_user_id,
            actor_kind=e.actor_kind,
            from_state=e.from_state,
            to_state=e.to_state,
            reason_code=e.reason_code,
            event_metadata=e.event_metadata,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.post("/{case_id}/override", response_model=CaseDetailDTO)
async def override_case(
    case_id: uuid.UUID = Path(...),
    body: CaseOverrideRequest = ...,
    membership: CampusMembershipContext = Depends(require_roles(["hod", "institution_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Applies authorized supervisor override with mandatory rationale."""
    await CaseService.apply_transition(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        user_roles=membership.roles,
        to_state=body.to_state,
        reason_code=body.reason_code,
        metadata={"override_action": body.override_action, "rationale": body.rationale},
    )
    return await CaseService.get_case_detail(db, membership.campus_id, case_id)


@router.post("/{case_id}/reopen", response_model=CaseDetailDTO)
async def reopen_case(
    case_id: uuid.UUID = Path(...),
    body: CaseReopenRequest = ...,
    membership: CampusMembershipContext = Depends(require_roles(["hod", "institution_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Reopens a closed case with mandatory reason code and immediate action planned."""
    await CaseService.apply_transition(
        db=db,
        campus_id=membership.campus_id,
        case_id=case_id,
        user_id=membership.user.id,
        user_roles=membership.roles,
        to_state="reopened",
        reason_code=body.reopen_reason_code,
        metadata={"next_action": body.next_action},
    )
    return await CaseService.get_case_detail(db, membership.campus_id, case_id)
