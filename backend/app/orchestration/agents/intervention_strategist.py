"""
Agent 2: Intervention Strategist Implementation for SUTRA Phase 2.

Turns validated signal interpretation and telemetry into a policy-constrained
candidate support intervention from the synthetic demo catalog.
"""

from typing import Optional

from backend.app.orchestration.agents.prompts import (
    INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1,
    INTERVENTION_STRATEGIST_VERSION,
    sanitize_untrusted_text,
)
from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.context import FilteredAgentContext
from backend.app.orchestration.contracts import (
    InterventionProposal,
    SignalInterpretation,
)
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderResponse,
)
from backend.app.orchestration.validator import DeterministicValidator


class InterventionStrategist:
    """
    SUTRA Agent 2: Intervention Strategist.

    Proposes policy-constrained candidate interventions strictly from SyntheticDemoCatalog.
    """

    AGENT_NAME: str = "Intervention Strategist"
    VERSION: str = INTERVENTION_STRATEGIST_VERSION

    @classmethod
    def build_prompt(
        cls,
        context: FilteredAgentContext,
        interpretation: SignalInterpretation,
        untrusted_student_comment: Optional[str] = None,
    ) -> str:
        """Construct structured user prompt from context and validated interpretation."""
        lines = [
            f"STUDENT CONTEXT (Day {context.snapshot_day} Cutoff):",
            f"- Record ID: {context.record_id}",
            f"- Module: {context.module_code} ({context.presentation_code})",
            "",
            "VALIDATED INTERPRETATION (From Agent 1):",
            f"- Summary: {interpretation.summary}",
            f"- Velocity Assessment: {interpretation.velocity_assessment}",
        ]

        if interpretation.missing_or_stale_indicators:
            lines.append(f"- Missing/Stale Indicators: {', '.join(interpretation.missing_or_stale_indicators)}")

        lines.append("")
        lines.append("AVAILABLE SYNTHETIC DEMO INTERVENTIONS (DEMO_CATALOG_V1):")
        for entry in SyntheticDemoCatalog.list_entries():
            allowed_roles_str = ", ".join(sorted(entry.allowed_owner_roles))
            lines.append(f"- ID: '{entry.intervention_id}' ({entry.title})")
            lines.append(f"  Description: {entry.description}")
            lines.append(f"  Allowed Roles: {allowed_roles_str}")
        lines.append(
            f"- ID: '{SyntheticDemoCatalog.NO_SUPPORTED_INTERVENTION}' "
            "(Select if no cataloged intervention is justified by the evidence)"
        )

        if untrusted_student_comment:
            lines.append("")
            lines.append("UNTRUSTED FREE-TEXT DATA:")
            lines.append(sanitize_untrusted_text(untrusted_student_comment))

        lines.append("")
        lines.append(
            "TASK: Propose a candidate intervention. You must select an intervention_id from "
            "the approved catalog list above and assign an allowed owner role. Provide an evidence-grounded "
            "rationale citing specific telemetry features. Never invent new intervention IDs or roles."
        )

        return "\n".join(lines)

    @classmethod
    def strategize(
        cls,
        context: FilteredAgentContext,
        interpretation: SignalInterpretation,
        provider: LLMProviderProtocol,
        timeout_sec: float = 4.0,
        untrusted_student_comment: Optional[str] = None,
    ) -> InterventionProposal:
        """
        Execute Agent 2 strategy selection via provider protocol and validate catalog constraints.
        """
        prompt = cls.build_prompt(
            context,
            interpretation,
            untrusted_student_comment=untrusted_student_comment,
        )

        response: ProviderResponse[InterventionProposal] = provider.generate_structured(
            prompt=prompt,
            response_model=InterventionProposal,
            timeout_sec=timeout_sec,
            system_prompt=INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1,
        )

        if response.result is None:
            raise ProviderFatalError("Provider returned empty result for InterventionProposal")

        proposal = response.result

        # Validate that intervention ID exists in synthetic catalog
        if not SyntheticDemoCatalog.is_valid_intervention(proposal.selected_intervention_id):
            raise ProviderFatalError(
                f"Agent 2 output validation failed: uncataloged intervention ID "
                f"'{proposal.selected_intervention_id}'"
            )

        # Validate that owner role is authorized for this catalog entry
        allowed_roles = SyntheticDemoCatalog.get_allowed_roles(proposal.selected_intervention_id)
        if proposal.target_role not in allowed_roles:
            raise ProviderFatalError(
                f"Agent 2 role validation failed: '{proposal.target_role}' is not in allowed roles "
                f"{allowed_roles} for '{proposal.selected_intervention_id}'"
            )

        # Validate citations against operational telemetry
        for citation in proposal.evidence_references:
            if citation.feature_name not in context.operational_telemetry:
                raise ProviderFatalError(
                    f"Agent 2 citation failed: feature '{citation.feature_name}' not in operational telemetry"
                )
            expected_val = context.operational_telemetry[citation.feature_name]
            err = DeterministicValidator.validate_citation(
                citation, {citation.feature_name: expected_val}
            )
            if err:
                raise ProviderFatalError(f"Agent 2 citation mismatch: {err.message}")

        # Check prohibited clinical language
        clinical_errs = DeterministicValidator.check_clinical_language(proposal.rationale, "proposal.rationale")
        if clinical_errs:
            raise ProviderFatalError(f"Agent 2 clinical language prohibited: {clinical_errs[0].message}")

        # Check speculative inferences
        speculative_errs = DeterministicValidator.check_speculative_inferences(proposal.rationale, "proposal.rationale")
        if speculative_errs:
            raise ProviderFatalError(f"Agent 2 speculative inference prohibited: {speculative_errs[0].message}")

        # Check risk reinterpretation attempts
        risk_errs = DeterministicValidator.check_risk_reinterpretation(proposal.rationale, "proposal.rationale")
        if risk_errs:
            raise ProviderFatalError(f"Agent 2 risk reinterpretation prohibited: {risk_errs[0].message}")

        return proposal
