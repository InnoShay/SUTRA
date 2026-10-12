"""
SUTRA Explainable Risk Signal Engine.

Evaluates multisource student observations across attendance, academic achievement,
LMS participation, fee status, career skills, and faculty feedback to generate
transparent, evidence-grounded risk signals and recommended supportive actions.

ETHICAL GOVERNANCE SAFEGUARDS:
1. Purely rule-based, deterministic heuristics for demonstration orchestration.
2. Absolutely NO punitive, disciplinary, or diagnostic recommendations.
3. Financial status signals are flagged CONFIDENTIAL and routed exclusively to financial aid.
4. Conflicting indicators mandate human advisor review rather than automatic action.
5. Completely decoupled from the OULAD Logistic Regression ML baseline.
"""

from dataclasses import dataclass
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from sutra_ml.schemas.multisource import (
    AcademicStanding,
    AssignedRole,
    AttendanceTrend,
    FacultyEvidenceCategory,
    FacultySentiment,
    FeePaymentStatus,
    PlacementTier,
    SignalCategory,
    SignalSeverity,
    StudentSuccess360Profile,
)


class RiskSignal(BaseModel):
    """Structured, explainable risk or support signal."""
    model_config = ConfigDict(extra="forbid")

    signal_id: str = Field(..., description="Unique signal instance key, e.g. 'SIG-ATT-001'")
    category: SignalCategory = Field(..., description="Observation domain")
    severity: SignalSeverity = Field(..., description="Triage priority level")
    title: str = Field(..., description="Clear human-readable headline")
    evidence: dict[str, Any] = Field(..., description="Exact empirical observations that triggered the rule")
    rule_description: str = Field(..., description="Verifiable logic rule formula")
    observation_freshness: str = Field(..., description="Source sync timestamp / latency")
    confidence_limitation: str = Field(..., description="Known data quality or coverage caveats")
    recommended_action: str = Field(..., description="Constructive, supportive intervention next step")
    assigned_role: AssignedRole = Field(..., description="Designated professional staff owner")
    is_confidential: bool = Field(default=False, description="Whether view is restricted to specific role")


class RiskSignalEvaluationResult(BaseModel):
    """Aggregate result from signal engine execution on a 360 profile."""
    model_config = ConfigDict(extra="forbid")

    student_key: str
    snapshot_timestamp: str
    total_signals_detected: int
    signals_by_severity: dict[str, int]
    signals: List[RiskSignal]
    confidential_signals: List[RiskSignal]
    requires_urgent_human_review: bool
    governance_notice: str = Field(
        default=(
            "TRANSPARENT RULE-BASED RISK SIGNALS ONLY. "
            "These indicators are deterministic operational rules for advisor triage, "
            "NOT machine learning probability estimates. All follow-ups require human discretion."
        )
    )


