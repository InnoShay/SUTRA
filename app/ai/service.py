import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import DeterministicMockProvider, get_ai_provider
from app.ai.validator import validate_and_filter_candidate_interventions
from app.core.config import settings
from app.core.errors import ResourceNotFoundError
from app.models.ai import AIOrchestrationLog
from app.models.case import Case, InterventionCatalog
from app.models.followup import CaseOutcome, FollowUp
from app.models.observation import StudentObservation
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from app.schemas.ai import (
    AICandidateInterventionItem,
    AIExecutionMetadata,
    AIRecommendationTier,
    AIServiceStatusResponse,
    AIStructuredReviewBriefResponse,
    AISuggestInterventionsResponse,
    AISummarizeEvidenceResponse,
    HumanDecisionTier,
    MLPredictionTier,
    ObservedDataTier,
    RuleSignalTier,
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
                "Evidence separation guarantees: Observed data, Rules, ML, AI advice, and Human decisions remain distinct",
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
        """Generates evidence-grounded 5-tier review brief for a human educator."""
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
        raw_obs = obs_res.scalars().all()

        observations = [
            {
                "domain": o.domain,
                "metric_key": o.metric_key,
                "value": o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
                "quality_state": o.quality_state,
                "event_at": o.event_at.isoformat() if o.event_at else None,
            }
            for o in raw_obs
            if o.domain.lower() not in ("financial", "finance", "fee", "fees", "billing", "financial_aid", "scholarship")
            and not o.domain.lower().startswith("financ")
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

        # 7. Validate and Format Candidate Interventions against campus catalog
        validated_candidates = validate_and_filter_candidate_interventions(
            raw_result.get("candidate_interventions", []),
            catalog,
        )

        # --- Construct Tier 1: Observed Student Data ---
        domains = sorted(list(set(o["domain"] for o in observations)))
        is_stale = any(o["quality_state"] == "stale" for o in observations)
        freshness = "stale" if is_stale else ("valid" if observations else "no_data")
        tier1 = ObservedDataTier(
            total_observations=len(observations),
            data_freshness=freshness,
            domains_represented=domains,
            observed_facts=raw_result.get("observed_facts", []),
            contradictions_detected=raw_result.get("contradictions_detected", []),
            data_limitations=raw_result.get("limitations", []),
        )

        # --- Construct Tier 2: Rule-Based Signal Audit ---
        tier2 = RuleSignalTier(
            rule_key=signal.rule_key,
            result=signal.result,
            evaluated_at=signal.evaluated_at,
            quality_state=signal.quality_state,
            explanation=evidence_card,
            trigger_summary=f"Rule '{signal.rule_key}' triggered outcome '{signal.result}' at {signal.evaluated_at.isoformat() if signal.evaluated_at else 'N/A'}",
        )

        # --- Construct Tier 3: ML Prediction & Model Attributions ---
        tier3 = MLPredictionTier(has_ml_prediction=False)
        if evidence_card and isinstance(evidence_card, dict):
            prob = evidence_card.get("risk_probability")
            m_name = evidence_card.get("model_name")
            if prob is not None or m_name:
                p_cutoff = evidence_card.get("prediction_cutoff", "Day 30")
                thresh = float(evidence_card.get("threshold", 0.46))
                cls_label = evidence_card.get("classification")
                if not cls_label and prob is not None:
                    cls_label = "At_Risk" if prob >= thresh else "On_Track"
                tier3 = MLPredictionTier(
                    has_ml_prediction=True,
                    model_name=m_name or "logistic_regression_baseline",
                    model_version=evidence_card.get("model_version", "1.0.0"),
                    prediction_cutoff=p_cutoff,
                    risk_probability=round(float(prob), 4) if prob is not None else None,
                    threshold=thresh,
                    classification=cls_label,
                    calibration_status=evidence_card.get("calibration_status", "platt_calibrated"),
                    top_attributions=evidence_card.get("top_attributions", evidence_card.get("attributions", [])),
                    ml_limitations=evidence_card.get("limitations", [
                        "Trained on historical Open University course registrations; not calibrated for non-modular curricula.",
                        "Represents statistical correlation, not causal certainty or personal diagnosis.",
                    ]),
                )

        # --- Construct Tier 4: AI Advisory Recommendations ---
        tier4 = AIRecommendationTier(
            summary=str(raw_result.get("summary", "")).strip()[:1500],
            uncertainties=raw_result.get("uncertainties", []),
            review_questions=raw_result.get("review_questions", []),
            candidate_interventions=validated_candidates,
            is_advisory=True,
        )

        # --- Construct Tier 5: Human Decisions & Case History ---
        case_query = select(Case).where(
            Case.institution_id == institution_id,
            Case.originating_signal_id == signal.id,
        )
        case_res = await db.execute(case_query)
        case_obj = case_res.scalars().first()

        follow_ups_count = 0
        outcome_status = None
        outcome_rationale = None

        if case_obj:
            fu_query = select(func.count(FollowUp.id)).where(FollowUp.case_id == case_obj.id)
            follow_ups_count = (await db.execute(fu_query)).scalar() or 0

            outcome_query = select(CaseOutcome).where(CaseOutcome.case_id == case_obj.id)
            outcome_res = await db.execute(outcome_query)
            outcome_obj = outcome_res.scalars().first()
            if outcome_obj:
                outcome_status = outcome_obj.outcome_status
                outcome_rationale = outcome_obj.rationale

        has_human = bool(signal.reviewed_decision or case_obj)
        tier5 = HumanDecisionTier(
            has_human_review=has_human,
            reviewed_decision=signal.reviewed_decision,
            reviewed_by=signal.reviewed_by,
            reviewed_at=signal.reviewed_at,
            review_reason_code=signal.review_reason_code,
            case_id=case_obj.id if case_obj else None,
            case_state=case_obj.state if case_obj else None,
            case_owner_id=case_obj.primary_owner_user_id if case_obj else None,
            case_due_at=case_obj.due_at if case_obj else None,
            follow_ups_count=follow_ups_count,
            outcome_status=outcome_status,
            outcome_rationale=outcome_rationale,
        )

        # 8. Audit log execution
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
            tier1_observed_data=tier1,
            tier2_rule_signal=tier2,
            tier3_ml_prediction=tier3,
            tier4_ai_recommendation=tier4,
            tier5_human_decision=tier5,
        )

    async def summarize_evidence(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        user_id: uuid.UUID,
        student_id: Optional[uuid.UUID] = None,
        student_ref: Optional[str] = None,
        signal_id: Optional[uuid.UUID] = None,
    ) -> AISummarizeEvidenceResponse:
        """Summarizes authorized student evidence into distinct tiers without full intervention plan."""
        start_time = time.time()

        # Resolve student
        student = None
        if student_id:
            student = await db.get(Student, student_id)
        elif student_ref:
            q = select(Student).where(
                Student.institution_id == institution_id,
                Student.external_ref == student_ref,
            )
            student = (await db.execute(q)).scalars().first()

        if not student or student.institution_id != institution_id:
            ident = str(student_id or student_ref)
            raise ResourceNotFoundError(f"Student '{ident}' not found in active campus")

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
                "quality_state": o.quality_state,
                "event_at": o.event_at.isoformat() if o.event_at else None,
            }
            for o in obs_res.scalars().all()
            if o.domain.lower() not in ("financial", "finance", "fee", "fees", "billing", "financial_aid", "scholarship")
            and not o.domain.lower().startswith("financ")
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
            target_entity_id=student.id,
            endpoint="/api/v1/ai/summarize-evidence",
            provider="deterministic_mock",
            model_name="sutra-mock-v1",
            status="success",
            latency_ms=latency_ms,
        )

        # Build Tier 1
        domains = sorted(list(set(o["domain"] for o in observations)))
        is_stale = any(o["quality_state"] == "stale" for o in observations)
        freshness = "stale" if is_stale else ("valid" if observations else "no_data")
        tier1 = ObservedDataTier(
            total_observations=len(observations),
            data_freshness=freshness,
            domains_represented=domains,
            observed_facts=raw_result.get("observed_facts", []),
            contradictions_detected=raw_result.get("contradictions_detected", []),
            data_limitations=raw_result.get("limitations", []),
        )

        # Build Tier 2 (active signals for student)
        sig_query = select(Signal).where(
            Signal.institution_id == institution_id,
            Signal.student_id == student.id,
        ).order_by(Signal.evaluated_at.desc())
        sig_res = await db.execute(sig_query)
        signals = sig_res.scalars().all()
        tier2_list = [
            RuleSignalTier(
                rule_key=s.rule_key,
                result=s.result,
                evaluated_at=s.evaluated_at,
                quality_state=s.quality_state,
                explanation=s.explanation if isinstance(s.explanation, dict) else {},
                trigger_summary=f"Rule '{s.rule_key}' triggered outcome '{s.result}'",
            )
            for s in signals[:5]
        ]

        # Build Tier 4
        validated_candidates = validate_and_filter_candidate_interventions(
            raw_result.get("candidate_interventions", []),
            catalog,
        )
        tier4 = AIRecommendationTier(
            summary=raw_result.get("summary", ""),
            uncertainties=raw_result.get("uncertainties", []),
            review_questions=raw_result.get("review_questions", []),
            candidate_interventions=validated_candidates,
            is_advisory=True,
        )

        # Build Tier 5
        cases_q = select(Case).where(
            Case.institution_id == institution_id,
            Case.student_id == student.id,
        ).order_by(Case.created_at.desc())
        case_obj = (await db.execute(cases_q)).scalars().first()
        tier5 = HumanDecisionTier(
            has_human_review=bool(case_obj),
            case_id=case_obj.id if case_obj else None,
            case_state=case_obj.state if case_obj else None,
            case_owner_id=case_obj.primary_owner_user_id if case_obj else None,
            case_due_at=case_obj.due_at if case_obj else None,
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
            tier1_observed_data=tier1,
            tier2_rule_signals=tier2_list,
            tier3_ml_prediction=MLPredictionTier(has_ml_prediction=False),
            tier4_ai_recommendation=tier4,
            tier5_human_decision=tier5,
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
            raw_result.get("candidate_interventions", [])[:max_suggestions],
            catalog,
        )

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
