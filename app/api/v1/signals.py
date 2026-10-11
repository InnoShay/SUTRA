import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import PermissionDeniedError, ResourceNotFoundError
from app.core.security import CampusMembershipContext, get_campus_membership, require_roles
from app.models.case import Case, InterventionCatalog
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from app.schemas.signal import (
    EvidenceCardDTO,
    EvaluateStudentRequest,
    SignalDTO,
    SignalReviewRequest,
    SignalReviewResponse,
)
from app.services.case_service import CaseService
from app.services.idempotency import IdempotencyService, compute_request_hash
from app.services.policy_engine import PolicyEngineService

router = APIRouter(tags=["Signals"])


def check_leadership_access(membership: CampusMembershipContext):
    """Restricts leadership role to cohort aggregates only (disallowing individual queues)."""
    if "leadership" in membership.roles and not any(
        r in ("hod", "mentor", "faculty", "institution_admin", "counsellor", "finance", "placement")
        for r in membership.roles
    ):
        raise PermissionDeniedError(
            "Leadership role is restricted to cohort aggregates and cannot access individual signal queues",
            code="LEADERSHIP_QUEUE_ACCESS_DENIED",
        )


@router.post("/students/{student_id}/signals/evaluate", response_model=SignalDTO)
async def evaluate_student_policy(
    student_id: uuid.UUID = Path(...),
    body: EvaluateStudentRequest = EvaluateStudentRequest(),
    membership: CampusMembershipContext = Depends(require_roles(["faculty", "hod", "mentor", "institution_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Evaluates deterministic policy rules against frozen student evidence as-of cutoff."""
    return await PolicyEngineService.evaluate_student(
        db=db,
        campus_id=membership.campus_id,
        student_id=student_id,
        as_of_at=body.as_of_at,
        policy_version_id=body.policy_version_id,
    )


@router.get("/signals", response_model=List[SignalDTO])
async def list_signals_queue(
    reviewed: Optional[bool] = Query(False, description="Filter by review status (default unreviewed queue)"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists signals in the review queue for the active campus."""
    check_leadership_access(membership)

    query = (
        select(Signal, Student.external_ref, Student.display_name, EvidencePacket.digest)
        .join(Student, Student.id == Signal.student_id)
        .join(EvidencePacket, EvidencePacket.id == Signal.evidence_packet_id)
        .where(Signal.institution_id == membership.campus_id)
    )
    if not reviewed:
        query = query.where(Signal.reviewed_decision.is_(None))

    query = query.order_by(Signal.evaluated_at.desc())
    result = await db.execute(query)
    rows = result.all()

    dtos = []
    for sig, ext_ref, disp_name, digest in rows:
        card = EvidenceCardDTO(
            card_type="deterministic_rule_evidence",
            model_name=sig.rule_key,
            classification="Attention Suggested" if sig.result == "attention_suggested" else "Normal",
        )
        dtos.append(
            SignalDTO(
                id=sig.id,
                institution_id=sig.institution_id,
                student_id=sig.student_id,
                external_student_ref=ext_ref,
                student_display_name=disp_name,
                rule_key=sig.rule_key,
                result=sig.result,
                quality_state=sig.quality_state,
                explanation=sig.explanation,
                evaluated_at=sig.evaluated_at,
                reviewed_decision=sig.reviewed_decision,
                reviewed_by=sig.reviewed_by,
                reviewed_at=sig.reviewed_at,
                review_reason_code=sig.review_reason_code,
                evidence_digest=digest,
                evidence_card=card,
            )
        )
    return dtos


@router.get("/signals/{signal_id}", response_model=SignalDTO)
async def get_signal_detail(
    signal_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full signal details, explanation, and evidence packet digest."""
    check_leadership_access(membership)

    query = (
        select(Signal, Student.external_ref, Student.display_name, EvidencePacket.digest)
        .join(Student, Student.id == Signal.student_id)
        .join(EvidencePacket, EvidencePacket.id == Signal.evidence_packet_id)
        .where(Signal.id == signal_id, Signal.institution_id == membership.campus_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise ResourceNotFoundError(f"Signal {signal_id} not found in active campus")

    sig, ext_ref, disp_name, digest = row
    card = EvidenceCardDTO(
        card_type="deterministic_rule_evidence",
        model_name=sig.rule_key,
        classification="Attention Suggested" if sig.result == "attention_suggested" else "Normal",
    )
    return SignalDTO(
        id=sig.id,
        institution_id=sig.institution_id,
        student_id=sig.student_id,
        external_student_ref=ext_ref,
        student_display_name=disp_name,
        rule_key=sig.rule_key,
        result=sig.result,
        quality_state=sig.quality_state,
        explanation=sig.explanation,
        evaluated_at=sig.evaluated_at,
        reviewed_decision=sig.reviewed_decision,
        reviewed_by=sig.reviewed_by,
        reviewed_at=sig.reviewed_at,
        review_reason_code=sig.review_reason_code,
        evidence_digest=digest,
        evidence_card=card,
    )


@router.post("/signals/{signal_id}/review", response_model=SignalReviewResponse)
async def review_signal(
    signal_id: uuid.UUID = Path(...),
    body: SignalReviewRequest = ...,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(require_roles(["faculty", "hod", "mentor", "institution_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Submits human review decision on a signal (approve, modify, dismiss, request_more_data)."""
    req_hash = compute_request_hash(body.model_dump(mode="json"))
    if idempotency_key:
        cached = await IdempotencyService.check_key(db, membership.campus_id, idempotency_key, req_hash)
        if cached:
            return SignalReviewResponse(**cached.response_json)

    signal = await db.get(Signal, signal_id)
    if not signal or signal.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Signal {signal_id} not found in active campus")

    now = datetime.now(timezone.utc)
    signal.reviewed_decision = body.decision
    signal.reviewed_by = membership.user.id
    signal.reviewed_at = now
    signal.review_reason_code = body.reason_code or f"DECISION_{body.decision.upper()}"

    case_id = None
    if body.decision in ("approve", "modify"):
        intervention_key = body.selected_intervention_key or "mentor_check_in"
        idemp = idempotency_key or str(uuid.uuid4())
        case = await CaseService.create_case_from_signal(
            db=db,
            campus_id=membership.campus_id,
            signal_id=signal.id,
            user_id=membership.user.id,
            selected_intervention_key=intervention_key,
            reason_code=signal.review_reason_code,
            idempotency_key=idemp,
        )
        case_id = case.id
    else:
        await db.commit()

    resp = SignalReviewResponse(
        signal_id=signal.id,
        decision=body.decision,
        case_id=case_id,
        status="success",
        message=f"Signal review decision '{body.decision}' recorded successfully",
    )
    if idempotency_key:
        await IdempotencyService.record_response(
            db=db,
            campus_id=membership.campus_id,
            idempotency_key=idempotency_key,
            request_path=f"/signals/{signal_id}/review",
            request_hash=req_hash,
            response_status_code=200,
            response_json=resp.model_dump(mode="json"),
        )
        await db.commit()

    return resp
