import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Path, Query, Body
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import PermissionDeniedError, ResourceNotFoundError, UnprocessableEntityError
from app.core.security import CampusMembershipContext, get_campus_membership
from app.ml.service import ml_service
from app.models.case import Case
from app.models.ml import MLInferenceLog
from app.models.observation import FinanceObservation, StudentObservation
from app.models.signal import Signal
from app.models.student import Student
from app.schemas.ai import AISummarizeEvidenceResponse
from app.schemas.ml import (
    DAY30_REQUIRED_FEATURES,
    FORBIDDEN_LEAKED_FEATURES,
    MLAttribution,
    MLEvidenceCard,
    MLPredictRequest,
    MLPredictResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
)
from app.schemas.student import (
    FeatureReadinessItem,
    FinanceObservationDTO,
    FinanceViewResponse,
    FreshnessMetricsDTO,
    ObservationDTO,
    ObservationTelemetryAudit,
    StudentReadinessResponse,
    StudentSummary,
    SupportViewResponse,
)

router = APIRouter(prefix="/students", tags=["Students"])


def check_leadership_access(membership: CampusMembershipContext):
    """Restricts leadership role to cohort aggregates only (disallowing individual queues)."""
    if "leadership" in membership.roles and not any(
        r in ("hod", "mentor", "faculty", "institution_admin", "counsellor", "finance", "placement")
        for r in membership.roles
    ):
        raise PermissionDeniedError(
            "Leadership role is restricted to cohort aggregates and cannot access individual student profiles",
            code="LEADERSHIP_QUEUE_ACCESS_DENIED",
        )


async def _resolve_student_in_campus(
    student_id_or_ref: str,
    campus_id: uuid.UUID,
    db: AsyncSession,
) -> Student:
    """
    Resolves student by UUID or external_ref strictly within the authorized campus.
    Raises ResourceNotFoundError (HTTP 404) if the student does not exist in the active campus
    or exists in a different campus, preventing cross-tenant existence oracle leakage.
    """
    clean_id = student_id_or_ref.strip()
    student = None
    try:
        parsed_uuid = uuid.UUID(clean_id)
        candidate = await db.get(Student, parsed_uuid)
        if candidate and candidate.institution_id == campus_id:
            student = candidate
    except ValueError:
        pass

    if not student:
        query = select(Student).where(
            Student.institution_id == campus_id,
            Student.external_ref == clean_id,
        )
        res = await db.execute(query)
        student = res.scalars().first()

    if not student:
        raise ResourceNotFoundError(f"Student '{clean_id}' not found in active campus")

    return student


