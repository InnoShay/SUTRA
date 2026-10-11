import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.case import Case, CaseEvent
from app.models.outbox import NotificationOutbox


class OutboxWorker:
    """
    Durable transactional outbox worker and automated escalation processor.
    
    Guarantees:
    - Background job intent is persisted durably within the business transaction.
    - Worker interruption or crash does not lose pending messages or corrupt case state.
    - Bounded exponential retries (up to MAX_RETRIES) before dead-lettering.
    - External side effects are logged with delivery idempotency keys.
    """

    MAX_RETRIES: int = 5
    BASE_BACKOFF_SECONDS: int = 5

    @classmethod
    async def process_outbox_batch(
        cls,
        db: AsyncSession,
        campus_id: Optional[uuid.UUID] = None,
        batch_size: int = 50,
        dispatcher: Optional[Callable[[NotificationOutbox], None]] = None,
    ) -> Dict[str, int]:
        """
        Drains up to batch_size pending outbox notifications that are due for delivery.
        Applies exponential backoff on delivery failures and dead-letters after MAX_RETRIES.
        """
        now = datetime.now(timezone.utc)
        query = select(NotificationOutbox).where(
            NotificationOutbox.status == "pending",
            NotificationOutbox.next_attempt_at <= now,
        )
        if campus_id:
            query = query.where(NotificationOutbox.institution_id == campus_id)

        query = query.order_by(NotificationOutbox.created_at.asc()).limit(batch_size).with_for_update(skip_locked=True)
        res = await db.execute(query)
        items = res.scalars().all()

        sent_count = 0
        failed_count = 0
        dead_letter_count = 0

        for item in items:
            item.attempts += 1
            try:
                if dispatcher:
                    dispatcher(item)
                item.status = "sent"
                item.sent_at = datetime.now(timezone.utc)
                item.last_error_code = None
                sent_count += 1
            except Exception as exc:
                failed_count += 1
                logger.warning(
                    f"Outbox dispatch failure for event {item.id} (attempt {item.attempts}/{cls.MAX_RETRIES}): {exc}"
                )
                if item.attempts >= cls.MAX_RETRIES:
                    item.status = "dead_letter"
                    item.last_error_code = f"MAX_RETRIES_EXCEEDED: {str(exc)[:100]}"
                    dead_letter_count += 1
                else:
                    backoff = cls.BASE_BACKOFF_SECONDS * (2 ** (item.attempts - 1))
                    item.next_attempt_at = datetime.fromtimestamp(now.timestamp() + backoff, tz=timezone.utc)
                    item.last_error_code = str(exc)[:100]

        await db.commit()
        return {
            "processed": len(items),
            "sent": sent_count,
            "failed": failed_count,
            "dead_letter": dead_letter_count,
        }

    @classmethod
    async def scan_and_escalate_overdue_cases(
        cls,
        db: AsyncSession,
        campus_id: Optional[uuid.UUID] = None,
        effective_now: Optional[datetime] = None,
    ) -> int:
        """
        Scans active cases with overdue deadlines, atomically updates escalation state,
        records audit events, and dispatches supervisor notification intents.
        """
        now = effective_now or datetime.now(timezone.utc)
        query = select(Case).where(
            Case.state.notin_(["closed", "dismissed"]),
            Case.due_at.is_not(None),
            Case.due_at < now,
            Case.is_escalated.is_(False),
        )
        if campus_id:
            query = query.where(Case.institution_id == campus_id)

        res = await db.execute(query)
        overdue_cases = res.scalars().all()

        for case in overdue_cases:
            case.is_escalated = True
            case.version += 1
            case.updated_at = now

            event_idemp = f"escalate-{case.id}-{int(now.timestamp())}"
            event = CaseEvent(
                id=uuid.uuid4(),
                institution_id=case.institution_id,
                case_id=case.id,
                actor_user_id=None,
                actor_kind="system_worker",
                event_type="CASE_ESCALATED",
                from_state=case.state,
                to_state=case.state,
                reason_code="DEADLINE_EXPIRED_AUTOMATIC_ESCALATION",
                event_metadata={
                    "due_at": case.due_at.isoformat() if case.due_at else None,
                    "escalated_at": now.isoformat(),
                },
                idempotency_key=event_idemp,
                created_at=now,
            )
            db.add(event)

            outbox = NotificationOutbox(
                id=uuid.uuid4(),
                institution_id=case.institution_id,
                case_id=case.id,
                adapter_key="in_app_demo",
                template_key="CASE_ESCALATION_SUPERVISOR",
                safe_payload={
                    "case_id": str(case.id),
                    "due_at": case.due_at.isoformat() if case.due_at else None,
                    "student_id": str(case.student_id),
                },
                status="pending",
                idempotency_key=f"outbox-{event_idemp}",
                created_at=now,
            )
            db.add(outbox)

        await db.commit()
        return len(overdue_cases)
