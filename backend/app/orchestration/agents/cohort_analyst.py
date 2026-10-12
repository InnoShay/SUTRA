"""
Agent 7: Cohort Learning Analyst Implementation (Phase 6).

Produces privacy-grounded aggregate-level narrative explaining trusted,
precomputed statistics across student support cases.
Under NO circumstances does Agent 7 process individual student PII or claim causal efficacy.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Optional
import uuid

from backend.app.orchestration.agents.prompts import (
    COHORT_LEARNING_ANALYST_SYSTEM_PROMPT_V1,
    COHORT_LEARNING_ANALYST_VERSION,
)
from backend.app.orchestration.contracts import (
    CohortAggregatePacket,
    CohortInsightReport,
)
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderResponse,
)

logger = logging.getLogger("sutra.orchestration.agents.cohort_analyst")


class CohortLearningAnalyst:
    """
    SUTRA Agent 7: Cohort Learning Analyst.

    Synthesizes trusted, precomputed aggregate cohort statistics into an executive
    narrative with strict provenance citation and non-causal boundaries.
    """

    AGENT_NAME: str = "Cohort Learning Analyst"
    VERSION: str = COHORT_LEARNING_ANALYST_VERSION

    def __init__(self, provider: Optional[LLMProviderProtocol] = None):
        from backend.app.orchestration.provider import MockLLMClient
        self.provider: LLMProviderProtocol = provider or MockLLMClient()
        self.version: str = self.VERSION
        self.provider_name: str = getattr(self.provider, "name", "MOCK")

    @classmethod
    def build_prompt(cls, packet: CohortAggregatePacket) -> str:
        """
        Construct structured user prompt providing ONLY precomputed aggregate metrics.
        Guaranteed to contain zero student-level records, PII, or raw telemetry.
        """
        lines = [
            f"COHORT AGGREGATE SNAPSHOT (Snapshot ID: {packet.snapshot_id}):",
            f"- Campus Scope: {packet.campus_id}",
            f"- Aggregation Timestamp: {packet.aggregation_timestamp}",
            f"- Total Cases Analyzed: {packet.total_cases_analyzed}",
            f"- Grouping Dimension: {packet.grouping_dimension}",
            f"- Minimum Subgroup Privacy Threshold: N={packet.min_cohort_threshold}",
            f"- Outcome Observation Summary: {packet.outcome_coverage_summary}",
            "",
            "PRECOMPUTED AGGREGATE METRICS:",
        ]

        for m in packet.metrics:
            val_str = f"{m.value:.1f}%" if m.unit == "percentage" else f"{m.value:.0f}"
            supp_str = " [SUPPRESSED UNDER PRIVACY THRESHOLD]" if m.is_suppressed else ""
            notes_str = f" ({m.notes})" if m.notes else ""
            lines.append(f"  * [{m.metric_id}] {m.name}: {val_str}{supp_str}{notes_str}")

        if packet.data_quality_limitations:
            lines.append("\nDATA QUALITY & PRIVACY LIMITATIONS:")
            for lim in packet.data_quality_limitations:
                lines.append(f"  * {lim}")

        lines.extend([
            "",
            "INSTRUCTIONS:",
            "1. Synthesize these aggregate figures into a high-level educational narrative.",
            "2. Cite the metric ID in brackets for every statement containing numbers (e.g., [M_CASE_COUNT_TOTAL]).",
            "3. Do NOT make causal claims (e.g. do not say outreach caused higher grades).",
            "4. Differentiate task completion from student achievement.",
            "5. State limitations clearly if outcome data is latency-delayed or unobserved.",
        ])

        return "\n".join(lines)

    def analyze(
        self,
        packet: CohortAggregatePacket,
        timeout_sec: float = 6.0,
    ) -> CohortInsightReport:
        """Execute Agent 7 analysis on precomputed cohort aggregate metrics."""
        return self._execute_analysis(packet=packet, provider=self.provider, timeout_sec=timeout_sec)

    @classmethod
    def _execute_analysis(
        cls,
        packet: CohortAggregatePacket,
        provider: LLMProviderProtocol,
        timeout_sec: float = 6.0,
    ) -> CohortInsightReport:
        prompt = cls.build_prompt(packet)

        response: ProviderResponse[CohortInsightReport] = provider.generate_structured(
            prompt=prompt,
            response_model=CohortInsightReport,
            timeout_sec=timeout_sec,
            system_prompt=COHORT_LEARNING_ANALYST_SYSTEM_PROMPT_V1,
        )

        if response.result is None:
            raise ProviderFatalError("Provider returned empty result for CohortInsightReport")

        report = response.result
        # Normalize authoritative snapshot and metadata linkage
        report.snapshot_id = packet.snapshot_id
        report.campus_id = packet.campus_id
        report.is_synthetic = packet.is_synthetic
        report.human_review_status = "DRAFT_AWAITING_REVIEW"
        report.agent_version = cls.VERSION
        report.provider_mode = response.provider_name

        return report