@router.get("", response_model=List[StudentSummary])
async def list_students(
    cohort: Optional[str] = Query(None, description="Optional cohort code filter"),
    limit: Optional[int] = Query(None, ge=1, le=200, description="Optional maximum number of records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Optional pagination offset"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists pseudonymous students belonging to the active campus with optional cohort filtering and pagination."""
    check_leadership_access(membership)
    query = (
        select(Student)
        .where(Student.institution_id == membership.campus_id)
        .order_by(Student.external_ref.asc())
    )
    if cohort:
        query = query.where(Student.cohort_code == cohort)
    if offset is not None:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)

    result = await db.execute(query)
    students = result.scalars().all()
    return [
        StudentSummary(
            id=s.id,
            external_ref=s.external_ref,
            display_name=s.display_name,
            cohort_code=s.cohort_code,
            enrollment_status=s.enrollment_status,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in students
    ]


@router.get("/{student_id}", response_model=StudentSummary)
async def get_student(
    student_id: str = Path(..., description="Student UUID or external reference (e.g. SYN-1007)"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves basic profile header for a specific student by UUID or external reference."""
    check_leadership_access(membership)
    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    return StudentSummary(
        id=student.id,
        external_ref=student.external_ref,
        display_name=student.display_name,
        cohort_code=student.cohort_code,
        enrollment_status=student.enrollment_status,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.get("/{student_id}/support-view", response_model=SupportViewResponse)
async def get_student_support_view(
    student_id: str = Path(..., description="Student UUID or external reference"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Returns role-filtered 360° support view with data freshness metrics (strictly omitting fee records)."""
    check_leadership_access(membership)
    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    # Observations query
    obs_query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student.id,
    ).order_by(StudentObservation.event_at.desc())
    obs_res = await db.execute(obs_query)
    observations = obs_res.scalars().all()

    # Active signals count
    sig_count_query = select(func.count(Signal.id)).where(
        Signal.institution_id == membership.campus_id,
        Signal.student_id == student.id,
        Signal.reviewed_decision.is_(None),
    )
    sig_count = (await db.execute(sig_count_query)).scalar() or 0

    # Active cases count
    case_count_query = select(func.count(Case.id)).where(
        Case.institution_id == membership.campus_id,
        Case.student_id == student.id,
        Case.state.notin_(["closed", "dismissed"]),
    )
    case_count = (await db.execute(case_count_query)).scalar() or 0

    domains = list({o.domain for o in observations})
    last_event = observations[0].event_at if observations else None
    last_avail = observations[0].available_at if observations else None

    # Check staleness
    is_stale = any(o.quality_state in ("stale", "missing") for o in observations)

    freshness = FreshnessMetricsDTO(
        total_observations=len(observations),
        domains_represented=domains,
        last_observation_event_at=last_event,
        last_observation_available_at=last_avail,
        is_stale=is_stale,
    )

    obs_dtos = [
        ObservationDTO(
            id=o.id,
            domain=o.domain,
            metric_key=o.metric_key,
            value=o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
            unit=o.unit,
            quality_state=o.quality_state,
            event_at=o.event_at,
            available_at=o.available_at,
            ingested_at=o.ingested_at,
            source_system=o.source_system,
        )
        for o in observations[:20]
    ]

    # Latest ML prediction log for student if available
    ml_log_query = select(MLInferenceLog).where(
        MLInferenceLog.institution_id == membership.campus_id,
        (MLInferenceLog.student_id == student.id) | (MLInferenceLog.external_student_ref == student.external_ref),
    ).order_by(MLInferenceLog.created_at.desc()).limit(1)
    ml_log_res = await db.execute(ml_log_query)
    latest_ml_log = ml_log_res.scalars().first()

    ml_prediction_dto = None
    if latest_ml_log:
        raw_attributions = (
            latest_ml_log.top_attributions
            if isinstance(latest_ml_log.top_attributions, list)
            else []
        )
        attributions = [
            MLAttribution(
                feature=str(a.get("feature", "unknown")),
                value=float(a.get("value", 0.0)),
                attribution=float(a.get("attribution", 0.0)),
                direction="increases_risk" if a.get("direction") == "increases_risk" else "decreases_risk",
            )
            for a in raw_attributions
            if isinstance(a, dict)
        ]

        evidence_card = MLEvidenceCard(
            card_type="ml_early_warning_evidence",
            model_name=latest_ml_log.model_name,
            model_version=latest_ml_log.model_version,
            prediction_cutoff=latest_ml_log.prediction_cutoff,
            risk_probability=round(latest_ml_log.risk_probability, 4),
            threshold=round(latest_ml_log.threshold, 2),
            classification="At_Risk" if latest_ml_log.risk_probability >= latest_ml_log.threshold else "On_Track",
            top_attributions=attributions,
        )

        ml_prediction_dto = MLPredictResponse(
            external_student_ref=latest_ml_log.external_student_ref,
            risk_probability=round(latest_ml_log.risk_probability, 4),
            threshold=round(latest_ml_log.threshold, 2),
            classification=evidence_card.classification,
            evidence_card=evidence_card,
        )

    return SupportViewResponse(
        student=StudentSummary(
            id=student.id,
            external_ref=student.external_ref,
            display_name=student.display_name,
            cohort_code=student.cohort_code,
            enrollment_status=student.enrollment_status,
            created_at=student.created_at,
            updated_at=student.updated_at,
        ),
        freshness_metrics=freshness,
        active_signals_count=sig_count,
        active_cases_count=case_count,
        recent_observations=obs_dtos,
        ml_prediction=ml_prediction_dto,
    )



@router.get("/{student_id}/observations", response_model=List[ObservationDTO])
async def list_student_observations(
    student_id: str = Path(..., description="Student UUID or external reference"),
    domain: Optional[str] = Query(None, description="Optional domain filter (attendance, academic, participation, skills, faculty_feedback)"),
    quality_state: Optional[str] = Query(None, description="Optional quality state filter (valid, stale, missing, conflicting)"),
    limit: Optional[int] = Query(100, description="Max observations to return", ge=1, le=500),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists chronological general observations across the 5 standard educational domains."""
    check_leadership_access(membership)
    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student.id,
    )
    if domain:
        query = query.where(StudentObservation.domain == domain.strip().lower())
    if quality_state:
        query = query.where(StudentObservation.quality_state == quality_state.strip().lower())

    query = query.order_by(StudentObservation.event_at.desc()).limit(limit)
    res = await db.execute(query)
    observations = res.scalars().all()

    return [
        ObservationDTO(
            id=o.id,
            domain=o.domain,
            metric_key=o.metric_key,
            value=o.value.get("val") if isinstance(o.value, dict) and "val" in o.value else o.value,
            unit=o.unit,
            quality_state=o.quality_state,
            event_at=o.event_at,
            available_at=o.available_at,
            ingested_at=o.ingested_at,
            source_system=o.source_system,
        )
        for o in observations
    ]


@router.get("/{student_id}/readiness", response_model=StudentReadinessResponse)
async def get_student_feature_readiness(
    student_id: str = Path(..., description="Student UUID or external reference"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Audits observation completeness against the 25 canonical Day-30 ML features.
    Explicitly distinguishes available, missing, stale, and underivable metrics.
    Does NOT fabricate scores or fill missing inputs with arbitrary defaults.
    """
    check_leadership_access(membership)
    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    obs_query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student.id,
    ).order_by(StudentObservation.event_at.desc())
    res = await db.execute(obs_query)
    observations = res.scalars().all()

    # Telemetry ledger audit
    domains = sorted(list({o.domain for o in observations}))
    quality_counts: dict[str, int] = {}
    for o in observations:
        quality_counts[o.quality_state] = quality_counts.get(o.quality_state, 0) + 1

    last_event = observations[0].event_at if observations else None
    last_avail = observations[0].available_at if observations else None
    is_stale = any(o.quality_state in ("stale", "missing") for o in observations)

    # Observation lookup by metric_key (latest event wins)
    obs_by_key = {o.metric_key: o for o in observations}

    # 25 Day-30 features breakdown
    feature_items = []
    avail_count = 0
    missing_count = 0
    underivable_count = 0
    stale_count = 0

    vle_features = {
        "vle_total_clicks_d30", "vle_active_days_d30", "vle_clicks_precourse",
        "vle_clicks_poststart_d30", "vle_clicks_last_7d", "vle_days_since_last_click",
        "vle_clicks_forumng_d30", "vle_clicks_oucontent_d30", "vle_clicks_quiz_d30",
        "vle_clicks_homepage_d30", "vle_clicks_other_d30", "has_vle_activity_d30",
    }
    assessment_features = {
        "assessments_submitted_d30", "assessment_banked_d30", "has_early_assessment_submission_d30",
    }

    for feat in DAY30_REQUIRED_FEATURES:
        category = "demographic"
        if feat in vle_features:
            category = "vle_engagement"
        elif feat in assessment_features:
            category = "assessment_timing"

        if feat in obs_by_key:
            obs = obs_by_key[feat]
            val = obs.value.get("val") if isinstance(obs.value, dict) and "val" in obs.value else obs.value
            if obs.quality_state in ("stale", "missing"):
                status = "stale"
                stale_count += 1
                note = f"Observed from source '{obs.source_system}', but quality state is '{obs.quality_state}'"
            else:
                status = "available"
                avail_count += 1
                note = f"Observed from source '{obs.source_system}' (Domain: {obs.domain})"
            feature_items.append(FeatureReadinessItem(
                feature_name=feat,
                category=category,
                status=status,
                observed_value=val,
                source_domain=obs.domain,
                derivation_note=note,
            ))
        else:
            if category == "vle_engagement":
                status = "underivable_from_source"
                underivable_count += 1
                note = "Institutional telemetry tracks high-level LMS activity, not OULAD fine-grained clickstream"
            elif category == "demographic":
                status = "missing"
                missing_count += 1
                note = "Demographic attribute not recorded in pseudonymous student profile"
            else:
                status = "missing"
                missing_count += 1
                note = "Day-30 assessment submission timestamp not recorded in academic domain"

            feature_items.append(FeatureReadinessItem(
                feature_name=feat,
                category=category,
                status=status,
                observed_value=None,
                source_domain=None,
                derivation_note=note,
            ))

    if avail_count + stale_count == 25:
        if stale_count > 0:
            app_status = "STALE_DATA"
            is_ready = False
            rationale = f"All 25 features are present, but {stale_count} feature(s) exceed freshness thresholds."
        else:
            app_status = "READY"
            is_ready = True
            rationale = "All 25 canonical Day-30 features are present, valid, and within temporal evaluation boundaries."
    elif underivable_count > 0:
        app_status = "MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM"
        is_ready = False
        rationale = (
            "The active ML model (Logistic Regression Baseline v1.0.0) requires 25 canonical OULAD Day-30 features, "
            f"including {underivable_count} fine-grained VLE clickstream interactions that cannot be derived from "
            "institutional attendance or LMS event logs. Running inference on this record would require fabricating "
            "missing inputs, which is strictly prohibited."
        )
    else:
        app_status = "INSUFFICIENT_DATA"
        is_ready = False
        rationale = f"Student record is missing {missing_count} of 25 required features for Day-30 inference."

    telemetry_audit = ObservationTelemetryAudit(
        total_observations=len(observations),
        domains_present=domains,
        quality_state_counts=quality_counts,
        last_event_at=last_event,
        last_available_at=last_avail,
        is_stale=is_stale,
        unsupported_sources=[
            "student_feedback (not implemented in SUTRA data architecture)",
            "raw_vle_clickstream (campus LMS does not capture per-URL interaction logs)",
            "grading_latency_scores (assessment score values excluded to prevent label leakage)",
        ],
    )

    return StudentReadinessResponse(
        student=StudentSummary(
            id=student.id,
            external_ref=student.external_ref,
            display_name=student.display_name,
            cohort_code=student.cohort_code,
            enrollment_status=student.enrollment_status,
            created_at=student.created_at,
            updated_at=student.updated_at,
        ),
        model_name="Logistic Regression Baseline",
        model_version="1.0.0",
        target_cutoff="Day 30",
        is_ready_for_inference=is_ready,
        applicability_status=app_status,
        applicability_rationale=rationale,
        features_total_required=25,
        features_available_count=avail_count,
        features_missing_count=missing_count,
        features_underivable_count=underivable_count,
        features_stale_count=stale_count,
        features=feature_items,
        telemetry_audit=telemetry_audit,
        governance_disclaimer=(
            "Feature readiness checks audit input data completeness. It does NOT generate an early-warning score, "
            "compute risk, or predict student performance. Missing or underivable data must NEVER be treated as an "
            "indicator that the student is at risk."
        ),
    )


@router.get("/{student_id}/finance", response_model=FinanceViewResponse)
@router.get("/{student_id}/finance-view", response_model=FinanceViewResponse)
async def get_student_finance_view(
    student_id: str = Path(..., description="Student UUID or external reference"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves restricted fee-support observations. Strictly gated to finance and admin roles (ADR-003)."""
    # Domain capability check: only finance or institution_admin roles may access
    if not any(r in ("finance", "institution_admin") for r in membership.roles):
        raise PermissionDeniedError(
            "Access to financial aid observations requires 'finance' or 'institution_admin' role",
            code="FINANCE_DOMAIN_RESTRICTED",
        )

    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    query = select(FinanceObservation).where(
        FinanceObservation.institution_id == membership.campus_id,
        FinanceObservation.student_id == student.id,
    ).order_by(FinanceObservation.event_at.desc())
    res = await db.execute(query)
    fin_obs = res.scalars().all()

    dtos = [
        FinanceObservationDTO(
            id=f.id,
            fee_support_status=f.fee_support_status,
            quality_state=f.quality_state,
            event_at=f.event_at,
            available_at=f.available_at,
            ingested_at=f.ingested_at,
            source_system=f.source_system,
        )
        for f in fin_obs
    ]

    return FinanceViewResponse(
        student=StudentSummary(
            id=student.id,
            external_ref=student.external_ref,
            display_name=student.display_name,
            cohort_code=student.cohort_code,
            enrollment_status=student.enrollment_status,
        ),
        finance_observations=dtos,
    )


@router.post("/{student_id}/predict", response_model=MLPredictResponse)
async def predict_student_single(
    student_id: str = Path(..., description="Student UUID or external reference"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes authorized server-side ML prediction for a specific student in the active campus.
    Retrieves and aggregates feature values strictly from the student's authenticated observations.
    Refuses inference if canonical Day-30 features are missing or underivable.
    Audits execution to ml_inference_logs.
    """
    check_leadership_access(membership)
    if not any(r in ("faculty", "hod", "mentor", "institution_admin", "counsellor") for r in membership.roles):
        raise PermissionDeniedError(
            "Executing student early-warning ML inference requires an authorized educator or advisor role",
            code="ML_PREDICTION_ROLE_FORBIDDEN",
        )

    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    obs_query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student.id,
    ).order_by(StudentObservation.event_at.desc())
    res = await db.execute(obs_query)
    observations = res.scalars().all()

    obs_by_key = {o.metric_key: o for o in observations}

    # Verify presence of all 25 canonical Day-30 features
    missing = [feat for feat in DAY30_REQUIRED_FEATURES if feat not in obs_by_key]
    if missing:
        vle_missing = [f for f in missing if "vle_" in f or "clicks" in f]
        if vle_missing:
            msg = (
                f"Student '{student.external_ref}' has insufficient canonical data for Day-30 inference. "
                f"Missing {len(missing)} of 25 required features, including {len(vle_missing)} fine-grained VLE clickstream interactions "
                "that cannot be derived from institutional attendance. "
                "Run `sutra students readiness <ID>` to inspect feature availability and provenance boundaries."
            )
        else:
            msg = (
                f"Student '{student.external_ref}' is missing {len(missing)} required Day-30 feature(s): {missing[:5]}. "
                "Run `sutra students readiness <ID>` to inspect feature gaps."
            )
        raise UnprocessableEntityError(msg, code="INSUFFICIENT_FEATURES")

    # Verify freshness of features
    stale = [
        feat for feat, o in obs_by_key.items()
        if feat in DAY30_REQUIRED_FEATURES and o.quality_state in ("stale", "missing")
    ]
    if stale:
        raise UnprocessableEntityError(
            f"Student '{student.external_ref}' has {len(stale)} stale feature observation(s): {stale[:5]}. "
            "Inference is blocked until telemetry is refreshed.",
            code="STALE_FEATURES",
        )

    # Assemble and validate canonical feature vector
    features_dict = {}
    for feat in DAY30_REQUIRED_FEATURES:
        obs = obs_by_key[feat]
        val = obs.value.get("val") if isinstance(obs.value, dict) and "val" in obs.value else (obs.value.get("value") if isinstance(obs.value, dict) and "value" in obs.value else obs.value)
        features_dict[feat] = val

    # Anti-leakage verification
    for leaked in FORBIDDEN_LEAKED_FEATURES:
        if leaked in obs_by_key:
            raise UnprocessableEntityError(
                f"Forbidden leakage feature '{leaked}' detected in student telemetry ledger.",
                code="LEAKAGE_DETECTED",
            )

    ml_req = MLPredictRequest(
        external_student_ref=student.external_ref,
        cutoff_days=30,
        features=features_dict,
    )

    start_time = time.time()
    response = ml_service.predict_single(ml_req, institution_id=membership.campus_id)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    # Persist inference audit log
    await ml_service.log_inference(
        db=db,
        institution_id=membership.campus_id,
        prediction=response,
        student_id=student.id,
        latency_ms=duration_ms,
    )
    await db.commit()

    return response


@router.get("/{student_id}/evidence-summary", response_model=AISummarizeEvidenceResponse)
async def get_student_evidence_summary(
    student_id: str = Path(..., description="Student UUID or external reference"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the comprehensive 5-tier evidence summary for an authorized student:
    - Tier 1: Observed student telemetry (facts, contradictions, limitations).
    - Tier 2: Active deterministic rule triggers.
    - Tier 3: Production ML predictions & calibrated attributions.
    - Tier 4: Bounded AI advisory recommendations (catalogue-grounded).
    - Tier 5: Human review history, case progression, and outcomes.
    Financial aid observations are strictly excluded per ADR-003.
    """
    check_leadership_access(membership)
    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)
    from app.ai.service import ai_service
    return await ai_service.summarize_evidence(
        db=db,
        institution_id=membership.campus_id,
        user_id=membership.user.id,
        student_id=student.id,
    )


@router.post("/{student_id}/simulate-scenario", response_model=WhatIfScenarioResponse)
async def simulate_student_scenario(
    student_id: str = Path(..., description="Student UUID or external reference"),
    payload: WhatIfScenarioRequest = Body(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes an in-memory What-If scenario simulation for an authorized student.
    Uses student's authenticated observations / telemetry baseline as base features.
    Applies validated hypothetical modifications in memory.
    Never updates official student records, telemetry ledger, signals, cases, or ml_inference_logs.
    """
    check_leadership_access(membership)
    if not any(r in ("faculty", "hod", "mentor", "institution_admin", "counsellor", "leadership") for r in membership.roles):
        raise PermissionDeniedError(
            "Simulating student early-warning ML scenarios requires an authorized educator or advisor role",
            code="ML_SCENARIO_ROLE_FORBIDDEN",
        )

    student = await _resolve_student_in_campus(student_id, membership.campus_id, db)

    # 1. Gather baseline features from observations if available
    obs_query = select(StudentObservation).where(
        StudentObservation.institution_id == membership.campus_id,
        StudentObservation.student_id == student.id,
    ).order_by(StudentObservation.event_at.desc())
    res = await db.execute(obs_query)
    observations = res.scalars().all()
    obs_by_key = {o.metric_key: o for o in observations}

    base_features: dict = {}
    for feat in DAY30_REQUIRED_FEATURES:
        if feat in obs_by_key:
            obs = obs_by_key[feat]
            val = obs.value.get("val") if isinstance(obs.value, dict) and "val" in obs.value else (obs.value.get("value") if isinstance(obs.value, dict) and "value" in obs.value else obs.value)
            base_features[feat] = val

    # If payload provided base_features overrides or student has none, merge them
    if payload.base_features:
        for k, v in payload.base_features.items():
            base_features[k] = v

    # 2. Execute purely in-memory simulation (zero database writes)
    response = ml_service.simulate_scenario(
        base_features=base_features,
        hypothetical_modifications=payload.hypothetical_modifications,
        student_ref=student.external_ref,
    )
    return response


