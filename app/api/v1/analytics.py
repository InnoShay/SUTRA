import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import PermissionDeniedError
from app.core.security import CampusMembershipContext, get_campus_membership
from app.models.case import Case
from app.models.ml import MLInferenceLog
from app.models.signal import Signal
from app.models.student import Student
from app.schemas.analytics import (
    CaseLifecycleStateCount,
    CohortAnalyticsSummaryResponse,
    CohortBreakdownItem,
    CohortRiskTrendResponse,
    GranularRiskTiers,
    HistoricalPerformanceMonitoringResponse,
    InterventionCategoryCount,
    MultiTierTrendPoint,
    RiskDistributionDTO,
    StudentRiskTrajectoryResponse,
)
from app.schemas.ml import ModelPerformanceResponse
from app.ml.service import ml_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/model-performance", response_model=ModelPerformanceResponse)
async def get_analytics_model_performance(
    model_version: Optional[str] = Query(default="v1.0.0"),
    db: AsyncSession = Depends(get_db),
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Returns verified model performance metrics for the active or requested model version.
    Includes held-out benchmark metrics, calibration tables, subgroup parity, and live telemetry.
    """
    allowed_roles = {"leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor"}
    if not any(r in allowed_roles for r in membership.roles):
        raise PermissionDeniedError(
            message=f"User roles {membership.roles} are not authorized to access model performance analytics."
        )

    resp = ml_service.get_model_performance(model_version=model_version)
    telemetry = await ml_service.get_live_monitoring_telemetry(db=db, institution_id=membership.campus_id)
    resp.live_telemetry = telemetry
    return resp


@router.get("/risk-trends", response_model=CohortRiskTrendResponse)
async def get_analytics_risk_trends(
    cohort: Optional[str] = Query(None, description="Optional cohort code filter (e.g. CS-2026)"),
    model_version: str = Query("v1.0.0", description="Reference model version for comparability"),
    cutoff: str = Query("Day 30", description="Operational cutoff window"),
    retention_days: Optional[int] = Query(365, ge=1, le=1825, description="Retention horizon in days"),
    db: AsyncSession = Depends(get_db),
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Requirement 1-5, 7-9: Returns longitudinal cohort risk trends across historical prediction snapshots.
    Enforces distinct counting of unique students vs repeated runs, model version comparability,
    non-causal outcome disclaimers, anti-fabrication safeguards, ADR-004 small-group privacy,
    and institutional tenancy isolation.
    """
    allowed_roles = {"leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor"}
    if not any(r in allowed_roles for r in membership.roles):
        raise PermissionDeniedError(
            message=f"User roles {membership.roles} are not authorized to access cohort risk trends."
        )

    is_leadership_only = "leadership" in membership.roles and not any(
        r in ("hod", "mentor", "faculty", "institution_admin", "counsellor")
        for r in membership.roles
    )

    return await ml_service.get_cohort_risk_trends(
        db=db,
        institution_id=membership.campus_id,
        cohort_code=cohort,
        reference_model_version=model_version,
        reference_cutoff=cutoff,
        retention_days=retention_days,
        is_leadership=is_leadership_only,
    )


@router.get("/student-risk-trajectory/{student_ref}", response_model=StudentRiskTrajectoryResponse)
async def get_analytics_student_risk_trajectory(
    student_ref: str,
    retention_days: Optional[int] = Query(365, ge=1, le=1825, description="Retention horizon in days"),
    db: AsyncSession = Depends(get_db),
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Requirement 3-5, 8-9: Retrieves chronological risk trajectory for an individual student.
    Identifies model version and prediction timestamp on each score, calculates score deltas,
    and flags transitions across model architectures.
    """
    # If user is a student, ensure they can only inspect their own trajectory
    if "student" in membership.roles and not any(
        r in ("leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor")
        for r in membership.roles
    ):
        # Resolve logged-in student's own record
        from app.models.student import Student
        stu_query = select(Student).where(
            Student.institution_id == membership.campus_id,
            (Student.id == membership.user.id) | (Student.external_ref == str(membership.user.id)),
        )
        res = await db.execute(stu_query)
        own_student = res.scalars().first()
        if not own_student or (own_student.external_ref != student_ref and str(own_student.id) != student_ref):
            raise PermissionDeniedError("Students can only access their own risk trajectory history.")

    return await ml_service.get_student_risk_trajectory(
        db=db,
        institution_id=membership.campus_id,
        student_ref=student_ref,
        retention_days=retention_days,
    )


@router.get("/performance-monitoring", response_model=HistoricalPerformanceMonitoringResponse)
async def get_analytics_performance_monitoring(
    db: AsyncSession = Depends(get_db),
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Requirement 6: Separate process for evaluating predictions against ground-truth outcomes over time.
    Distinguishes fully labeled historical research holdouts from active live campus terms
    where outcome labels are pending term completion.
    """
    allowed_roles = {"leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor"}
    if not any(r in allowed_roles for r in membership.roles):
        raise PermissionDeniedError(
            message=f"User roles {membership.roles} are not authorized to access performance monitoring."
        )

    return await ml_service.get_historical_performance_monitoring(
        db=db,
        institution_id=membership.campus_id,
    )



CANONICAL_CASE_STATES = [
    "NEW",
    "TRIAGED",
    "UNDER_REVIEW",
    "ACTIONABLE",
    "ASSIGNED",
    "ACCEPTED",
    "IN_PROGRESS",
    "FOLLOW_UP_REQUIRED",
    "RESOLVED",
    "CLOSED",
]

CANONICAL_INTERVENTIONS = [
    ("academic_tutoring_offer", "Subject Tutoring Referral"),
    ("mentor_check_in", "Faculty Mentorship 1-on-1"),
    ("counselling_referral", "Student Wellbeing Referral"),
    ("fee_emergency_counselling", "Financial Aid Consultation"),
]


def _get_timeframe_cutoff(timeframe: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    tf = timeframe.lower().replace(" ", "_")
    if tf in ("this_week", "week"):
        return now - timedelta(days=7)
    elif tf in ("this_month", "month"):
        return now - timedelta(days=30)
    elif tf in ("this_term", "term", "this_year", "year"):
        return now - timedelta(days=90)
    return None  # all_time


@router.get("/cohort-summary", response_model=CohortAnalyticsSummaryResponse)
async def get_cohort_analytics_summary(
    cohort: Optional[str] = Query(None, description="Optional cohort code filter (e.g. CS-2026)"),
    timeframe: str = Query("this_month", description="Timeframe window: this_week, this_month, this_term, all_time"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated cohort indicators, risk distributions, multi-tier trends,
    and workflow status for the active campus.
    
    Access Control:
    - Authorised for leadership, faculty, advisors, hods, mentors, and administrators.
    - Strictly omits individual student PII and personal rosters.
    - Enforces k-anonymity small-group privacy protection: groups with < 5 students
      have sensitive risk counts suppressed for leadership personas.
    """
    campus_id = membership.campus_id
    cutoff_time = _get_timeframe_cutoff(timeframe)
    is_leadership_only = "leadership" in membership.roles and not any(
        r in ("hod", "mentor", "faculty", "institution_admin", "counsellor")
        for r in membership.roles
    )

    # 1. Total students in scope query
    student_query = select(Student).where(Student.institution_id == campus_id)
    if cohort:
        student_query = student_query.where(Student.cohort_code == cohort)
    student_res = await db.execute(student_query)
    all_students = student_res.scalars().all()
    total_students_in_scope = len(all_students)
    student_id_set = {s.id for s in all_students}
    student_ref_set = {s.external_ref for s in all_students}

    # 2. ML Inference logs in scope
    ml_query = select(MLInferenceLog).where(MLInferenceLog.institution_id == campus_id)
    if cutoff_time:
        ml_query = ml_query.where(MLInferenceLog.created_at >= cutoff_time)
    ml_res = await db.execute(ml_query)
    all_ml_logs = ml_res.scalars().all()

    # Filter logs strictly to students in scope
    scoped_ml_logs = [
        log for log in all_ml_logs
        if (log.student_id and log.student_id in student_id_set)
        or (log.external_student_ref in student_ref_set)
    ]
    total_prediction_runs = len(scoped_ml_logs)

    # Deduplicate: find the latest inference log per student
    latest_per_student: Dict[str, MLInferenceLog] = {}
    for log in scoped_ml_logs:
        key = str(log.student_id) if log.student_id else log.external_student_ref
        if key not in latest_per_student or log.created_at >= latest_per_student[key].created_at:
            latest_per_student[key] = log

    evaluated_students_count = len(latest_per_student)
    coverage_pct = (
        round((evaluated_students_count / total_students_in_scope) * 100, 1)
        if total_students_in_scope > 0
        else 0.0
    )

    # Compute risk counts across deduplicated unique evaluated students
    raw_at_risk = 0
    raw_on_track = 0
    low_risk = 0
    mod_risk = 0
    elev_risk = 0

    for log in latest_per_student.values():
        prob = log.risk_probability
        thresh = log.threshold or 0.46
        if prob >= thresh or log.classification == "At_Risk":
            raw_at_risk += 1
            elev_risk += 1
        else:
            raw_on_track += 1
            if prob < 0.30:
                low_risk += 1
            else:
                mod_risk += 1

    unevaluated_count = max(0, total_students_in_scope - evaluated_students_count)

    # Small-group privacy check (ADR-004)
    # If scope total < 5 and user is leadership, suppress sensitive risk breakdown
    is_suppressed = total_students_in_scope < 5 and is_leadership_only
    suppression_msg = (
        "Subgroup size < 5 (Protected under ADR-004 to prevent student re-identification)"
        if is_suppressed
        else None
    )

    if is_suppressed:
        risk_dist = RiskDistributionDTO(
            at_risk_count=None,
            at_risk_percentage=None,
            on_track_count=None,
            on_track_percentage=None,
            unevaluated_count=unevaluated_count,
            threshold=0.46,
            granular_tiers=None,
            is_privacy_suppressed=True,
            suppression_reason=suppression_msg,
        )
    else:
        at_risk_pct = (
            round((raw_at_risk / evaluated_students_count) * 100, 1)
            if evaluated_students_count > 0
            else 0.0
        )
        on_track_pct = (
            round((raw_on_track / evaluated_students_count) * 100, 1)
            if evaluated_students_count > 0
            else 0.0
        )
        risk_dist = RiskDistributionDTO(
            at_risk_count=raw_at_risk,
            at_risk_percentage=at_risk_pct,
            on_track_count=raw_on_track,
            on_track_percentage=on_track_pct,
            unevaluated_count=unevaluated_count,
            threshold=0.46,
            granular_tiers=GranularRiskTiers(
                low_risk=low_risk,
                moderate_risk=mod_risk,
                elevated_risk=elev_risk,
            ),
            is_privacy_suppressed=False,
            suppression_reason=None,
        )

    # 3. Cohort breakdown
    cohort_student_groups: Dict[str, List[Student]] = {}
    for s in all_students:
        c_code = s.cohort_code or "General Cohort"
        cohort_student_groups.setdefault(c_code, []).append(s)

    cohort_breakdown: List[CohortBreakdownItem] = []
    for c_code, c_students in sorted(cohort_student_groups.items(), key=lambda x: x[0]):
        c_total = len(c_students)
        c_student_ids = {s.id for s in c_students}
        c_eval_logs = [log for sid, log in latest_per_student.items() if any(str(s.id) == sid or s.external_ref == sid for s in c_students)]
        c_eval_count = len(c_eval_logs)
        c_at_risk = sum(1 for log in c_eval_logs if (log.risk_probability >= (log.threshold or 0.46) or log.classification == "At_Risk"))
        c_on_track = c_eval_count - c_at_risk

        # Small group suppression per cohort
        c_suppressed = c_total < 5 and is_leadership_only
        if c_suppressed:
            cohort_breakdown.append(CohortBreakdownItem(
                cohort_code=c_code,
                total_students=c_total,
                evaluated_count=c_eval_count,
                at_risk_count=None,
                at_risk_percentage=None,
                on_track_count=None,
                on_track_percentage=None,
                is_privacy_suppressed=True,
                suppression_reason="Subgroup size < 5 (Protected under ADR-004)",
            ))
        else:
            cohort_breakdown.append(CohortBreakdownItem(
                cohort_code=c_code,
                total_students=c_total,
                evaluated_count=c_eval_count,
                at_risk_count=c_at_risk,
                at_risk_percentage=round((c_at_risk / c_eval_count) * 100, 1) if c_eval_count > 0 else 0.0,
                on_track_count=c_on_track,
                on_track_percentage=round((c_on_track / c_eval_count) * 100, 1) if c_eval_count > 0 else 0.0,
                is_privacy_suppressed=False,
                suppression_reason=None,
            ))

    # 4. Multi-tier trend timeline (Prediction Runs vs Signals vs Cases vs Outcomes)
    # Fetch Signals in scope
    sig_query = select(Signal).where(Signal.institution_id == campus_id)
    if cutoff_time:
        sig_query = sig_query.where(Signal.evaluated_at >= cutoff_time)
    sig_res = await db.execute(sig_query)
    signals_in_scope = sig_res.scalars().all()

    # Fetch Cases in scope
    case_query = select(Case).where(Case.institution_id == campus_id)
    if cutoff_time:
        case_query = case_query.where(Case.created_at >= cutoff_time)
    case_res = await db.execute(case_query)
    cases_in_scope = case_res.scalars().all()

    # Bucket dates (default past 7 days)
    timeline_days = 7 if timeframe in ("this_week", "week") else 14
    now = datetime.now(timezone.utc)
    day_buckets: Dict[str, Dict[str, int]] = {}
    for i in range(timeline_days - 1, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_buckets[d] = {
            "prediction_runs": 0,
            "signals_detected": 0,
            "cases_opened": 0,
            "confirmed_outcomes": 0,
        }

    for log in scoped_ml_logs:
        d = log.created_at.strftime("%Y-%m-%d")
        if d in day_buckets:
            day_buckets[d]["prediction_runs"] += 1

    for sig in signals_in_scope:
        d = sig.evaluated_at.strftime("%Y-%m-%d")
        if d in day_buckets:
            day_buckets[d]["signals_detected"] += 1

    for c in cases_in_scope:
        d = c.created_at.strftime("%Y-%m-%d")
        if d in day_buckets:
            day_buckets[d]["cases_opened"] += 1
            if c.state in ("RESOLVED", "CLOSED"):
                day_buckets[d]["confirmed_outcomes"] += 1

    trend_timeline: List[MultiTierTrendPoint] = []
    for d, counts in sorted(day_buckets.items()):
        dt = datetime.strptime(d, "%Y-%m-%d")
        trend_timeline.append(MultiTierTrendPoint(
            date_key=d,
            label=dt.strftime("%b %d"),
            prediction_runs=counts["prediction_runs"],
            signals_detected=counts["signals_detected"],
            cases_opened=counts["cases_opened"],
            confirmed_outcomes=counts["confirmed_outcomes"],
        ))

    # 5. Case Lifecycle state distribution (Canonical 10 states)
    case_state_counts: Dict[str, int] = {st: 0 for st in CANONICAL_CASE_STATES}
    for c in cases_in_scope:
        st_norm = (c.state or "NEW").upper()
        if st_norm in case_state_counts:
            case_state_counts[st_norm] += 1
        else:
            case_state_counts["NEW"] += 1

    case_lifecycle_distribution = [
        CaseLifecycleStateCount(
            state=st,
            count=case_state_counts[st],
            is_terminal=st in ("RESOLVED", "CLOSED"),
        )
        for st in CANONICAL_CASE_STATES
    ]

    # 6. Intervention distribution (Canonical 4 interventions)
    int_counts: Dict[str, int] = {k: 0 for k, _ in CANONICAL_INTERVENTIONS}
    total_assigned_interventions = 0
    for c in cases_in_scope:
        k = c.selected_intervention_key
        if k and k in int_counts:
            int_counts[k] += 1
            total_assigned_interventions += 1

    intervention_distribution = [
        InterventionCategoryCount(
            key=k,
            label=lbl,
            count=int_counts[k],
            percentage=round((int_counts[k] / total_assigned_interventions) * 100, 1) if total_assigned_interventions > 0 else 0.0,
        )
        for k, lbl in CANONICAL_INTERVENTIONS
    ]

    # 7. Disclaimers
    disclaimers = [
        "Case counts reflect educator triage volume, not model precision.",
        "Intervention counts reflect assigned student support protocols, not verified treatment causality.",
        "Cohort risk predictions represent statistical disengagement likelihood from Day-30 OULAD features, not student capability.",
        "Small-group privacy safeguards (ADR-004) automatically mask cells with fewer than 5 students in leadership views.",
    ]

    return CohortAnalyticsSummaryResponse(
        campus_id=campus_id,
        as_of_at=datetime.now(timezone.utc),
        timeframe=timeframe,
        cohort_filter=cohort,
        total_students_in_scope=total_students_in_scope,
        evaluated_students_count=evaluated_students_count,
        total_prediction_runs=total_prediction_runs,
        coverage_percentage=coverage_pct,
        risk_distribution=risk_dist,
        cohort_breakdown=cohort_breakdown,
        trend_timeline=trend_timeline,
        case_lifecycle_distribution=case_lifecycle_distribution,
        intervention_distribution=intervention_distribution,
        governance_disclaimers=disclaimers,
    )
