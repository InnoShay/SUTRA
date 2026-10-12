"""
Agent 1: Student Signal Interpreter Implementation for SUTRA Phase 2.

Turns sanitized telemetry and safe risk factors into an understandable,
evidence-grounded qualitative interpretation without altering ML risk metrics.
"""

import json
from typing import Optional

from backend.app.orchestration.agents.prompts import (
    SIGNAL_INTERPRETER_SYSTEM_PROMPT_V1,
    SIGNAL_INTERPRETER_VERSION,
    sanitize_untrusted_text,
)
from backend.app.orchestration.context import FilteredAgentContext
from backend.app.orchestration.contracts import (
    EvidenceReference,
    SignalInterpretation,
)
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderResponse,
)
from backend.app.orchestration.validator import DeterministicValidator


class StudentSignalInterpreter:
    """
    SUTRA Agent 1: Student Signal Interpreter.

    Grounds qualitative narrative strictly in verified operational telemetry.
    """

    AGENT_NAME: str = "Student Signal Interpreter"
    VERSION: str = SIGNAL_INTERPRETER_VERSION

    @classmethod
    def build_prompt(
        cls,
        context: FilteredAgentContext,
        untrusted_student_comment: Optional[str] = None,
    ) -> str:
        """Construct structured user prompt from FilteredAgentContext."""
        lines = [
            f"STUDENT CONTEXT (Day {context.snapshot_day} Cutoff):",
            f"- Record ID: {context.record_id}",
            f"- Course Module: {context.module_code} ({context.presentation_code})",
            "",
            "VERIFIED OPERATIONAL TELEMETRY:",
            json.dumps(context.operational_telemetry, indent=2),
            "",
            "VERIFIED SAFE RISK DRIVERS (Authoritative Model Signals):",
        ]

        if context.safe_risk_drivers:
            for factor in context.safe_risk_drivers:
                lines.append(
                    f"- {factor.factor_title}: observed value {factor.observed_raw_value} "
                    f"(weight: {factor.contribution_weight:.4f})"
                )
        else:
            lines.append("- (No non-sensitive risk drivers isolated)")

        lines.append("")
        lines.append("VERIFIED SAFE PROTECTIVE FACTORS:")
        if context.safe_protective_factors:
            for factor in context.safe_protective_factors:
                lines.append(
                    f"- {factor.factor_title}: observed value {factor.observed_raw_value} "
                    f"(weight: {factor.contribution_weight:.4f})"
                )
        else:
            lines.append("- (No non-sensitive protective factors isolated)")

        if untrusted_student_comment:
            lines.append("")
            lines.append("UNTRUSTED FREE-TEXT DATA:")
            lines.append(sanitize_untrusted_text(untrusted_student_comment))

        lines.append("")
        lines.append(
            "TASK: Synthesize these engagement signals into a grounded SignalInterpretation. "
            "Ensure every material claim has an explicit EvidenceReference citation matching "
            "the exact feature name and observed value. Do not alter risk scores or make medical inferences."
        )

        return "\n".join(lines)

    @classmethod
    def interpret(
        cls,
        context: FilteredAgentContext,
        provider: LLMProviderProtocol,
        timeout_sec: float = 4.0,
        untrusted_student_comment: Optional[str] = None,
    ) -> SignalInterpretation:
        """
        Execute Agent 1 interpretation via provider protocol and validate grounding.
        """
        prompt = cls.build_prompt(context, untrusted_student_comment=untrusted_student_comment)

        response: ProviderResponse[SignalInterpretation] = provider.generate_structured(
            prompt=prompt,
            response_model=SignalInterpretation,
            timeout_sec=timeout_sec,
            system_prompt=SIGNAL_INTERPRETER_SYSTEM_PROMPT_V1,
        )

        if response.result is None:
            raise ProviderFatalError("Provider returned empty result for SignalInterpretation")

        interpretation = response.result

        # Validate citation grounding against available operational telemetry
        for citation in interpretation.evidence_references:
            # Check if feature is in operational telemetry
            if citation.feature_name not in context.operational_telemetry:
                raise ProviderFatalError(
                    f"Agent 1 output validation failed: feature '{citation.feature_name}' "
                    f"is not in operational telemetry"
                )
            expected_val = context.operational_telemetry[citation.feature_name]
            err = DeterministicValidator.validate_citation(
                citation, {citation.feature_name: expected_val}
            )
            if err:
                raise ProviderFatalError(f"Agent 1 citation mismatch: {err.message}")

        # Check temporal trend claim grounding
        temporal_errs = (
            DeterministicValidator.validate_temporal_claims(
                interpretation.velocity_assessment,
                interpretation.evidence_references,
                "interpretation.velocity_assessment",
            )
            + DeterministicValidator.validate_temporal_claims(
                interpretation.summary,
                interpretation.evidence_references,
                "interpretation.summary",
            )
        )
        if temporal_errs:
            raise ProviderFatalError(f"Agent 1 temporal claim invalid: {temporal_errs[0].message}")

        # Check prohibited clinical language
        clinical_errs = (
            DeterministicValidator.check_clinical_language(interpretation.summary, "interpretation.summary")
            + DeterministicValidator.check_clinical_language(interpretation.velocity_assessment, "interpretation.velocity")
        )
        if clinical_errs:
            raise ProviderFatalError(f"Agent 1 clinical language prohibited: {clinical_errs[0].message}")

        # Check speculative personal inferences
        speculative_errs = (
            DeterministicValidator.check_speculative_inferences(interpretation.summary, "interpretation.summary")
            + DeterministicValidator.check_speculative_inferences(interpretation.velocity_assessment, "interpretation.velocity")
        )
        if speculative_errs:
            raise ProviderFatalError(f"Agent 1 speculative inference prohibited: {speculative_errs[0].message}")

        # Check risk reinterpretation attempts
        risk_errs = (
            DeterministicValidator.check_risk_reinterpretation(interpretation.summary, "interpretation.summary")
            + DeterministicValidator.check_risk_reinterpretation(interpretation.velocity_assessment, "interpretation.velocity")
        )
        if risk_errs:
            raise ProviderFatalError(f"Agent 1 risk reinterpretation prohibited: {risk_errs[0].message}")

        return interpretation
