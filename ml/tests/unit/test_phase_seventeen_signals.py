"""
Unit tests for SUTRA Phase Seventeen — Multisource Synthetic Student Data & Risk Signal Engine.

Verifies:
1. Workstream A & B:
   - Deterministic generation with fixed seed.
   - Pydantic v2 schema compliance across all 6 domains.
   - Synthetic provenance markers (is_synthetic=True, SYNTH- prefix).
   - Validation failure on invalid inputs (negative percentages, > 100%).
2. Workstream C:
   - Reproducibility of signal calculations.
   - Accurate evidence citation in generated signals.
   - Strictly supportive, non-punitive recommendations across all rules.
   - Confidentiality isolation for financial aid signals.
   - Conflicting cross-domain indicators trigger mandatory human review.
3. Workstream D:
   - Architectural isolation between OULAD ML baseline and multisource rules.
   - Prototype composite score labeled as heuristic, not ML probability.
4. Safeguards:
   - Production Logistic Regression v1.0.0 artifact hash immutability.
   - Candidate execution gate in shadow mode remains closed.
"""

import hashlib
import json
from pathlib import Path
import pytest
from pydantic import ValidationError

from backend.app.core.config import DEFAULT_MODEL_PATH
from sutra_ml.data.multisource_generator import MultisourceDataGenerator
from sutra_ml.evaluation.shadow_mode import ShadowModeEvaluator
from sutra_ml.schemas.multisource import (
    AcademicPerformanceMetrics,
    AcademicStanding,
    AssignedRole,
    AttendanceMetrics,
    AttendanceTrend,
    FeePaymentStatus,
    FeeStatusMetrics,
    LmsParticipationMetrics,
    PlacementTier,
    SignalCategory,
    SignalSeverity,
    SkillsAndPlacementMetrics,
    StudentSuccess360Profile,
)
from sutra_ml.signals.integration_boundary import (
    MultisourceOrchestrator,
    compute_prototype_composite_score,
)
from sutra_ml.signals.risk_signal_engine import RiskSignalEngine

EXPECTED_PRODUCTION_SHA256 = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"


@pytest.fixture
def generator() -> MultisourceDataGenerator:
    return MultisourceDataGenerator(seed=42)


@pytest.fixture
def signal_engine() -> RiskSignalEngine:
    return RiskSignalEngine()


@pytest.fixture
def orchestrator() -> MultisourceOrchestrator:
    return MultisourceOrchestrator()


# =========================================================================
# Workstream A & B: Schema & Generator Determinism Tests
# =========================================================================

def test_deterministic_multisource_generation():
    """Identical seed produces identical 360 student profiles."""
    gen1 = MultisourceDataGenerator(seed=123)
    gen2 = MultisourceDataGenerator(seed=123)
    batch1 = gen1.generate_batch(10)
    batch2 = gen2.generate_batch(10)

    assert [p.model_dump() for p in batch1] == [p.model_dump() for p in batch2]

    gen3 = MultisourceDataGenerator(seed=999)
    batch3 = gen3.generate_batch(10)
    assert [p.model_dump() for p in batch1] != [p.model_dump() for p in batch3]


def test_synthetic_provenance_markers(generator: MultisourceDataGenerator):
    """Every generated profile carries explicit synthetic markers and key prefix."""
    profiles = generator.generate_batch(20)
    for p in profiles:
        assert p.is_synthetic is True
        assert p.student_key.startswith("SYNTH-")
        assert p.synthetic_seed == 42


