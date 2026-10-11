import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import PermissionDeniedError, ResourceNotFoundError, StateConflictError
from app.models.case import (
    Case,
    CaseEvent,
    CaseTask,
    InterventionCatalog,
    RestrictedTaskDetail,
)
from app.models.followup import CaseOutcome, FollowUp
from app.models.outbox import NotificationOutbox
from app.models.signal import Signal
from app.models.student import Student
from app.schemas.case import (
    CaseDetailDTO,
    CaseEventDTO,
    CaseOutcomeDTO,
    CaseTaskDTO,
    FollowUpDTO,
)


# Canonical transition graph from 07_CASE_LIFECYCLE_AND_WORKER.md
ALLOWED_TRANSITIONS = {
    "suggested": ["under_review"],
    "under_review": ["action_planned", "dismissed"],
    "action_planned": ["assigned"],
    "assigned": ["accepted", "assigned"],  # reassign
    "accepted": ["contact_attempted"],
    "contact_attempted": ["support_in_progress", "failed_contact"],
    "support_in_progress": ["follow_up_due", "service_unavailable"],
    "follow_up_due": ["outcome_reviewed"],
    "outcome_reviewed": ["closed"],
    "failed_contact": ["closed"],
    "service_unavailable": ["closed"],
    "closed": ["reopened"],
    "dismissed": [],
    "reopened": ["assigned", "action_planned"],
}

TRANSITION_EVENTS = {
    ("suggested", "under_review"): "CASE_REVIEW_STARTED",
    ("under_review", "action_planned"): "INTERVENTION_APPROVED",
    ("under_review", "dismissed"): "SIGNAL_DISMISSED",
    ("action_planned", "assigned"): "OWNER_ASSIGNED",
    ("assigned", "accepted"): "ASSIGNMENT_ACCEPTED",
    ("assigned", "assigned"): "OWNER_REASSIGNED",
    ("accepted", "contact_attempted"): "CONTACT_ATTEMPTED",
    ("contact_attempted", "support_in_progress"): "SUPPORT_STARTED",
    ("contact_attempted", "failed_contact"): "CONTACT_FAILED",
    ("support_in_progress", "follow_up_due"): "SUPPORT_DELIVERED",
    ("support_in_progress", "service_unavailable"): "SERVICE_UNAVAILABLE",
    ("follow_up_due", "outcome_reviewed"): "OUTCOME_RECORDED",
    ("outcome_reviewed", "closed"): "CASE_CLOSED",
    ("failed_contact", "closed"): "CASE_CLOSED",
    ("service_unavailable", "closed"): "CASE_CLOSED",
    ("closed", "reopened"): "CASE_REOPENED",
}


