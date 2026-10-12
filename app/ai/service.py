import time
import uuid
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import DeterministicMockProvider, get_ai_provider
from app.ai.validator import validate_and_filter_candidate_interventions
from app.core.config import settings
from app.core.errors import ResourceNotFoundError
from app.models.ai import AIOrchestrationLog
from app.models.case import InterventionCatalog
from app.models.observation import StudentObservation
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from app.schemas.ai import (
    AICandidateInterventionItem,
    AIExecutionMetadata,
    AIServiceStatusResponse,
    AIStructuredReviewBriefResponse,
    AISuggestInterventionsResponse,
    AISummarizeEvidenceResponse,
)

logger = logging.getLogger(__name__)


class AIService:
    """Core Bounded AI Orchestration Service for SUTRA."""

    def __init__(self):
        self.mock_provider = DeterministicMockProvider()

    def get_status(self) -> AIServiceStatusResponse:
        """Returns readiness and governance boundaries of the AI service."""
        return AIServiceStatusResponse(
            enabled=settings.AI_ENABLED,
            provider=settings.AI_PROVIDER,
            model_name=settings.AI_MODEL,
            timeout_seconds=settings.AI_TIMEOUT_SECONDS,
            governance_invariants=[
                "AI is strictly advisory; never directly mutates database or executes actions",
                "Consequential case interventions require authorized human review (No Alert Without Action)",
                "Student financial records (ADR-003) and PII are strictly excluded from AI prompts",
                "Candidate interventions must match campus-controlled intervention catalogue",
                "Executive leadership is restricted from individual student queues (ADR-004)",
            ],
        )

    async def _get_campus_catalog(self, db: AsyncSession, institution_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Retrieves active catalog items for the active campus."""
        query = select(InterventionCatalog).where(
            InterventionCatalog.institution_id == institution_id,
            InterventionCatalog.active.is_(True),
        )
        result = await db.execute(query)
        items = result.scalars().all()

        if items:
            return [
                {
                    "intervention_key": i.intervention_key,
                    "display_label": i.display_label,
                    "domain": i.domain,
                    "recipient_role": i.recipient_role,
                    "description": i.description or "",
                }
                for i in items
            ]

        # Standard fallback catalog
        return [
            {
                "intervention_key": "academic_tutoring_offer",
                "display_label": "Subject Tutoring Referral",
                "domain": "academic",
                "recipient_role": "faculty",
                "description": "Targeted tutorial support session focusing on missed assignments.",
            },
            {
                "intervention_key": "mentor_check_in",
                "display_label": "Academic Mentor Check-In",
                "domain": "mentor",
                "recipient_role": "mentor",
                "description": "Informal check-in with assigned mentor to identify study obstacles.",
            },
            {
                "intervention_key": "counselling_referral",
                "display_label": "Student Wellbeing Referral",
                "domain": "counselling",
                "recipient_role": "counsellor",
                "description": "Confidential appointment referral with institutional counselling service.",
            },
        ]

    async def _log_execution(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        user_id: uuid.UUID,
        target_entity_type: str,
        target_entity_id: uuid.UUID,
        endpoint: str,
        provider: str,
        model_name: str,
        status: str,
        latency_ms: float,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
    ) -> None:
        """Persists audit record of AI orchestration execution."""
        try:
            log_entry = AIOrchestrationLog(
                institution_id=institution_id,
                user_id=user_id,
                target_entity_type=target_entity_type,
                target_entity_id=target_entity_id,
                endpoint=endpoint,
                provider=provider,
                model_name=model_name,
                status=status,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=round(latency_ms, 2),
            )
            db.add(log_entry)
            await db.commit()
        except Exception as e:
            logger.warning(f"Could not persist AI orchestration log: {e}")
            await db.rollback()

    async def generate_review_brief(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        user_id: uuid.UUID,
        signal_id: uuid.UUID,
    ) -> AIStructuredReviewBriefResponse:
        """Generates evidence-grounded review brief for a human educator."""
        start_time = time.time()

        # 1. Fetch Signal with strict campus isolation
        signal = await db.get(Signal, signal_id)
        if not signal or signal.institution_id != institution_id:
            raise ResourceNotFoundError(f"Signal {signal_id} not found in active campus")

        # 2. Fetch Student
        student = await db.get(Student, signal.student_id)
        if not student or student.institution_id != institution_id:
            raise ResourceNotFoundError(f"Student {signal.student_id} not found in active campus")

        # 3. Fetch Observations (strictly omitting financial records per ADR-003)
        obs_query = select(StudentObservation).where(
            StudentObservation.institution_id == institution_id,
            StudentObservation.student_id == student.id,
        ).order_by(StudentObservation.event_at.desc())
        obs_res = await db.execute(obs_query)
        observations = [
            {
                "domain": o.domain,
                "metric_key": o.metric_key,
                "value": o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
                "event_at": o.event_at.isoformat() if o.event_at else None,
            }
            for o in obs_res.scalars().all()
        ]

        # 4. Fetch Campus Intervention Catalog
        catalog = await self._get_campus_catalog(db, institution_id)

        # 5. Extract Evidence Digest and Evidence Card from Signal & Packet
        ep = await db.get(EvidencePacket, signal.evidence_packet_id) if signal.evidence_packet_id else None
        evidence_digest = ep.digest if ep else "sha256-unspecified"
        evidence_card = signal.explanation if isinstance(signal.explanation, dict) else {"explanation": str(signal.explanation)}

        # 6. Execute Provider with Fallback
        provider = get_ai_provider()
        status_label = "success"
        raw_result = None

        try:
            raw_result = await provider.generate_review_brief(
                student_ref=student.external_ref,
                rule_key=signal.rule_key,
                evidence_digest=evidence_digest,
                evidence_card=evidence_card,
                observations=observations,
                allowed_interventions=catalog,
            )
        except Exception as e:
            logger.warning(f"External AI provider failed ({e}); falling back to deterministic mock")
            status_label = "fallback"
            raw_result = await self.mock_provider.generate_review_brief(
                student_ref=student.external_ref,
                rule_key=signal.rule_key,
                evidence_digest=evidence_digest,
                evidence_card=evidence_card,
                observations=observations,
                allowed_interventions=catalog,
            )

        latency_ms = (time.time() - start_time) * 1000

        # 6. Validate and Format Candidate Interventions
        validated_candidates = validate_and_filter_candidate_interventions(
            raw_result.get("candidate_interventions", []),
            catalog,
        )

        # 7. Audit log
        await self._log_execution(
            db=db,
            institution_id=institution_id,
            user_id=user_id,
            target_entity_type="signal",
            target_entity_id=signal_id,
            endpoint="/api/v1/ai/review-brief",
            provider=raw_result.get("provider", "deterministic_mock"),
            model_name=raw_result.get("model_name", "sutra-mock-v1"),
            status=status_label,
            latency_ms=latency_ms,
        )

        return AIStructuredReviewBriefResponse(
            target_student_ref=student.external_ref,
            signal_id=signal.id,
            summary=str(raw_result.get("summary", "")).strip()[:1500],
            observed_facts=raw_result.get("observed_facts", []),
            model_predictions=raw_result.get("model_predictions", []),
            uncertainties=raw_result.get("uncertainties", []),
            review_questions=raw_result.get("review_questions", []),
            candidate_interventions=validated_candidates,
            limitations=raw_result.get("limitations", []),
            metadata=AIExecutionMetadata(
                model_name=raw_result.get("model_name", "sutra-mock-v1"),
                provider=raw_result.get("provider", "deterministic_mock"),
                latency_ms=round(latency_ms, 2),
                is_mock=raw_result.get("is_mock", True),
                timestamp=datetime.now(timezone.utc),
            ),
        )

    async def summarize_evidence(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        user_id: uuid.UUID,
        student_id: uuid.UUID,
        signal_id: Optional[uuid.UUID] = None,
    ) -> AISummarizeEvidenceResponse:
        """Summarizes authorized student evidence without generating full intervention plan."""
        start_time = time.time()

        student = await db.get(Student, student_id)
        if not student or student.institution_id != institution_id:
            raise ResourceNotFoundError(f"Student {student_id} not found in active campus")

        obs_query = select(StudentObservation).where(
            StudentObservation.institution_id == institution_id,
            StudentObservation.student_id == student.id,
        ).order_by(StudentObservation.event_at.desc())
        obs_res = await db.execute(obs_query)
        observations = [
            {
                "domain": o.domain,
                "metric_key": o.metric_key,
                "value": o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
                "event_at": o.event_at.isoformat() if o.event_at else None,
            }
            for o in obs_res.scalars().all()
            if o.domain.lower() not in ("finance", "fee", "billing")
        ]

        catalog = await self._get_campus_catalog(db, institution_id)

        raw_result = await self.mock_provider.generate_review_brief(
            student_ref=student.external_ref,
            rule_key="Evidence Summary Request",
            evidence_digest=f"Synthesis of {len(observations)} multi-domain observations",
            evidence_card=None,
            observations=observations,
            allowed_interventions=catalog,
        )

        latency_ms = (time.time() - start_time) * 1000

        await self._log_execution(
            db=db,
            institution_id=institution_id,
            user_id=user_id,
            target_entity_type="student",
            target_entity_id=student_id,
            endpoint="/api/v1/ai/summarize-evidence",
            provider="deterministic_mock",
            model_name="sutra-mock-v1",
            status="success",
            latency_ms=latency_ms,
        )

        return AISummarizeEvidenceResponse(
            target_student_ref=student.external_ref,
            summary=raw_result.get("summary", ""),
            observed_facts=raw_result.get("observed_facts", []),
            uncertainties=raw_result.get("uncertainties", []),
            limitations=raw_result.get("limitations", []),
            metadata=AIExecutionMetadata(
                model_name="sutra-mock-v1",
                provider="deterministic_mock",
                latency_ms=round(latency_ms, 2),
                is_mock=True,
                timestamp=datetime.now(timezone.utc),
            ),
        )

    async def suggest_interventions(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        user_id: uuid.UUID,
        student_id: uuid.UUID,
        signal_id: Optional[uuid.UUID] = None,
        max_suggestions: int = 3,
    ) -> AISuggestInterventionsResponse:
        """Suggests candidate interventions strictly from campus catalog."""
        start_time = time.time()

        student = await db.get(Student, student_id)
        if not student or student.institution_id != institution_id:
            raise ResourceNotFoundError(f"Student {student_id} not found in active campus")

        catalog = await self._get_campus_catalog(db, institution_id)

        raw_result = await self.mock_provider.generate_review_brief(
            student_ref=student.external_ref,
            rule_key="Intervention Planning",
            evidence_digest="Catalogue recommendation mapping",
            evidence_card=None,
            observations=[],
            allowed_interventions=catalog,
        )

        validated_candidates = validate_and_filter_candidate_interventions(
            raw_result.get("candidate_interventions", []),
            catalog,
        )[:max_suggestions]

        latency_ms = (time.time() - start_time) * 1000

        await self._log_execution(
            db=db,
            institution_id=institution_id,
            user_id=user_id,
            target_entity_type="student",
            target_entity_id=student_id,
            endpoint="/api/v1/ai/suggest-interventions",
            provider="deterministic_mock",
            model_name="sutra-mock-v1",
            status="success",
            latency_ms=latency_ms,
        )

        return AISuggestInterventionsResponse(
            target_student_ref=student.external_ref,
            candidate_interventions=validated_candidates,
            metadata=AIExecutionMetadata(
                model_name="sutra-mock-v1",
                provider="deterministic_mock",
                latency_ms=round(latency_ms, 2),
                is_mock=True,
                timestamp=datetime.now(timezone.utc),
            ),
        )


ai_service = AIService()