def test_schema_rejection_of_invalid_values():
    """Validates that out-of-bounds metrics raise ValidationError fail-closed."""
    # Negative attendance
    with pytest.raises(ValidationError):
        AttendanceMetrics(
            overall_attendance_pct=-5.0,
            recent_attendance_pct=50.0,
            consecutive_absences=0,
            lecture_attendance_pct=50.0,
            lab_attendance_pct=50.0,
            attendance_trend=AttendanceTrend.STABLE,
        )

    # Attendance > 100%
    with pytest.raises(ValidationError):
        AttendanceMetrics(
            overall_attendance_pct=105.0,
            recent_attendance_pct=50.0,
            consecutive_absences=0,
            lecture_attendance_pct=50.0,
            lab_attendance_pct=50.0,
            attendance_trend=AttendanceTrend.STABLE,
        )

    # Non-SYNTH student key
    with pytest.raises(ValidationError):
        StudentSuccess360Profile(
            student_key="REAL_STUDENT_123",  # Must begin with SYNTH-
            academic_term="2026-FALL",
            department="CS",
            program_year=2,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            attendance=AttendanceMetrics(
                overall_attendance_pct=90.0,
                recent_attendance_pct=90.0,
                consecutive_absences=0,
                lecture_attendance_pct=90.0,
                lab_attendance_pct=90.0,
                attendance_trend=AttendanceTrend.STABLE,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=3.5,
                current_term_average_pct=80.0,
                assessments_completed=2,
                assessments_due=2,
                assessments_overdue=0,
                failed_assessments_count=0,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=20,
                active_learning_days_d30=15,
                days_since_last_lms_login=1,
                discussion_forum_posts=2,
                content_resource_views=50,
                weekly_study_velocity_hours=5.0,
                assignment_submission_rate_pct=100.0,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=75.0,
                soft_skills_rating=4.0,
                resume_reviewed=True,
                mock_interview_completed=True,
                placement_readiness_tier=PlacementTier.READY,
            ),
        )


# =========================================================================
# Workstream C: Risk Signal Engine Logic & Evidence Alignment
# =========================================================================

def test_attendance_anomaly_signals(generator: MultisourceDataGenerator, signal_engine: RiskSignalEngine):
    """Verifies that ATTENDANCE_ANOMALY triggers attendance signals and conflicting indicators."""
    scenarios = generator.generate_named_scenarios()
    profile = scenarios["ATTENDANCE_ANOMALY_STRONG_ACADEMIC"]
    res = signal_engine.evaluate_profile(profile)

    cat_list = [s.category for s in res.signals]
    assert SignalCategory.ATTENDANCE in cat_list
    assert SignalCategory.CONFLICTING_INDICATORS in cat_list

    # Evidence check
    conflict_sig = next(s for s in res.signals if s.category == SignalCategory.CONFLICTING_INDICATORS)
    assert conflict_sig.evidence["recent_attendance_pct"] == 42.0
    assert conflict_sig.evidence["current_term_average_pct"] == 84.0
    assert "MANDATORY HUMAN REVIEW" in conflict_sig.recommended_action
    assert conflict_sig.assigned_role == AssignedRole.ACADEMIC_ADVISOR


def test_academic_struggle_signals(generator: MultisourceDataGenerator, signal_engine: RiskSignalEngine):
    """Verifies ACADEMIC_AND_PARTICIPATION_STRUGGLE triggers academic and inactivity alerts."""
    scenarios = generator.generate_named_scenarios()
    profile = scenarios["ACADEMIC_AND_PARTICIPATION_STRUGGLE"]
    res = signal_engine.evaluate_profile(profile)

    cat_list = [s.category for s in res.signals]
    assert SignalCategory.ACADEMIC in cat_list
    assert SignalCategory.PARTICIPATION in cat_list
    assert SignalCategory.FACULTY_FEEDBACK in cat_list

    acad_sig = next(s for s in res.signals if s.category == SignalCategory.ACADEMIC)
    assert acad_sig.evidence["failed_assessments_count"] >= 2
    assert acad_sig.severity in [SignalSeverity.HIGH, SignalSeverity.CRITICAL]