class CaseService:
    """Orchestrates case lifecycle transitions, task delegation, follow-ups, and audit persistence."""

    @staticmethod
    async def create_case_from_signal(
        db: AsyncSession,
        campus_id: uuid.UUID,
        signal_id: uuid.UUID,
        user_id: uuid.UUID,
        selected_intervention_key: str,
        reason_code: str,
        idempotency_key: str,
    ) -> Case:
        # Check if case already exists for this signal
        query = select(Case).where(
            Case.institution_id == campus_id,
            Case.originating_signal_id == signal_id,
        )
        res = await db.execute(query)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        signal = await db.get(Signal, signal_id)
        if not signal or signal.institution_id != campus_id:
            raise ResourceNotFoundError(f"Signal {signal_id} not found in campus {campus_id}")

        now = datetime.now(timezone.utc)
        case = Case(
            id=uuid.uuid4(),
            institution_id=campus_id,
            student_id=signal.student_id,
            originating_signal_id=signal_id,
            selected_intervention_key=selected_intervention_key,
            state="action_planned",
            version=1,
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        db.add(case)
        await db.flush()

        # Emit audit event
        event = CaseEvent(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            actor_user_id=user_id,
            actor_kind="user",
            event_type="CASE_CREATED_FROM_SIGNAL",
            from_state="suggested",
            to_state="action_planned",
            reason_code=reason_code,
            event_metadata={"intervention": selected_intervention_key},
            idempotency_key=idempotency_key,
            created_at=now,
        )
        db.add(event)

        # Emit outbox notification intent
        outbox = NotificationOutbox(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            adapter_key="in_app_demo",
            template_key="CASE_ACTION_PLANNED",
            safe_payload={"case_id": str(case.id), "intervention": selected_intervention_key},
            status="pending",
            idempotency_key=f"outbox-{idempotency_key}",
            created_at=now,
        )
        db.add(outbox)

        await db.commit()
        return case

    @classmethod
    async def apply_transition(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        case_id: uuid.UUID,
        user_id: uuid.UUID,
        user_roles: List[str],
        to_state: str,
        reason_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Case:
        case = await db.get(Case, case_id)
        if not case or case.institution_id != campus_id:
            raise ResourceNotFoundError(f"Case {case_id} not found in campus {campus_id}")

        current_state = case.state
        allowed_targets = ALLOWED_TRANSITIONS.get(current_state, [])
        if to_state not in allowed_targets:
            raise StateConflictError(
                f"Transition from '{current_state}' to '{to_state}' is not allowed. Valid targets: {allowed_targets}",
                code="CASE_TRANSITION_NOT_ALLOWED",
            )

        # Role checks
        if current_state == "assigned" and to_state == "accepted":
            if case.primary_owner_user_id != user_id and "institution_admin" not in user_roles:
                raise PermissionDeniedError(
                    "Only the assigned primary owner may accept assignment",
                    code="OWNER_ONLY_ACTION",
                )

        now = datetime.now(timezone.utc)
        from_state = case.state
        case.state = to_state
        case.version += 1
        case.updated_at = now

        if to_state == "accepted":
            case.accepted_at = now

        event_type = TRANSITION_EVENTS.get((from_state, to_state), "STATE_TRANSITION")
        event_idemp = idempotency_key or str(uuid.uuid4())

        event = CaseEvent(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            actor_user_id=user_id,
            actor_kind="user",
            event_type=event_type,
            from_state=from_state,
            to_state=to_state,
            reason_code=reason_code,
            event_metadata=metadata or {},
            request_id=request_id,
            idempotency_key=event_idemp,
            created_at=now,
        )
        db.add(event)

        # Outbox entry
        outbox = NotificationOutbox(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            adapter_key="in_app_demo",
            template_key=f"CASE_STATE_{to_state.upper()}",
            safe_payload={"case_id": str(case.id), "from_state": from_state, "to_state": to_state},
            status="pending",
            idempotency_key=f"outbox-{event_idemp}",
            created_at=now,
        )
        db.add(outbox)

        await db.commit()
        return case

    @classmethod
    async def assign_owner(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        case_id: uuid.UUID,
        assigner_user_id: uuid.UUID,
        new_owner_user_id: uuid.UUID,
        due_at: Optional[datetime] = None,
        reason_code: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Case:
        case = await db.get(Case, case_id)
        if not case or case.institution_id != campus_id:
            raise ResourceNotFoundError(f"Case {case_id} not found in campus {campus_id}")

        now = datetime.now(timezone.utc)
        from_state = case.state

        # Can assign from action_planned or reassign from assigned
        if from_state not in ("action_planned", "assigned"):
            raise StateConflictError(
                f"Cannot assign owner while case is in '{from_state}' state",
                code="INVALID_STATE_FOR_ASSIGNMENT",
            )

        case.primary_owner_user_id = new_owner_user_id
        case.state = "assigned"
        if due_at:
            case.due_at = due_at
        case.version += 1
        case.updated_at = now

        event_idemp = idempotency_key or str(uuid.uuid4())
        event = CaseEvent(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            actor_user_id=assigner_user_id,
            actor_kind="user",
            event_type="OWNER_ASSIGNED" if from_state == "action_planned" else "OWNER_REASSIGNED",
            from_state=from_state,
            to_state="assigned",
            reason_code=reason_code or "ASSIGNED_BY_COORDINATOR",
            event_metadata={"new_owner_id": str(new_owner_user_id), "due_at": due_at.isoformat() if due_at else None},
            idempotency_key=event_idemp,
            created_at=now,
        )
        db.add(event)

        outbox = NotificationOutbox(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            adapter_key="in_app_demo",
            template_key="CASE_ASSIGNMENT_NOTIFICATION",
            destination_ref=str(new_owner_user_id),
            safe_payload={"case_id": str(case.id), "owner_id": str(new_owner_user_id)},
            status="pending",
            idempotency_key=f"outbox-{event_idemp}",
            created_at=now,
        )
        db.add(outbox)

        await db.commit()
        return case

    @classmethod
    async def create_task(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        case_id: uuid.UUID,
        user_id: uuid.UUID,
        domain: str,
        generic_label: str,
        assignee_user_id: Optional[uuid.UUID] = None,
        due_at: Optional[datetime] = None,
        restricted_details: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> CaseTask:
        case = await db.get(Case, case_id)
        if not case or case.institution_id != campus_id:
            raise ResourceNotFoundError(f"Case {case_id} not found in campus {campus_id}")

        now = datetime.now(timezone.utc)
        task_id = uuid.uuid4()
        task_idemp = idempotency_key or str(uuid.uuid4())

        task = CaseTask(
            id=task_id,
            institution_id=campus_id,
            case_id=case.id,
            domain=domain,
            generic_label=generic_label,
            state="assigned" if assignee_user_id else "pending",
            assignee_user_id=assignee_user_id,
            due_at=due_at,
            deadline_version=1,
            idempotency_key=task_idemp,
            created_at=now,
        )
        db.add(task)

        if restricted_details:
            r_detail = RestrictedTaskDetail(
                id=uuid.uuid4(),
                institution_id=campus_id,
                task_id=task.id,
                restricted_domain=domain,
                details=restricted_details,
                purpose_key=f"{domain}_support",
                retention_class="restricted_short_lived",
                created_at=now,
            )
            db.add(r_detail)

        event = CaseEvent(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            actor_user_id=user_id,
            actor_kind="user",
            event_type="SUBTASK_CREATED",
            from_state=case.state,
            to_state=case.state,
            reason_code="SPECIALIST_SUBTASK_DELEGATION",
            event_metadata={"task_id": str(task.id), "domain": domain, "label": generic_label},
            idempotency_key=f"event-{task_idemp}",
            created_at=now,
        )
        db.add(event)

        await db.commit()
        return task

    @classmethod
    async def record_follow_up(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        case_id: uuid.UUID,
        user_id: uuid.UUID,
        follow_up_type: str,
        contact_status: Optional[str],
        proof_kind: str,
        occurred_at: datetime,
        note: Optional[str] = None,
        proof_ref: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> FollowUp:
        case = await db.get(Case, case_id)
        if not case or case.institution_id != campus_id:
            raise ResourceNotFoundError(f"Case {case_id} not found in campus {campus_id}")

        now = datetime.now(timezone.utc)
        fu_idemp = idempotency_key or str(uuid.uuid4())

        fu = FollowUp(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            follow_up_type=follow_up_type,
            contact_status=contact_status,
            proof_kind=proof_kind,
            occurred_at=occurred_at,
            recorded_by=user_id,
            sanitized_note=note,
            proof_ref=proof_ref,
            idempotency_key=fu_idemp,
            created_at=now,
        )
        db.add(fu)

        # Advance case state if in earlier active stages
        from_state = case.state
        if case.state == "accepted":
            if follow_up_type == "support_delivered" and contact_status == "student_reached":
                case.state = "follow_up_due"
            elif contact_status == "student_reached":
                case.state = "support_in_progress"
            else:
                case.state = "contact_attempted"
            case.version += 1
            case.updated_at = now
        elif case.state == "contact_attempted":
            if follow_up_type == "support_delivered":
                case.state = "follow_up_due"
            elif contact_status == "student_reached":
                case.state = "support_in_progress"
            case.version += 1
            case.updated_at = now
        elif case.state == "support_in_progress" and follow_up_type == "support_delivered":
            case.state = "follow_up_due"
            case.version += 1
            case.updated_at = now

        event = CaseEvent(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            actor_user_id=user_id,
            actor_kind="user",
            event_type="FOLLOW_UP_RECORDED",
            from_state=from_state,
            to_state=case.state,
            reason_code="STUDENT_OUTREACH_ATTEMPTED",
            event_metadata={
                "follow_up_type": follow_up_type,
                "contact_status": contact_status,
                "proof_kind": proof_kind,
            },
            idempotency_key=f"event-{fu_idemp}",
            created_at=now,
        )
        db.add(event)

        await db.commit()
        return fu

    @classmethod
    async def record_outcome(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        case_id: uuid.UUID,
        user_id: uuid.UUID,
        outcome_status: str,
        rationale: str,
        evidence_kind: str = "staff_review",
        follow_up_window_end: Optional[datetime] = None,
    ) -> CaseOutcome:
        case = await db.get(Case, case_id)
        if not case or case.institution_id != campus_id:
            raise ResourceNotFoundError(f"Case {case_id} not found in campus {campus_id}")

        now = datetime.now(timezone.utc)
        outcome = CaseOutcome(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            outcome_status=outcome_status,
            follow_up_window_start=now,
            follow_up_window_end=follow_up_window_end,
            rationale=rationale,
            evidence_kind=evidence_kind,
            recorded_by=user_id,
            recorded_at=now,
            created_at=now,
        )
        db.add(outcome)

        from_state = case.state
        case.state = "outcome_reviewed"
        case.version += 1
        case.updated_at = now

        event = CaseEvent(
            id=uuid.uuid4(),
            institution_id=campus_id,
            case_id=case.id,
            actor_user_id=user_id,
            actor_kind="user",
            event_type="OUTCOME_RECORDED",
            from_state=from_state,
            to_state="outcome_reviewed",
            reason_code="POST_INTERVENTION_EVALUATION",
            event_metadata={"outcome_status": outcome_status, "evidence_kind": evidence_kind},
            idempotency_key=str(uuid.uuid4()),
            created_at=now,
        )
        db.add(event)

        await db.commit()
        return outcome

    @classmethod
    async def get_case_detail(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        case_id: uuid.UUID,
    ) -> CaseDetailDTO:
        case = await db.get(Case, case_id)
        if not case or case.institution_id != campus_id:
            raise ResourceNotFoundError(f"Case {case_id} not found in campus {campus_id}")

        student = await db.get(Student, case.student_id)

        # Tasks
        tasks_query = select(CaseTask).where(CaseTask.case_id == case.id)
        tasks = (await db.execute(tasks_query)).scalars().all()

        # Events
        events_query = select(CaseEvent).where(CaseEvent.case_id == case.id).order_by(CaseEvent.created_at.asc())
        events = (await db.execute(events_query)).scalars().all()

        # Follow-ups
        fu_query = select(FollowUp).where(FollowUp.case_id == case.id).order_by(FollowUp.occurred_at.asc())
        fus = (await db.execute(fu_query)).scalars().all()

        # Outcome
        outcome_query = select(CaseOutcome).where(CaseOutcome.case_id == case.id)
        outcome = (await db.execute(outcome_query)).scalar_one_or_none()

        return CaseDetailDTO(
            id=case.id,
            institution_id=case.institution_id,
            student_id=case.student_id,
            external_student_ref=student.external_ref if student else "",
            student_display_name=student.display_name if student else "",
            originating_signal_id=case.originating_signal_id,
            selected_intervention_key=case.selected_intervention_key,
            state=case.state,
            primary_owner_user_id=case.primary_owner_user_id,
            due_at=case.due_at,
            accepted_at=case.accepted_at,
            is_escalated=case.is_escalated,
            version=case.version,
            created_at=case.created_at,
            updated_at=case.updated_at,
            tasks=[
                CaseTaskDTO(
                    id=t.id,
                    domain=t.domain,
                    generic_label=t.generic_label,
                    state=t.state,
                    assignee_user_id=t.assignee_user_id,
                    due_at=t.due_at,
                    accepted_at=t.accepted_at,
                    completed_at=t.completed_at,
                    deadline_version=t.deadline_version,
                )
                for t in tasks
            ],
            events=[
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
            ],
            follow_ups=[
                FollowUpDTO(
                    id=f.id,
                    follow_up_type=f.follow_up_type,
                    contact_status=f.contact_status,
                    proof_kind=f.proof_kind,
                    occurred_at=f.occurred_at,
                    recorded_by=f.recorded_by,
                    sanitized_note=f.sanitized_note,
                    proof_ref=f.proof_ref,
                    created_at=f.created_at,
                )
                for f in fus
            ],
            outcome=CaseOutcomeDTO(
                id=outcome.id,
                outcome_status=outcome.outcome_status,
                rationale=outcome.rationale,
                evidence_kind=outcome.evidence_kind,
                follow_up_window_start=outcome.follow_up_window_start,
                follow_up_window_end=outcome.follow_up_window_end,
                recorded_by=outcome.recorded_by,
                recorded_at=outcome.recorded_at,
            ) if outcome else None,
        )
