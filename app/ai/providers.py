import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import httpx

from app.ai.prompt import SYSTEM_ORCHESTRATION_PROMPT, build_review_brief_prompt
from app.ai.validator import validate_and_filter_candidate_interventions
from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseAIProvider(ABC):
    """Abstract base class for AI orchestration providers."""

    @abstractmethod
    async def generate_review_brief(
        self,
        student_ref: str,
        rule_key: Optional[str],
        evidence_digest: Optional[str],
        evidence_card: Optional[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        allowed_interventions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generates raw dictionary representation of structured review brief."""
        pass


class DeterministicMockProvider(BaseAIProvider):
    """
    Deterministic rule-grounded mock provider.
    Synthesizes facts directly from the Evidence Card and observations without external network calls.
    Guarantees deterministic, reproducible, and offline-safe test execution.
    """

    async def generate_review_brief(
        self,
        student_ref: str,
        rule_key: Optional[str],
        evidence_digest: Optional[str],
        evidence_card: Optional[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        allowed_interventions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        # Synthesize observed facts from observations
        facts = []
        uncertainties = []

        # Filter out finance domain per ADR-003
        safe_obs = [
            o for o in observations
            if o.get("domain", "").lower() not in ("finance", "billing", "fee")
        ]

        for o in safe_obs[:5]:
            metric = o.get("metric_key", "")
            val = o.get("value")
            dom = o.get("domain", "")
            facts.append(f"Recorded {dom} metric '{metric}' with value {val}.")

        if not facts:
            facts.append("Early warning policy trigger flagged from telemetric threshold evaluation.")

        # Model predictions from evidence card
        predictions = []
        if evidence_card:
            model_name = evidence_card.get("model_name", "LogisticRegression v1")
            risk_prob = evidence_card.get("risk_probability")
            thresh = evidence_card.get("threshold", 0.46)
            if risk_prob is not None:
                predictions.append(
                    f"Model '{model_name}' computed early-warning probability of {risk_prob:.2f} (operational threshold: {thresh})."
                )
            for attr in evidence_card.get("attributions", []):
                feat = attr.get("feature", "")
                direction = attr.get("direction", "increases_risk")
                predictions.append(f"Feature '{feat}' identified as risk factor ({direction}).")
        else:
            predictions.append("Policy engine rule UG attendance/academic evaluated at Day-30 cutoff.")

        # Uncertainties & questions
        uncertainties.append("Temporal observation window reflects Day-30 snapshot; subsequent assignments not yet evaluated.")
        uncertainties.append("Direct student self-report or mitigating circumstance not present in telemetry.")

        review_questions = [
            "Has the student reported illness, accommodation needs, or external scheduling conflicts?",
            "Are missed assignments concentrated in one specific module or distributed across coursework?",
            "Would a mentor check-in resolve immediate study hurdles before formal tutoring?",
        ]

        # Candidate interventions grounded in catalog
        raw_candidates = []
        if allowed_interventions:
            for item in allowed_interventions[:2]:
                raw_candidates.append({
                    "intervention_key": item["intervention_key"],
                    "display_label": item["display_label"],
                    "domain": item["domain"],
                    "recipient_role": item["recipient_role"],
                    "confidence": 0.85,
                    "evidence_grounding": f"Grounded in observed decline flagged by rule '{rule_key or 'early_warning'}'.",
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
            "model_predictions": predictions,
            "uncertainties": uncertainties,
            "review_questions": review_questions,
            "candidate_interventions": [c.model_dump() for c in valid_candidates],
            "limitations": [
                "Advisory synthesis only. All intervention decisions must be authorized by staff.",
                "Student financial records are segregated and not included in this analysis.",
            ],
            "is_mock": True,
            "provider": "deterministic_mock",
            "model_name": "sutra-deterministic-mock-v1",
        }


class OpenAIProvider(BaseAIProvider):
    """OpenAI API provider for production bounded LLM orchestration."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", timeout_sec: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_sec = timeout_sec

    async def generate_review_brief(
        self,
        student_ref: str,
        rule_key: Optional[str],
        evidence_digest: Optional[str],
        evidence_card: Optional[Dict[str, Any]],
        observations: List[Dict[str, Any]],
        allowed_interventions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        prompt = build_review_brief_prompt(
            student_ref=student_ref,
            rule_key=rule_key,
            evidence_digest=evidence_digest,
            evidence_card=evidence_card,
            observations=observations,
            allowed_interventions=allowed_interventions,
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_ORCHESTRATION_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            # Validate candidate interventions
            parsed["candidate_interventions"] = [
                c.model_dump()
                for c in validate_and_filter_candidate_interventions(
                    parsed.get("candidate_interventions", []), allowed_interventions
                )
            ]
            parsed["is_mock"] = False
            parsed["provider"] = "openai"
            parsed["model_name"] = self.model_name
            return parsed


def get_ai_provider() -> BaseAIProvider:
    """Instantiates the configured provider or falls back to deterministic mock."""
    provider_name = (settings.AI_PROVIDER or "mock").lower()

    if provider_name == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model_name=settings.AI_MODEL,
            timeout_sec=settings.AI_TIMEOUT_SECONDS,
        )

    # Default to deterministic mock
    return DeterministicMockProvider()
