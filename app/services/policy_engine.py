import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import StudentObservation
from app.models.policy import PolicyVersion
from app.models.signal import EvidencePacket, Signal
from app.models.student import Student
from app.schemas.signal import EvidenceCardDTO, EvidenceCardItem, SignalDTO


class PolicyEngineService:
    """Pure, deterministic policy evaluation engine enforcing anti-leakage and traceable evidence."""

    RULE_POLICY_KEY = "ug_attendance_academic_v1"
    EVALUATOR_VERSION = "2.0.0"

    @classmethod
    async def get_or_create_policy_version(
        cls, db: AsyncSession, campus_id: uuid.UUID
    ) -> PolicyVersion:
        """Retrieves or initializes the active published policy version for the campus."""
        query = select(PolicyVersion).where(
            PolicyVersion.institution_id == campus_id,
            PolicyVersion.policy_key == cls.RULE_POLICY_KEY,
            PolicyVersion.status == "published",
        ).order_by(PolicyVersion.version.desc())
        res = await db.execute(query)
        pv = res.scalar_one_or_none()
        if pv:
            return pv

        definition = {
            "rules": [
                {
                    "rule_key": "attendance_concern",
                    "domain": "attendance",
                    "metric_key": "attendance_rate",
                    "operator": "<",
                    "threshold": 0.75,
                    "suggested_intervention": "mentor_check_in",
                    "rationale_code": "ATTENDANCE_BELOW_THRESHOLD_75",
                },
                {
                    "rule_key": "assignment_backlog",
                    "domain": "academic",
                    "metric_key": "missing_assignments_count",
                    "operator": ">=",
                    "threshold": 2,
                    "suggested_intervention": "academic_tutoring_offer",
                    "rationale_code": "MULTIPLE_MISSING_ASSIGNMENTS",
                },
                {
                    "rule_key": "faculty_feedback_concern",
                    "domain": "faculty_feedback",
                    "metric_key": "support_check_requested",
                    "operator": "==",
                    "threshold": True,
                    "suggested_intervention": "mentor_check_in",
                    "rationale_code": "FACULTY_SUPPORT_REQUESTED",
                },
            ]
        }
        raw_bytes = json.dumps(definition, sort_keys=True).encode("utf-8")
        checksum = hashlib.sha256(raw_bytes).hexdigest()

        now = datetime.now(timezone.utc)
        pv = PolicyVersion(
            id=uuid.uuid4(),
            institution_id=campus_id,
            policy_key=cls.RULE_POLICY_KEY,
            version=1,
            status="published",
            definition=definition,
            checksum=checksum,
            evaluator_version=cls.EVALUATOR_VERSION,
            published_at=now,
            effective_from=now,
            created_at=now,
        )
        db.add(pv)
        await db.flush()
        return pv

    @classmethod
    async def evaluate_student(
        cls,
        db: AsyncSession,
        campus_id: uuid.UUID,
        student_id: uuid.UUID,
        as_of_at: Optional[datetime] = None,
        policy_version_id: Optional[uuid.UUID] = None,
    ) -> SignalDTO:
        cutoff = as_of_at or datetime.now(timezone.utc)

        # 1. Fetch student
        student = await db.get(Student, student_id)
        if not student or student.institution_id != campus_id:
            from app.core.errors import ResourceNotFoundError
            raise ResourceNotFoundError(f"Student {student_id} not found in campus {campus_id}")

        # 2. Fetch policy version
        if policy_version_id:
            pv = await db.get(PolicyVersion, policy_version_id)
        else:
            pv = await cls.get_or_create_policy_version(db, campus_id)

        # 3. Retrieve eligible observations strictly satisfying: available_at <= cutoff
        # Anti-leakage temporal barrier: any record available after cutoff is completely invisible
        obs_query = select(StudentObservation).where(
            StudentObservation.institution_id == campus_id,
            StudentObservation.student_id == student_id,
            StudentObservation.available_at <= cutoff,
        ).order_by(StudentObservation.event_at.desc())
        obs_res = await db.execute(obs_query)
        eligible_obs = obs_res.scalars().all()

        # Build metric map
        metrics: Dict[str, Any] = {}
        quality_states: Dict[str, str] = {}
        for o in eligible_obs:
            val = o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value
            if o.metric_key not in metrics:
                metrics[o.metric_key] = val
                quality_states[o.metric_key] = o.quality_state

        # 4. Evaluate rules deterministically
        triggered_rules: List[Dict[str, Any]] = []
        attributions: List[EvidenceCardItem] = []
        rules = pv.definition.get("rules", [])

        has_stale_or_conflicting = any(
            o.quality_state in ("stale", "conflicting") for o in eligible_obs
        )
        has_missing_metrics = False

        for r in rules:
            m_key = r["metric_key"]
            if m_key not in metrics:
                has_missing_metrics = True
                continue

            val = metrics[m_key]
            q_state = quality_states.get(m_key, "valid")
            if q_state in ("stale", "missing", "conflicting"):
                continue

            triggered = False
            op = r["operator"]
            thresh = r["threshold"]

            try:
                if op == "<" and float(val) < float(thresh):
                    triggered = True
                elif op == ">=" and float(val) >= float(thresh):
                    triggered = True
                elif op == "==" and val == thresh:
                    triggered = True
            except (ValueError, TypeError):
                continue

            if triggered:
                triggered_rules.append(r)
                attributions.append(
                    EvidenceCardItem(
                        feature=m_key,
                        value=val,
                        attribution=0.35,
                        direction="increases_risk",
                    )
                )

        # Determine signal result & quality state
        if not eligible_obs:
            result = "unknown"
            quality_state = "insufficient_evidence"
            primary_rule_key = "insufficient_observations"
        elif has_stale_or_conflicting:
            result = "unknown"
            quality_state = "stale_source"
            primary_rule_key = "stale_or_incomplete_evidence"
        elif triggered_rules:
            result = "attention_suggested"
            quality_state = "sufficient"
            primary_rule_key = triggered_rules[0]["rule_key"]
        elif has_missing_metrics:
            result = "unknown"
            quality_state = "insufficient_evidence"
            primary_rule_key = "missing_observations"
        else:
            result = "no_rule_triggered"
            quality_state = "sufficient"
            primary_rule_key = "all_metrics_normal"

        # Construct Evidence Packet snapshot & digest
        snapshot = {
            "student_id": str(student_id),
            "external_student_ref": student.external_ref,
            "as_of_at": cutoff.isoformat(),
            "eligible_observation_ids": [str(o.id) for o in eligible_obs],
            "metrics_evaluated": metrics,
            "triggered_rules": triggered_rules,
            "policy_key": pv.policy_key,
            "policy_version": pv.version,
        }
        snapshot_bytes = json.dumps(snapshot, sort_keys=True).encode("utf-8")
        digest = hashlib.sha256(snapshot_bytes).hexdigest()

        now = datetime.now(timezone.utc)
        packet = EvidencePacket(
            id=uuid.uuid4(),
            institution_id=campus_id,
            student_id=student_id,
            policy_version_id=pv.id,
            schema_version="1.0",
            as_of_at=cutoff,
            snapshot=snapshot,
            digest=digest,
            retention_class="demo_short_lived",
            created_at=now,
        )
        db.add(packet)
        await db.flush()

        explanation = {
            "summary": f"Deterministic evaluation triggered {len(triggered_rules)} rule(s).",
            "triggered_rules": triggered_rules,
            "metrics": metrics,
            "cutoff_used": cutoff.isoformat(),
        }

        evidence_card = EvidenceCardDTO(
            card_type="deterministic_rule_evidence",
            model_name=pv.policy_key,
            model_version=str(pv.version),
            prediction_cutoff=cutoff.strftime("%Y-%m-%d"),
            classification="Attention Suggested" if result == "attention_suggested" else "Normal",
            attributions=attributions,
            limitations=[
                "Evidence reflects strictly observations available on or before the evaluation cutoff.",
                "Deterministic rule indicators identify need for educator review; they do not diagnose failure.",
            ],
        )

        signal = Signal(
            id=uuid.uuid4(),
            institution_id=campus_id,
            student_id=student_id,
            policy_version_id=pv.id,
            evidence_packet_id=packet.id,
            rule_key=primary_rule_key,
            result=result,
            quality_state=quality_state,
            explanation=explanation,
            evaluated_at=now,
            created_at=now,
        )
        db.add(signal)
        await db.commit()

        return SignalDTO(
            id=signal.id,
            institution_id=campus_id,
            student_id=student_id,
            external_student_ref=student.external_ref,
            student_display_name=student.display_name,
            rule_key=signal.rule_key,
            result=signal.result,
            quality_state=signal.quality_state,
            explanation=signal.explanation,
            evaluated_at=signal.evaluated_at,
            reviewed_decision=signal.reviewed_decision,
            reviewed_by=signal.reviewed_by,
            reviewed_at=signal.reviewed_at,
            review_reason_code=signal.review_reason_code,
            evidence_digest=digest,
            evidence_card=evidence_card,
        )
