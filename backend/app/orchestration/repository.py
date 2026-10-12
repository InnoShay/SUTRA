"""
In-Memory Run Repository for Testing Only — SUTRA Phase 1.

CRITICAL NOTICE:
This is an ephemeral, in-memory repository designed exclusively for testing
coordinator state machines and idempotency mechanics in unit tests.
It does NOT provide ACID durability, cryptographic tamper-proofing, or production
audit immutability. Durable persistence (SQLite/PostgreSQL) is deferred to Phase 4.
"""

import hashlib
import json
from typing import Any, Optional
from pydantic import BaseModel

from backend.app.orchestration.contracts import OrchestrationResult


class IdempotencyConflictError(Exception):
    """Raised when an idempotency key is reused with a different request payload."""
    pass


class StoredRunEntry(BaseModel):
    """Internal stored run representation."""
    run_id: str
    actor_id: str
    operation: str
    idempotency_key: str
    payload_fingerprint: str
    result: OrchestrationResult


class InMemoryRunRepository:
    """
    Ephemeral in-memory repository for deterministic testing.

    Enforces request-level idempotency binding: (actor_id, operation, idempotency_key).
    """

    def __init__(self):
        # Maps run_id -> StoredRunEntry
        self._runs_by_id: dict[str, StoredRunEntry] = {}
        # Maps (actor_id, operation, idempotency_key) -> StoredRunEntry
        self._runs_by_idempotency: dict[tuple[str, str, str], StoredRunEntry] = {}

    @staticmethod
    def compute_payload_fingerprint(payload: dict[str, Any]) -> str:
        """Compute deterministic SHA-256 fingerprint of normalized dictionary payload."""
        canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def get_run(self, run_id: str) -> Optional[OrchestrationResult]:
        """Retrieve run result by run_id."""
        entry = self._runs_by_id.get(run_id)
        return entry.result if entry else None

    def check_or_reserve_idempotency(
        self,
        actor_id: str,
        operation: str,
        idempotency_key: str,
        payload: dict[str, Any],
    ) -> Optional[OrchestrationResult]:
        """
        Check whether an idempotent execution already exists.

        Returns:
            - OrchestrationResult if an identical request previously completed.
            - None if the key has not been used yet.

        Raises:
            - IdempotencyConflictError if the same key is reused with a differing payload.
        """
        key_tuple = (actor_id, operation, idempotency_key)
        existing = self._runs_by_idempotency.get(key_tuple)

        if existing is None:
            return None

        # Verify payload fingerprint matches exactly
        current_fingerprint = self.compute_payload_fingerprint(payload)
        if existing.payload_fingerprint != current_fingerprint:
            raise IdempotencyConflictError(
                f"Idempotency conflict: key '{idempotency_key}' was previously used with "
                f"fingerprint '{existing.payload_fingerprint}', but was resubmitted with "
                f"different payload fingerprint '{current_fingerprint}'."
            )

        return existing.result

    def save_run(
        self,
        actor_id: str,
        operation: str,
        idempotency_key: str,
        payload: dict[str, Any],
        result: OrchestrationResult,
    ) -> None:
        """Store completed run result and register idempotency mapping."""
        fingerprint = self.compute_payload_fingerprint(payload)
        entry = StoredRunEntry(
            run_id=result.run_id,
            actor_id=actor_id,
            operation=operation,
            idempotency_key=idempotency_key,
            payload_fingerprint=fingerprint,
            result=result,
        )

        self._runs_by_id[result.run_id] = entry
        key_tuple = (actor_id, operation, idempotency_key)
        self._runs_by_idempotency[key_tuple] = entry

    def clear(self) -> None:
        """Clear all stored entries (for test setup/teardown)."""
        self._runs_by_id.clear()
        self._runs_by_idempotency.clear()
