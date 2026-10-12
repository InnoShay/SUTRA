"""
Agent 4: Evidence Challenge Agent Implementation for SUTRA Phase 3.

Adversarial red-team auditor inspecting the entire upstream triage pipeline
against verified telemetry, catalog constraints, and causal grounding.
"""

import json
from typing import Optional

from backend.app.orchestration.agents.prompts import (
    EVIDENCE_CHALLENGE_AGENT_SYSTEM_PROMPT_V1,
    EVIDENCE_CHALLENGE_AGENT_VERSION,
    sanitize_untrusted_text,
)
from backend.app.orchestration.context import FilteredAgentContext
from backend.app.orchestration.contracts import (
    ChallengeFinding,
    EvidenceChallengeReport,
    InterventionProposal,
    SignalInterpretation,
    SupportPlanDraft,
)
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderResponse,
)


class EvidenceChallengeAgent:
    """
    SUTRA Agent 4: Evidence Challenge Agent.

    Independent adversarial critic examining upstream claims, catalog fidelity,
    and plan grounding prior to human advisor presentation.
    """

    AGENT_NAME: str = "Evidence Challenge Agent"
    VERSION: str = EVIDENCE_CHALLENGE_AGENT_VERSION

    @classmethod
    def build_prompt(
        cls,
        context: FilteredAgentContext,
        interpretation: SignalInterpretation,
        proposal: InterventionProposal,
        plan: SupportPlanDraft,
        untrusted_student_comment: Optional[str] = None,
    ) -> str:
        """Construct structured audit prompt providing full pipeline state to Agent 4."""
        lines = [
            f"STUDENT CONTEXT (Day {context.snapshot_day} Cutoff):",
            f"- Record ID: {context.record_id}",
            f"- Module: {context.module_code} ({context.presentation_code})",
            "",
            "VERIFIED OPERATIONAL TELEMETRY (Canonical Source of Truth):",
            json.dumps(context.operational_telemetry, indent=2),
            "",
            "UPSTREAM STAGE 1: SIGNAL INTERPRETATION:",
            f"- Summary: {interpretation.summary}",
            f"- Velocity Assessment: {interpretation.velocity_assessment}",
            f"- Missing/Stale Indicators: {interpretation.missing_or_stale_indicators}",
            "- Citations:",
        ]

        for cit in interpretation.evidence_references:
            lines.append(f"  * {cit.feature_name} = {cit.cited_value} ({cit.claim_kind.value})")

        lines.extend([
            "",
            "UPSTREAM STAGE 2: INTERVENTION PROPOSAL:",
            f"- Selected Intervention ID: '{proposal.selected_intervention_id}'",
            f"- Target Role: '{proposal.target_role}'",
            f"- Rationale: {proposal.rationale}",
            "- Citations:",
        ])
        for cit in proposal.evidence_references:
            lines.append(f"  * {cit.feature_name} = {cit.cited_value}")

        lines.extend([
            "",
            "UPSTREAM STAGE 3: SUPPORT PLAN DRAFT:",
            f"- Plan Title: {plan.plan_title}",
            f"- Target Window: {plan.target_window_days} days",
            f"- Rationale: {plan.rationale}",
            f"- Evidence Requirements: {plan.evidence_requirements}",
            "- Action Steps:",
        ])
        for step in plan.action_steps:
            lines.append(
                f"  * Step {step.step_number}: '{step.action_description}' "
                f"[Role: {step.suggested_role}, Timeline: {step.target_days}d]"
            )

        if untrusted_student_comment:
            lines.extend([
                "",
                "UNTRUSTED FREE-TEXT DATA:",
                sanitize_untrusted_text(untrusted_student_comment),
            ])

        lines.extend([
            "",
            "TASK: Perform an adversarial audit of this draft plan and preceding outputs. "
            "Identify unsupported factual claims, fabricated/mismatching citations, "
            "temporal trend claims based solely on static snapshots, causal speculations, "
            "clinical diagnoses, catalog role mismatches, or missing follow-up evidence. "
            "Produce an EvidenceChallengeReport with structured findings referencing specific targets. "
            "Remember that your critique is advisory and cannot approve or mutate plans.",
        ])

        return "\n".join(lines)

    @classmethod
    def audit(
        cls,
        context: FilteredAgentContext,
        interpretation: SignalInterpretation,
        proposal: InterventionProposal,
        plan: SupportPlanDraft,
        provider: LLMProviderProtocol,
        timeout_sec: float = 4.0,
        untrusted_student_comment: Optional[str] = None,
    ) -> EvidenceChallengeReport:
        """
        Execute Agent 4 adversarial critique via provider protocol.
        """
        prompt = cls.build_prompt(
            context=context,
            interpretation=interpretation,
            proposal=proposal,
            plan=plan,
            untrusted_student_comment=untrusted_student_comment,
        )

        response: ProviderResponse[EvidenceChallengeReport] = provider.generate_structured(
            prompt=prompt,
            response_model=EvidenceChallengeReport,
            timeout_sec=timeout_sec,
            system_prompt=EVIDENCE_CHALLENGE_AGENT_SYSTEM_PROMPT_V1,
        )

        if response.result is None:
            raise ProviderFatalError("Provider returned empty result for EvidenceChallengeReport")

        report = response.result

        # Ensure flags_count accurately reflects all raised findings
        total_flags = (
            len(report.unsupported_claims)
            + len(report.catalog_divergences)
            + len(report.unjustified_certainty_flags)
            + len(report.findings)
        )
        report.flags_count = max(report.flags_count, total_flags)

        return report
