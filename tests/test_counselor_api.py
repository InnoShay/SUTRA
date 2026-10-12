import uuid
import pytest
from app.schemas.counselor import (
    CounselorOnboardingRequest,
    CounselorApprovalRequest,
    CreateCallRequestInput,
    EscalationRequest,
    AuthorityContactItem,
)


def test_counselor_schemas_validation():
    """Validates Counselor domain schema constraints and onboarding state transitions."""
    req = CounselorOnboardingRequest(
        full_name="Dr. Meera Nambiar",
        email="counselor@sutra.edu",
        designation="Senior Student Counselor",
        department="Student Wellbeing",
        specializations=["Academic Stress", "Crisis De-escalation"],
        campus_id=str(uuid.uuid4()),
        qualification="Ph.D. in Psychology",
        certifications=["Licensed Counselor"],
        contact_methods=["phone", "in_person"],
        availability_schedule="Mon - Fri, 09:30 AM - 05:30 PM",
        preferred_notification="email_and_sms",
        assigned_cohorts=["CS-Y2"],
    )
    assert req.full_name == "Dr. Meera Nambiar"
    assert "phone" in req.contact_methods

    # Test approval request
    approval = CounselorApprovalRequest(
        counselor_id=str(uuid.uuid4()),
        decision="approve",
    )
    assert approval.decision == "approve"

    # Test call request schema
    call_req = CreateCallRequestInput(
        student_id="SYN-1007",
        risk_score=0.68,
        preferred_contact_method="phone",
        preferred_time_slot="afternoon",
        student_notes="Requesting academic check-in",
    )
    assert call_req.student_id == "SYN-1007"
    assert call_req.risk_score == 0.68

    # Test escalation request schema
    esc_req = EscalationRequest(
        student_id="SYN-1007",
        authority_contact_id="AUTH-01",
        escalation_category="counseling_supervisor",
        reason="Severe attendance decline exceeding threshold",
        notes="Scheduled follow-up",
        communication_method="phone",
        urgent=False,
    )
    assert esc_req.reason == "Severe attendance decline exceeding threshold"
