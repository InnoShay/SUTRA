"""
Synthetic Institutional Demo Intervention Catalog for SUTRA Phase 1.

CRITICAL NOTICE: This catalog contains EXCLUSIVELY SYNTHETIC, illustrative
intervention specifications designed for software testing and pipeline verification.
It does NOT represent approved institutional policy, medical recommendations,
or legal commitments.
"""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DemoCatalogEntry(BaseModel):
    """Specification of an approved synthetic demo intervention."""
    model_config = ConfigDict(extra="forbid")

    intervention_id: str = Field(..., description="Unique catalog identifier")
    title: str = Field(..., description="Short descriptive title (clearly labeled synthetic demo)")
    category: str = Field(..., description="Intervention classification")
    description: str = Field(..., description="Operational summary of support action")
    allowed_owner_roles: set[str] = Field(..., description="Roles permitted to be assigned as owners")
    target_window_days: int = Field(ge=1, le=30, description="Recommended completion timeline")
    is_synthetic_demo_entry: bool = Field(default=True, description="Strict synthetic marker")


class SyntheticDemoCatalog:
    """
    In-memory registry of approved synthetic demo interventions.

    Catalog Version: DEMO_CATALOG_V1
    """
    CATALOG_VERSION: str = "DEMO_CATALOG_V1"
    NO_SUPPORTED_INTERVENTION: str = "NO_SUPPORTED_INTERVENTION"

    # Permitted institutional roles across all demo entries
    STANDARD_ROLES: set[str] = {
        "ACADEMIC_ADVISOR",
        "MODULE_TUTOR",
        "PEER_MENTOR",
        "STUDENT_SUCCESS_COACH",
    }

    _ENTRIES: dict[str, DemoCatalogEntry] = {
        "INT-VLE-ONBOARD-01": DemoCatalogEntry(
            intervention_id="INT-VLE-ONBOARD-01",
            title="[SYNTHETIC DEMO] Digital Engagement & LMS Orientation Check-in",
            category="DIGITAL_ONBOARDING",
            description="Proactive outreach to review platform login navigation, course forum access, and study materials.",
            allowed_owner_roles={"ACADEMIC_ADVISOR", "PEER_MENTOR", "STUDENT_SUCCESS_COACH"},
            target_window_days=7,
        ),
        "INT-ACAD-TUTOR-01": DemoCatalogEntry(
            intervention_id="INT-ACAD-TUTOR-01",
            title="[SYNTHETIC DEMO] Formative Assessment & Subject Tutoring Referral",
            category="ACADEMIC_SUPPORT",
            description="Referral to module tutor or learning center for guidance on early formative tasks.",
            allowed_owner_roles={"ACADEMIC_ADVISOR", "MODULE_TUTOR"},
            target_window_days=10,
        ),
        "INT-PEER-CONNECT-01": DemoCatalogEntry(
            intervention_id="INT-PEER-CONNECT-01",
            title="[SYNTHETIC DEMO] Peer Mentorship Study Group Connection",
            category="PEER_ENGAGEMENT",
            description="Introduction to senior student peer mentor and peer study circle for module discussion.",
            allowed_owner_roles={"PEER_MENTOR", "STUDENT_SUCCESS_COACH"},
            target_window_days=14,
        ),
    }

    @classmethod
    def get_entry(cls, intervention_id: str) -> Optional[DemoCatalogEntry]:
        """Retrieve catalog entry by identifier, or None if unknown."""
        return cls._ENTRIES.get(intervention_id)

    @classmethod
    def is_valid_intervention(cls, intervention_id: str) -> bool:
        """Verify whether an intervention ID exists in the synthetic catalog or represents explicit non-intervention."""
        return intervention_id in cls._ENTRIES or intervention_id == cls.NO_SUPPORTED_INTERVENTION

    @classmethod
    def get_allowed_roles(cls, intervention_id: str) -> set[str]:
        """Return allowed executing roles for an intervention, or standard roles for non-intervention."""
        if intervention_id == cls.NO_SUPPORTED_INTERVENTION:
            return cls.STANDARD_ROLES
        entry = cls.get_entry(intervention_id)
        return entry.allowed_owner_roles if entry else set()

    @classmethod
    def list_entries(cls) -> list[DemoCatalogEntry]:
        """List all registered demo interventions."""
        return list(cls._ENTRIES.values())


