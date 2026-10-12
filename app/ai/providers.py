import os
from typing import Any, Dict, List, Optional
import logging

from app.ai.validator import validate_and_filter_candidate_interventions

logger = logging.getLogger(__name__)


class BaseAIProvider:
    """Abstract interface for bounded LLM or mock completion providers."""

    async def generate_review_brief(
        self,
        student_ref: str,
        rule_key: Optional[str],
        evidence_digest: Optional[str],
        evidence_card: Optional[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        allowed_interventions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        raise NotImplementedError


class DeterministicMockProvider(BaseAIProvider):
    """Deterministic, fast mock provider for test suites and offline operation."""

    async def generate_review_brief(
        self,
        student_ref: str,
        rule_key: Optional[str],
        evidence_digest: Optional[str],
        evidence_card: Optional[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        allowed_interventions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        facts = []
        uncertainties = []
        contradictions = []
        limitations = [
            "Advisory decision-support only. Does NOT constitute a clinical diagnosis, an ability assessment, or certainty of student outcome.",
            "Student financial records are segregated and not included in this analysis per ADR-003.",
            "All intervention decisions require verified educator review (No Alert Without Action).",
        ]

        # Filter out finance domain per ADR-003
        safe_obs = [
            o for o in observations
            if o.get("domain", "").lower() not in ("financial", "finance", "billing", "fee", "fees", "financial_aid", "scholarship")
            and not o.get("domain", "").lower().startswith("financ")
        ]

        obs_map = {o.get("metric_key", ""): o for o in safe_obs}

        # 1. Synthesize observed facts
        for o in safe_obs[:8]:
            metric = o.get("metric_key", "")
            val = o.get("value")
            dom = o.get("domain", "")
            q_state = o.get("quality_state", "valid")
            quality_note = f" [{q_state}]" if q_state != "valid" else ""
            facts.append(f"Recorded {dom} metric '{metric}' with value {val}{quality_note}.")

        if not facts:
            facts.append("No non-sensitive observations currently recorded in student telemetry ledger.")
            uncertainties.append("Missing telemetry: Student has zero recorded non-sensitive observations.")
        elif len(safe_obs) < 3:
            uncertainties.append(
                f"Sparse telemetry: Student record contains only {len(safe_obs)} observation(s); "
                "conclusions are provisional and require live advising verification."
            )

        # 2. Check for stale telemetry
        stale_items = [o.get("metric_key") for o in safe_obs if o.get("quality_state") == "stale"]
        if stale_items:
            uncertainties.append(
                f"Stale telemetry: Observation(s) {stale_items} exceed freshness boundaries. "
                "Current behavioral trajectory may differ."
            )

        # 3. Detect contradictory observations
        # Contradiction: high attendance recorded but attendance alert triggered
        att_rate = None
        if "attendance_rate" in obs_map:
            try:
                att_val = obs_map["attendance_rate"].get("value")
                att_rate = float(att_val) if att_val is not None else None
            except (ValueError, TypeError):
                pass

        if att_rate is not None and att_rate >= 0.80 and rule_key and "attendance" in rule_key.lower():
            contradiction_msg = (
                f"Contradictory evidence: Recorded attendance is high ({att_rate * 100:.1f}%), "
                f"yet policy rule '{rule_key}' flagged an attendance concern. "
                "Educator should verify whether the decline was module-specific or an erroneous biometric scan."
            )
            contradictions.append(contradiction_msg)
            uncertainties.append(contradiction_msg)

        # Contradiction: high clicks but missing assignments
        vle_clicks = None
        if "vle_total_clicks_d30" in obs_map:
            try:
                vle_clicks = float(obs_map["vle_total_clicks_d30"].get("value", 0))
            except (ValueError, TypeError):
                pass

        missing_assign = None
        if "missing_assignments_count" in obs_map:
            try:
                missing_assign = float(obs_map["missing_assignments_count"].get("value", 0))
            except (ValueError, TypeError):
                pass

        if vle_clicks is not None and vle_clicks >= 100 and missing_assign is not None and missing_assign >= 2:
            contradiction_msg = (
                f"Contradictory evidence: High digital engagement ({vle_clicks:.0f} clicks) concurrent with "
                f"{missing_assign:.0f} missing assignments. "
                "Telemetry suggests course navigation obstacles or submission friction rather than disengagement."
            )
            contradictions.append(contradiction_msg)
            uncertainties.append(contradiction_msg)

        # 4. Model predictions from evidence card
        predictions = []
        if evidence_card:
            model_name = evidence_card.get("model_name", "LogisticRegression v1")
            risk_prob = evidence_card.get("risk_probability")
            thresh = evidence_card.get("threshold", 0.46)
            cutoff = evidence_card.get("prediction_cutoff", "Day 30")
            if risk_prob is not None:
                predictions.append(
                    f"Model '{model_name}' ({cutoff}) computed early-warning probability of {risk_prob:.2f} "
                    f"(operational threshold: {thresh})."
                )
            for attr in evidence_card.get("top_attributions", evidence_card.get("attributions", [])):
                feat = attr.get("feature", "")
                direction = attr.get("direction", "increases_risk")
                weight = attr.get("attribution", 0.0)
                predictions.append(f"Feature '{feat}' identified as key attribution factor ({direction}, weight: {weight:+.4f}).")
        else:
            predictions.append(f"Deterministic policy rule '{rule_key or 'early_warning'}' evaluated against telemetry boundaries.")

        # 5. Neutral review questions for human staff
        review_questions = [
            "Has the student reported illness, accommodation needs, or external scheduling conflicts?",
            "Are missed assignments concentrated in one specific module or distributed across coursework?",
            "Would a mentor check-in resolve immediate study hurdles before formal tutoring?",
        ]

        # 6. Candidate interventions grounded in campus catalog
        raw_candidates = []
        if allowed_interventions:
            for item in allowed_interventions[:2]:
                raw_candidates.append({
                    "intervention_key": item["intervention_key"],
                    "display_label": item["display_label"],
                    "domain": item["domain"],
                    "recipient_role": item["recipient_role"],
                    "confidence": 0.85,
                    "evidence_grounding": f"Grounded in observed telemetry flagged by '{rule_key or 'early_warning'}'.",
                    "caveats": "Requires educator confirmation of student availability.",
                })

        valid_candidates = validate_and_filter_candidate_interventions(raw_candidates, allowed_interventions)

        return {
            "summary": (
                f"Student {student_ref} flagged by '{rule_key or 'academic alert'}' with evidence digest: "
                f"\"{evidence_digest or 'Multi-domain observations indicate academic risk'}\". "
                "Staff review recommended to evaluate tailored support."
            ),
            "observed_facts": facts,
            "contradictions_detected": contradictions,
            "model_predictions": predictions,
            "uncertainties": uncertainties,
            "review_questions": review_questions,
            "candidate_interventions": [c.model_dump() for c in valid_candidates],
            "limitations": limitations,
            "is_mock": True,
            "provider": "deterministic_mock",
            "model_name": "sutra-deterministic-mock-v1",
        }


class OpenAIProvider(BaseAIProvider):
    """OpenAI API provider for production bounded LLM orchestration with graceful fallback."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", timeout_sec: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_sec = timeout_sec
        self._mock_fallback = DeterministicMockProvider()

    async def generate_review_brief(
        self,
        student_ref: str,
        rule_key: Optional[str],
        evidence_digest: Optional[str],
        evidence_card: Optional[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        allowed_interventions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        # Always fallback to deterministic mock if API key is mock or unavailable
        if not self.api_key or self.api_key.startswith("mock") or self.api_key.startswith("test"):
            return await self._mock_fallback.generate_review_brief(
                student_ref=student_ref,
                rule_key=rule_key,
                evidence_digest=evidence_digest,
                evidence_card=evidence_card,
                observations=observations,
                allowed_interventions=allowed_interventions,
            )

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key, timeout=self.timeout_sec)
            from app.ai.prompt import SYSTEM_ORCHESTRATION_PROMPT, build_review_brief_prompt
            prompt = build_review_brief_prompt(
                student_ref=student_ref,
                rule_key=rule_key,
                evidence_digest=evidence_digest,
                evidence_card=evidence_card,
                observations=observations,
                allowed_interventions=allowed_interventions,
            )

            import json
            response = await client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_ORCHESTRATION_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            content = response.choices[0].message.content
            parsed = json.loads(content or "{}")
            parsed["is_mock"] = False
            parsed["provider"] = "openai"
            parsed["model_name"] = self.model_name
            return parsed
        except Exception as e:
            logger.warning(f"OpenAI completion failed ({e}); safely falling back to DeterministicMockProvider")
            res = await self._mock_fallback.generate_review_brief(
                student_ref=student_ref,
                rule_key=rule_key,
                evidence_digest=evidence_digest,
                evidence_card=evidence_card,
                observations=observations,
                allowed_interventions=allowed_interventions,
            )
            res["provider"] = "deterministic_mock_fallback"
            return res


def get_ai_provider() -> BaseAIProvider:
    """Factory selecting AI provider based on configuration."""
    provider_name = os.getenv("AI_PROVIDER", "mock").lower()
    if provider_name == "openai":
        return OpenAIProvider(
            api_key=os.getenv("OPENAI_API_KEY", "mock-key"),
            model_name=os.getenv("AI_MODEL", "gpt-4o-mini"),
        )
    return DeterministicMockProvider()
