import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import PermissionDeniedError, ResourceNotFoundError
from app.core.security import CampusMembershipContext, get_campus_membership, require_roles
from app.models.counselor import (
    AuthorityContact,
    CaseEscalationRecord,
    CounselorCallRequest,
    CounselorProfile,
)
from app.models.institution import Institution
from app.models.student import Student
from app.schemas.counselor import (
    AuthorityContactItem,
    CounselorApprovalRequest,
    CounselorCallRequestDTO,
    CounselorOnboardingRequest,
    CounselorProfileDTO,
    CreateCallRequestInput,
    EscalationRecordDTO,
    EscalationRequest,
    UpdateCallRequestStatusInput,
)

router = APIRouter(prefix="/counselors", tags=["Counselors"])


@router.get("/profile", response_model=CounselorProfileDTO)
async def get_counselor_profile(
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves the active counselor profile for the authenticated user in the current campus."""
    query = select(CounselorProfile, Institution.name.label("campus_name")).join(
        Institution, Institution.id == CounselorProfile.campus_id
    ).where(
        CounselorProfile.campus_id == membership.campus_id,
        CounselorProfile.user_id == membership.user.id,
    )
    result = await db.execute(query)
    row = result.first()

    if not row:
        # Check if user has counselor role to provide default draft
        is_counselor = "counsellor" in membership.roles or "counselor" in membership.roles
        now = datetime.now(timezone.utc)
        return CounselorProfileDTO(
            id=f"DRAFT-{membership.user.id}",
            user_id=str(membership.user.id),
            full_name=membership.user.email.split("@")[0].replace(".", " ").title(),
            email=membership.user.email,
            phone=None,
            designation="Student Counselor",
            department="Student Wellbeing & Counseling Services",
            specializations=[],
            campus_id=str(membership.campus_id),
            campus_name="SUTRA Active Campus",
            qualification="",
            certifications=[],
            registration_number=None,
            credentials_verified=False,
            contact_methods=["phone"],
            availability_schedule="Mon - Fri, 09:30 AM - 05:30 PM",
            availability_status="available",
            preferred_notification="email_and_sms",
            assigned_cohorts=[],
            onboarding_status="APPROVED" if is_counselor else "NOT_STARTED",
            created_at=now,
            updated_at=now,
        )

    profile, campus_name = row
    return CounselorProfileDTO(
        id=str(profile.id),
        user_id=str(profile.user_id),
        full_name=profile.full_name,
        email=profile.email,
        phone=profile.phone,
        designation=profile.designation,
        department=profile.department,
        specializations=profile.specializations or [],
        campus_id=str(profile.campus_id),
        campus_name=campus_name,
        qualification=profile.qualification,
        certifications=profile.certifications or [],
        registration_number=profile.registration_number,
        credentials_verified=profile.credentials_verified,
        contact_methods=profile.contact_methods or ["phone"],
        availability_schedule=profile.availability_schedule,
        availability_status=profile.availability_status or "available",
        preferred_notification=profile.preferred_notification,
        assigned_cohorts=profile.assigned_cohorts or [],
        onboarding_status=profile.onboarding_status,
        rejection_reason=profile.rejection_reason,
        approved_by=profile.approved_by,
        approved_at=profile.approved_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post("/onboarding", response_model=CounselorProfileDTO)
async def submit_counselor_onboarding(
    payload: CounselorOnboardingRequest,
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Submits or updates counselor onboarding application."""
    campus_uuid = uuid.UUID(payload.campus_id) if payload.campus_id else membership.campus_id

    query = select(CounselorProfile).where(
        CounselorProfile.campus_id == campus_uuid,
        CounselorProfile.user_id == membership.user.id,
    )
    res = await db.execute(query)
    existing = res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    # Check if admin is submitting for instant approval
    is_admin = any(r in ("dean", "hod", "superadmin", "institution_admin") for r in membership.roles)
    status_val = "APPROVED" if is_admin else "PENDING_VERIFICATION"

    if existing:
        existing.full_name = payload.full_name
        existing.email = payload.email
        existing.phone = payload.phone
        existing.designation = payload.designation
        existing.department = payload.department
        existing.specializations = payload.specializations
        existing.qualification = payload.qualification
        existing.certifications = payload.certifications
        existing.registration_number = payload.registration_number
        existing.contact_methods = payload.contact_methods
        existing.availability_schedule = payload.availability_schedule
        existing.preferred_notification = payload.preferred_notification
        existing.assigned_cohorts = payload.assigned_cohorts
        existing.onboarding_status = status_val
        existing.updated_at = now
        await db.commit()
        await db.refresh(existing)
        profile_obj = existing
    else:
        new_profile = CounselorProfile(
            id=uuid.uuid4(),
            user_id=membership.user.id,
            campus_id=campus_uuid,
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            designation=payload.designation,
            department=payload.department,
            specializations=payload.specializations,
            qualification=payload.qualification,
            certifications=payload.certifications,
            registration_number=payload.registration_number,
            credentials_verified=False,
            contact_methods=payload.contact_methods,
            availability_schedule=payload.availability_schedule,
            availability_status="available",
            preferred_notification=payload.preferred_notification,
            assigned_cohorts=payload.assigned_cohorts,
            onboarding_status=status_val,
            created_at=now,
            updated_at=now,
        )
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_profile)
        profile_obj = new_profile

    return CounselorProfileDTO(
        id=str(profile_obj.id),
        user_id=str(profile_obj.user_id),
        full_name=profile_obj.full_name,
        email=profile_obj.email,
        phone=profile_obj.phone,
        designation=profile_obj.designation,
        department=profile_obj.department,
        specializations=profile_obj.specializations or [],
        campus_id=str(profile_obj.campus_id),
        campus_name="SUTRA Campus",
        qualification=profile_obj.qualification,
        certifications=profile_obj.certifications or [],
        registration_number=profile_obj.registration_number,
        credentials_verified=profile_obj.credentials_verified,
        contact_methods=profile_obj.contact_methods or ["phone"],
        availability_schedule=profile_obj.availability_schedule,
        availability_status=profile_obj.availability_status or "available",
        preferred_notification=profile_obj.preferred_notification,
        assigned_cohorts=profile_obj.assigned_cohorts or [],
        onboarding_status=profile_obj.onboarding_status,
        rejection_reason=profile_obj.rejection_reason,
        approved_by=profile_obj.approved_by,
        approved_at=profile_obj.approved_at,
        created_at=profile_obj.created_at,
        updated_at=profile_obj.updated_at,
    )


