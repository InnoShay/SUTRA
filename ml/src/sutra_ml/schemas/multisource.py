"""
SUTRA Multisource Student Success 360-Degree Data Contract.

Defines Pydantic v2 schemas for multisource synthetic student profiles supporting
the CODEX 3.0 PS6 Student Success and Intervention Orchestration Engine.

Includes:
- Attendance observations and trends
- Academic milestones and progress
- LMS and digital participation
- Sensitive, non-punitive fee status indicators
- Skill assessments and career placement readiness
- Structured, timestamped faculty observations
- Data quality, freshness, and synthetic provenance
"""

from datetime import date, datetime
from enum import Enum
import math
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class AttendanceTrend(str, Enum):
    STABLE = "STABLE"
    IMPROVING = "IMPROVING"
    DECLINING = "DECLINING"
    CRITICAL_DROP = "CRITICAL_DROP"


class AcademicStanding(str, Enum):
    GOOD_STANDING = "GOOD_STANDING"
    ACADEMIC_WARNING = "ACADEMIC_WARNING"
    PROBATION = "PROBATION"
    HONORS = "HONORS"


class FeePaymentStatus(str, Enum):
    PAID = "PAID"
    GRACE_PERIOD = "GRACE_PERIOD"
    OVERDUE = "OVERDUE"
    SCHOLARSHIP_PENDING = "SCHOLARSHIP_PENDING"
    PAYMENT_PLAN_ACTIVE = "PAYMENT_PLAN_ACTIVE"
    WAIVER_APPROVED = "WAIVER_APPROVED"


class FinancialAidStatus(str, Enum):
    NONE = "NONE"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    DISBURSED = "DISBURSED"
    DENIED = "DENIED"


class PlacementTier(str, Enum):
    READY = "READY"
    DEVELOPING = "DEVELOPING"
    NEEDS_SUPPORT = "NEEDS_SUPPORT"
    NOT_STARTED = "NOT_STARTED"


class InternshipStatus(str, Enum):
    NOT_APPLIED = "NOT_APPLIED"
    APPLYING = "APPLYING"
    OFFERED = "OFFERED"
    COMPLETED = "COMPLETED"
    EXEMPT = "EXEMPT"


class FacultySentiment(str, Enum):
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    CONCERN = "CONCERN"
    URGENT_CONCERN = "URGENT_CONCERN"


class FacultyEvidenceCategory(str, Enum):
    ATTENDANCE = "ATTENDANCE"
    CONCEPTUAL_DIFFICULTY = "CONCEPTUAL_DIFFICULTY"
    ENGAGEMENT = "ENGAGEMENT"
    DEADLINE_STRUGGLE = "DEADLINE_STRUGGLE"
    OUTSTANDING_EFFORT = "OUTSTANDING_EFFORT"
    WELLBEING = "WELLBEING"


class SignalCategory(str, Enum):
    ATTENDANCE = "ATTENDANCE"
    ACADEMIC = "ACADEMIC"
    PARTICIPATION = "PARTICIPATION"
    FINANCIAL_SUPPORT = "FINANCIAL_SUPPORT"
    PLACEMENT_READINESS = "PLACEMENT_READINESS"
    FACULTY_FEEDBACK = "FACULTY_FEEDBACK"
    CONFLICTING_INDICATORS = "CONFLICTING_INDICATORS"
    DATA_QUALITY = "DATA_QUALITY"


class SignalSeverity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AssignedRole(str, Enum):
    ACADEMIC_ADVISOR = "ACADEMIC_ADVISOR"
    COURSE_INSTRUCTOR = "COURSE_INSTRUCTOR"
    FINANCIAL_AID_COUNSELOR = "FINANCIAL_AID_COUNSELOR"
    CAREER_PLACEMENT_OFFICER = "CAREER_PLACEMENT_OFFICER"
    STUDENT_SUCCESS_COORDINATOR = "STUDENT_SUCCESS_COORDINATOR"


# =========================================================================
# Domain Models
# =========================================================================

