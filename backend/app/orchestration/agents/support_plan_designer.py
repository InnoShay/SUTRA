"""
Agent 3: Support Plan Designer Implementation for SUTRA Phase 3.

Translates policy-constrained candidate interventions into bounded, evidence-linked
action steps for human advisor review.
"""

from typing import Optional

from backend.app.orchestration.agents.prompts import (
    SUPPORT_PLAN_DESIGNER_SYSTEM_PROMPT_V1,
    SUPPORT_PLAN_DESIGNER_VERSION,
    sanitize_untrusted_text,
)
from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.context import FilteredAgentContext
from backend.app.orchestration.contracts import (
    ActionStep,
    InterventionProposal,
    SignalInterpretation,
    SupportPlanDraft,
)
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderResponse,
)


class SupportPlanDesigner:
    """
    SUTRA Agent 3: Support Plan Designer.

    Formulates structured draft support plans strictly within institutional catalog constraints.
    """

    AGENT_NAME: str = "Support Plan Designer"
    VERSION: str = SUPPORT_PLAN_DESIGNER_VERSION

    @classmethod
    def build_prompt(
        cls,
        context: FilteredAgentContext,
        proposal: InterventionProposal,
        interpretation: Optional[SignalInterpretation] = None,
        untrusted_student_comment: Optional[str] = None,
    ) -> str:
        """Construct structured user prompt from context, proposal, and optional interpretation."""
        lines = [
            f"STUDENT CONTEXT (Day {context.snapshot_day} Cutoff):",
            f"- Record ID: {context.record_id}",
            f"- Course Module: {context.module_code} ({context.presentation_code})",
            "",
            "SELECTED INTERVENTION (From Agent 2):",
            f"- Intervention ID: '{proposal.selected_intervention_id}'",
            f"- Suggested Target Role: '{proposal.target_role}'",
            f"- Rationale: {proposal.rationale}",
        ]

        # Add catalog entry context and allowed roles
        entry = SyntheticDemoCatalog.get_entry(proposal.selected_intervention_id)
        if entry:
            allowed_roles_str = ", ".join(sorted(entry.allowed_owner_roles))
            lines.extend([
                f"- Catalog Title: {entry.title}",
                f"- Description: {entry.description}",
                f"- Allowed Owner Roles: {allowed_roles_str}",
            ])
        elif proposal.selected_intervention_id == SyntheticDemoCatalog.NO_SUPPORTED_INTERVENTION:
            allowed_roles_str = ", ".join(sorted(SyntheticDemoCatalog.get_allowed_roles(proposal.selected_intervention_id)))
            lines.extend([
                "- Catalog Note: No standard intervention justified by student signals.",
                f"- Allowed Roles for Review/Clarification: {allowed_roles_str}",
            ])

        if interpretation:
            lines.extend([
                "",
                "QUALITATIVE SIGNAL INTERPRETATION (From Agent 1):",
                f"- Summary: {interpretation.summary}",
                f"- Velocity Assessment: {interpretation.velocity_assessment}",
            ])
            if interpretation.missing_or_stale_indicators:
                lines.append(f"- Missing/Stale Signals: {', '.join(interpretation.missing_or_stale_indicators)}")

        if untrusted_student_comment:
            lines.extend([
                "",
                "UNTRUSTED FREE-TEXT DATA:",
                sanitize_untrusted_text(untrusted_student_comment),
            ])

        lines.extend([
            "",
            "TASK: Create a SupportPlanDraft with 1 to 5 sequential ActionSteps. "
            "Every step MUST have a suggested_role strictly belonging to the allowed owner roles "
            "for the selected intervention. Keep target_days within the plan target_window_days (1-60 days). "
            "Specify follow-up evidence requirements to observe completion without conflating "
            "action execution with student academic progress. "
            "Explicitly treat this as a non-binding DRAFT for human advisor review.",
        ])

        return "\n".join(lines)

    @classmethod
    def design(
        cls,
        context: FilteredAgentContext,
        proposal: InterventionProposal,
        provider: LLMProviderProtocol,
        interpretation: Optional[SignalInterpretation] = None,
        timeout_sec: float = 4.0,
        untrusted_student_comment: Optional[str] = None,
    ) -> SupportPlanDraft:
        """
        Execute Agent 3 support plan formulation via provider protocol and enforce constraints.
        """
        prompt = cls.build_prompt(
            context=context,
            proposal=proposal,
            interpretation=interpretation,
            untrusted_student_comment=untrusted_student_comment,
        )

        response: ProviderResponse[SupportPlanDraft] = provider.generate_structured(
            prompt=prompt,
            response_model=SupportPlanDraft,
            timeout_sec=timeout_sec,
            system_prompt=SUPPORT_PLAN_DESIGNER_SYSTEM_PROMPT_V1,
        )

        if response.result is None:
            raise ProviderFatalError("Provider returned empty result for SupportPlanDraft")

        plan = response.result

        # Validate step bounds (1 to 5 steps)
        if not (1 <= len(plan.action_steps) <= 5):
            raise ProviderFatalError(
                f"Agent 3 produced invalid step count: {len(plan.action_steps)} (must be 1 to 5)."
            )

        # Validate owner role constraints for each step against catalog
        allowed_roles = SyntheticDemoCatalog.get_allowed_roles(proposal.selected_intervention_id)
        for step in plan.action_steps:
            if step.suggested_role not in allowed_roles:
                raise ProviderFatalError(
                    f"Agent 3 proposed disallowed role '{step.suggested_role}' for intervention "
                    f"'{proposal.selected_intervention_id}'. Allowed roles: {allowed_roles}."
                )

        return plan
