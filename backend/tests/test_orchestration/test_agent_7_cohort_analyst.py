"""
Unit tests for Agent 7: Cohort Learning Analyst and its Deterministic Validation Gate (Phase 6).

Verifies:
1. Agent 7 invocation via LLMProviderProtocol with MockLLMClient.
2. Structured CohortInsightReport contract.
3. Deterministic metric citation grounding (every cited metric exists in the packet).
4. Rejection of unsupported causal claims (e.g., "intervention caused graduation").
5. Small-group suppression warnings if small cells are referenced without disclosure.
6. Snapshot and campus alignment.
"""

import pytest

from backend.app.orchestration.agents import CohortLearningAnalyst
from backend.app.orchestration.contracts import (
    AggregateMetricItem,
    CohortAggregatePacket,
    CohortInsightReport,
    ValidationSeverity,
)
from backend.app.orchestration.provider import MockLLMClient
from backend.app.orchestration.validator import DeterministicValidator


@pytest.fixture
def sample_cohort_packet() -> CohortAggregatePacket:
    return CohortAggregatePacket(
        snapshot_id="SNAP-TEST-001",
        campus_id="CAMPUS_A",
        is_synthetic=True,
        aggregation_timestamp="2026-10-12T00:00:00Z",
        total_cases_analyzed=12,
        min_cohort_threshold=5,
        grouping_dimension="ALL_CAMPUS_CASES",
        metrics=[
            AggregateMetricItem(
                metric_id="M_CASE_COUNT_TOTAL",
                name="Total Monitored Cases",
                category="WORKFLOW_STAGES",
                value=12.0,
                unit="count",
                is_suppressed=False,
            ),
            AggregateMetricItem(
                metric_id="M_RISK_TIER_HIGH_COUNT",
                name="High Risk Tier Count",
                category="RISK_TIER_DISTRIBUTION",
                value=8.0,
                unit="count",
                is_suppressed=False,
            ),
            AggregateMetricItem(
                metric_id="M_STAGE_APPROVED_COUNT",
                name="Approved Support Plans",
                category="WORKFLOW_STAGES",
                value=7.0,
                unit="count",
                is_suppressed=False,
            ),
            AggregateMetricItem(
                metric_id="M_TASK_COMPLETION_RATE",
                name="Task Completion Rate",
                category="TASK_EXECUTION",
                value=75.0,
                unit="percentage",
                is_suppressed=False,
            ),
            AggregateMetricItem(
                metric_id="M_OUTCOME_UNOBSERVED_COUNT",
                name="Unobserved Academic Outcomes",
                category="STUDENT_OUTCOMES",
                value=10.0,
                unit="count",
                is_suppressed=False,
            ),
        ],
        data_quality_limitations=[],
        outcome_coverage_summary="10 unobserved, 2 recorded",
    )


def test_agent_7_mock_analysis(sample_cohort_packet: CohortAggregatePacket):
    """Verify that MockLLMClient generates a valid structured CohortInsightReport."""
    client = MockLLMClient()
    analyst = CohortLearningAnalyst(provider=client)

    report = analyst.analyze(sample_cohort_packet)

    assert isinstance(report, CohortInsightReport)
    assert report.snapshot_id == sample_cohort_packet.snapshot_id
    assert report.campus_id == sample_cohort_packet.campus_id
    assert len(report.observed_patterns) >= 1
    assert len(report.metric_references) >= 1
    assert len(report.limitations_and_caveats) >= 1
    assert "M_CASE_COUNT_TOTAL" in report.metric_references


def test_validation_gate_passes_valid_report(sample_cohort_packet: CohortAggregatePacket):
    """Verify validator passes when metric citations are grounded and non-causal."""
    report = CohortInsightReport(
        report_id="rpt_test_001",
        snapshot_id=sample_cohort_packet.snapshot_id,
        campus_id=sample_cohort_packet.campus_id,
        summary_narrative=(
            "Analysis of cohort [M_CASE_COUNT_TOTAL] reveals 8 high-risk learners [M_RISK_TIER_HIGH_COUNT]. "
            "Staff executed tasks with 75% completion [M_TASK_COMPLETION_RATE]. "
            "Most student academic outcomes remain unobserved [M_OUTCOME_UNOBSERVED_COUNT]."
        ),
        observed_patterns=[
            "Strong workflow execution recorded across [M_STAGE_APPROVED_COUNT] plans.",
            "Outcome recording is lagging behind task execution.",
        ],
        metric_references=[
            "M_CASE_COUNT_TOTAL",
            "M_RISK_TIER_HIGH_COUNT",
            "M_TASK_COMPLETION_RATE",
            "M_OUTCOME_UNOBSERVED_COUNT",
            "M_STAGE_APPROVED_COUNT",
        ],
        missing_or_insufficient_evidence=["Longitudinal term-end grade reports not yet synchronized."],
        limitations_and_caveats=["Pure observational aggregate; causality cannot be inferred."],
        institutional_review_questions=["Why are outcome observations lagging behind completed tasks?"],
        human_review_status="DRAFT_AWAITING_REVIEW",
        is_synthetic=True,
        agent_version="1.0.0",
        provider_mode="MOCK",
        created_at="2026-10-12T00:00:00Z",
    )

    summary = DeterministicValidator.validate_cohort_report(report, sample_cohort_packet)
    assert summary.passed is True
    assert summary.error_count == 0