class AttendanceMetrics(BaseModel):
    """Simulated classroom and laboratory attendance observations."""
    model_config = ConfigDict(extra="forbid")

    overall_attendance_pct: float = Field(..., ge=0.0, le=100.0, description="Semester cumulative attendance rate %")
    recent_attendance_pct: float = Field(..., ge=0.0, le=100.0, description="Attendance rate over last 14 observation days %")
    consecutive_absences: int = Field(..., ge=0, description="Current run of consecutive missed sessions")
    lecture_attendance_pct: float = Field(..., ge=0.0, le=100.0, description="Lecture session attendance %")
    lab_attendance_pct: float = Field(..., ge=0.0, le=100.0, description="Laboratory session attendance %")
    attendance_trend: AttendanceTrend = Field(..., description="Short-term velocity trend")
    last_attendance_date: Optional[str] = Field(default=None, description="ISO date of last present attendance")
    source_freshness_days: int = Field(default=0, ge=0, description="Days elapsed since attendance source sync")

    @field_validator("overall_attendance_pct", "recent_attendance_pct", "lecture_attendance_pct", "lab_attendance_pct")
    @classmethod
    def validate_finite_pct(cls, v: float) -> float:
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Attendance percentages must be finite real numbers.")
        return v


class AcademicPerformanceMetrics(BaseModel):
    """Simulated coursework, quiz, and midterm academic achievements."""
    model_config = ConfigDict(extra="forbid")

    cumulative_gpa: float = Field(..., ge=0.0, le=4.0, description="Cumulative Grade Point Average (4.0 scale)")
    current_term_average_pct: float = Field(..., ge=0.0, le=100.0, description="Weighted coursework score % to date")
    assessments_completed: int = Field(..., ge=0, description="Count of submitted assessment milestones")
    assessments_due: int = Field(..., ge=0, description="Count of scheduled assessment milestones to date")
    assessments_overdue: int = Field(..., ge=0, description="Count of missed / overdue assessments")
    failed_assessments_count: int = Field(..., ge=0, description="Count of graded assessments scoring below 40%")
    recent_quiz_average_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Recent formative quiz average %")
    midterm_grade: Optional[str] = Field(default=None, description="Letter grade for midterm milestone")
    academic_standing: AcademicStanding = Field(default=AcademicStanding.GOOD_STANDING)
    source_freshness_days: int = Field(default=0, ge=0)


class LmsParticipationMetrics(BaseModel):
    """Simulated virtual learning and digital study footprint."""
    model_config = ConfigDict(extra="forbid")

    total_platform_logins_d30: int = Field(..., ge=0, description="LMS sessions initiated up to cutoff day")
    active_learning_days_d30: int = Field(..., ge=0, le=30, description="Distinct calendar days with recorded LMS activity")
    days_since_last_lms_login: int = Field(..., ge=0, description="Days elapsed since most recent LMS session")
    discussion_forum_posts: int = Field(..., ge=0, description="Forum replies and student discussion interactions")
    content_resource_views: int = Field(..., ge=0, description="Digital lecture note and reading module accesses")
    weekly_study_velocity_hours: float = Field(..., ge=0.0, description="Average study hours logged per week")
    assignment_submission_rate_pct: float = Field(..., ge=0.0, le=100.0, description="Percentage of available tasks submitted")
    source_freshness_days: int = Field(default=0, ge=0)


class FeeStatusMetrics(BaseModel):
    """
    Simulated institutional fee status.
    
    PRIVACY & ETHICS SAFEGUARD:
    Financial details are strictly bounded to high-level administrative categories.
    No monetary amounts, bank accounts, or punitive measures are exposed.
    Information is classified RESTRICTED to financial aid counselors.
    """
    model_config = ConfigDict(extra="forbid")

    status: FeePaymentStatus = Field(..., description="Administrative payment status")
    days_past_due: int = Field(..., ge=0, description="Days past institutional due date (0 if paid)")
    has_financial_hold: bool = Field(..., description="System flag indicating pending bursar registration hold")
    financial_aid_status: FinancialAidStatus = Field(default=FinancialAidStatus.NONE)
    bursary_eligibility_flag: bool = Field(default=False, description="Candidate for institutional emergency aid bursary")
    access_restriction_level: str = Field(
        default="RESTRICTED_FINANCIAL_AID_ONLY",
        description="Least-privilege classification boundary"
    )
    source_freshness_days: int = Field(default=0, ge=0)


