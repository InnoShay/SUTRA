"""
Deterministic Application Validation Gate for SUTRA Phase 1.

Authoritative server-side validation enforcing evidence grounding, catalog integrity,
role constraints, and clinical-language heuristic screening independently of LLM outputs.
"""

import math
import re
from typing import Any, Optional, Union

from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.contracts import (
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    SignalInterpretation,
    SupportPlanDraft,
    EvidenceChallengeReport,
    ValidationFinding,
    ValidationSeverity,
    ValidationSummary,
)


class DeterministicValidator:
    """
    Authoritative server-side validation gate.

    Verifies claims made by AI specialists against verified evidence packets
    and institutional policies before allowing plans to reach human advisors.
    """

    # Prohibited clinical diagnosis patterns (supplementary heuristic check)
    PROHIBITED_CLINICAL_PATTERNS = [
        re.compile(r"\b(clinically\s+depressed|clinical\s+depression)\b", re.IGNORECASE),
        re.compile(r"\b(bipolar\s+disorder|schizophreni[ac]|psychosis)\b", re.IGNORECASE),
        re.compile(r"\b(diagnosed\s+with\s+(adhd|depression|anxiety|autism))\b", re.IGNORECASE),
        re.compile(r"\b(suffers?\s+from\s+(major\s+depression|adhd|ptsd))\b", re.IGNORECASE),
        re.compile(r"\b(student\s+is\s+(mentally\s+ill|psychotic))\b", re.IGNORECASE),
    ]

    # Prohibited speculative inferences (device failures, financial crises, domestic assumptions)
    PROHIBITED_SPECULATIVE_PATTERNS = [
        (
            re.compile(r"\b(broken\s+laptop|laptop\s+is\s+broken|computer\s+crashed|hardware\s+failure|lost\s+internet|wifi\s+failed)\b", re.IGNORECASE),
            "Speculative hardware or connectivity failure inferred without evidence"
        ),
        (
            re.compile(r"\b(cannot\s+afford\s+tuition|financial\s+hardship|impoverished\s+family|job\s+loss)\b", re.IGNORECASE),
            "Speculative financial hardship inferred without evidence"
        ),
        (
            re.compile(r"\b(family\s+problems?|domestic\s+issues?|chaotic\s+home)\b", re.IGNORECASE),
            "Speculative domestic circumstance inferred without evidence"
        ),
        (
            re.compile(r"\b(student\s+is\s+lazy|student\s+lacks\s+motivation|unmotivated\s+student)\b", re.IGNORECASE),
            "Speculative student attitude or motivation inferred without evidence"
        ),
    ]

    # Unauthorized attempts by qualitative LLM layers to recalculate or override model risk probability/tier
    UNAUTHORIZED_RISK_REINTERPRETATION_PATTERNS = [
        re.compile(r"\b(risk\s+probability\s+is\s+actually|recalculated\s+risk|overriding\s+risk|adjusted\s+the\s+model\s+probability|actual\s+risk\s+tier\s+is)\b", re.IGNORECASE),
    ]

    # Prohibited attempts to treat draft plans as approved, active, or formally scheduled
    UNAUTHORIZED_APPROVAL_PATTERNS = [
        re.compile(r"\b(plan\s+is\s+(approved|active|enacted|binding)|mandatory\s+student\s+attendance|officially\s+approved|formally\s+authorized|appointment\s+scheduled)\b", re.IGNORECASE),
    ]

    # Prohibited claims conflating task completion with guaranteed student academic outcome
    TASK_OUTCOME_CONFLATION_PATTERNS = [
        re.compile(r"\b(guarantees?\s+(student\s+)?(success|passing|completion)|will\s+ensure\s+the\s+student\s+passes|proves?\s+student\s+(progress|retention))\b", re.IGNORECASE),
    ]

    # Features required to justify temporal trend claims (e.g. 'declined', 'dropped')
    TEMPORAL_COMPARATIVE_FEATURES = {
        "vle_clicks_last_7d",
        "vle_days_since_last_click",
        "vle_clicks_precourse",
        "vle_clicks_poststart_d30",
    }

    # Tolerated benign educational uses that should NOT be flagged as clinical diagnosis
    BENIGN_EXCEPTIONS = [
        re.compile(r"\b(economic\s+depression|depressed\s+economic|depressed\s+attendance\s+rate)\b", re.IGNORECASE),
    ]

    @classmethod
    def validate_citation(
        cls,
        citation: EvidenceReference,
        canonical_features: dict[str, Union[int, float, str]],
    ) -> Optional[ValidationFinding]:
        """
        Validate an individual evidence reference against the canonical feature dictionary.

        Checks:
        1. Feature name exists in canonical 25-feature dictionary.
        2. Cited value matches canonical value (exact for int/str, within float tolerance).
        """
        feature_name = citation.feature_name
        if feature_name not in canonical_features:
            return ValidationFinding(
                field=f"evidence_reference.{feature_name}",
                severity=ValidationSeverity.ERROR,
                message=f"Fabricated citation: feature '{feature_name}' does not exist in 25-feature contract.",
                code="ERR_FABRICATED_FEATURE",
            )

        canonical_val = canonical_features[feature_name]
        cited_val = citation.cited_value

        # Check value match with type-aware comparison
        if isinstance(canonical_val, float) or isinstance(cited_val, float):
            try:
                c_float = float(canonical_val)
                cited_float = float(cited_val)
                if not math.isclose(c_float, cited_float, abs_tol=1e-4):
                    return ValidationFinding(
                        field=f"evidence_reference.{feature_name}",
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Cited value mismatch for '{feature_name}': "
                            f"cited {cited_val!r}, but canonical source value is {canonical_val!r}."
                        ),
                        code="ERR_VALUE_MISMATCH",
                    )
            except (ValueError, TypeError):
                return ValidationFinding(
                    field=f"evidence_reference.{feature_name}",
                    severity=ValidationSeverity.ERROR,
                    message=f"Cannot compare non-numeric float values for '{feature_name}'.",
                    code="ERR_TYPE_MISMATCH",
                )
        elif str(canonical_val) != str(cited_val):
            return ValidationFinding(
                field=f"evidence_reference.{feature_name}",
                severity=ValidationSeverity.ERROR,
                message=(
                    f"Cited value mismatch for '{feature_name}': "
                    f"cited {cited_val!r}, but canonical source value is {canonical_val!r}."
                ),
                code="ERR_VALUE_MISMATCH",
            )

        return None

    @classmethod
    def validate_temporal_claims(
        cls,
        text: str,
        citations: list[EvidenceReference],
        context_field: str,
    ) -> list[ValidationFinding]:
        """
        Validate that temporal change or trend claims (e.g. 'activity declined')
        cite sufficient comparative temporal evidence rather than single static snapshots.
        """
        findings: list[ValidationFinding] = []
        trend_match = re.search(r"\b(declined?|drop(ped|ping|s)?|decreased?|downward|falling|plummeted|slowed\s+down)\b", text, re.IGNORECASE)
        if trend_match:
            cited_names = {c.feature_name for c in citations}
            has_temporal_feature = any(f in cls.TEMPORAL_COMPARATIVE_FEATURES for f in cited_names)
            if not has_temporal_feature:
                findings.append(
                    ValidationFinding(
                        field=context_field,
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Trend claim '{trend_match.group(0)}' asserts activity decline or temporal change "
                            f"but lacks comparative temporal evidence (must cite comparative temporal features such as "
                            f"'vle_clicks_last_7d', 'vle_days_since_last_click', 'vle_clicks_poststart_d30', or 'vle_clicks_precourse'). "
                            f"A single static snapshot cannot prove a decline."
                        ),
                        code="ERR_UNSUPPORTED_TEMPORAL_TREND",
                    )
                )
        return findings

    @classmethod
    def check_speculative_inferences(cls, text: str, context_field: str) -> list[ValidationFinding]:
        """Scan text for ungrounded domestic, financial, hardware, or personal speculations."""
        findings: list[ValidationFinding] = []
        for pattern, desc in cls.PROHIBITED_SPECULATIVE_PATTERNS:
            match = pattern.search(text)
            if match:
                findings.append(
                    ValidationFinding(
                        field=context_field,
                        severity=ValidationSeverity.ERROR,
                        message=f"{desc}: '{match.group(0)}'.",
                        code="ERR_UNSUPPORTED_SPECULATIVE_INFERENCE",
                    )
                )
        return findings

    @classmethod
    def check_risk_reinterpretation(cls, text: str, context_field: str) -> list[ValidationFinding]:
        """Verify that agent text does not attempt to calculate or override authoritative ML risk metrics."""
        findings: list[ValidationFinding] = []
        for pattern in cls.UNAUTHORIZED_RISK_REINTERPRETATION_PATTERNS:
            match = pattern.search(text)
            if match:
                findings.append(
                    ValidationFinding(
                        field=context_field,
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Unauthorized risk metric recalculation detected: '{match.group(0)}'. "
                            f"Authoritative ML risk scoring cannot be reinterpreted by qualitative agents."
                        ),
                        code="ERR_UNAUTHORIZED_RISK_REINTERPRETATION",
                    )
                )
        return findings

    @classmethod
    def check_clinical_language(cls, text: str, context_field: str) -> list[ValidationFinding]:
        """
        Scan text for prohibited diagnostic or clinical assertions.

        Distinguishes prohibited diagnostic claims from benign educational uses.
        """
        findings: list[ValidationFinding] = []

        # Check if benign exception applies
        for benign in cls.BENIGN_EXCEPTIONS:
            if benign.search(text):
                return findings  # Allowed benign use

        for pattern in cls.PROHIBITED_CLINICAL_PATTERNS:
            match = pattern.search(text)
            if match:
                findings.append(
                    ValidationFinding(
                        field=context_field,
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Prohibited clinical diagnosis or unsupported psychiatric assertion "
                            f"detected: '{match.group(0)}'."
                        ),
                        code="ERR_CLINICAL_LANGUAGE_DETECTED",
                    )
                )

        return findings

    @classmethod
    def check_unauthorized_approval(cls, text: str, context_field: str) -> list[ValidationFinding]:
        """Detect attempts to declare draft plans approved, active, or binding without human review."""
        findings: list[ValidationFinding] = []
        for pattern in cls.UNAUTHORIZED_APPROVAL_PATTERNS:
            match = pattern.search(text)
            if match:
                findings.append(
                    ValidationFinding(
                        field=context_field,
                        severity=ValidationSeverity.ERROR,
                        message=f"Unauthorized plan approval assertion: '{match.group(0)}'. Drafts require advisor review.",
                        code="ERR_UNAUTHORIZED_PLAN_APPROVAL",
                    )
                )
        return findings

    @classmethod
    def check_task_outcome_conflation(cls, text: str, context_field: str) -> list[ValidationFinding]:
        """Detect claims falsely equating task execution with guaranteed student progress or passing."""
        findings: list[ValidationFinding] = []
        for pattern in cls.TASK_OUTCOME_CONFLATION_PATTERNS:
            match = pattern.search(text)
            if match:
                findings.append(
                    ValidationFinding(
                        field=context_field,
                        severity=ValidationSeverity.ERROR,
                        message=f"Task-outcome conflation detected: '{match.group(0)}'. Task completion is not proof of student outcome.",
                        code="ERR_TASK_OUTCOME_CONFLATION",
                    )
                )
        return findings

    @classmethod
    def validate_support_plan(
        cls,
        plan: SupportPlanDraft,
        proposal: Optional[InterventionProposal] = None,
        canonical_features: Optional[dict[str, Union[int, float, str]]] = None,
    ) -> list[ValidationFinding]:
        """
        Authoritative validation of Agent 3 SupportPlanDraft.
        Enforces step bounds, catalog role constraints, timeline limits, draft status,
        and follow-up evidence requirements.
        """
        findings: list[ValidationFinding] = []

        # 1. Draft status check
        if not plan.is_draft:
            findings.append(
                ValidationFinding(
                    field="plan.is_draft",
                    severity=ValidationSeverity.ERROR,
                    message="Plan must remain an unapproved draft for advisor review (is_draft must be True).",
                    code="ERR_UNAUTHORIZED_PLAN_APPROVAL",
                )
            )

        # 2. Step count bounds check (1 to 5 steps)
        if not (1 <= len(plan.action_steps) <= 5):
            findings.append(
                ValidationFinding(
                    field="plan.action_steps",
                    severity=ValidationSeverity.ERROR,
                    message=f"Action step count ({len(plan.action_steps)}) outside allowed bounds (1 to 5 steps).",
                    code="ERR_INVALID_STEP_COUNT",
                )
            )

        # 3. Overall target window bounds
        if not (1 <= plan.target_window_days <= 60):
            findings.append(
                ValidationFinding(
                    field="plan.target_window_days",
                    severity=ValidationSeverity.ERROR,
                    message=f"Target window ({plan.target_window_days}d) must be between 1 and 60 days.",
                    code="ERR_INVALID_TARGET_WINDOW",
                )
            )

        # 4. Action steps validation
        allowed_roles = (
            SyntheticDemoCatalog.get_allowed_roles(proposal.selected_intervention_id)
            if proposal else None
        )

        for step in plan.action_steps:
            # Role checking against catalog entry
            if allowed_roles is not None and step.suggested_role not in allowed_roles:
                findings.append(
                    ValidationFinding(
                        field=f"plan.step_{step.step_number}.suggested_role",
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Disallowed role '{step.suggested_role}' for intervention "
                            f"'{proposal.selected_intervention_id}'. Allowed roles: {allowed_roles}."
                        ),
                        code="ERR_DISALLOWED_ROLE",
                    )
                )

            # Target days bounding
            if step.target_days > plan.target_window_days:
                findings.append(
                    ValidationFinding(
                        field=f"plan.step_{step.step_number}.target_days",
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Step target days ({step.target_days}d) exceeds overall plan "
                            f"target window ({plan.target_window_days}d)."
                        ),
                        code="ERR_TARGET_DAYS_EXCEEDS_WINDOW",
                    )
                )

            # Heuristic checks on action text
            findings.extend(cls.check_clinical_language(step.action_description, f"plan.step_{step.step_number}.action"))
            findings.extend(cls.check_speculative_inferences(step.action_description, f"plan.step_{step.step_number}.action"))
            findings.extend(cls.check_risk_reinterpretation(step.action_description, f"plan.step_{step.step_number}.action"))
            findings.extend(cls.check_unauthorized_approval(step.action_description, f"plan.step_{step.step_number}.action"))
            findings.extend(cls.check_task_outcome_conflation(step.action_description, f"plan.step_{step.step_number}.action"))

            # Evidence reference check if cited on step
            if step.evidence_reference and canonical_features:
                if step.evidence_reference not in canonical_features:
                    findings.append(
                        ValidationFinding(
                            field=f"plan.step_{step.step_number}.evidence_reference",
                            severity=ValidationSeverity.ERROR,
                            message=f"Fabricated citation in step: '{step.evidence_reference}' not in 25-feature contract.",
                            code="ERR_FABRICATED_FEATURE",
                        )
                    )

        # 5. Narrative checks on title and rationale
        findings.extend(cls.check_clinical_language(plan.plan_title, "plan.title"))
        findings.extend(cls.check_speculative_inferences(plan.plan_title, "plan.title"))
        findings.extend(cls.check_unauthorized_approval(plan.plan_title, "plan.title"))
        findings.extend(cls.check_task_outcome_conflation(plan.plan_title, "plan.title"))

        if plan.rationale:
            findings.extend(cls.check_clinical_language(plan.rationale, "plan.rationale"))
            findings.extend(cls.check_speculative_inferences(plan.rationale, "plan.rationale"))
            findings.extend(cls.check_unauthorized_approval(plan.rationale, "plan.rationale"))
            findings.extend(cls.check_task_outcome_conflation(plan.rationale, "plan.rationale"))

        # 6. Follow-up evidence requirement check
        has_follow_up = bool(plan.evidence_requirements) or any(bool(s.follow_up_evidence) for s in plan.action_steps)
        if not has_follow_up:
            findings.append(
                ValidationFinding(
                    field="plan.evidence_requirements",
                    severity=ValidationSeverity.ERROR,
                    message="Plan must specify follow-up evidence requirements to observe completion.",
                    code="ERR_MISSING_FOLLOW_UP_EVIDENCE",
                )
            )

        return findings

    @classmethod
    def validate_stage_outputs(
        cls,
        evidence_packet: EvidencePacket,
        interpretation: Optional[SignalInterpretation] = None,
        proposal: Optional[InterventionProposal] = None,
        plan: Optional[SupportPlanDraft] = None,
        challenge: Optional[EvidenceChallengeReport] = None,
    ) -> ValidationSummary:
        """
        Comprehensive application gate validating all available stage outputs.
        """
        findings: list[ValidationFinding] = []
        canonical_features = evidence_packet.get_canonical_features()

        # 1. Validate Agent 1: SignalInterpretation citations and narratives
        if interpretation is not None:
            for cit in interpretation.evidence_references:
                err = cls.validate_citation(cit, canonical_features)
                if err:
                    findings.append(err)

            findings.extend(cls.check_clinical_language(interpretation.summary, "interpretation.summary"))
            findings.extend(cls.check_clinical_language(interpretation.velocity_assessment, "interpretation.velocity"))
            findings.extend(cls.check_speculative_inferences(interpretation.summary, "interpretation.summary"))
            findings.extend(cls.check_speculative_inferences(interpretation.velocity_assessment, "interpretation.velocity"))
            findings.extend(cls.check_risk_reinterpretation(interpretation.summary, "interpretation.summary"))
            findings.extend(cls.check_risk_reinterpretation(interpretation.velocity_assessment, "interpretation.velocity"))
            findings.extend(
                cls.validate_temporal_claims(
                    interpretation.velocity_assessment,
                    interpretation.evidence_references,
                    "interpretation.velocity_assessment",
                )
            )
            findings.extend(
                cls.validate_temporal_claims(
                    interpretation.summary,
                    interpretation.evidence_references,
                    "interpretation.summary",
                )
            )

        # 2. Validate Agent 2: InterventionProposal
        if proposal is not None:
            if not SyntheticDemoCatalog.is_valid_intervention(proposal.selected_intervention_id):
                findings.append(
                    ValidationFinding(
                        field="proposal.selected_intervention_id",
                        severity=ValidationSeverity.ERROR,
                        message=(
                            f"Uncataloged intervention ID '{proposal.selected_intervention_id}'. "
                            f"Must belong to {SyntheticDemoCatalog.CATALOG_VERSION}."
                        ),
                        code="ERR_UNCATALOGED_INTERVENTION",
                    )
                )
            else:
                allowed_roles = SyntheticDemoCatalog.get_allowed_roles(proposal.selected_intervention_id)
                if proposal.target_role not in allowed_roles:
                    findings.append(
                        ValidationFinding(
                            field="proposal.target_role",
                            severity=ValidationSeverity.ERROR,
                            message=(
                                f"Invalid role '{proposal.target_role}' for intervention "
                                f"'{proposal.selected_intervention_id}'. Allowed roles: {allowed_roles}."
                            ),
                            code="ERR_INVALID_ROLE",
                        )
                    )

            for cit in proposal.evidence_references:
                err = cls.validate_citation(cit, canonical_features)
                if err:
                    findings.append(err)

            findings.extend(cls.check_clinical_language(proposal.rationale, "proposal.rationale"))
            findings.extend(cls.check_speculative_inferences(proposal.rationale, "proposal.rationale"))
            findings.extend(cls.check_risk_reinterpretation(proposal.rationale, "proposal.rationale"))

        # 3. Validate Agent 3: SupportPlanDraft
        if plan is not None:
            findings.extend(
                cls.validate_support_plan(
                    plan=plan,
                    proposal=proposal,
                    canonical_features=canonical_features,
                )
            )

        # 4. Process Agent 4: EvidenceChallengeReport (Advisory findings)
        if challenge is not None:
            # Map critique flags to WARNING level advisory findings
            for ungrounded in challenge.unsupported_claims:
                findings.append(
                    ValidationFinding(
                        field="challenge.unsupported_claim",
                        severity=ValidationSeverity.WARNING,
                        message=f"Advisory red-team flag (unsupported claim): {ungrounded}",
                        code="WARN_ADVISORY_CHALLENGE",
                    )
                )
            for div in challenge.catalog_divergences:
                findings.append(
                    ValidationFinding(
                        field="challenge.catalog_divergence",
                        severity=ValidationSeverity.WARNING,
                        message=f"Advisory red-team flag (catalog divergence): {div}",
                        code="WARN_ADVISORY_CHALLENGE",
                    )
                )
            for unc in challenge.unjustified_certainty_flags:
                findings.append(
                    ValidationFinding(
                        field="challenge.unjustified_certainty",
                        severity=ValidationSeverity.WARNING,
                        message=f"Advisory red-team flag (unjustified certainty): {unc}",
                        code="WARN_ADVISORY_CHALLENGE",
                    )
                )
            for structured_finding in challenge.findings:
                findings.append(
                    ValidationFinding(
                        field=structured_finding.target,
                        severity=structured_finding.severity,
                        message=f"Advisory red-team challenge: {structured_finding.reason}",
                        code="WARN_ADVISORY_CHALLENGE",
                    )
                )

        error_count = sum(1 for f in findings if f.severity == ValidationSeverity.ERROR)
        warning_count = sum(1 for f in findings if f.severity == ValidationSeverity.WARNING)

        return ValidationSummary(
            passed=(error_count == 0),
            findings=findings,
            error_count=error_count,
            warning_count=warning_count,
        )