class DemoCommunicationTemplate(BaseModel):
    """Specification of an approved synthetic communication template for Agent 5."""
    model_config = ConfigDict(extra="forbid")

    template_id: str = Field(..., description="Unique template identifier")
    purpose: str = Field(..., description="Intended purpose (e.g. CHECK_IN_INVITATION, RESOURCE_REFERRAL)")
    allowed_roles: set[str] = Field(..., description="Permitted stakeholder recipient roles")
    title: str = Field(..., description="Descriptive template name")
    description: str = Field(..., description="Operational summary and style guideline")
    default_subject: str = Field(..., description="Standard non-stigmatizing subject line draft")
    is_synthetic_demo_template: bool = Field(default=True, description="Synthetic demo marker")


class SyntheticCommunicationCatalog:
    """
    Catalog of approved communication templates and permitted purposes for Agent 5.

    Catalog Version: COMM_CATALOG_V1
    """
    CATALOG_VERSION: str = "COMM_CATALOG_V1"

    ALLOWED_PURPOSES: set[str] = {
        "CHECK_IN_INVITATION",
        "RESOURCE_REFERRAL",
        "TUTOR_COLLABORATION_BRIEF",
        "SUCCESS_COACH_ALIGNMENT",
    }

    PERMITTED_STAKEHOLDER_ROLES: set[str] = {
        "STUDENT",
        "ACADEMIC_ADVISOR",
        "MODULE_TUTOR",
        "STUDENT_SUCCESS_COACH",
    }

    _TEMPLATES: dict[str, DemoCommunicationTemplate] = {
        "TPL_STUDENT_SUPPORT_CHECKIN": DemoCommunicationTemplate(
            template_id="TPL_STUDENT_SUPPORT_CHECKIN",
            purpose="CHECK_IN_INVITATION",
            allowed_roles={"STUDENT"},
            title="[SYNTHETIC DEMO] Supportive Student Check-in Invitation",
            description="Warm, respectful invitation offering an informal check-in on course navigation and study routine.",
            default_subject="Checking in: How are your studies going this week?",
        ),
        "TPL_STUDENT_RESOURCE_GUIDE": DemoCommunicationTemplate(
            template_id="TPL_STUDENT_RESOURCE_GUIDE",
            purpose="RESOURCE_REFERRAL",
            allowed_roles={"STUDENT"},
            title="[SYNTHETIC DEMO] Course Resources & Academic Skills Referral",
            description="Supportive message sharing module learning guides, tutoring hours, and academic skills resources.",
            default_subject="Helpful resources for your course module",
        ),
        "TPL_TUTOR_ACADEMIC_BRIEF": DemoCommunicationTemplate(
            template_id="TPL_TUTOR_ACADEMIC_BRIEF",
            purpose="TUTOR_COLLABORATION_BRIEF",
            allowed_roles={"MODULE_TUTOR"},
            title="[SYNTHETIC DEMO] Module Tutor Formative Support Brief",
            description="Professional coordination brief requesting tutor check-in or formative feedback review.",
            default_subject="Advisor Coordination: Formative check-in support request",
        ),
        "TPL_COACH_COORDINATION_NOTE": DemoCommunicationTemplate(
            template_id="TPL_COACH_COORDINATION_NOTE",
            purpose="SUCCESS_COACH_ALIGNMENT",
            allowed_roles={"STUDENT_SUCCESS_COACH"},
            title="[SYNTHETIC DEMO] Success Coach & Peer Connection Note",
            description="Internal coordination note to arrange student onboarding session with peer mentor or study group.",
            default_subject="Success Coach Coordination: Study group and peer connection",
        ),
    }

    @classmethod
    def get_template(cls, template_id: str) -> Optional[DemoCommunicationTemplate]:
        """Retrieve communication template by ID, or None if unknown."""
        return cls._TEMPLATES.get(template_id)

    @classmethod
    def is_valid_template(cls, template_id: str) -> bool:
        """Check if template exists in catalog."""
        return template_id in cls._TEMPLATES

    @classmethod
    def is_allowed_purpose(cls, purpose: str) -> bool:
        """Check if purpose is an allowed communication purpose."""
        return purpose in cls.ALLOWED_PURPOSES

    @classmethod
    def get_allowed_roles_for_template(cls, template_id: str) -> set[str]:
        """Return allowed roles for template."""
        tpl = cls.get_template(template_id)
        return tpl.allowed_roles if tpl else set()

    @classmethod
    def list_templates(cls) -> list[DemoCommunicationTemplate]:
        """List all approved templates."""
        return list(cls._TEMPLATES.values())

