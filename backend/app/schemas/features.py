"""
Pydantic v2 schemas for the SUTRA 25-feature input contract.

Defines the exact observable Day-30 feature set expected by the trained
Regularized Logistic Regression pipeline. Forbids extraneous fields (such
as target outcomes or post-Day-30 leakage).
"""

from enum import Enum
import math
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class GenderEnum(str, Enum):
    F = "F"
    M = "M"


class RegionEnum(str, Enum):
    EAST_ANGLIAN = "East Anglian Region"
    EAST_MIDLANDS = "East Midlands Region"
    IRELAND = "Ireland"
    LONDON = "London Region"
    NORTH = "North Region"
    NORTH_WESTERN = "North Western Region"
    SCOTLAND = "Scotland"
    SOUTH_EAST = "South East Region"
    SOUTH = "South Region"
    SOUTH_WEST = "South West Region"
    WALES = "Wales"
    WEST_MIDLANDS = "West Midlands Region"
    YORKSHIRE = "Yorkshire Region"


class HighestEducationEnum(str, Enum):
    A_LEVEL = "A Level or Equivalent"
    HE_QUAL = "HE Qualification"
    LOWER_THAN_A_LEVEL = "Lower Than A Level"
    NO_FORMAL = "No Formal quals"
    POST_GRAD = "Post Graduate Qualification"


class ImdBandEnum(str, Enum):
    BAND_0_10 = "0-10%"
    BAND_10_20 = "10-20"
    BAND_20_30 = "20-30%"
    BAND_30_40 = "30-40%"
    BAND_40_50 = "40-50%"
    BAND_50_60 = "50-60%"
    BAND_60_70 = "60-70%"
    BAND_70_80 = "70-80%"
    BAND_80_90 = "80-90%"
    BAND_90_100 = "90-100%"
    UNKNOWN = "Unknown"


class AgeBandEnum(str, Enum):
    BAND_0_35 = "0-35"
    BAND_35_55 = "35-55"
    BAND_55_PLUS = "55<="


class DisabilityEnum(str, Enum):
    N = "N"
    Y = "Y"


NUMERICAL_FEATURE_KEYS = [
    "num_of_prev_attempts",
    "studied_credits",
    "days_registered_before_start",
    "has_missing_registration_date",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_precourse",
    "vle_clicks_poststart_d30",
    "vle_clicks_last_7d",
    "vle_days_since_last_click",
    "vle_clicks_forumng_d30",
    "vle_clicks_oucontent_d30",
    "vle_clicks_quiz_d30",
    "vle_clicks_homepage_d30",
    "vle_clicks_other_d30",
    "has_vle_activity_d30",
    "assessments_submitted_d30",
    "assessment_banked_d30",
    "has_early_assessment_submission_d30",
]


