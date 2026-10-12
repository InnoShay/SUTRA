"""
Least-Privilege Agent Context Filtering for SUTRA Phase 1.

Filters telemetry features before passing into qualitative AI prompts to prevent
unnecessary exposure of sensitive demographic or socioeconomic proxies.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict

from backend.app.orchestration.contracts import EvidencePacket
from sutra_ml.schemas.evidence_card import EvidenceFactor


class FilteredAgentContext(BaseModel):
    """Sanitized context payload prepared specifically for qualitative AI agents."""
    model_config = ConfigDict(extra="forbid")

    record_id: str = Field(..., description="De-identified record ID")
    module_code: str = Field(..., description="Course module code")
    presentation_code: str = Field(..., description="Semester presentation code")
    snapshot_day: int = Field(default=30, description="Cutoff day")
    operational_telemetry: dict[str, Any] = Field(
        ...,
        description="Non-sensitive observable activity metrics (clicks, velocity, submissions)"
    )
    safe_risk_drivers: list[EvidenceFactor] = Field(
        ...,
        description="Top model drivers filtered of unapproved sensitive demographic features"
    )
    safe_protective_factors: list[EvidenceFactor] = Field(
        ...,
        description="Top protective factors filtered of unapproved sensitive demographic features"
    )
    redacted_sensitive_feature_count: int = Field(
        default=0,
        ge=0,
        description="Count of sensitive features excluded from qualitative agent prompt"
    )
    requires_demographic_equity_review: bool = Field(
        default=False,
        description="Flagged if top model drivers rely on socioeconomic or demographic proxies"
    )


class AgentContextFilter:
    """
    Enforces least-privilege context boundary between raw input data and AI agents.

    Operational Allowlist: Telemetry directly capturing LMS interaction velocity
    and past attempt counts.
    Sensitive Blocklist: Demographic and socioeconomic features excluded by default.
    """

    # Operational features safe for qualitative reasoning
    ALLOWED_OPERATIONAL_FEATURES: set[str] = {
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
    }

    # Sensitive features excluded by default from AI context
    SENSITIVE_FEATURES: set[str] = {
        "gender",
        "region",
        "highest_education",
        "imd_band",
        "age_band",
        "disability",
    }

    @classmethod
    def filter_context(
        cls,
        evidence_packet: EvidencePacket,
        allow_sensitive_override: bool = False,
    ) -> FilteredAgentContext:
        """
        Produce a sanitized agent context from an authoritative EvidencePacket.

        Preserves all features in the authoritative EvidenceCard, but filters
        what is exposed to qualitative AI prompts.
        """
        all_features = evidence_packet.get_canonical_features()
        operational: dict[str, Any] = {}
        redacted_count = 0

        for key, val in all_features.items():
            if key in cls.ALLOWED_OPERATIONAL_FEATURES:
                operational[key] = val
            elif key in cls.SENSITIVE_FEATURES:
                if allow_sensitive_override:
                    operational[key] = val
                else:
                    redacted_count += 1

        # Inspect EvidenceCard drivers for sensitive demographic reliance
        safe_drivers: list[EvidenceFactor] = []
        equity_review_needed = False

        for factor in evidence_packet.evidence_card.top_risk_drivers:
            # Check if factor corresponds to a sensitive feature (using title or substrings)
            is_sensitive = any(
                sens in factor.factor_title.lower() or sens in factor.plain_english_summary.lower()
                for sens in ["disability", "deprivation", "imd", "gender", "education", "age"]
            )
            if is_sensitive:
                equity_review_needed = True
                if allow_sensitive_override:
                    safe_drivers.append(factor)
                else:
                    redacted_count += 1
            else:
                safe_drivers.append(factor)

        safe_protective: list[EvidenceFactor] = []
        for factor in evidence_packet.evidence_card.top_protective_factors:
            is_sensitive = any(
                sens in factor.factor_title.lower() or sens in factor.plain_english_summary.lower()
                for sens in ["disability", "deprivation", "imd", "gender", "education", "age"]
            )
            if is_sensitive:
                equity_review_needed = True
                if allow_sensitive_override:
                    safe_protective.append(factor)
                else:
                    redacted_count += 1
            else:
                safe_protective.append(factor)

        return FilteredAgentContext(
            record_id=evidence_packet.evidence_card.record_id,
            module_code=evidence_packet.evidence_card.course_context.module_code,
            presentation_code=evidence_packet.evidence_card.course_context.presentation_code,
            snapshot_day=evidence_packet.snapshot_day,
            operational_telemetry=operational,
            safe_risk_drivers=safe_drivers,
            safe_protective_factors=safe_protective,
            redacted_sensitive_feature_count=redacted_count,
            requires_demographic_equity_review=equity_review_needed,
        )
