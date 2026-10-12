"""
SUTRA Local Demonstration Case Persistence Store.

Provides local, file-based persistence for intervention cases during testing and demos.
Ensures predictable seed and reset commands, safe serialization, and complete audit history preservation.
"""

from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

from sutra_ml.schemas.interventions import (
    AuditEvent,
    CasePriority,
    CaseStatus,
    EscalationLevel,
    InterventionCase,
    InterventionType,
    OutcomeCategory,
)
from sutra_ml.schemas.multisource import AssignedRole, SignalCategory, SignalSeverity

logger = logging.getLogger("sutra.interventions.store")

DEFAULT_CASES_STORE_PATH = Path("ml/data/interventions/cases.json")


class InterventionCaseStore:
    """Thread-safe, local JSON-backed storage for demonstration intervention records."""

    def __init__(self, store_path: Path = DEFAULT_CASES_STORE_PATH):
        self.store_path = store_path
        self._ensure_store_dir()

    def _ensure_store_dir(self) -> None:
        self.store_path.parent.mkdir(parents=True, exist_ok=True)

    def load_all(self) -> List[InterventionCase]:
        """Load all cases from the JSON store. Initializes seed if file is missing."""
        if not self.store_path.exists():
            return self.reset_to_seed()
        try:
            with open(self.store_path, "r", encoding="utf-8") as f:
                raw_list = json.load(f)
            cases = [InterventionCase.model_validate(item) for item in raw_list]
            return cases
        except Exception as exc:
            logger.warning("Could not read cases from %s: %s. Resetting to seed.", self.store_path, exc)
            return self.reset_to_seed()

    def save_all(self, cases: List[InterventionCase]) -> None:
        """Atomically persist cases list to disk."""
        self._ensure_store_dir()
        temp_path = self.store_path.with_suffix(".tmp")
        raw_list = [c.model_dump(mode="json") for c in cases]
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(raw_list, f, indent=2)
        os.replace(temp_path, self.store_path)

    def get_by_id(self, case_id: str) -> Optional[InterventionCase]:
        """Retrieve single case by case_id."""
        cases = self.load_all()
        for c in cases:
            if c.case_id == case_id:
                return c
        return None

    def upsert_case(self, case: InterventionCase) -> InterventionCase:
        """Insert or update a case."""
        cases = self.load_all()
        found = False
        for idx, existing in enumerate(cases):
            if existing.case_id == case.case_id:
                cases[idx] = case
                found = True
                break
        if not found:
            cases.append(case)
        self.save_all(cases)
        return case

    def delete_case(self, case_id: str) -> bool:
        """Remove a case by ID."""
        cases = self.load_all()
        filtered = [c for c in cases if c.case_id != case_id]
        if len(filtered) < len(cases):
            self.save_all(filtered)
            return True
        return False

    def reset_to_seed(self) -> List[InterventionCase]:
        """Reset storage to standard initial demonstration cases."""
        now_iso = "2026-10-15T10:00:00Z"

        seed_cases: List[InterventionCase] = [
            # 1. Recommendation awaiting review (Attendance Anomaly with high grades)
            InterventionCase(
                case_id="CASE-2026-001",
                student_key="SYNTH-360-ATTANOM-02",
                scenario_name="ATTENDANCE_ANOMALY_STRONG_ACADEMIC",
                source_signal_id="SIG-ATT-CRIT-SYNTH-360-ATTANOM-02",
                source_signal_category=SignalCategory.ATTENDANCE,
                source_signal_severity=SignalSeverity.CRITICAL,
                evidence_summary={
                    "consecutive_absences": 5,
                    "recent_attendance_pct": 35.0,
                    "cumulative_gpa": 3.84,
                    "conflict": "Sudden attendance drop despite exceptional academic mastery."
                },
                intervention_type=InterventionType.ATTENDANCE_SUPPORT_MEETING,
                priority=CasePriority.HIGH,
                status=CaseStatus.AWAITING_REVIEW,
                is_human_reviewed=False,
                created_at="2026-10-15T08:30:00Z",
                due_date=None,
                is_overdue=False,
                is_confidential=False,
                is_synthetic=True,
                audit_history=[
                    AuditEvent(
                        event_id="EVT-001",
                        timestamp="2026-10-15T08:30:00Z",
                        from_status=CaseStatus.RECOMMENDED,
                        to_status=CaseStatus.AWAITING_REVIEW,
                        actor_role="SYSTEM_RULE_ENGINE",
                        actor_id="SYS-ORCHESTRATOR",
                        action="SUBMIT_FOR_ADVISOR_REVIEW",
                        rationale="Critical attendance decline flagged. Conflicting strong GPA requires human triage before outreach."
                    )
                ]
            ),

            # 2. Approved & Assigned Confidential Financial Aid Case
            InterventionCase(
                case_id="CASE-2026-002",
                student_key="SYNTH-360-FINAID-04",
                scenario_name="FINANCIAL_SUPPORT_NEEDED",
                source_signal_id="SIG-FEE-BURSARY-SYNTH-360-FINAID-04",
                source_signal_category=SignalCategory.FINANCIAL_SUPPORT,
                source_signal_severity=SignalSeverity.HIGH,
                evidence_summary={
                    "fee_status": "OVERDUE",
                    "days_past_due": 38,
                    "bursary_eligibility": True,
                    "confidential_routing": "Financial Aid Counselor only"
                },
                intervention_type=InterventionType.FINANCIAL_AID_REFERRAL,
                priority=CasePriority.HIGH,
                status=CaseStatus.ASSIGNED,
                is_human_reviewed=True,
                reviewer_role="FINANCIAL_AID_COUNSELOR",
                reviewer_id="STAFF-AID-01",
                review_notes="Emergency bursary application verified. Proactive payment plan consultation approved.",
                reviewed_at="2026-10-14T09:00:00Z",
                assigned_role=AssignedRole.FINANCIAL_AID_COUNSELOR,
                assignee_id="STAFF-AID-01",
                created_at="2026-10-13T14:00:00Z",
                due_date="2026-10-22",
                is_overdue=False,
                is_confidential=True,
                is_synthetic=True,
                audit_history=[
                    AuditEvent(
                        event_id="EVT-002A",
                        timestamp="2026-10-13T14:00:00Z",
                        from_status=CaseStatus.RECOMMENDED,
                        to_status=CaseStatus.APPROVED,
                        actor_role="FINANCIAL_AID_COUNSELOR",
                        actor_id="STAFF-AID-01",
                        action="APPROVE_BURSARY_CONSULTATION",
                        rationale="Student meets institutional criteria for emergency bursary waiver."
                    ),
                    AuditEvent(
                        event_id="EVT-002B",
                        timestamp="2026-10-14T09:00:00Z",
                        from_status=CaseStatus.APPROVED,
                        to_status=CaseStatus.ASSIGNED,
                        actor_role="FINANCIAL_AID_COUNSELOR",
                        actor_id="STAFF-AID-01",
                        action="ASSIGN_SPECIALIST",
                        rationale="Assigned to lead financial counselor for direct support plan."
                    )
                ]
            ),

            # 3. Overdue Case for Explicit Escalation Policy Demonstration
            InterventionCase(
                case_id="CASE-2026-003",
                student_key="SYNTH-360-OVERDUE-09",
                scenario_name="OVERDUE_ADVISORY_FOLLOWUP",
                source_signal_id="SIG-ACAD-STRUGGLE-SYNTH-360-OVERDUE-09",
                source_signal_category=SignalCategory.ACADEMIC,
                source_signal_severity=SignalSeverity.MEDIUM,
                evidence_summary={
                    "assessments_overdue": 2,
                    "current_term_average_pct": 52.0,
                    "target_milestone": "Midterm Exam 1"
                },
                intervention_type=InterventionType.ACADEMIC_TUTORING,
                priority=CasePriority.MEDIUM,
                status=CaseStatus.ASSIGNED,
                is_human_reviewed=True,
                reviewer_role="ACADEMIC_ADVISOR",
                reviewer_id="STAFF-ADV-03",
                review_notes="Assigned to departmental tutoring coordinator for math clinic scheduling.",
                reviewed_at="2026-09-28T11:00:00Z",
                assigned_role=AssignedRole.COURSE_INSTRUCTOR,
                assignee_id="STAFF-INST-04",
                created_at="2026-09-25T10:00:00Z",
                due_date="2026-10-05",  # Past date relative to simulation reference 2026-10-15
                is_overdue=True,
                escalation_level=EscalationLevel.OVERDUE_FLAGGED,
                is_confidential=False,
                is_synthetic=True,
                audit_history=[
                    AuditEvent(
                        event_id="EVT-003A",
                        timestamp="2026-09-28T11:00:00Z",
                        from_status=CaseStatus.APPROVED,
                        to_status=CaseStatus.ASSIGNED,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-03",
                        action="ASSIGN_INSTRUCTOR",
                        rationale="Assigned instructor to coordinate tutoring milestone."
                    ),
                    AuditEvent(
                        event_id="EVT-003B",
                        timestamp="2026-10-06T00:00:00Z",
                        from_status=CaseStatus.ASSIGNED,
                        to_status=CaseStatus.ASSIGNED,
                        actor_role="SYSTEM_MONITOR",
                        actor_id="SYS-ESCALATION-DAEMON",
                        action="FLAG_OVERDUE_TASK",
                        rationale="Target due date (2026-10-05) elapsed without documented follow-up note. Internal triage flag set."
                    )
                ]
            ),

            # 4. In-Progress Case with Follow-Up Pending Outcome
            InterventionCase(
                case_id="CASE-2026-004",
                student_key="SYNTH-360-ACADSTRUG-03",
                scenario_name="ACADEMIC_AND_PARTICIPATION_STRUGGLE",
                source_signal_id="SIG-ACAD-FAIL-SYNTH-360-ACADSTRUG-03",
                source_signal_category=SignalCategory.ACADEMIC,
                source_signal_severity=SignalSeverity.CRITICAL,
                evidence_summary={
                    "assessments_overdue": 3,
                    "failed_assessments_count": 2,
                    "current_term_average_pct": 38.0
                },
                intervention_type=InterventionType.ADVISOR_CHECK_IN,
                priority=CasePriority.URGENT,
                status=CaseStatus.IN_PROGRESS,
                is_human_reviewed=True,
                reviewer_role="ACADEMIC_ADVISOR",
                reviewer_id="STAFF-ADV-01",
                review_notes="Urgent comprehensive academic coaching session required.",
                reviewed_at="2026-10-11T14:00:00Z",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                assignee_id="STAFF-ADV-01",
                created_at="2026-10-10T12:00:00Z",
                due_date="2026-10-18",
                is_overdue=False,
                is_confidential=False,
                is_synthetic=True,
                audit_history=[
                    AuditEvent(
                        event_id="EVT-004A",
                        timestamp="2026-10-11T14:00:00Z",
                        from_status=CaseStatus.RECOMMENDED,
                        to_status=CaseStatus.APPROVED,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-01",
                        action="APPROVE_URGENT_CHECKIN",
                        rationale="Severe academic milestones missed; prioritized for immediate one-on-one session."
                    ),
                    AuditEvent(
                        event_id="EVT-004B",
                        timestamp="2026-10-11T15:00:00Z",
                        from_status=CaseStatus.APPROVED,
                        to_status=CaseStatus.ASSIGNED,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-01",
                        action="SELF_ASSIGN",
                        rationale="Primary advisor assumed ownership."
                    ),
                    AuditEvent(
                        event_id="EVT-004C",
                        timestamp="2026-10-12T10:00:00Z",
                        from_status=CaseStatus.ASSIGNED,
                        to_status=CaseStatus.IN_PROGRESS,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-01",
                        action="INITIATE_CONTACT",
                        rationale="Simulated invitation sent for advising meeting."
                    )
                ]
            ),

            # 5. Successfully Concluded Intervention Case with Documented Outcome
            InterventionCase(
                case_id="CASE-2026-005",
                student_key="SYNTH-360-RECOVERY-08",
                scenario_name="POST_SUPPORT_RECOVERY",
                source_signal_id="SIG-ATT-PREV-SYNTH-360-RECOVERY-08",
                source_signal_category=SignalCategory.ATTENDANCE,
                source_signal_severity=SignalSeverity.MEDIUM,
                evidence_summary={
                    "prior_attendance_pct": 54.0,
                    "recovered_attendance_pct": 88.0,
                    "faculty_feedback": "Student successfully re-engaged."
                },
                intervention_type=InterventionType.ADVISOR_CHECK_IN,
                priority=CasePriority.MEDIUM,
                status=CaseStatus.CLOSED,
                is_human_reviewed=True,
                reviewer_role="ACADEMIC_ADVISOR",
                reviewer_id="STAFF-ADV-02",
                review_notes="Follow-up scheduled after mid-semester health absence.",
                reviewed_at="2026-10-01T10:00:00Z",
                assigned_role=AssignedRole.ACADEMIC_ADVISOR,
                assignee_id="STAFF-ADV-02",
                created_at="2026-09-28T09:00:00Z",
                due_date="2026-10-10",
                is_overdue=False,
                follow_up_notes="Met with student in person. Student recovered from temporary flu, caught up on lecture recordings, and submitted makeup lab.",
                follow_up_timestamp="2026-10-08T14:30:00Z",
                follow_up_method="In-Person Advising Office",
                outcome_category=OutcomeCategory.STUDENT_ENGAGEMENT_IMPROVED,
                outcome_notes="Observed attendance returned to 88%. Lab submission confirmed by faculty. Support goals satisfied.",
                outcome_date="2026-10-09T16:00:00Z",
                is_confidential=False,
                is_synthetic=True,
                audit_history=[
                    AuditEvent(
                        event_id="EVT-005A",
                        timestamp="2026-10-01T10:00:00Z",
                        from_status=CaseStatus.RECOMMENDED,
                        to_status=CaseStatus.ASSIGNED,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-02",
                        action="APPROVE_AND_ASSIGN",
                        rationale="Health leave check-in agreed."
                    ),
                    AuditEvent(
                        event_id="EVT-005B",
                        timestamp="2026-10-08T14:30:00Z",
                        from_status=CaseStatus.ASSIGNED,
                        to_status=CaseStatus.FOLLOW_UP_RECORDED,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-02",
                        action="RECORD_FOLLOW_UP",
                        rationale="Student attended check-in; confirmed catch-up on missed coursework."
                    ),
                    AuditEvent(
                        event_id="EVT-005C",
                        timestamp="2026-10-09T16:00:00Z",
                        from_status=CaseStatus.FOLLOW_UP_RECORDED,
                        to_status=CaseStatus.CLOSED,
                        actor_role="ACADEMIC_ADVISOR",
                        actor_id="STAFF-ADV-02",
                        action="CLOSE_CASE",
                        rationale="Intervention completed with recorded engagement recovery."
                    )
                ]
            )
        ]

        self.save_all(seed_cases)
        return seed_cases
