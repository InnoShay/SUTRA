import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

CounselorOnboardingStatus = Literal[
    "NOT_STARTED",
    "INCOMPLETE",
    "PENDING_VERIFICATION",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
]

ContactMethod = Literal["phone", "in_person", "video"]
AvailabilityStatus = Literal["available", "in_session", "away"]
EscalationCategory = Literal[
    "academic_support",
    "student_welfare",
    "counseling_supervisor",
    "institutional_emergency",
    "campus_medical",
]
CallRequestStatus = Literal[
    "requested",
    "awaiting_assignment",
    "assigned",
    "contact_attempted",
    "contact_completed",
    "closed",
]
EscalationStatus = Literal[
    "initiated",
    "contact_attempted",
    "contact_confirmed",
    "follow_up_required",
    "resolved",
]


class CounselorProfileDTO(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    designation: str
    department: str
    specializations: List[str] = []
    campus_id: str
    campus_name: str
    qualification: str
    certifications: List[str] = []
    registration_number: Optional[str] = None
    credentials_verified: bool = False
    contact_methods: List[ContactMethod] = ["phone"]
    availability_schedule: str
    availability_status: AvailabilityStatus = "available"
    preferred_notification: str = "email_and_sms"
    assigned_cohorts: List[str] = []
    onboarding_status: CounselorOnboardingStatus = "NOT_STARTED"
    rejection_reason: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CounselorOnboardingRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str
    phone: Optional[str] = None
    designation: str
    department: str
    specializations: List[str] = []
    campus_id: str
    qualification: str
    certifications: List[str] = []
    registration_number: Optional[str] = None
    contact_methods: List[ContactMethod] = ["phone"]
    availability_schedule: str = "Mon - Fri, 09:30 AM - 05:30 PM"
    preferred_notification: str = "email_and_sms"
    assigned_cohorts: List[str] = []


class CounselorApprovalRequest(BaseModel):
    counselor_id: str
    decision: Literal["approve", "reject", "suspend"]
    reason: Optional[str] = None


class AuthorityContactItem(BaseModel):
    id: str
    service_name: str
    contact_name: str
    designation: str
    department: str
    escalation_category: EscalationCategory
    contact_number: str
    contact_email: str
    communication_method: Literal["phone", "email", "portal"] = "phone"
    availability: str
    verified: bool = True
    is_emergency: bool = False


class EscalationRequest(BaseModel):
    case_id: Optional[str] = None
    student_id: str
    authority_contact_id: str
    escalation_category: str
    reason: str = Field(..., min_length=5)
    notes: str = ""
    communication_method: Literal["phone", "email", "portal"] = "phone"
    urgent: bool = False


class EscalationRecordDTO(BaseModel):
    id: str
    case_id: Optional[str] = None
    student_id: str
    student_name: str
    authority_contact_id: str
    authority_name: str
    escalation_category: str
    initiated_by_user_id: str
    initiator_name: str
    timestamp: datetime
    reason: str
    communication_method: str
    status: EscalationStatus = "initiated"
    follow_up_notes: Optional[str] = None


class CreateCallRequestInput(BaseModel):
    student_id: str
    case_id: Optional[str] = None
    signal_id: Optional[str] = None
    risk_score: Optional[float] = None
    preferred_contact_method: ContactMethod = "phone"
    preferred_time_slot: Literal["morning", "afternoon", "flexible"] = "flexible"
    student_notes: Optional[str] = None


class CounselorCallRequestDTO(BaseModel):
    id: str
    student_id: str
    student_name: str
    external_student_ref: str
    case_id: Optional[str] = None
    signal_id: Optional[str] = None
    risk_score: float
    preferred_contact_method: ContactMethod
    preferred_time_slot: Literal["morning", "afternoon", "flexible"]
    student_notes: Optional[str] = None
    status: CallRequestStatus = "requested"
    assigned_counselor_id: Optional[str] = None
    assigned_counselor_name: Optional[str] = None
    contact_attempt_count: int = 0
    last_attempt_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UpdateCallRequestStatusInput(BaseModel):
    status: CallRequestStatus
    notes: Optional[str] = None
    attempt_increment: bool = False
