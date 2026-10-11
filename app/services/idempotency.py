import hashlib
import json
import uuid
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import StateConflictError
from app.models.idempotency import IdempotencyRecord


def compute_request_hash(data: Any) -> str:
    """Computes a deterministic SHA-256 hash of a request payload."""
    if data is None:
        raw = b""
    elif isinstance(data, (dict, list)):
        raw = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
    elif isinstance(data, str):
        raw = data.encode("utf-8")
    else:
        raw = str(data).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class IdempotencyService:
    """Provides scoped request idempotency, replay of cached responses, and payload mismatch detection."""

    @staticmethod
    async def check_key(
        db: AsyncSession,
        campus_id: uuid.UUID,
        idempotency_key: str,
        request_hash: str,
    ) -> Optional[IdempotencyRecord]:
        """
        Checks whether an idempotency key was previously processed in this campus boundary.
        If found:
          - If request_hash matches, returns the existing record for safe replay.
          - If request_hash differs, raises StateConflictError (IDEMPOTENCY_KEY_MISMATCH).
        """
        query = select(IdempotencyRecord).where(
            IdempotencyRecord.institution_id == campus_id,
            IdempotencyRecord.idempotency_key == idempotency_key,
        )
        res = await db.execute(query)
        record = res.scalar_one_or_none()
        if not record:
            return None

        if record.request_hash != request_hash:
            raise StateConflictError(
                f"Idempotency key '{idempotency_key}' was previously used with a different request payload.",
                code="IDEMPOTENCY_KEY_MISMATCH",
            )
        return record

    @staticmethod
    async def record_response(
        db: AsyncSession,
        campus_id: uuid.UUID,
        idempotency_key: str,
        request_path: str,
        request_hash: str,
        response_status_code: int,
        response_json: Dict[str, Any],
    ) -> IdempotencyRecord:
        """Stores the response outcome within the active database transaction for future idempotent replays."""
        record = IdempotencyRecord(
            id=uuid.uuid4(),
            institution_id=campus_id,
            idempotency_key=idempotency_key,
            request_path=request_path,
            request_hash=request_hash,
            response_status_code=response_status_code,
            response_json=response_json,
        )
        db.add(record)
        return record