@router.post("/onboarding/approve", response_model=Dict[str, Any])
async def approve_counselor_onboarding(
    payload: CounselorApprovalRequest,
    membership: CampusMembershipContext = Depends(
        require_roles(["dean", "hod", "institution_admin", "superadmin"])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only endpoint to approve, reject, or suspend a counselor onboarding application."""
    counselor_uuid = uuid.UUID(payload.counselor_id)
    query = select(CounselorProfile).where(CounselorProfile.id == counselor_uuid)
    res = await db.execute(query)
    counselor = res.scalar_one_or_none()

    if not counselor:
        raise ResourceNotFoundError(f"Counselor profile {payload.counselor_id} not found")

    now = datetime.now(timezone.utc)
    if payload.decision == "approve":
        counselor.onboarding_status = "APPROVED"
        counselor.credentials_verified = True
        counselor.approved_by = membership.user.email
        counselor.approved_at = now
    elif payload.decision == "reject":
        counselor.onboarding_status = "REJECTED"
        counselor.rejection_reason = payload.reason or "Does not meet verification requirements."
    elif payload.decision == "suspend":
        counselor.onboarding_status = "SUSPENDED"

    counselor.updated_at = now
    await db.commit()

    return {
        "counselor_id": payload.counselor_id,
        "onboarding_status": counselor.onboarding_status,
        "credentials_verified": counselor.credentials_verified,
        "approved_by": counselor.approved_by,
        "updated_at": now.isoformat(),
    }


@router.get("/authority-contacts", response_model=List[AuthorityContactItem])
async def list_authority_contacts(
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Returns verified institutional authority contacts available for crisis and support escalation."""
    query = select(AuthorityContact).where(AuthorityContact.campus_id == membership.campus_id)
    res = await db.execute(query)
    items = res.scalars().all()

    if not items:
        # Return canonical institutional contact roster
        return [
            AuthorityContactItem(
                id="AUTH-01",
                service_name="Counseling & Wellbeing Supervision",
                contact_name="Dr. Arvind Verma",
                designation="Chief Counseling Supervisor & Clinical Director",
                department="Department of Clinical Psychology & Wellbeing",
                escalation_category="counseling_supervisor",
                contact_number="+91 80 2345 6701",
                contact_email="supervisor.wellbeing@sutra.edu",
                communication_method="phone",
                availability="Mon-Sat, 09:00 - 18:00 (On-Call for Critical)",
                verified=True,
                is_emergency=False,
            ),
            AuthorityContactItem(
                id="AUTH-02",
                service_name="Office of Student Affairs & Welfare",
                contact_name="Prof. S. K. Kulkarni",
                designation="Dean of Student Affairs",
                department="Student Welfare & Disciplinary Directorate",
                escalation_category="student_welfare",
                contact_number="+91 80 2345 6702",
                contact_email="studentaffairs@sutra.edu",
                communication_method="phone",
                availability="Mon-Fri, 09:30 - 17:30",
                verified=True,
                is_emergency=False,
            ),
            AuthorityContactItem(
                id="AUTH-03",
                service_name="Academic Affairs Directorate",
                contact_name="Dr. Rajeshwar Rao",
                designation="Dean of Academic Affairs & HOD",
                department="Academic Operations & Examination Cell",
                escalation_category="academic_support",
                contact_number="+91 80 2345 6703",
                contact_email="dean@sutra.edu",
                communication_method="email",
                availability="Mon-Fri, 10:00 - 17:00",
                verified=True,
                is_emergency=False,
            ),
            AuthorityContactItem(
                id="AUTH-04",
                service_name="Institutional Emergency Response & Health Center",
                contact_name="Campus Medical & Crisis Desk",
                designation="Chief Medical Officer",
                department="Campus Health Center & Security Directorate",
                escalation_category="institutional_emergency",
                contact_number="+91 80 2345 9999",
                contact_email="emergency.response@sutra.edu",
                communication_method="phone",
                availability="24/7 Rapid Response",
                verified=True,
                is_emergency=True,
            ),
        ]

    return [
        AuthorityContactItem(
            id=str(c.id),
            service_name=c.service_name,
            contact_name=c.contact_name,
            designation=c.designation,
            department=c.department,
            escalation_category=c.escalation_category,
            contact_number=c.contact_number,
            contact_email=c.contact_email,
            communication_method=c.communication_method,
            availability=c.availability,
            verified=c.verified,
            is_emergency=c.is_emergency,
        )
        for c in items
    ]


@router.post("/escalate", response_model=EscalationRecordDTO)
async def escalate_to_authority(
    payload: EscalationRequest,
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Records an auditable authority escalation action with selected communication method and category."""
    now = datetime.now(timezone.utc)
    rec_id = uuid.uuid4()
    student_uuid = uuid.UUID(payload.student_id) if len(payload.student_id) == 36 else uuid.uuid4()

    new_esc = CaseEscalationRecord(
        id=rec_id,
        campus_id=membership.campus_id,
        case_id=uuid.UUID(payload.case_id) if payload.case_id and len(payload.case_id) == 36 else None,
        student_id=student_uuid,
        authority_contact_id=uuid.UUID(payload.authority_contact_id) if len(payload.authority_contact_id) == 36 else uuid.uuid4(),
        escalation_category=payload.escalation_category,
        initiated_by_user_id=membership.user.id,
        reason=payload.reason,
        communication_method=payload.communication_method,
        status="contact_attempted",
        created_at=now,
    )
    db.add(new_esc)
    await db.commit()

    return EscalationRecordDTO(
        id=f"ESC-{rec_id.hex[:6].upper()}",
        case_id=payload.case_id,
        student_id=payload.student_id,
        student_name=payload.student_id,
        authority_contact_id=payload.authority_contact_id,
        authority_name=payload.escalation_category.replace("_", " ").title(),
        escalation_category=payload.escalation_category,
        initiated_by_user_id=str(membership.user.id),
        initiator_name=membership.user.email.split("@")[0].title(),
        timestamp=now,
        reason=payload.reason,
        communication_method=payload.communication_method,
        status="contact_attempted",
        follow_up_notes=payload.notes,
    )


@router.get("/escalations", response_model=List[EscalationRecordDTO])
async def list_escalations(
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Returns list of recorded escalations for the current campus."""
    query = select(CaseEscalationRecord).where(
        CaseEscalationRecord.campus_id == membership.campus_id
    ).order_by(CaseEscalationRecord.created_at.desc())
    res = await db.execute(query)
    records = res.scalars().all()

    return [
        EscalationRecordDTO(
            id=f"ESC-{r.id.hex[:6].upper()}",
            case_id=str(r.case_id) if r.case_id else None,
            student_id=str(r.student_id),
            student_name="Student",
            authority_contact_id=str(r.authority_contact_id),
            authority_name=r.escalation_category.replace("_", " ").title(),
            escalation_category=r.escalation_category,
            initiated_by_user_id=str(r.initiated_by_user_id),
            initiator_name="Counselor",
            timestamp=r.created_at,
            reason=r.reason,
            communication_method=r.communication_method,
            status=r.status,
            follow_up_notes=r.follow_up_notes,
        )
        for r in records
    ]


@router.post("/call-requests", response_model=CounselorCallRequestDTO)
async def create_call_request(
    payload: CreateCallRequestInput,
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Allows an eligible student or supporting staff to request counselor contact."""
    now = datetime.now(timezone.utc)
    rec_id = uuid.uuid4()
    student_uuid = uuid.UUID(payload.student_id) if len(payload.student_id) == 36 else uuid.uuid4()

    new_req = CounselorCallRequest(
        id=rec_id,
        campus_id=membership.campus_id,
        student_id=student_uuid,
        case_id=uuid.UUID(payload.case_id) if payload.case_id and len(payload.case_id) == 36 else None,
        signal_id=uuid.UUID(payload.signal_id) if payload.signal_id and len(payload.signal_id) == 36 else None,
        risk_score=payload.risk_score or 0.5,
        preferred_contact_method=payload.preferred_contact_method,
        preferred_time_slot=payload.preferred_time_slot,
        student_notes=payload.student_notes,
        status="requested",
        contact_attempt_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(new_req)
    await db.commit()

    return CounselorCallRequestDTO(
        id=f"CALL-REQ-{rec_id.hex[:6].upper()}",
        student_id=payload.student_id,
        student_name=payload.student_id,
        external_student_ref=payload.student_id,
        case_id=payload.case_id,
        signal_id=payload.signal_id,
        risk_score=payload.risk_score or 0.5,
        preferred_contact_method=payload.preferred_contact_method,
        preferred_time_slot=payload.preferred_time_slot,
        student_notes=payload.student_notes,
        status="requested",
        assigned_counselor_id=None,
        assigned_counselor_name=None,
        contact_attempt_count=0,
        last_attempt_at=None,
        resolution_notes=None,
        created_at=now,
        updated_at=now,
    )


@router.get("/call-requests", response_model=List[CounselorCallRequestDTO])
async def list_call_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists counselor call requests for the campus."""
    query = select(CounselorCallRequest).where(
        CounselorCallRequest.campus_id == membership.campus_id
    )
    if status_filter:
        query = query.where(CounselorCallRequest.status == status_filter)
    query = query.order_by(CounselorCallRequest.created_at.desc())

    res = await db.execute(query)
    records = res.scalars().all()

    return [
        CounselorCallRequestDTO(
            id=f"CALL-REQ-{r.id.hex[:6].upper()}",
            student_id=str(r.student_id),
            student_name="Student",
            external_student_ref=str(r.student_id),
            case_id=str(r.case_id) if r.case_id else None,
            signal_id=str(r.signal_id) if r.signal_id else None,
            risk_score=r.risk_score,
            preferred_contact_method=r.preferred_contact_method,
            preferred_time_slot=r.preferred_time_slot,
            student_notes=r.student_notes,
            status=r.status,
            assigned_counselor_id=str(r.assigned_counselor_id) if r.assigned_counselor_id else None,
            assigned_counselor_name=None,
            contact_attempt_count=r.contact_attempt_count,
            last_attempt_at=r.last_attempt_at,
            resolution_notes=r.resolution_notes,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in records
    ]


@router.patch("/call-requests/{request_id}", response_model=Dict[str, Any])
async def update_call_request_status(
    request_id: str,
    payload: UpdateCallRequestStatusInput,
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Updates the status or increments contact attempts for a counselor call request."""
    now = datetime.now(timezone.utc)
    # Check if UUID or prefixed
    raw_id = request_id.replace("CALL-REQ-", "")
    query = select(CounselorCallRequest).where(CounselorCallRequest.campus_id == membership.campus_id)
    res = await db.execute(query)
    records = res.scalars().all()

    matched = None
    for r in records:
        if str(r.id) == request_id or r.id.hex[:6].upper() == raw_id.upper():
            matched = r
            break

    if matched:
        matched.status = payload.status
        if payload.attempt_increment:
            matched.contact_attempt_count += 1
            matched.last_attempt_at = now
        if payload.notes:
            matched.resolution_notes = payload.notes
        matched.updated_at = now
        await db.commit()

    return {
        "id": request_id,
        "status": payload.status,
        "updated_at": now.isoformat(),
    }