def test_financial_aid_confidential_routing(generator: MultisourceDataGenerator, signal_engine: RiskSignalEngine):
    """Confidential fee signals are strictly routed to FINANCIAL_AID_COUNSELOR."""
    scenarios = generator.generate_named_scenarios()
    profile = scenarios["FINANCIAL_SUPPORT_NEEDED"]
    res = signal_engine.evaluate_profile(profile)

    assert len(res.confidential_signals) >= 1
    fin_sig = res.confidential_signals[0]
    assert fin_sig.is_confidential is True
    assert fin_sig.assigned_role == AssignedRole.FINANCIAL_AID_COUNSELOR
    assert "bursary" in fin_sig.recommended_action.lower()
    assert "prohibit academic de-registration" in fin_sig.recommended_action.lower()


def test_conflicting_high_lms_zero_submissions(generator: MultisourceDataGenerator, signal_engine: RiskSignalEngine):
    """Detects high LMS logins paired with 0 submissions as conflicting indicator."""
    scenarios = generator.generate_named_scenarios()
    profile = scenarios["CONFLICTING_SIGNALS_HUMAN_REVIEW"]
    res = signal_engine.evaluate_profile(profile)

    conflict_signals = [s for s in res.signals if s.category == SignalCategory.CONFLICTING_INDICATORS]
    assert len(conflict_signals) >= 1
    sig = conflict_signals[0]
    assert sig.evidence["total_logins"] == 55
    assert sig.evidence["assessments_completed"] == 0
    assert "anxiety" in sig.recommended_action.lower() or "blockers" in sig.recommended_action.lower()


def test_non_punitive_mandate_across_all_signals(generator: MultisourceDataGenerator, signal_engine: RiskSignalEngine):
    """Verifies that no rule recommends punitive sanctions, expulsions, or punishments."""
    profiles = generator.generate_batch(50)
    punitive_keywords = ["punish", "disciplinary action", "expel", "terminate enrollment", "fine student", "suspension"]

    for p in profiles:
        res = signal_engine.evaluate_profile(p)
        for s in res.signals + res.confidential_signals:
            action_lower = s.recommended_action.lower()
            for bad_word in punitive_keywords:
                assert bad_word not in action_lower, f"Punitive wording '{bad_word}' found in signal {s.signal_id}!"


# =========================================================================
# Workstream D: ML Boundary Isolation & Heuristic Composite Tests
# =========================================================================

def test_ml_boundary_isolation_contract(orchestrator: MultisourceOrchestrator, generator: MultisourceDataGenerator):
    """Boundary contract confirms zero multisource feature leakage to production ML model."""
    scenarios = generator.generate_named_scenarios()
    profile = scenarios["ON_TRACK_THRIVING"]
    card = orchestrator.process_student_360(profile)

    contract = card.boundary_contract
    assert contract.ml_component_active is True
    assert contract.ml_model_version == "v1.0.0"
    assert contract.ml_decision_threshold == 0.46
    assert contract.ml_input_feature_count == 25
    assert contract.ml_has_access_to_multisource_features is False
    assert contract.future_multimodal_model_authorized is False


def test_prototype_composite_heuristic_labeling():
    """Composite score is strictly bounded in [0, 100] and carries explicit heuristic disclaimer."""
    comp = compute_prototype_composite_score(signals=[], confidential_signals=[])
    assert comp.composite_score_0_to_100 == 0.0
    assert comp.priority_level == "LOW"
    assert "HEURISTIC OPERATIONAL SCORE ONLY" in comp.disclaimer
    assert "NOT a statistical ML probability" in comp.disclaimer


# =========================================================================
# Production Model Artifact Safeguards
# =========================================================================

def test_production_artifact_unmodified():
    """Production Logistic Regression v1.0.0 hash matches canonical hash."""
    assert DEFAULT_MODEL_PATH.exists()
    hasher = hashlib.sha256()
    with open(DEFAULT_MODEL_PATH, "rb") as f:
        hasher.update(f.read())
    assert hasher.hexdigest() == EXPECTED_PRODUCTION_SHA256


def test_shadow_mode_candidate_execution_gate_remains_closed():
    """Experimental candidate execution gate remains closed by default."""
    evaluator = ShadowModeEvaluator()
    assert evaluator.candidate_provenance_verified is False
    assert evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"