class SkillsAndPlacementMetrics(BaseModel):
    """Simulated technical competency and career placement readiness."""
    model_config = ConfigDict(extra="forbid")

    technical_skills_score: float = Field(..., ge=0.0, le=100.0, description="Standardized technical assessment benchmark %")
    soft_skills_rating: float = Field(..., ge=1.0, le=5.0, description="Communication and teamwork peer/tutor rubric (1-5)")
    resume_reviewed: bool = Field(..., description="Whether student's resume has been certified by career office")
    mock_interview_completed: bool = Field(..., description="Whether formal mock interview was completed")
    mock_interview_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    internship_status: InternshipStatus = Field(default=InternshipStatus.NOT_APPLIED)
    placement_readiness_tier: PlacementTier = Field(..., description="Aggregated placement office readiness rating")
    certifications_earned: int = Field(default=0, ge=0)
    source_freshness_days: int = Field(default=0, ge=0)


class FacultyObservationEntry(BaseModel):
    """Structured, timestamped observational note logged by instructional staff."""
    model_config = ConfigDict(extra="forbid")

    observation_id: str = Field(..., description="Unique observation event ID, e.g. 'OBS-001'")
    timestamp: str = Field(..., description="ISO 8601 observation timestamp")
    faculty_role: str = Field(..., description="Role of observer: 'COURSE_INSTRUCTOR', 'LAB_INSTRUCTOR', etc.")
    course_code: str = Field(..., description="Academic course subject code, e.g. 'CS101'")
    sentiment: FacultySentiment = Field(..., description="Observer assessment tag")
    evidence_category: FacultyEvidenceCategory = Field(..., description="Primary behavioral focus area")
    summary_notes: str = Field(..., description="Objective, non-stigmatizing observational text")
    action_recommended_by_faculty: Optional[str] = Field(default=None)


class DataQualityStatus(BaseModel):
    """Audit metadata regarding multisource synchronization completeness."""
    model_config = ConfigDict(extra="forbid")

    is_stale: bool = Field(default=False, description="True if any critical source exceeds freshness threshold (14 days)")
    missing_sources: List[str] = Field(default_factory=list, description="List of feeder systems with missing data")
    data_completeness_pct: float = Field(default=100.0, ge=0.0, le=100.0)
    validation_passed: bool = Field(default=True)


# =========================================================================
# Unified 360 Student Profile
# =========================================================================

class StudentSuccess360Profile(BaseModel):
    """
    Comprehensive 360-degree synthetic student success profile.
    
    Integrates 6 observation domains, quality audits, and strict synthetic provenance.
    """
    model_config = ConfigDict(extra="forbid")

    # Core Profile Identity
    student_key: str = Field(..., description="Non-identifying synthetic identifier, e.g. 'SYNTH-360-001'")
    academic_term: str = Field(..., description="Academic term, e.g. '2026-FALL'")
    department: str = Field(..., description="Academic department or school")
    program_year: int = Field(..., ge=1, le=5, description="Year of study (1=Freshman, 4=Senior)")
    snapshot_timestamp: str = Field(..., description="Observation cutoff timestamp (ISO 8601)")

    # Synthetic Provenance
    is_synthetic: bool = Field(default=True, description="Mandatory synthetic flag; always True")
    synthetic_seed: Optional[int] = Field(default=None, description="RNG seed used to generate profile")
    scenario_name: Optional[str] = Field(default=None, description="Named demonstration archetype name")

    # Multisource Domains
    attendance: AttendanceMetrics
    academics: AcademicPerformanceMetrics
    participation: LmsParticipationMetrics
    fee_status: FeeStatusMetrics
    skills_placement: SkillsAndPlacementMetrics
    faculty_observations: List[FacultyObservationEntry] = Field(default_factory=list)

    # Data Quality Audit
    data_quality: DataQualityStatus = Field(default_factory=DataQualityStatus)

    # Optional OULAD Feature Mapping for Dual Demonstration
    oulad_features: Optional[dict[str, Any]] = Field(
        default=None,
        description="Optional 25-feature payload for evaluating alongside production v1.0.0 model"
    )

    @field_validator("student_key")
    @classmethod
    def validate_synthetic_key(cls, v: str) -> str:
        if not v.startswith("SYNTH-"):
            raise ValueError(f"Student key '{v}' must begin with 'SYNTH-' to guarantee synthetic identity.")
        return v
