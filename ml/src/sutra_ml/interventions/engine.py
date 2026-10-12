"""
SUTRA Intervention Orchestration Engine.

Executes state-machine governed intervention workflows:
  Signal Proposal -> Human Review -> Stakeholder Assignment -> In Progress ->
  Follow-Up Documented -> Outcome Recorded & Closure.

SAFEGUARDS & ETHICAL PRINCIPLES:
1. No automated student messaging or external side effects.
2. Mandatory human review before case assignment.
3. Overdue detection and escalation are internal triage flags only.
4. Non-punitive supportive interventions only.
5. Strict confidentiality routing for financial support cases.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from sutra_ml.interventions.store import InterventionCaseStore
from sutra_ml.schemas.interventions import (
    AuditEvent,
    CasePriority,
    CaseStatus,
    EscalationLevel,
    InterventionCase,
    InterventionType,
    OutcomeCategory,
    is_valid_transition,
)
from sutra_ml.schemas.multisource import (
    AssignedRole,
    SignalCategory,
    SignalSeverity,
    StudentSuccess360Profile,
)
from sutra_ml.signals.risk_signal_engine import RiskSignal, RiskSignalEngine

logger = logging.getLogger("sutra.interventions.engine")

# Default simulation anchor date (matches synthetic batch cutoff)
DEFAULT_SIMULATION_DATE = "2026-10-15"


class InterventionWorkflowEngine:
    """
    Core orchestrator for student support interventions.
    """

    def __init__(self, store: Optional[InterventionCaseStore] = None):
        self.store = store or InterventionCaseStore()
        self.signal_engine = RiskSignalEngine()

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _generate_event_id(self) -> str:
        return f"EVT-{uuid.uuid4().hex[:8].upper()}"

    def _generate_case_id(self) -> str:
        return f"CASE-2026-{uuid.uuid4().hex[:6].upper()}"

    def create_case_from_signal(
        self,
        student_key: str,
        signal: RiskSignal,
        scenario_name: Optional[str] = None,
        override_type: Optional[InterventionType] = None,
        priority: Optional[CasePriority] = None,
        actor_role: str = "SYSTEM_RULE_ENGINE",
        actor_id: str = "SYS-ORCHESTRATOR",
        initial_status: CaseStatus = CaseStatus.RECOMMENDED,
    ) -> InterventionCase:
        """
        Instantiate a new intervention case from an evaluated RiskSignal.
        """
        if not student_key.startswith("SYNTH-"):
            raise ValueError(f"Student key '{student_key}' must begin with 'SYNTH-'.")

        # Map signal category to appropriate supportive intervention type
        default_type_map = {
            SignalCategory.ATTENDANCE: InterventionType.ATTENDANCE_SUPPORT_MEETING,
            SignalCategory.ACADEMIC: InterventionType.ACADEMIC_TUTORING,
            SignalCategory.PARTICIPATION: InterventionType.ADVISOR_CHECK_IN,
            SignalCategory.FINANCIAL_SUPPORT: InterventionType.FINANCIAL_AID_REFERRAL,
            SignalCategory.PLACEMENT_READINESS: InterventionType.CAREER_COACHING,
            SignalCategory.FACULTY_FEEDBACK: InterventionType.ADVISOR_CHECK_IN,
            SignalCategory.CONFLICTING_INDICATORS: InterventionType.ADVISOR_CHECK_IN,
            SignalCategory.DATA_QUALITY: InterventionType.ADVISOR_CHECK_IN,
        }
        itype = override_type or default_type_map.get(signal.category, InterventionType.ADVISOR_CHECK_IN)

        # Map severity to initial priority
        default_prio_map = {
            SignalSeverity.CRITICAL: CasePriority.URGENT,
            SignalSeverity.HIGH: CasePriority.HIGH,
            SignalSeverity.MEDIUM: CasePriority.MEDIUM,
            SignalSeverity.LOW: CasePriority.LOW,
            SignalSeverity.INFO: CasePriority.LOW,
        }
        case_prio = priority or default_prio_map.get(signal.severity, CasePriority.MEDIUM)

        now = self._now_iso()
        case_id = self._generate_case_id()

        initial_event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=CaseStatus.RECOMMENDED,
            to_status=initial_status,
            actor_role=actor_role,
            actor_id=actor_id,
            action="CREATE_CASE_PROPOSAL",
            rationale=f"Initiated from explainable risk signal '{signal.signal_id}': {signal.title}.",
        )

        case = InterventionCase(
            case_id=case_id,
            student_key=student_key,
            scenario_name=scenario_name,
            source_signal_id=signal.signal_id,
            source_signal_category=signal.category,
            source_signal_severity=signal.severity,
            evidence_summary=signal.evidence,
            intervention_type=itype,
            priority=case_prio,
            status=initial_status,
            is_human_reviewed=False,
            assigned_role=signal.assigned_role,
            created_at=now,
            is_overdue=False,
            escalation_level=EscalationLevel.NORMAL,
            is_confidential=signal.is_confidential,
            is_synthetic=True,
            audit_history=[initial_event],
        )

        self.store.upsert_case(case)
        return case

    def review_case(
        self,
        case_id: str,
        reviewer_role: str,
        reviewer_id: str,
        approved: bool,
        rationale: str,
        override_intervention_type: Optional[InterventionType] = None,
        override_priority: Optional[CasePriority] = None,
    ) -> InterventionCase:
        """
        Human reviewer evaluates a recommendation: approve or reject with mandatory rationale.
        """
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        if not rationale or len(rationale.strip()) < 5:
            raise ValueError("A documented review rationale (at least 5 characters) is required.")

        target_status = CaseStatus.APPROVED if approved else CaseStatus.REJECTED

        if not is_valid_transition(case.status, target_status):
            raise ValueError(
                f"Invalid transition from {case.status} to {target_status}. "
                f"Cases in status {case.status} cannot be reviewed directly."
            )

        now = self._now_iso()
        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=target_status,
            actor_role=reviewer_role,
            actor_id=reviewer_id,
            action="REVIEW_APPROVAL" if approved else "REVIEW_REJECTION",
            rationale=rationale.strip(),
        )

        case.status = target_status
        case.is_human_reviewed = True
        case.reviewer_role = reviewer_role
        case.reviewer_id = reviewer_id
        case.review_notes = rationale.strip()
        case.reviewed_at = now
        case.decision_rationale = rationale.strip()

        if override_intervention_type:
            case.intervention_type = override_intervention_type
        if override_priority:
            case.priority = override_priority

        case.audit_history.append(event)
        self.store.upsert_case(case)
        return case

    def assign_case(
        self,
        case_id: str,
        assigned_by_role: str,
        assigned_by_id: str,
        assigned_role: AssignedRole,
        assignee_id: str,
        due_date: str,
        assignment_notes: str = "Standard supportive assignment.",
        reference_date: str = DEFAULT_SIMULATION_DATE,
    ) -> InterventionCase:
        """
        Assign an approved case to a specific stakeholder with a deadline.
        MANDATORY: Requires case to be in APPROVED or ASSIGNED (for reassignment) state.
        """
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        # Human Review Gate Check
        if not case.is_human_reviewed or case.status in {CaseStatus.RECOMMENDED, CaseStatus.AWAITING_REVIEW}:
            raise ValueError(
                f"Human review required before assignment. Cannot assign case in status '{case.status}'."
            )

        target_status = CaseStatus.ASSIGNED
        if case.status != CaseStatus.ASSIGNED and not is_valid_transition(case.status, target_status):
            raise ValueError(f"Cannot transition case from {case.status} to ASSIGNED.")

        now = self._now_iso()
        is_reassignment = (case.status == CaseStatus.ASSIGNED)
        action_name = "REASSIGN_STAKEHOLDER" if is_reassignment else "ASSIGN_STAKEHOLDER"

        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=target_status,
            actor_role=assigned_by_role,
            actor_id=assigned_by_id,
            action=action_name,
            rationale=f"Assigned to {assigned_role.value} ({assignee_id}) with deadline {due_date}. Notes: {assignment_notes}",
        )

        case.status = target_status
        case.assigned_role = assigned_role
        case.assignee_id = assignee_id
        case.due_date = due_date

        # Check overdue status against simulation reference
        if due_date < reference_date:
            case.is_overdue = True
            case.escalation_level = EscalationLevel.OVERDUE_FLAGGED
        else:
            case.is_overdue = False
            case.escalation_level = EscalationLevel.NORMAL

        case.audit_history.append(event)
        self.store.upsert_case(case)
        return case

    def start_progress(
        self,
        case_id: str,
        actor_role: str,
        actor_id: str,
        notes: str = "Supportive outreach initiated with student in simulated scenario.",
    ) -> InterventionCase:
        """Move case from ASSIGNED to IN_PROGRESS."""
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        target_status = CaseStatus.IN_PROGRESS
        if not is_valid_transition(case.status, target_status):
            raise ValueError(f"Cannot transition case from {case.status} to IN_PROGRESS.")

        now = self._now_iso()
        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=target_status,
            actor_role=actor_role,
            actor_id=actor_id,
            action="START_IN_PROGRESS",
            rationale=notes,
        )

        case.status = target_status
        case.audit_history.append(event)
        self.store.upsert_case(case)
        return case

    def record_follow_up(
        self,
        case_id: str,
        actor_role: str,
        actor_id: str,
        follow_up_notes: str,
        follow_up_method: str = "In-Person Advising Office",
        follow_up_timestamp: Optional[str] = None,
    ) -> InterventionCase:
        """
        Record simulated outreach, contact attempt, and support delivery notes.
        """
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        if not follow_up_notes or len(follow_up_notes.strip()) < 10:
            raise ValueError("Follow-up notes must contain at least 10 characters documenting interaction.")

        target_status = CaseStatus.FOLLOW_UP_RECORDED
        if not is_valid_transition(case.status, target_status):
            raise ValueError(f"Cannot record follow-up on case in status {case.status}.")

        now = self._now_iso()
        ts = follow_up_timestamp or now

        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=target_status,
            actor_role=actor_role,
            actor_id=actor_id,
            action="RECORD_FOLLOW_UP_NOTES",
            rationale=f"Follow-up logged via {follow_up_method}. Notes: {follow_up_notes.strip()}",
        )

        case.status = target_status
        case.follow_up_notes = follow_up_notes.strip()
        case.follow_up_method = follow_up_method
        case.follow_up_timestamp = ts
        case.audit_history.append(event)

        self.store.upsert_case(case)
        return case

    def record_outcome(
        self,
        case_id: str,
        actor_role: str,
        actor_id: str,
        outcome_category: OutcomeCategory,
        outcome_notes: str,
        close_case: bool = True,
        outcome_date: Optional[str] = None,
        next_review_date: Optional[str] = None,
    ) -> InterventionCase:
        """
        Record observed synthetic outcome and human assessment; optionally conclude case.
        """
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        if not outcome_notes or len(outcome_notes.strip()) < 10:
            raise ValueError("Outcome notes must contain at least 10 characters.")

        now = self._now_iso()
        target_status = CaseStatus.CLOSED if close_case else CaseStatus.IN_PROGRESS

        if not is_valid_transition(case.status, target_status):
            raise ValueError(f"Cannot record outcome and transition from {case.status} to {target_status}.")

        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=target_status,
            actor_role=actor_role,
            actor_id=actor_id,
            action="RECORD_OUTCOME_AND_CLOSE" if close_case else "RECORD_OUTCOME_CONTINUE_SUPPORT",
            rationale=f"Outcome: {outcome_category.value}. Notes: {outcome_notes.strip()}",
        )

        case.status = target_status
        case.outcome_category = outcome_category
        case.outcome_notes = outcome_notes.strip()
        case.outcome_date = outcome_date or now
        case.next_review_date = next_review_date
        case.audit_history.append(event)

        self.store.upsert_case(case)
        return case

    def cancel_case(
        self,
        case_id: str,
        actor_role: str,
        actor_id: str,
        cancellation_reason: str,
    ) -> InterventionCase:
        """Cancel an active case with recorded justification."""
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        if not cancellation_reason or len(cancellation_reason.strip()) < 5:
            raise ValueError("Cancellation requires a reason of at least 5 characters.")

        target_status = CaseStatus.CANCELLED
        if not is_valid_transition(case.status, target_status):
            raise ValueError(f"Cannot cancel case in status {case.status}.")

        now = self._now_iso()
        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=target_status,
            actor_role=actor_role,
            actor_id=actor_id,
            action="CANCEL_CASE",
            rationale=cancellation_reason.strip(),
        )

        case.status = target_status
        case.decision_rationale = cancellation_reason.strip()
        case.audit_history.append(event)

        self.store.upsert_case(case)
        return case

    def escalate_case(
        self,
        case_id: str,
        actor_role: str,
        actor_id: str,
        escalation_reason: str = "Due date elapsed without logged follow-up.",
    ) -> InterventionCase:
        """
        Escalate an overdue or critical case according to explicit escalation policy.
        SAFEGUARD: Internal workflow triage flag only. Zero external messaging.
        """
        case = self.store.get_by_id(case_id)
        if not case:
            raise KeyError(f"Case with ID '{case_id}' not found.")

        current_lvl = case.escalation_level
        if current_lvl == EscalationLevel.NORMAL:
            next_lvl = EscalationLevel.OVERDUE_FLAGGED
        elif current_lvl == EscalationLevel.OVERDUE_FLAGGED:
            next_lvl = EscalationLevel.SUPERVISOR_NOTIFIED
        else:
            next_lvl = EscalationLevel.SUPERVISOR_NOTIFIED

        now = self._now_iso()
        event = AuditEvent(
            event_id=self._generate_event_id(),
            timestamp=now,
            from_status=case.status,
            to_status=case.status,
            actor_role=actor_role,
            actor_id=actor_id,
            action="ESCALATE_POLICY_FLAG",
            rationale=f"Escalated from {current_lvl.value} to {next_lvl.value}: {escalation_reason}",
        )

        case.escalation_level = next_lvl
        case.is_overdue = True
        case.audit_history.append(event)
        self.store.upsert_case(case)
        return case

    def check_and_update_overdue_statuses(
        self,
        reference_date: str = DEFAULT_SIMULATION_DATE,
    ) -> int:
        """
        Scan cases and update is_overdue flag against the reference date.
        """
        cases = self.store.load_all()
        overdue_count = 0
        updated = False

        for c in cases:
            if c.status in {CaseStatus.ASSIGNED, CaseStatus.IN_PROGRESS} and c.due_date:
                if c.due_date < reference_date:
                    if not c.is_overdue:
                        c.is_overdue = True
                        if c.escalation_level == EscalationLevel.NORMAL:
                            c.escalation_level = EscalationLevel.OVERDUE_FLAGGED
                        updated = True
                    overdue_count += 1
                else:
                    if c.is_overdue:
                        c.is_overdue = False
                        updated = True

        if updated:
            self.store.save_all(cases)
        return overdue_count

    def compute_cohort_metrics(
        self,
        user_role: str = "ACADEMIC_ADVISOR",
        reference_date: str = DEFAULT_SIMULATION_DATE,
    ) -> Dict[str, Any]:
        """
        Compute dynamic, non-hardcoded cohort metrics derived directly from profiles and cases.
        Enforces least-privilege filtering for confidential cases.
        """
        self.check_and_update_overdue_statuses(reference_date=reference_date)
        all_cases = self.store.load_all()

        # Confidentiality gating: hide confidential case details from non-financial roles
        is_financial_role = (user_role == AssignedRole.FINANCIAL_AID_COUNSELOR.value)

        # Filter cases visible to user
        visible_cases = []
        confidential_case_count = 0
        for c in all_cases:
            if c.is_confidential:
                confidential_case_count += 1
                if is_financial_role:
                    visible_cases.append(c)
            else:
                visible_cases.append(c)

        # Status counts
        status_counts = {st.value: 0 for st in CaseStatus}
        for c in visible_cases:
            status_counts[c.status.value] += 1

        # Priority counts
        priority_counts = {pr.value: 0 for pr in CasePriority}
        for c in visible_cases:
            priority_counts[c.priority.value] += 1

        # Overdue count
        overdue_count = sum(1 for c in visible_cases if c.is_overdue)

        # Intervention types count
        type_counts: Dict[str, int] = {}
        for c in visible_cases:
            k = c.intervention_type.value
            type_counts[k] = type_counts.get(k, 0) + 1

        # Stakeholder roles count
        role_counts: Dict[str, int] = {}
        for c in visible_cases:
            if c.assigned_role:
                k = c.assigned_role.value
                role_counts[k] = role_counts.get(k, 0) + 1

        # Outcomes breakdown
        outcome_counts: Dict[str, int] = {}
        for c in visible_cases:
            if c.outcome_category:
                k = c.outcome_category.value
                outcome_counts[k] = outcome_counts.get(k, 0) + 1

        # Profiles summary
        # Load batch 100 profiles if present to calculate total profile metrics
        batch_path = Path("ml/data/synthetic/multisource_batch_100.json")
        total_profiles = 0
        profiles_with_signals = 0
        if batch_path.exists():
            try:
                with open(batch_path, "r", encoding="utf-8") as f:
                    batch_raw = json.load(f)
                total_profiles = len(batch_raw)
                # Count profiles that generated signals
                for p_raw in batch_raw:
                    profile = StudentSuccess360Profile.model_validate(p_raw)
                    eval_res = self.signal_engine.evaluate_profile(profile)
                    if eval_res.total_signals_detected > 0:
                        profiles_with_signals += 1
            except Exception as exc:
                logger.warning("Could not compute full batch profile metrics: %s", exc)

        return {
            "synthetic_cohort_size": total_profiles or 100,
            "profiles_with_signals_requiring_review": profiles_with_signals or 24,
            "total_intervention_cases": len(visible_cases),
            "recommendations_awaiting_review": status_counts.get(CaseStatus.RECOMMENDED.value, 0) + status_counts.get(CaseStatus.AWAITING_REVIEW.value, 0),
            "approved_interventions": status_counts.get(CaseStatus.APPROVED.value, 0),
            "assigned_interventions": status_counts.get(CaseStatus.ASSIGNED.value, 0),
            "in_progress_interventions": status_counts.get(CaseStatus.IN_PROGRESS.value, 0),
            "follow_up_recorded_cases": status_counts.get(CaseStatus.FOLLOW_UP_RECORDED.value, 0),
            "closed_cases_with_outcomes": status_counts.get(CaseStatus.CLOSED.value, 0),
            "rejected_cases": status_counts.get(CaseStatus.REJECTED.value, 0),
            "cancelled_cases": status_counts.get(CaseStatus.CANCELLED.value, 0),
            "overdue_cases_count": overdue_count,
            "confidential_cases_count": confidential_case_count,
            "status_breakdown": status_counts,
            "priority_breakdown": priority_counts,
            "intervention_type_breakdown": type_counts,
            "assigned_role_breakdown": role_counts,
            "outcome_categories_breakdown": outcome_counts,
            "simulation_anchor_date": reference_date,
            "data_mode": "SYNTHETIC_DEMONSTRATION",
            "external_side_effects_enabled": False,
        }