class RiskSignalEngine:
    """
    Evaluates StudentSuccess360Profile instances to synthesize explainable risk signals.
    """

    def __init__(self):
        pass

    def evaluate_profile(self, profile: StudentSuccess360Profile) -> RiskSignalEvaluationResult:
        """
        Execute full ruleset across all 6 domains and data quality audit.
        """
        signals: List[RiskSignal] = []
        confidential_signals: List[RiskSignal] = []

        # -------------------------------------------------------------
        # 1. Attendance Domain Rules
        # -------------------------------------------------------------
        att = profile.attendance
        if att.consecutive_absences >= 4 or att.recent_attendance_pct < 50.0:
            sev = SignalSeverity.CRITICAL if (att.consecutive_absences >= 5 or att.recent_attendance_pct < 40.0) else SignalSeverity.HIGH
            sig = RiskSignal(
                signal_id=f"SIG-ATT-CRIT-{profile.student_key}",
                category=SignalCategory.ATTENDANCE,
                severity=sev,
                title="Critical Attendance Decline Detected",
                evidence={
                    "consecutive_absences": att.consecutive_absences,
                    "recent_attendance_pct": att.recent_attendance_pct,
                    "overall_attendance_pct": att.overall_attendance_pct,
                    "attendance_trend": att.attendance_trend.value,
                },
                rule_description="Triggered when consecutive absences >= 4 OR recent 14-day attendance rate < 50.0%",
                observation_freshness=f"Last present: {att.last_attendance_date or 'N/A'}, sync freshness: {att.source_freshness_days}d",
                confidence_limitation="Derived from lecture/lab scanners. Subject to manual attendance logging lags.",
                recommended_action="Initiate non-punitive supportive check-in to identify external obstacles (health, commute, schedule clash).",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)
        elif (att.overall_attendance_pct - att.recent_attendance_pct) > 15.0 or att.attendance_trend == AttendanceTrend.DECLINING:
            sig = RiskSignal(
                signal_id=f"SIG-ATT-WARN-{profile.student_key}",
                category=SignalCategory.ATTENDANCE,
                severity=SignalSeverity.MEDIUM,
                title="Downward Attendance Velocity Trend",
                evidence={
                    "overall_attendance_pct": att.overall_attendance_pct,
                    "recent_attendance_pct": att.recent_attendance_pct,
                    "drop_delta_pct": round(att.overall_attendance_pct - att.recent_attendance_pct, 1),
                },
                rule_description="Triggered when recent attendance drops > 15% below overall semester baseline",
                observation_freshness=f"Source freshness: {att.source_freshness_days}d",
                confidence_limitation="Moderate confidence; automated roster reconciliation verified.",
                recommended_action="Send automated advisory notification regarding attendance policy and student support services.",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)

        # -------------------------------------------------------------
        # 2. Academic Performance Rules
        # -------------------------------------------------------------
        acad = profile.academics
        if acad.failed_assessments_count >= 2 or acad.current_term_average_pct < 50.0 or acad.academic_standing == AcademicStanding.PROBATION:
            sev = SignalSeverity.CRITICAL if (acad.failed_assessments_count >= 2 and acad.current_term_average_pct < 50.0) else SignalSeverity.HIGH
            sig = RiskSignal(
                signal_id=f"SIG-ACAD-FAIL-{profile.student_key}",
                category=SignalCategory.ACADEMIC,
                severity=sev,
                title="Academic Performance Alert: Core Subject Difficulty",
                evidence={
                    "failed_assessments_count": acad.failed_assessments_count,
                    "current_term_average_pct": acad.current_term_average_pct,
                    "cumulative_gpa": acad.cumulative_gpa,
                    "academic_standing": acad.academic_standing.value,
                },
                rule_description="Triggered when failed assessments >= 2 OR current term score < 50.0% OR standing is PROBATION",
                observation_freshness=f"Gradebook sync: {acad.source_freshness_days}d ago",
                confidence_limitation="Based on verified faculty marks entries. Late submissions may pending grading.",
                recommended_action="Connect student with subject-specific peer tutoring and schedule academic advising plan.",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)

        if acad.assessments_overdue >= 1:
            sig = RiskSignal(
                signal_id=f"SIG-ACAD-DUE-{profile.student_key}",
                category=SignalCategory.ACADEMIC,
                severity=SignalSeverity.MEDIUM,
                title="Overdue Assessment Milestones",
                evidence={
                    "assessments_overdue": acad.assessments_overdue,
                    "assessments_completed": acad.assessments_completed,
                    "assessments_due": acad.assessments_due,
                },
                rule_description="Triggered when scheduled assessment milestones are overdue >= 1",
                observation_freshness=f"Coursework tracker: {acad.source_freshness_days}d ago",
                confidence_limitation="Does not reflect unsubmitted drafts or active extension waivers.",
                recommended_action="Course instructor to reach out regarding assignment blockers and extension criteria.",
                assigned_role=AssignedRole.COURSE_INSTRUCTOR,
                is_confidential=False,
            )
            signals.append(sig)

        # -------------------------------------------------------------
        # 3. Participation & LMS Rules
        # -------------------------------------------------------------
        lms = profile.participation
        if lms.days_since_last_lms_login >= 14 or lms.active_learning_days_d30 <= 2:
            sig = RiskSignal(
                signal_id=f"SIG-PART-INACT-{profile.student_key}",
                category=SignalCategory.PARTICIPATION,
                severity=SignalSeverity.HIGH,
                title="Prolonged Digital Platform Inactivity",
                evidence={
                    "days_since_last_lms_login": lms.days_since_last_lms_login,
                    "active_learning_days_d30": lms.active_learning_days_d30,
                    "total_logins": lms.total_platform_logins_d30,
                },
                rule_description="Triggered when LMS access dormancy >= 14 days OR active study days <= 2",
                observation_freshness=f"LMS log sync: {lms.source_freshness_days}d ago",
                confidence_limitation="LMS telemetry only; does not record offline textbook study or library reading.",
                recommended_action="Verify technical portal access; confirm student has active credentials and device availability.",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)
        elif lms.weekly_study_velocity_hours < 2.0 and acad.current_term_average_pct < 65.0:
            sig = RiskSignal(
                signal_id=f"SIG-PART-SLOW-{profile.student_key}",
                category=SignalCategory.PARTICIPATION,
                severity=SignalSeverity.MEDIUM,
                title="Sub-Threshold Weekly Study Velocity",
                evidence={
                    "weekly_study_velocity_hours": lms.weekly_study_velocity_hours,
                    "term_avg_pct": acad.current_term_average_pct,
                },
                rule_description="Triggered when weekly study velocity < 2.0 hrs AND term average < 65.0%",
                observation_freshness=f"LMS log sync: {lms.source_freshness_days}d ago",
                confidence_limitation="Reflects online time only. Unmonitored study is uncaptured.",
                recommended_action="Offer academic skills workshop on self-directed study schedules and time management.",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)

        # -------------------------------------------------------------
        # 4. Fee Status Domain Rules (CONFIDENTIAL, NON-PUNITIVE)
        # -------------------------------------------------------------
        fee = profile.fee_status
        if fee.status == FeePaymentStatus.OVERDUE or fee.has_financial_hold:
            sev = SignalSeverity.HIGH if (fee.days_past_due > 30 and fee.has_financial_hold) else SignalSeverity.MEDIUM
            sig = RiskSignal(
                signal_id=f"SIG-FIN-BURS-{profile.student_key}",
                category=SignalCategory.FINANCIAL_SUPPORT,
                severity=sev,
                title="Financial Aid Review: Emergency Bursary Support Opportunity",
                evidence={
                    "fee_status": fee.status.value,
                    "days_past_due": fee.days_past_due,
                    "has_financial_hold": fee.has_financial_hold,
                    "bursary_eligibility": fee.bursary_eligibility_flag,
                    "financial_aid_status": fee.financial_aid_status.value,
                },
                rule_description="Triggered when fee status is OVERDUE OR financial hold flag is set",
                observation_freshness=f"Bursar record sync: {fee.source_freshness_days}d ago",
                confidence_limitation="Financial records reconciled nightly. Pending bank wire transfers may not appear.",
                recommended_action=(
                    "Financial aid counselor outreach: review emergency bursary fund eligibility, "
                    "waive administrative hold temporarily, and structure affordable installment schedule. "
                    "Prohibit academic de-registration."
                ),
                assigned_role=AssignedRole.FINANCIAL_AID_COUNSELOR,
                is_confidential=True,  # STRICT PRIVACY ISOLATION
            )
            confidential_signals.append(sig)
        elif fee.status == FeePaymentStatus.SCHOLARSHIP_PENDING:
            sig = RiskSignal(
                signal_id=f"SIG-FIN-SCHOL-{profile.student_key}",
                category=SignalCategory.FINANCIAL_SUPPORT,
                severity=SignalSeverity.INFO,
                title="Scholarship Disbursement in Processing",
                evidence={"status": fee.status.value, "aid_status": fee.financial_aid_status.value},
                rule_description="Triggered when scholarship disbursement is pending institutional transfer",
                observation_freshness="Bursar system sync current",
                confidence_limitation="Disbursement timelines set by external donor or governmental grant body.",
                recommended_action="Ensure administrative holds remain suppressed pending scheduled scholarship payout.",
                assigned_role=AssignedRole.FINANCIAL_AID_COUNSELOR,
                is_confidential=True,
            )
            confidential_signals.append(sig)

        # -------------------------------------------------------------
        # 5. Career & Placement Readiness Rules
        # -------------------------------------------------------------
        place = profile.skills_placement
        if profile.program_year >= 3 and place.placement_readiness_tier in [PlacementTier.NEEDS_SUPPORT, PlacementTier.NOT_STARTED]:
            sig = RiskSignal(
                signal_id=f"SIG-PLACE-GAP-{profile.student_key}",
                category=SignalCategory.PLACEMENT_READINESS,
                severity=SignalSeverity.MEDIUM,
                title="Upper-Year Career Placement Readiness Deficit",
                evidence={
                    "program_year": profile.program_year,
                    "readiness_tier": place.placement_readiness_tier.value,
                    "technical_skills_score": place.technical_skills_score,
                    "resume_reviewed": place.resume_reviewed,
                    "mock_interview_completed": place.mock_interview_completed,
                },
                rule_description="Triggered for Year >= 3 students with placement tier 'NEEDS_SUPPORT' or 'NOT_STARTED'",
                observation_freshness=f"Career assessment sync: {place.source_freshness_days}d ago",
                confidence_limitation="Voluntary career center mock assessments; external student internships may be unlogged.",
                recommended_action="Career advisor outreach: schedule resume review clinic and mock technical interview workshop.",
                assigned_role=AssignedRole.CAREER_PLACEMENT_OFFICER,
                is_confidential=False,
            )
            signals.append(sig)

        # -------------------------------------------------------------
        # 6. Faculty Feedback Observations
        # -------------------------------------------------------------
        for obs in profile.faculty_observations:
            if obs.sentiment in [FacultySentiment.CONCERN, FacultySentiment.URGENT_CONCERN]:
                sev = SignalSeverity.HIGH if obs.sentiment == FacultySentiment.URGENT_CONCERN else SignalSeverity.MEDIUM
                sig = RiskSignal(
                    signal_id=f"SIG-FAC-{obs.observation_id}-{profile.student_key}",
                    category=SignalCategory.FACULTY_FEEDBACK,
                    severity=sev,
                    title=f"Faculty Observation Concern: {obs.evidence_category.value}",
                    evidence={
                        "observation_id": obs.observation_id,
                        "course_code": obs.course_code,
                        "faculty_role": obs.faculty_role,
                        "sentiment": obs.sentiment.value,
                        "notes": obs.summary_notes,
                    },
                    rule_description="Triggered on faculty observation logged with sentiment CONCERN or URGENT_CONCERN",
                    observation_freshness=f"Logged at {obs.timestamp}",
                    confidence_limitation="Subjective instructional staff observation; requires corroboration with objective data.",
                    recommended_action=f"Advisor review note: '{obs.summary_notes}'. Coordinate with instructor on follow-up.",
                    assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                    is_confidential=False,
                )
                signals.append(sig)
            elif obs.sentiment == FacultySentiment.POSITIVE and obs.evidence_category == FacultyEvidenceCategory.OUTSTANDING_EFFORT:
                sig = RiskSignal(
                    signal_id=f"SIG-FAC-COMMEND-{obs.observation_id}-{profile.student_key}",
                    category=SignalCategory.FACULTY_FEEDBACK,
                    severity=SignalSeverity.INFO,
                    title="Faculty Commendation: Outstanding Student Effort",
                    evidence={
                        "course_code": obs.course_code,
                        "notes": obs.summary_notes,
                    },
                    rule_description="Triggered on faculty commendation logged for outstanding student leadership or effort",
                    observation_freshness=f"Logged at {obs.timestamp}",
                    confidence_limitation="Instructor commendation.",
                    recommended_action="Log positive commendation on academic portfolio; encourage continued peer leadership.",
                    assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                    is_confidential=False,
                )
                signals.append(sig)

        # -------------------------------------------------------------
        # 7. Conflicting Cross-Domain Indicators & Human-Review Mandates
        # -------------------------------------------------------------
        # Case A: Low attendance but high academic marks
        if att.recent_attendance_pct < 50.0 and acad.current_term_average_pct >= 80.0:
            sig = RiskSignal(
                signal_id=f"SIG-CONF-ATT-ACAD-{profile.student_key}",
                category=SignalCategory.CONFLICTING_INDICATORS,
                severity=SignalSeverity.MEDIUM,
                title="Divergent Indicators: Low Attendance with High Coursework Attainment",
                evidence={
                    "recent_attendance_pct": att.recent_attendance_pct,
                    "current_term_average_pct": acad.current_term_average_pct,
                    "cumulative_gpa": acad.cumulative_gpa,
                },
                rule_description="Triggered when recent attendance < 50.0% but term academic score >= 80.0%",
                observation_freshness="Cross-system correlation verified",
                confidence_limitation="Strong divergence suggests student has mastered content but faces attendance barriers.",
                recommended_action=(
                    "MANDATORY HUMAN REVIEW: Do NOT apply punitive attendance sanctions. "
                    "Advisor should investigate external barriers (e.g. chronic illness, timetable conflict, work commitments)."
                ),
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)

        # Case B: High LMS activity but zero assessment submissions
        if lms.total_platform_logins_d30 >= 25 and acad.assessments_completed == 0 and acad.assessments_due >= 1:
            sig = RiskSignal(
                signal_id=f"SIG-CONF-LMS-SUB-{profile.student_key}",
                category=SignalCategory.CONFLICTING_INDICATORS,
                severity=SignalSeverity.MEDIUM,
                title="Divergent Indicators: Active LMS Logins with Zero Completed Submissions",
                evidence={
                    "total_logins": lms.total_platform_logins_d30,
                    "assessments_completed": acad.assessments_completed,
                    "assessments_due": acad.assessments_due,
                    "assessments_overdue": acad.assessments_overdue,
                },
                rule_description="Triggered when LMS logins >= 25 but completed assessments == 0 while assessments are due",
                observation_freshness="LMS and gradebook reconciled",
                confidence_limitation="Student is clearly engaged online but unable or hesitant to finalize submissions.",
                recommended_action="Advisor check-in: probe for assignment submission anxiety, portal technical issues, or task ambiguity.",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                is_confidential=False,
            )
            signals.append(sig)

        # -------------------------------------------------------------
        # 8. Data Quality & Freshness Audits
        # -------------------------------------------------------------
        dq = profile.data_quality
        if dq.is_stale or len(dq.missing_sources) > 0:
            sig = RiskSignal(
                signal_id=f"SIG-DQ-WARN-{profile.student_key}",
                category=SignalCategory.DATA_QUALITY,
                severity=SignalSeverity.LOW,
                title="Data Freshness & Completeness Warning",
                evidence={
                    "is_stale": dq.is_stale,
                    "missing_sources": dq.missing_sources,
                    "data_completeness_pct": dq.data_completeness_pct,
                },
                rule_description="Triggered when source freshness exceeds 14 days OR any feeder source is missing",
                observation_freshness=f"Audited at {profile.snapshot_timestamp}",
                confidence_limitation="Signals computed with partial or stale source feeds must be interpreted with caution.",
                recommended_action="Notify IT data engineering to re-sync institutional LMS and SIS feeder connectors.",
                assigned_role=AssignedRole.STUDENT_SUCCESS_COORDINATOR,
                is_confidential=False,
            )
            signals.append(sig)

        # Count severities
        all_signals = signals + confidential_signals
        sev_counts = {
            SignalSeverity.INFO.value: 0,
            SignalSeverity.LOW.value: 0,
            SignalSeverity.MEDIUM.value: 0,
            SignalSeverity.HIGH.value: 0,
            SignalSeverity.CRITICAL.value: 0,
        }
        for s in all_signals:
            sev_counts[s.severity.value] += 1

        urgent = sev_counts[SignalSeverity.CRITICAL.value] > 0 or sev_counts[SignalSeverity.HIGH.value] >= 2

        return RiskSignalEvaluationResult(
            student_key=profile.student_key,
            snapshot_timestamp=profile.snapshot_timestamp,
            total_signals_detected=len(all_signals),
            signals_by_severity=sev_counts,
            signals=signals,
            confidential_signals=confidential_signals,
            requires_urgent_human_review=urgent,
        )