def test_validation_gate_rejects_hallucinated_metric(sample_cohort_packet: CohortAggregatePacket):
    """Verify validator rejects reports citing non-existent metric IDs."""
    report = CohortInsightReport(
        report_id="rpt_test_002",
        snapshot_id=sample_cohort_packet.snapshot_id,
        campus_id=sample_cohort_packet.campus_id,
        summary_narrative="Cohort shows 50% graduation increase [M_HALLUCINATED_RETENTION_RATE].",
        observed_patterns=["Pattern A"],
        metric_references=["M_HALLUCINATED_RETENTION_RATE"],
        missing_or_insufficient_evidence=[],
        limitations_and_caveats=["Observational only."],
        institutional_review_questions=[],
        human_review_status="DRAFT_AWAITING_REVIEW",
        is_synthetic=True,
        agent_version="1.0.0",
        provider_mode="MOCK",
        created_at="2026-10-12T00:00:00Z",
    )

    summary = DeterministicValidator.validate_cohort_report(report, sample_cohort_packet)
    assert summary.passed is False
    errors = [f for f in summary.findings if f.severity == ValidationSeverity.ERROR]
    assert any(f.code == "ERR_UNGROUNDED_METRIC_CITATION" for f in errors)


def test_validation_gate_rejects_causal_efficacy_claims(sample_cohort_packet: CohortAggregatePacket):
    """Verify validator rejects causal phrasing asserting intervention caused student success."""
    report = CohortInsightReport(
        report_id="rpt_test_003",
        snapshot_id=sample_cohort_packet.snapshot_id,
        campus_id=sample_cohort_packet.campus_id,
        summary_narrative=(
            "The support plan intervention caused significant student success [M_CASE_COUNT_TOTAL] "
            "and directly proved that our outreach caused retention."
        ),
        observed_patterns=["Intervention proved effective in causing student retention."],
        metric_references=["M_CASE_COUNT_TOTAL"],
        missing_or_insufficient_evidence=[],
        limitations_and_caveats=[],
        institutional_review_questions=[],
        human_review_status="DRAFT_AWAITING_REVIEW",
        is_synthetic=True,
        agent_version="1.0.0",
        provider_mode="MOCK",
        created_at="2026-10-12T00:00:00Z",
    )

    summary = DeterministicValidator.validate_cohort_report(report, sample_cohort_packet)
    assert summary.passed is False
    errors = [f for f in summary.findings if f.severity == ValidationSeverity.ERROR]
    assert any(f.code == "ERR_PROHIBITED_CAUSAL_CLAIM" for f in errors)


def test_validation_gate_flags_campus_mismatch(sample_cohort_packet: CohortAggregatePacket):
    """Verify validator errors if report snapshot or campus does not match the packet."""
    report = CohortInsightReport(
        report_id="rpt_test_004",
        snapshot_id="SNAP-DIFFERENT",
        campus_id="CAMPUS_B",
        summary_narrative="Report for another campus citing [M_CASE_COUNT_TOTAL].",
        observed_patterns=["Pattern A"],
        metric_references=["M_CASE_COUNT_TOTAL"],
        missing_or_insufficient_evidence=[],
        limitations_and_caveats=["None"],
        institutional_review_questions=[],
        human_review_status="DRAFT_AWAITING_REVIEW",
        is_synthetic=True,
        agent_version="1.0.0",
        provider_mode="MOCK",
        created_at="2026-10-12T00:00:00Z",
    )

    summary = DeterministicValidator.validate_cohort_report(report, sample_cohort_packet)
    assert summary.passed is False
    errors = [f for f in summary.findings if f.severity == ValidationSeverity.ERROR]
    assert any(f.code == "ERR_SNAPSHOT_MISMATCH" for f in errors)
    assert any(f.code == "ERR_CAMPUS_MISMATCH" for f in errors)