class StudentFeatureInput(BaseModel):
    """
    Exact 25-feature input contract observable on or before Day 30.

    Rejects missing required fields, non-finite values (NaN/Inf),
    unknown categoricals, and unpermitted extraneous attributes.
    """
    model_config = ConfigDict(extra="forbid")

    # --- 19 Numerical Features ---
    num_of_prev_attempts: int = Field(
        ..., ge=0, description="Count of previous enrollments in this module"
    )
    studied_credits: int = Field(
        ..., ge=0, description="Total academic credits currently registered"
    )
    days_registered_before_start: float = Field(
        ..., description="Registration lead time in days relative to course start (negative = prior to day 0)"
    )
    has_missing_registration_date: int = Field(
        ..., ge=0, le=1, description="Binary flag: 1 if registration timestamp was missing in system records, 0 otherwise"
    )
    vle_total_clicks_d30: float = Field(
        ..., ge=0.0, description="Cumulative virtual learning environment clicks up to Day 30"
    )
    vle_active_days_d30: float = Field(
        ..., ge=0.0, description="Number of distinct calendar days with logged activity up to Day 30"
    )
    vle_clicks_precourse: float = Field(
        ..., ge=0.0, description="Pre-course orientation clicks recorded prior to Day 0 (date < 0)"
    )
    vle_clicks_poststart_d30: float = Field(
        ..., ge=0.0, description="Post-start course engagement clicks from Day 0 through Day 30"
    )
    vle_clicks_last_7d: float = Field(
        ..., ge=0.0, description="Recent study engagement velocity: clicks in the 7 days prior to Day 30"
    )
    vle_days_since_last_click: float = Field(
        ..., ge=0.0, description="Elapsed days since most recent platform access as of Day 30 cutoff"
    )
    vle_clicks_forumng_d30: float = Field(
        ..., ge=0.0, description="Clicks on discussion forum resources up to Day 30"
    )
    vle_clicks_oucontent_d30: float = Field(
        ..., ge=0.0, description="Clicks on core learning content up to Day 30"
    )
    vle_clicks_quiz_d30: float = Field(
        ..., ge=0.0, description="Clicks on practice/formative quiz activities up to Day 30"
    )
    vle_clicks_homepage_d30: float = Field(
        ..., ge=0.0, description="Clicks on module homepage up to Day 30"
    )
    vle_clicks_other_d30: float = Field(
        ..., ge=0.0, description="Clicks on supplementary resource types up to Day 30"
    )
    has_vle_activity_d30: int = Field(
        ..., ge=0, le=1, description="Binary flag: 1 if student had any recorded VLE clicks by Day 30, 0 otherwise"
    )
    assessments_submitted_d30: float = Field(
        ..., ge=0.0, description="Count of assessment submissions made on or before Day 30 (marks excluded)"
    )
    assessment_banked_d30: float = Field(
        ..., ge=0.0, description="Count of transferred/banked prior assessment submissions"
    )
    has_early_assessment_submission_d30: int = Field(
        ..., ge=0, le=1, description="Binary flag: 1 if at least one submission occurred by Day 30, 0 otherwise"
    )

    # --- 6 Categorical Features ---
    gender: GenderEnum = Field(..., description="Demographic gender code ('M' or 'F')")
    region: RegionEnum = Field(..., description="Geographic administrative region")
    highest_education: HighestEducationEnum = Field(..., description="Highest prior formal education qualification")
    imd_band: ImdBandEnum = Field(..., description="Index of Multiple Deprivation decile band")
    age_band: AgeBandEnum = Field(..., description="Student age category ('0-35', '35-55', '55<=')")
    disability: DisabilityEnum = Field(..., description="Declared disability accommodation status ('N' or 'Y')")

    # --- Optional Non-Feature Context ---
    record_id: Optional[str] = Field(
        default=None,
        description="Optional de-identified record identifier (e.g. 'ANON-REC-001')"
    )
    code_module: Optional[str] = Field(
        default="UNKNOWN",
        description="Optional course module code (e.g. 'BBB')"
    )
    code_presentation: Optional[str] = Field(
        default="UNKNOWN",
        description="Optional academic presentation (e.g. '2014J')"
    )

    @field_validator(
        "num_of_prev_attempts",
        "studied_credits",
        "days_registered_before_start",
        "has_missing_registration_date",
        "vle_total_clicks_d30",
        "vle_active_days_d30",
        "vle_clicks_precourse",
        "vle_clicks_poststart_d30",
        "vle_clicks_last_7d",
        "vle_days_since_last_click",
        "vle_clicks_forumng_d30",
        "vle_clicks_oucontent_d30",
        "vle_clicks_quiz_d30",
        "vle_clicks_homepage_d30",
        "vle_clicks_other_d30",
        "has_vle_activity_d30",
        "assessments_submitted_d30",
        "assessment_banked_d30",
        "has_early_assessment_submission_d30",
        mode="after"
    )
    @classmethod
    def validate_finite_number(cls, v: float | int) -> float | int:
        """Reject non-finite numbers (NaN, Inf, -Inf)."""
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            raise ValueError("Numeric feature values must be finite (cannot be NaN or Inf)")
        return v

    def to_feature_dict(self) -> dict[str, any]:
        """Extract raw feature dictionary for pipeline scoring."""
        d = self.model_dump()
        # Exclude metadata fields
        d.pop("record_id", None)
        d.pop("code_module", None)
        d.pop("code_presentation", None)
        # Convert enums to raw string values
        for cat_col in ["gender", "region", "highest_education", "imd_band", "age_band", "disability"]:
            if isinstance(d[cat_col], Enum):
                d[cat_col] = d[cat_col].value
        return d
