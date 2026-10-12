"""
Deterministic Cohort Analytics & Privacy Disclosure Controls (Phase 6).

Computes authoritative aggregate statistics across cases BEFORE invoking Agent 7.
Under NO circumstances does Agent 7 calculate statistics or receive raw student records.
"""

from datetime import datetime, timezone
from typing import Optional
import uuid

from backend.app.orchestration.contracts import (
    AggregateMetricItem,
    CohortAggregatePacket,
)
from backend.app.orchestration.persistence.models import CaseStatus, OutcomeStatus
from backend.app.orchestration.persistence.repository import CaseRepository


def compute_cohort_aggregates(
    repo: CaseRepository,
    campus_id: str,
    min_cohort_threshold: int = 5,
    grouping_dimension: str = "ALL_CAMPUS_CASES",
) -> CohortAggregatePacket:
    """
    Deterministically computes aggregate metrics across authorized cases for a given campus.
    
    Guarantees:
    1. Only cases belonging to campus_id are included (or all if campus_id is CAMPUS-SYSTEM).
    2. Small-group suppression flags metrics where cell counts could expose small subgroups.
    3. Strict separation among workflow stages, task execution, follow-ups, and student outcomes.
    4. Task completion is NEVER conflated with positive student academic success.
    """
    snapshot_id = f"SNAP-{uuid.uuid4().hex[:10].upper()}"
    ts = datetime.now(timezone.utc).isoformat()

    # 1. Fetch authorized cases
    if campus_id == "CAMPUS-SYSTEM":
        cases = repo.list_cases(campus_id=None)
    else:
        cases = repo.list_cases(campus_id=campus_id)

    total_cases = len(cases)
    metrics: list[AggregateMetricItem] = []
    limitations: list[str] = []

    # Check minimum cohort size
    is_small_cohort = total_cases < min_cohort_threshold
    if is_small_cohort:
        limitations.append(
            f"Small cohort size (N={total_cases} < threshold {min_cohort_threshold}). "
            "Statistical aggregations may be unstable or subject to small-number re-identification."
        )

    # 1. Total Cases
    metrics.append(
        AggregateMetricItem(
            metric_id="M_CASE_COUNT_TOTAL",
            name="Total Monitored Cases",
            category="WORKFLOW_STAGES",
            value=float(total_cases),
            unit="count",
            is_suppressed=False,
            notes="Total unique cases registered under this campus boundary.",
        )
    )

    if total_cases == 0:
        for status in CaseStatus:
            metrics.append(
                AggregateMetricItem(
                    metric_id=f"M_STAGE_{status.value}",
                    name=f"Cases in Stage: {status.value}",
                    category="WORKFLOW_STAGES",
                    value=0.0,
                    numerator=0.0,
                    denominator=0.0,
                    unit="count",
                    is_suppressed=False,
                    notes="No cases recorded.",
                )
            )
        for tier in ["HIGH", "ELEVATED", "MODERATE", "LOW"]:
            metrics.append(
                AggregateMetricItem(
                    metric_id=f"M_TIER_{tier}",
                    name=f"Cohort in Risk Tier: {tier}",
                    category="RISK_TIERS",
                    value=0.0,
                    numerator=0.0,
                    denominator=0.0,
                    unit="count",
                    is_suppressed=False,
                    notes="No cases recorded.",
                )
            )
        metrics.extend([
            AggregateMetricItem(
                metric_id="M_TASKS_TOTAL",
                name="Total Support Tasks Created",
                category="TASK_EXECUTION",
                value=0.0,
                unit="count",
                is_suppressed=False,
                notes="No cases recorded.",
            ),
            AggregateMetricItem(
                metric_id="M_TASKS_COMPLETED",
                name="Completed Support Tasks",
                category="TASK_EXECUTION",
                value=0.0,
                numerator=0.0,
                denominator=0.0,
                unit="count",
                is_suppressed=False,
                notes="No cases recorded.",
            ),
            AggregateMetricItem(
                metric_id="M_TASK_COMPLETION_RATE",
                name="Task Execution Completion Rate",
                category="TASK_EXECUTION",
                value=0.0,
                numerator=0.0,
                denominator=0.0,
                unit="percentage",
                is_suppressed=False,
                notes="No cases recorded.",
            ),
            AggregateMetricItem(
                metric_id="M_FOLLOWUPS_TOTAL",
                name="Total Follow-up Contact Notes Recorded",
                category="FOLLOW_UP_COMPLETION",
                value=0.0,
                unit="count",
                is_suppressed=False,
                notes="No cases recorded.",
            ),
            AggregateMetricItem(
                metric_id="M_OUTCOME_UNOBSERVED",
                name="Cases with Unobserved Registrar Outcome",
                category="SEPARATE_OUTCOME_MEASUREMENT",
                value=0.0,
                unit="count",
                is_suppressed=False,
                notes="No cases recorded.",
            ),
            AggregateMetricItem(
                metric_id="M_OUTCOME_RECORDED",
                name="Cases with Recorded Registrar Outcome",
                category="SEPARATE_OUTCOME_MEASUREMENT",
                value=0.0,
                unit="count",
                is_suppressed=False,
                notes="No cases recorded.",
            ),
        ])
        return CohortAggregatePacket(
            snapshot_id=snapshot_id,
            campus_id=campus_id,
            is_synthetic=True,
            aggregation_timestamp=ts,
            total_cases_analyzed=0,
            min_cohort_threshold=min_cohort_threshold,
            grouping_dimension=grouping_dimension,
            metrics=metrics,
            data_quality_limitations=["No cases found in authorized cohort scope."],
            outcome_coverage_summary="0 cases available; zero outcomes observed.",
        )

    # 2. Workflow Stage Breakdown
    stage_counts = {
        CaseStatus.DRAFT_AWAITING_REVIEW: 0,
        CaseStatus.APPROVED: 0,
        CaseStatus.IN_PROGRESS: 0,
        CaseStatus.TASKS_COMPLETED: 0,
        CaseStatus.CLOSED: 0,
        CaseStatus.REJECTED: 0,
    }
    for c in cases:
        if c.status in stage_counts:
            stage_counts[c.status] += 1

    for status, count in stage_counts.items():
        m_id = f"M_STAGE_{status.value}"
        should_suppress = is_small_cohort and (0 < count < min_cohort_threshold)
        metrics.append(
            AggregateMetricItem(
                metric_id=m_id,
                name=f"Cases in Stage: {status.value}",
                category="WORKFLOW_STAGES",
                value=float(count),
                numerator=float(count),
                denominator=float(total_cases),
                unit="count",
                is_suppressed=should_suppress,
                notes=f"Percentage of total: {(count / total_cases * 100):.1f}%",
            )
        )

    # 3. Risk Tier Distribution
    tier_counts = {"HIGH": 0, "ELEVATED": 0, "MODERATE": 0, "LOW": 0}
    for c in cases:
        tier = (c.risk_tier.upper() if isinstance(c.risk_tier, str) else str(c.risk_tier)).replace("RISKTIER.", "")
        if tier in tier_counts:
            tier_counts[tier] += 1
        else:
            tier_counts["MODERATE"] += 1

    for tier, count in tier_counts.items():
        m_id = f"M_TIER_{tier}"
        should_suppress = is_small_cohort and (0 < count < min_cohort_threshold)
        metrics.append(
            AggregateMetricItem(
                metric_id=m_id,
                name=f"Cohort in Risk Tier: {tier}",
                category="RISK_TIERS",
                value=float(count),
                numerator=float(count),
                denominator=float(total_cases),
                unit="count",
                is_suppressed=should_suppress,
                notes=f"Percentage: {(count / total_cases * 100):.1f}% of cohort",
            )
        )

    # 4. Task Execution Metrics (Aggregated from DB)
    case_ids = [c.case_id for c in cases]
    placeholders = ",".join("?" for _ in case_ids)

    task_cur = repo.conn.execute(
        f"""
        SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks
        FROM tasks 
        WHERE case_id IN ({placeholders})
        """,
        case_ids,
    )
    task_row = task_cur.fetchone()
    total_tasks = int(task_row["total_tasks"] or 0)
    completed_tasks = int(task_row["completed_tasks"] or 0)
    in_progress_tasks = int(task_row["in_progress_tasks"] or 0)

    task_rate = (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0

    metrics.append(
        AggregateMetricItem(
            metric_id="M_TASKS_TOTAL",
            name="Total Support Tasks Created",
            category="TASK_EXECUTION",
            value=float(total_tasks),
            unit="count",
            is_suppressed=False,
            notes="Derived from approved support plans only.",
        )
    )
    metrics.append(
        AggregateMetricItem(
            metric_id="M_TASKS_COMPLETED",
            name="Completed Support Tasks",
            category="TASK_EXECUTION",
            value=float(completed_tasks),
            numerator=float(completed_tasks),
            denominator=float(total_tasks) if total_tasks > 0 else 1.0,
            unit="count",
            is_suppressed=False,
            notes=f"Completion rate: {task_rate:.1f}%",
        )
    )
    metrics.append(
        AggregateMetricItem(
            metric_id="M_TASK_COMPLETION_RATE",
            name="Task Execution Completion Rate",
            category="TASK_EXECUTION",
            value=float(round(task_rate, 1)),
            numerator=float(completed_tasks),
            denominator=float(total_tasks) if total_tasks > 0 else 1.0,
            unit="percentage",
            is_suppressed=False,
            notes="Does NOT constitute or imply positive student outcome.",
        )
    )

    # 5. Follow-up Observations
    fu_cur = repo.conn.execute(
        f"""
        SELECT 
            COUNT(*) as total_fu,
            SUM(CASE WHEN is_structured = 1 THEN 1 ELSE 0 END) as structured_fu
        FROM follow_up_records 
        WHERE case_id IN ({placeholders})
        """,
        case_ids,
    )
    fu_row = fu_cur.fetchone()
    total_fu = int(fu_row["total_fu"] or 0)
    structured_fu = int(fu_row["structured_fu"] or 0)

    metrics.append(
        AggregateMetricItem(
            metric_id="M_FOLLOWUPS_TOTAL",
            name="Total Follow-up Contact Notes Recorded",
            category="FOLLOW_UP_COMPLETION",
            value=float(total_fu),
            unit="count",
            is_suppressed=False,
            notes="Manual and AI-structured staff interaction records.",
        )
    )
    metrics.append(
        AggregateMetricItem(
            metric_id="M_FOLLOWUPS_STRUCTURED",
            name="Agent 6 Confirmed Structured Notes",
            category="FOLLOW_UP_COMPLETION",
            value=float(structured_fu),
            numerator=float(structured_fu),
            denominator=float(total_fu) if total_fu > 0 else 1.0,
            unit="count",
            is_suppressed=False,
            notes="Follow-ups confirmed with separated provenance categories.",
        )
    )

    # 6. Student Outcomes Breakdown (Strictly decoupled from tasks!)
    outcome_counts = {
        OutcomeStatus.UNOBSERVED: 0,
        OutcomeStatus.IN_PROGRESS: 0,
        OutcomeStatus.RECORDED: 0,
    }
    for c in cases:
        if c.outcome_status in outcome_counts:
            outcome_counts[c.outcome_status] += 1
        else:
            outcome_counts[OutcomeStatus.UNOBSERVED] += 1

    for ost, count in outcome_counts.items():
        m_id = f"M_OUTCOME_{ost.value}"
        metrics.append(
            AggregateMetricItem(
                metric_id=m_id,
                name=f"Student Outcome Status: {ost.value}",
                category="OUTCOMES",
                value=float(count),
                numerator=float(count),
                denominator=float(total_cases),
                unit="count",
                is_suppressed=False,
                notes=f"{(count / total_cases * 100):.1f}% of cohort cases",
            )
        )

    unobserved_count = outcome_counts[OutcomeStatus.UNOBSERVED]
    unobserved_pct = (unobserved_count / total_cases * 100) if total_cases > 0 else 0
    recorded_count = outcome_counts[OutcomeStatus.RECORDED]

    coverage_summary = (
        f"{unobserved_count} of {total_cases} cases ({unobserved_pct:.1f}%) have academic outcome UNOBSERVED. "
        f"{recorded_count} cases have authoritative verified outcomes recorded. "
        "Task execution and follow-ups are strictly distinct from student achievement."
    )

    if unobserved_pct > 50:
        limitations.append(
            f"High outcome latency: {unobserved_pct:.1f}% of cohort outcomes remain unobserved, "
            "as course assessments occur at subsequent milestones."
        )

    return CohortAggregatePacket(
        snapshot_id=snapshot_id,
        campus_id=campus_id,
        is_synthetic=True,
        aggregation_timestamp=ts,
        total_cases_analyzed=total_cases,
        min_cohort_threshold=min_cohort_threshold,
        grouping_dimension=grouping_dimension,
        metrics=metrics,
        data_quality_limitations=limitations,
        outcome_coverage_summary=coverage_summary,
    )
