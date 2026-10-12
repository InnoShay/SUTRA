"""
Tamper-evident audit chain and cryptographic hashing for Support Evidence Ledger (Phase 4).

Terminology Distinction:
- Input Evidence Fingerprint: SHA-256 of canonical Day-30 student telemetry features.
- Plan Version Hash: SHA-256 of canonical action steps and parameters in a support plan.
- Request Idempotency Key: Unique caller-supplied token to ensure exactly-once execution.
- Tamper-Evident Audit Hash Chain: SHA-256 linked chain over append-only audit events.
- Durable Database Transaction: ACID transaction executed in SQLite (WAL mode).

Security Notice:
An application-level hash chain and SQLite triggers provide tamper-evidence against
application-level regressions, ordinary edits, and accidental deletions. They DO NOT
prevent out-of-band manipulation by a privileged OS/database administrator with direct
write access to the SQLite file. We do NOT claim hardware or cryptographic immutability.
"""

import hashlib
import json
from typing import Any

from pydantic import BaseModel

from backend.app.orchestration.persistence.models import (
    AuditEventRecord,
    AuditVerificationResult,
)


def canonical_json(data: Any) -> str:
    """
    Produce deterministic canonical JSON representation.
    Ensures identical byte sequences across platforms and runs.
    """
    if isinstance(data, BaseModel):
        dumped = data.model_dump(mode="json")
    elif isinstance(data, dict):
        dumped = {
            k: (v.model_dump(mode="json") if isinstance(v, BaseModel) else v)
            for k, v in data.items()
        }
    else:
        dumped = data

    return json.dumps(
        dumped,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def compute_evidence_fingerprint(features: dict[str, Any]) -> str:
    """Compute SHA-256 fingerprint of Day-30 verified telemetry input."""
    payload = canonical_json(features)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def compute_plan_hash(
    plan_title: str,
    target_window_days: int,
    action_steps: list[Any],
) -> str:
    """Compute SHA-256 hash of structured support plan contents."""
    serialized_steps = []
    for step in action_steps:
        if isinstance(step, BaseModel):
            serialized_steps.append(step.model_dump(mode="json"))
        elif isinstance(step, dict):
            serialized_steps.append(step)
        else:
            serialized_steps.append(str(step))

    payload = canonical_json({
        "plan_title": plan_title,
        "target_window_days": target_window_days,
        "action_steps": serialized_steps,
    })
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def compute_entry_hash(
    prev_entry_hash: str,
    event_type: str,
    case_id: str,
    actor_id: str,
    timestamp: str,
    payload_canonical_json: str,
) -> str:
    """
    Compute cryptographic SHA-256 hash linking an event to its predecessor.
    Formula: sha256(prev_entry_hash | event_type | case_id | actor_id | timestamp | payload)
    """
    composite = f"{prev_entry_hash}|{event_type}|{case_id}|{actor_id}|{timestamp}|{payload_canonical_json}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def verify_audit_chain(events: list[AuditEventRecord]) -> AuditVerificationResult:
    """
    Verify tamper-evident audit hash chain integrity across all events.
    Checks:
    1. First event links to 'GENESIS'
    2. Every subsequent event links to prev_entry_hash == previous event's entry_hash
    3. Every event's entry_hash strictly matches recomputed SHA-256 hash
    """
    if not events:
        return AuditVerificationResult(
            is_valid=True,
            total_events=0,
            verified_events=0,
            corrupted_seq_id=None,
            message="Audit ledger is empty; integrity holds vacuously.",
        )

    # Sort strictly by sequence ID
    sorted_events = sorted(events, key=lambda e: e.seq_id)

    expected_prev = "GENESIS"
    for i, event in enumerate(sorted_events):
        # Verify backward pointer link
        if event.prev_entry_hash != expected_prev:
            return AuditVerificationResult(
                is_valid=False,
                total_events=len(sorted_events),
                verified_events=i,
                corrupted_seq_id=event.seq_id,
                message=(
                    f"Audit chain broken at seq_id {event.seq_id}: "
                    f"expected prev_entry_hash '{expected_prev}', got '{event.prev_entry_hash}'."
                ),
            )

        # Verify entry content hash
        recomputed = compute_entry_hash(
            prev_entry_hash=event.prev_entry_hash,
            event_type=event.event_type,
            case_id=event.case_id,
            actor_id=event.actor_id,
            timestamp=event.timestamp,
            payload_canonical_json=event.payload_canonical_json,
        )

        if event.entry_hash != recomputed:
            return AuditVerificationResult(
                is_valid=False,
                total_events=len(sorted_events),
                verified_events=i,
                corrupted_seq_id=event.seq_id,
                message=(
                    f"Audit entry hash mismatch at seq_id {event.seq_id}: "
                    f"recorded '{event.entry_hash}', recomputed '{recomputed}'."
                ),
            )

        expected_prev = event.entry_hash

    return AuditVerificationResult(
        is_valid=True,
        total_events=len(sorted_events),
        verified_events=len(sorted_events),
        corrupted_seq_id=None,
        message=f"All {len(sorted_events)} audit events verified successfully. Tamper check passed.",
    )
