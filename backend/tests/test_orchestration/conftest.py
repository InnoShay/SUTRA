"""
Shared Pytest fixtures for SUTRA Phase 1 orchestration test suite.
"""

from typing import Any
import pytest

from backend.app.orchestration.contracts import EvidencePacket
from backend.app.orchestration.provider import MockLLMClient
from backend.app.orchestration.repository import InMemoryRunRepository
from backend.app.orchestration.security import SecurityContext, SecurityRole
from backend.app.schemas.features import StudentFeatureInput
from sutra_ml.schemas.evidence_card import (
    CourseContext,
    EvidenceFactor,
    GovernanceNotices,
    ModelMetadata,
    RiskTier,
    SutraEvidenceCard,
)


@pytest.fixture
def sample_feature_dict() -> dict[str, Any]:
    """Canonical 25-feature dictionary for testing."""
    return {
        "num_of_prev_attempts": 1,
        "studied_credits": 120,
        "days_registered_before_start": -5.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 14.0,
        "vle_active_days_d30": 2.0,
        "vle_clicks_precourse": 0.0,
        "vle_clicks_poststart_d30": 14.0,
        "vle_clicks_last_7d": 0.0,
        "vle_days_since_last_click": 22.0,
        "vle_clicks_forumng_d30": 0.0,
        "vle_clicks_oucontent_d30": 5.0,
        "vle_clicks_quiz_d30": 0.0,
        "vle_clicks_homepage_d30": 9.0,
        "vle_clicks_other_d30": 0.0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 0.0,
        "assessment_banked_d30": 0.0,
        "has_early_assessment_submission_d30": 0,
        "gender": "M",
        "region": "London Region",
        "highest_education": "Lower Than A Level",
        "imd_band": "10-20",
        "age_band": "0-35",
        "disability": "N",
        "record_id": "SYNTH-TEST-001",
        "code_module": "BBB",
        "code_presentation": "2014J",
    }


@pytest.fixture
def sample_student_input(sample_feature_dict: dict[str, Any]) -> StudentFeatureInput:
    """Validated StudentFeatureInput model."""
    return StudentFeatureInput(**sample_feature_dict)


@pytest.fixture
def sample_evidence_card() -> SutraEvidenceCard:
    """Synthetic SUTRA Evidence Card."""
    return SutraEvidenceCard(
        record_id="SYNTH-TEST-001",
        course_context=CourseContext(
            module_code="BBB",
            presentation_code="2014J",
            snapshot_day=30,
        ),
        risk_probability=0.9287,
        review_recommended=True,
        risk_tier=RiskTier.HIGH,
        operational_threshold=0.46,
        model_metadata=ModelMetadata(
            model_name="Regularized Logistic Regression Baseline",
            model_version="v1.0.0",
            training_cohort="Historical Open University 2013B-2014B",
        ),
        top_risk_drivers=[
            EvidenceFactor(
                factor_title="Active Learning Days on Platform",
                observed_raw_value="2.0",
                contribution_weight=0.5891,
                plain_english_summary="Recorded low platform presence (2.0 active days).",
            ),
            EvidenceFactor(
                factor_title="Days Inactive Since Last VLE Access",
                observed_raw_value="22.0",
                contribution_weight=0.5359,
                plain_english_summary="Inactive for 22.0 days since last access.",
            ),
            EvidenceFactor(
                factor_title="Index of Multiple Deprivation Band: 10-20",
                observed_raw_value="10-20",
                contribution_weight=0.2809,
                plain_english_summary="Area deprivation decile band: '10-20'.",
            ),
        ],
        top_protective_factors=[
            EvidenceFactor(
                factor_title="Declared Disability Indicator: N",
                observed_raw_value="N",
                contribution_weight=-0.1484,
                plain_english_summary="Declared disability status: 'N'.",
            ),
            EvidenceFactor(
                factor_title="Course Registration Lead Time",
                observed_raw_value="-5.0",
                contribution_weight=-0.0300,
                plain_english_summary="Enrolled -5.0 days before start.",
            ),
        ],
        governance_notices=GovernanceNotices(),
        alert_triggered=True,
    )


@pytest.fixture
def sample_evidence_packet(
    sample_student_input: StudentFeatureInput,
    sample_evidence_card: SutraEvidenceCard,
) -> EvidencePacket:
    """Full EvidencePacket for orchestration tests."""
    return EvidencePacket(
        student_input=sample_student_input,
        evidence_card=sample_evidence_card,
        campus_id="CAMPUS-MAIN",
        snapshot_day=30,
    )


@pytest.fixture
def mock_security_context() -> SecurityContext:
    """Test security context for authorized advisor."""
    return SecurityContext.create_test_context(
        actor_id="ADV-TEST-01",
        campus_id="CAMPUS-MAIN",
        role=SecurityRole.ACADEMIC_ADVISOR,
    )


@pytest.fixture
def mock_llm_client() -> MockLLMClient:
    """Deterministic offline mock LLM client."""
    return MockLLMClient()


@pytest.fixture
def in_memory_repo() -> InMemoryRunRepository:
    """Fresh in-memory repository instance."""
    return InMemoryRunRepository()
