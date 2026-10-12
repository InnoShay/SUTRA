"""
Unit tests for DeterministicValidator in SUTRA Phase 1.

Tests authoritative server-side validation against evidence packets,
synthetic catalog entries, allowed roles, and clinical safety heuristics.
"""

from typing import Any
import pytest

from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.contracts import (
    ActionStep,
    ClaimKind,
    EvidenceChallengeReport,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    SignalInterpretation,
    SupportPlanDraft,
    ValidationFinding,
    ValidationSeverity,
)
from backend.app.orchestration.validator import DeterministicValidator
from backend.app.schemas.features import StudentFeatureInput


def test_validator_valid_citations(sample_evidence_packet: EvidencePacket):
    """Valid citations matching canonical 25-feature dictionary pass validation."""
    valid_interpretation = SignalInterpretation(
        summary="Student exhibits low initial platform logins and zero assessment submissions.",
        velocity_assessment="VLE activity has declined over 22 days of recorded inactivity.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            ),
            EvidenceReference(
                feature_name="vle_days_since_last_click",
                cited_value=22.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            ),
            EvidenceReference(
                feature_name="gender",
                cited_value="M",
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            ),
        ],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=valid_interpretation,
    )
    assert summary.passed is True
    assert summary.error_count == 0
    assert len(summary.findings) == 0


