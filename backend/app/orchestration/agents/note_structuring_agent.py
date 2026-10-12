"""
Agent 6: Follow-up Note Structuring Agent Implementation for SUTRA Phase 5.

Structures staff-entered unstructured follow-up notes while preserving strict
provenance and truthfulness. Never equates task completion with student progress,
and never sets or changes student course outcomes.
"""

import hashlib
from typing import Optional

from backend.app.orchestration.agents.prompts import (
    NOTE_STRUCTURING_SYSTEM_PROMPT_V1,
    NOTE_STRUCTURING_VERSION,
    sanitize_untrusted_note,
)
from backend.app.orchestration.contracts import (
    StructuredNoteDraft,
    StructuredNoteStatus,
)
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderResponse,
)


class NoteStructuringAgent:
    """
    SUTRA Agent 6: Follow-up Note Structuring Agent.

    Organizes unstructured staff notes into auditable categories (actions taken,
    observations, student statements, evidence references, unanswered questions).
    Outputs an unconfirmed draft requiring human advisor review.
    """

    AGENT_NAME: str = "Follow-up Note Structuring Agent"
    VERSION: str = NOTE_STRUCTURING_VERSION

    @classmethod
    def compute_note_hash(cls, raw_note: str) -> str:
        """Calculate SHA-256 fingerprint of original submitted note content."""
        return hashlib.sha256(raw_note.strip().encode("utf-8")).hexdigest()

    @classmethod
    def build_prompt(
        cls,
        case_id: str,
        raw_note: str,
        submitted_by: str,
        submitted_by_role: str,
        task_id: Optional[str] = None,
        task_description: Optional[str] = None,
        follow_up_evidence_expected: Optional[str] = None,
        current_outcome_status: str = "UNOBSERVED",
    ) -> str:
        """
        Build prompt isolating untrusted staff text and providing task context.
        """
        lines = [
            "CASE & TASK CONTEXT:",
            f"- Case ID: {case_id}",
            f"- Staff Submitter: {submitted_by} ({submitted_by_role})",
            f"- Authoritative Student Outcome State: {current_outcome_status} "
            f"(NOTE: Follow-up notes CANNOT alter this outcome state)",
        ]

        if task_id:
            lines.extend([
                f"- Associated Task ID: {task_id}",
                f"- Expected Task Action: {task_description or 'N/A'}",
                f"- Expected Follow-up Evidence: {follow_up_evidence_expected or 'N/A'}",
            ])

        lines.extend([
            "",
            "UNTRUSTED STAFF-ENTERED NOTE CONTENT:",
            sanitize_untrusted_note(raw_note),
            "",
            "TASK: Analyze the staff-entered note and classify into structured categories: "
            "1. reported_actions_taken: Specific actions the staff member states they performed. "
            "2. staff_observations: Direct factual observations reported by staff. "
            "3. attributed_student_statements: Statements explicitly attributed to the student. "
            "4. documented_evidence_references: Specific assessments, LMS modules, or metrics cited. "
            "5. unresolved_questions_or_concerns: Open items or uncertainties. "
            "6. missing_or_contradictory_information: Information gaps. "
            "7. potential_follow_up_evidence_required: What evidence is still needed. "
            "8. claims_requiring_confirmation: Unverified claims. "
            "",
            "CRITICAL CONSTRAINTS: "
            "- Distinguish what staff says they did from what the student said and what was verified. "
            "- NEVER infer or declare that the student has passed, improved, or succeeded based on task actions. "
            "- Leave sections empty if not supported by the note text. "
            "- Output human_confirmation_status MUST be 'DRAFT_AWAITING_CONFIRMATION'.",
        ])

        return "\n".join(lines)

    @classmethod
    def structure_note(
        cls,
        case_id: str,
        raw_note: str,
        submitted_by: str,
        submitted_by_role: str,
        provider: LLMProviderProtocol,
        task_id: Optional[str] = None,
        task_description: Optional[str] = None,
        follow_up_evidence_expected: Optional[str] = None,
        current_outcome_status: str = "UNOBSERVED",
        timeout_sec: float = 4.0,
    ) -> StructuredNoteDraft:
        """
        Execute Agent 6 follow-up note structuring via provider protocol.
        """
        if not raw_note or not raw_note.strip():
            raise ProviderFatalError("Cannot structure an empty follow-up note.")

        source_hash = cls.compute_note_hash(raw_note)

        prompt = cls.build_prompt(
            case_id=case_id,
            raw_note=raw_note,
            submitted_by=submitted_by,
            submitted_by_role=submitted_by_role,
            task_id=task_id,
            task_description=task_description,
            follow_up_evidence_expected=follow_up_evidence_expected,
            current_outcome_status=current_outcome_status,
        )

        response: ProviderResponse[StructuredNoteDraft] = provider.generate_structured(
            prompt=prompt,
            response_model=StructuredNoteDraft,
            timeout_sec=timeout_sec,
            system_prompt=NOTE_STRUCTURING_SYSTEM_PROMPT_V1,
        )

        if response.result is None:
            raise ProviderFatalError("Provider returned empty result for StructuredNoteDraft")

        draft = response.result

        # Populate authoritative attributes
        draft.case_id = case_id
        draft.task_id = task_id
        draft.raw_note_content = raw_note
        draft.source_note_hash = source_hash
        draft.human_confirmation_status = StructuredNoteStatus.DRAFT_AWAITING_CONFIRMATION

        draft.generation_metadata = {
            "agent_version": cls.VERSION,
            "provider_name": response.provider_name,
            "model_name": response.model_name,
            "latency_ms": response.latency_ms,
            "tokens_used": response.tokens_used,
            "submitted_by": submitted_by,
            "submitted_by_role": submitted_by_role,
        }

        return draft
