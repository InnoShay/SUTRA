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