def test_validator_rejects_fabricated_feature_name(sample_evidence_packet: EvidencePacket):
    """Validator rejects citations referencing non-existent or hallucinated features."""
    hallucinated_interpretation = SignalInterpretation(
        summary="Student seems disengaged based on cafeteria card swipe data.",
        velocity_assessment="Static attendance record.",
        evidence_references=[
            EvidenceReference(
                feature_name="cafeteria_card_swipes",  # Hallucinated feature not in 25-feature contract
                cited_value=0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=hallucinated_interpretation,
    )
    assert summary.passed is False
    assert any(f.code == "ERR_FABRICATED_FEATURE" for f in summary.findings)
    assert any("cafeteria_card_swipes" in f.message for f in summary.findings)


def test_validator_rejects_unsupported_temporal_trend(sample_evidence_packet: EvidencePacket):
    """Validator rejects claims of decline/trend that cite only static snapshot features without baseline."""
    unsupported_trend_interpretation = SignalInterpretation(
        summary="Student study hours dropped significantly.",
        velocity_assessment="Activity declined sharply over the term.",
        evidence_references=[
            EvidenceReference(
                feature_name="studied_credits",  # Static snapshot feature, does not justify a trend!
                cited_value=120,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=unsupported_trend_interpretation,
    )
    assert summary.passed is False
    assert any(f.code == "ERR_UNSUPPORTED_TEMPORAL_TREND" for f in summary.findings)


def test_validator_rejects_speculative_personal_inferences(sample_evidence_packet: EvidencePacket):
    """Validator rejects unevidenced speculations regarding broken laptops, domestic crises, or student attitude."""
    speculative_interpretation = SignalInterpretation(
        summary="Student has a broken laptop and cannot afford tuition due to family problems.",
        velocity_assessment="Student is lazy and lacks motivation.",
        evidence_references=[],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=speculative_interpretation,
    )
    assert summary.passed is False
    assert any(f.code == "ERR_UNSUPPORTED_SPECULATIVE_INFERENCE" for f in summary.findings)


def test_validator_rejects_risk_reinterpretation(sample_evidence_packet: EvidencePacket):
    """Validator rejects qualitative agent attempts to recalculate or override the ML model probability."""
    overriding_interpretation = SignalInterpretation(
        summary="The model is too pessimistic; risk probability is actually 0.20 and actual risk tier is LOW.",
        velocity_assessment="Normal activity pattern observed.",
        evidence_references=[],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=overriding_interpretation,
    )
    assert summary.passed is False
    assert any(f.code == "ERR_UNAUTHORIZED_RISK_REINTERPRETATION" for f in summary.findings)


def test_validator_rejects_value_mismatch(sample_evidence_packet: EvidencePacket):
    """Validator rejects citations where the feature exists but the cited value differs from canonical."""
    mismatched_interpretation = SignalInterpretation(
        summary="Student logged in 100 times.",
        velocity_assessment="High velocity claimed incorrectly.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=100.0,  # Canonical source value is 2.0
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=mismatched_interpretation,
    )
    assert summary.passed is False
    assert summary.error_count == 1
    error = summary.findings[0]
    assert error.code == "ERR_VALUE_MISMATCH"
    assert "vle_active_days_d30" in error.message
    assert "100.0" in error.message


def test_validator_rejects_uncataloged_intervention(sample_evidence_packet: EvidencePacket):
    """Validator rejects proposals referencing unverified or invented intervention IDs."""
    invalid_proposal = InterventionProposal(
        selected_intervention_id="INT-IMAGINARY-COURSE-DROP-99",  # Not in synthetic catalog
        target_role="ACADEMIC_ADVISOR",
        rationale="Student needs urgent custom course drop authorization.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=2.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        proposal=invalid_proposal,
    )
    assert summary.passed is False
    assert summary.error_count == 1
    assert summary.findings[0].code == "ERR_UNCATALOGED_INTERVENTION"


def test_validator_rejects_invalid_role_for_catalog_entry(sample_evidence_packet: EvidencePacket):
    """Validator rejects proposals where role is not authorized for the cataloged intervention."""
    # INT-VLE-ONBOARD-01 only allows PEER_MENTOR or STUDENT_SUCCESS_COACH, NOT MODULE_TUTOR
    invalid_role_proposal = InterventionProposal(
        selected_intervention_id="INT-VLE-ONBOARD-01",
        target_role="MODULE_TUTOR",  # Invalid role for this intervention
        rationale="Peer mentor outreach needed.",
        evidence_references=[],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        proposal=invalid_role_proposal,
    )
    assert summary.passed is False
    assert summary.error_count == 1
    assert summary.findings[0].code == "ERR_INVALID_ROLE"
    assert "MODULE_TUTOR" in summary.findings[0].message


def test_validator_clinical_language_detection(sample_evidence_packet: EvidencePacket):
    """Validator rejects psychiatric/clinical diagnostic claims in agent outputs."""
    clinical_interpretation = SignalInterpretation(
        summary="The student suffers from major depression and is clinically depressed.",
        velocity_assessment="Low attendance caused by clinical depression.",
        evidence_references=[],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=clinical_interpretation,
    )
    assert summary.passed is False
    assert summary.error_count >= 1
    finding_codes = [f.code for f in summary.findings]
    assert "ERR_CLINICAL_LANGUAGE_DETECTED" in finding_codes


def test_validator_benign_educational_phrasing_allowed(sample_evidence_packet: EvidencePacket):
    """Validator does not falsely flag benign non-clinical phrases like 'depressed economic area'."""
    benign_interpretation = SignalInterpretation(
        summary="Student comes from an area with a depressed economic profile and low historical progression.",
        velocity_assessment="Steady progress observed despite economic depression in the regional cohort.",
        evidence_references=[],
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        interpretation=benign_interpretation,
    )
    assert summary.passed is True
    assert summary.error_count == 0


def test_validator_converts_agent_4_challenge_to_advisory_warning(sample_evidence_packet: EvidencePacket):
    """Agent 4 red-team critique findings are converted to WARNING level advisory flags, not gate pass/fail."""
    challenge_report = EvidenceChallengeReport(
        critique_summary="Critique identified unsupported assumptions regarding student work hours.",
        unsupported_claims=["Plan claims student works full time without evidence."],
        catalog_divergences=[],
        unjustified_certainty_flags=[],
        flags_count=1,
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        challenge=challenge_report,
    )
    # Passed should be True because Agent 4 is an advisory critic (warnings do not block passed status)
    assert summary.passed is True
    assert summary.error_count == 0
    assert summary.warning_count == 1
    assert summary.findings[0].code == "WARN_ADVISORY_CHALLENGE"
    assert summary.findings[0].severity == ValidationSeverity.WARNING


def test_validator_ignores_model_generated_policy_boolean(sample_evidence_packet: EvidencePacket):
    """
    Even when an AI critic gives a completely clean report (flags_count=0, empty unsupported claims),
    an invalid/uncataloged intervention is authoritative caught and failed by server-side validator code.
    """
    invalid_proposal = InterventionProposal(
        selected_intervention_id="INT-UNAUTHORIZED-FINANCIAL-AID-GRANT-99",
        target_role="ACADEMIC_ADVISOR",
        rationale="Student needs urgent tuition refund.",
        evidence_references=[],
    )
    challenge_falsely_approving = EvidenceChallengeReport(
        critique_summary="Agent 4 claims plan is fully compliant.",
        unsupported_claims=[],
        catalog_divergences=[],
        unjustified_certainty_flags=[],
        flags_count=0,
    )

    summary = DeterministicValidator.validate_stage_outputs(
        evidence_packet=sample_evidence_packet,
        proposal=invalid_proposal,
        challenge=challenge_falsely_approving,
    )
    # Must fail because code validation is authoritative!
    assert summary.passed is False
    assert any(f.code == "ERR_UNCATALOGED_INTERVENTION" for f in summary.findings)

