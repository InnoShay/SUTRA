import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CounselorProfile(Base):
    __tablename__ = "counselor_profiles"
    __table_args__ = (
        UniqueConstraint("campus_id", "user_id", name="uq_counselor_campus_user"),
        Index("idx_counselor_status", "campus_id", "onboarding_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    campus_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    designation: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)
    specializations: Mapped[List[str]] = mapped_column(JSON, default=list)
    qualification: Mapped[str] = mapped_column(String, nullable=False)
    certifications: Mapped[List[str]] = mapped_column(JSON, default=list)
    registration_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    credentials_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    contact_methods: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["phone"])
    availability_schedule: Mapped[str] = mapped_column(
        String, default="Mon - Fri, 09:30 AM - 05:30 PM"
    )
    availability_status: Mapped[str] = mapped_column(String, default="available")
    preferred_notification: Mapped[str] = mapped_column(String, default="email_and_sms")
    assigned_cohorts: Mapped[List[str]] = mapped_column(JSON, default=list)
    onboarding_status: Mapped[str] = mapped_column(String, default="PENDING_VERIFICATION")
    rejection_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class AuthorityContact(Base):
    __tablename__ = "authority_contacts"
    __table_args__ = (
        Index("idx_authority_campus_cat", "campus_id", "escalation_category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    campus_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    service_name: Mapped[str] = mapped_column(String, nullable=False)
    contact_name: Mapped[str] = mapped_column(String, nullable=False)
    designation: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)
    escalation_category: Mapped[str] = mapped_column(String, nullable=False)
    contact_number: Mapped[str] = mapped_column(String, nullable=False)
    contact_email: Mapped[str] = mapped_column(String, nullable=False)
    communication_method: Mapped[str] = mapped_column(String, default="phone")
    availability: Mapped[str] = mapped_column(String, default="Standard Working Hours")
    verified: Mapped[bool] = mapped_column(Boolean, default=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CaseEscalationRecord(Base):
    __tablename__ = "case_escalations"
    __table_args__ = (
        Index("idx_escalation_campus", "campus_id", "status"),
        Index("idx_escalation_case", "case_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    campus_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    authority_contact_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    escalation_category: Mapped[str] = mapped_column(String, nullable=False)
    initiated_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    communication_method: Mapped[str] = mapped_column(String, default="phone")
    status: Mapped[str] = mapped_column(String, default="initiated")
    follow_up_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CounselorCallRequest(Base):
    __tablename__ = "counselor_call_requests"
    __table_args__ = (
        Index("idx_call_req_campus_status", "campus_id", "status"),
        Index("idx_call_req_student", "student_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    campus_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    signal_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    risk_score: Mapped[float] = mapped_column(nullable=False, default=0.5)
    preferred_contact_method: Mapped[str] = mapped_column(String, default="phone")
    preferred_time_slot: Mapped[str] = mapped_column(String, default="flexible")
    student_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="requested")
    assigned_counselor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    contact_attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    last_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
