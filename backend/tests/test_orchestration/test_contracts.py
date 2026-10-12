"""
Unit tests for versioned Pydantic v2 orchestration contracts.
"""

import pytest
from pydantic import ValidationError

from backend.app.orchestration.contracts import (
    ActionStep,
    ClaimKind,
    EvidenceChallengeReport,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    SignalInterpretation,
    SupportPlanDraft,
)


def test_evidence_packet_contract(sample_evidence_packet: EvidencePacket):
    """EvidencePacket requires exact schema fields and forbids extraneous attributes."""
    assert sample_evidence_packet.schema_version == "v1.0.0"
    assert sample_evidence_packet.snapshot_day == 30
    assert sample_evidence_packet.campus_id == "CAMPUS-MAIN"

    # Canonical features map contains exactly 25 features
    canonical = sample_evidence_packet.get_canonical_features()
    assert len(canonical) == 25
    assert "vle_total_clicks_d30" in canonical

    # Extra fields must be forbidden
    with pytest.raises(ValidationError):
        EvidencePacket(
            **sample_evidence_packet.model_dump(),
            unexpected_field="disallowed",
        )


def test_evidence_reference_typed_preservation():
    """EvidenceReference preserves int, float, and str semantics without ambiguous conversion."""
    ref_float = EvidenceReference(
        feature_name="vle_days_since_last_click",
        cited_value=22.0,
        claim_kind=ClaimKind.VERIFIED_OBSERVATION,
    )
    assert isinstance(ref_float.cited_value, float)
    assert ref_float.cited_value == 22.0

    ref_int = EvidenceReference(
        feature_name="num_of_prev_attempts",
        cited_value=1,
        claim_kind=ClaimKind.VERIFIED_OBSERVATION,
    )
    assert isinstance(ref_int.cited_value, int)
    assert ref_int.cited_value == 1

    ref_str = EvidenceReference(
        feature_name="highest_education",
        cited_value="Lower Than A Level",
        claim_kind=ClaimKind.VERIFIED_OBSERVATION,
    )
    assert isinstance(ref_str.cited_value, str)
    assert ref_str.cited_value == "Lower Than A Level"


def test_signal_interpretation_contract():
    """SignalInterpretation enforces versioning and evidence references."""
    interp = SignalInterpretation(
        summary="Minimal engagement with sharp velocity drop.",
        velocity_assessment="Zero clicks in past 7 days.",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_clicks_last_7d",
                cited_value=0.0,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
        missing_or_stale_indicators=["No assessment submitted by Day 30."],
    )
    assert interp.schema_version == "v1.0.0"
    assert len(interp.evidence_references) == 1


def test_intervention_proposal_contract():
    """InterventionProposal requires selected intervention and rationale."""
    prop = InterventionProposal(
        selected_intervention_id="INT-VLE-ONBOARD-01",
        rationale="Student needs urgent LMS navigation check-in.",
        target_role="ACADEMIC_ADVISOR",
        alternative_intervention_ids=["INT-PEER-CONNECT-01"],
        evidence_references=[],
    )
    assert prop.selected_intervention_id == "INT-VLE-ONBOARD-01"


def test_support_plan_contract_step_bounds():
    """SupportPlanDraft restricts action steps to bounded range (1 to 5)."""
    # Empty steps should fail validation
    with pytest.raises(ValidationError):
        SupportPlanDraft(
            plan_title="Empty Plan",
            action_steps=[],
        )

    # Valid step
    plan = SupportPlanDraft(
        plan_title="Digital Onboarding Plan",
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Contact student via LMS messaging portal.",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=3,
            )
        ],
        evidence_requirements=["Advisor log note of completed check-in."],
        target_window_days=7,
    )
    assert len(plan.action_steps) == 1
    assert plan.action_steps[0].step_number == 1


def test_evidence_challenge_contract():
    """EvidenceChallengeReport captures adversarial audit findings."""
    rep = EvidenceChallengeReport(
        critique_summary="Plan contains 1 ungrounded assertion regarding personal device access.",
        unsupported_claims=["Claim that student lacks laptop is unsupported by telemetry."],
        catalog_divergences=[],
        unjustified_certainty_flags=["Assumes student will definitely drop out."],
        flags_count=2,
    )
    assert rep.flags_count == 2
    assert len(rep.unsupported_claims) == 1
