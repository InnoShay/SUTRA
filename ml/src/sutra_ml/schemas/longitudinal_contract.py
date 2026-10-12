"""
SUTRA Longitudinal Data Contract Schemas.

Defines Pydantic v2 data models for longitudinal student success data contracts,
point-in-time snapshot validation, and dataset readiness reporting.

ETHICAL SAFEGUARD:
Excludes fee status and unstructured faculty text from predictive feature sets.
Requires strict temporal censoring at snapshot cutoff date.
"""

from datetime import date, datetime
from enum import Enum
import math
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CutoffMilestone(str, Enum):
    """Standardized prediction milestones in an academic semester."""
    DAY_30 = "DAY_30"       # Early-Warning Milestone (End of Month 1)
    DAY_60 = "DAY_60"       # Midterm Progress Milestone (End of Month 2)


class AcademicOutcomeLabel(int, Enum):
    """Binary official academic outcome at course conclusion."""
    ON_TRACK_PASS = 0       # Pass or Distinction (Credit Earned)
    AT_RISK_FAIL = 1        # Fail or Official Withdrawal (Credit Not Earned)


class SensitivityLevel(str, Enum):
    """Institutional data governance classification."""
    PUBLIC = "PUBLIC"
    INTERNAL_EDUCATIONAL = "INTERNAL_EDUCATIONAL"
    RESTRICTED_CONFIDENTIAL = "RESTRICTED_CONFIDENTIAL"


# =========================================================================
# Longitudinal Snapshot Feature Model
# =========================================================================

class LongitudinalSnapshotRow(BaseModel):
    """
    Standardized, point-in-time censored observation row for longitudinal training.
    Represents features available strictly on or before snapshot cutoff date.
    """
    model_config = ConfigDict(extra="forbid")

    # Entity Primary Keys
    student_id_hash: str = Field(..., description="Pseudonymized student identifier hash")
    course_id: str = Field(..., description="Course / Module catalog code, e.g. CS101")
    term_id: str = Field(..., description="Academic term / semester, e.g. 2026-FALL")
    cutoff_milestone: CutoffMilestone = Field(..., description="Prediction landmark: DAY_30 or DAY_60")
    cutoff_date: str = Field(..., description="ISO 8601 date of snapshot cutoff: YYYY-MM-DD")

    # Domain 1: Academic Progress Features (Observed <= cutoff_date)
    prior_cumulative_gpa: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    term_credits_attempted: int = Field(..., ge=1, le=40)
    assessments_due_to_cutoff: int = Field(..., ge=0)
    assessments_submitted_to_cutoff: int = Field(..., ge=0)
    weighted_coursework_score_to_cutoff: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    failed_assessments_to_cutoff: int = Field(default=0, ge=0)
    days_registered_before_start: int = Field(default=0)

    # Domain 2: LMS Digital Engagement Features (Observed <= cutoff_date)
    lms_total_clicks_to_cutoff: int = Field(..., ge=0)
    lms_active_days_to_cutoff: int = Field(..., ge=0)
    lms_days_since_last_interaction: int = Field(..., ge=0)
    lms_forum_posts_to_cutoff: int = Field(default=0, ge=0)
    lms_resource_views_to_cutoff: int = Field(default=0, ge=0)
    lms_recent_7d_clicks: int = Field(default=0, ge=0)

    # Domain 3: Classroom / Lab Attendance (Optional / Conditional)
    attendance_pct_to_cutoff: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    consecutive_absences_at_cutoff: Optional[int] = Field(default=None, ge=0)
    recent_14d_attendance_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0)

    # Demographic Context (Pre-Course Fixed)
    highest_education_level: Optional[str] = Field(default=None)
    age_band: Optional[str] = Field(default=None)
    socioeconomic_band: Optional[str] = Field(default=None)

    # Target Label (Observed strictly after cutoff_date at semester end)
    target_academic_risk: AcademicOutcomeLabel = Field(
        ...,
        description="Official ground truth outcome: 1=Fail/Withdraw, 0=Pass"
    )

    # Provenance and Ingestion Metadata
    source_event_max_timestamp: str = Field(
        ...,
        description="Latest event timestamp in the feature payload (Must be <= cutoff_date)"
    )
    system_ingest_timestamp: str = Field(
        ...,
        description="Timestamp when SUTRA received this row (ISO UTC)"
    )
    is_outcome_mature: bool = Field(
        default=True,
        description="True if course semester has fully concluded with final registrar grades"
    )

    @field_validator("student_id_hash")
    @classmethod
    def validate_hash_format(cls, v: str) -> str:
        if not v or len(v.strip()) < 8:
            raise ValueError("student_id_hash must be a pseudonymized identifier of at least 8 characters.")
        return v.strip()


# =========================================================================
# Dataset Readiness Scorecard Model
# =========================================================================

class DatasetReadinessScorecard(BaseModel):
    """
    Quantitative scorecard assessing historical dataset adequacy for training.
    """
    model_config = ConfigDict(extra="forbid")

    total_records: int
    unique_students: int
    unique_courses: int
    terms_covered: List[str]
    term_count: int
    
    positive_outcome_count: int     # Count of at-risk outcomes (Fail/Withdraw)
    negative_outcome_count: int     # Count of on-track outcomes (Pass)
    outcome_prevalence_pct: float   # % at-risk
    
    day_30_record_count: int
    day_60_record_count: int
    
    academic_coverage_pct: float
    lms_coverage_pct: float
    attendance_coverage_pct: float
    outcome_maturity_pct: float
    
    has_leakage_fields: bool
    leakage_fields_detected: List[str]
    has_point_in_time_violations: bool
    point_in_time_violation_count: int
    
    governance_approved: bool = Field(
        default=False,
        description="Whether a formal DUA and ethics approval has been certified"
    )
    overall_readiness_verdict: str  # e.g. "READY_FOR_TRAINING", "NEEDS_REMEDIATION", "REJECTED"
    remediation_notes: List[str] = Field(default_factory=list)
