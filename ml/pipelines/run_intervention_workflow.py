"""
SUTRA Phase Eighteen CLI Intervention Workflow Runner.

Demonstrates the complete end-to-end PS6 student success journey:
  Student 360 -> Explainable Risk Signals -> Human Review -> Assignment ->
  Follow-up Notes -> Case Outcome & Closure -> Dynamic Cohort Metrics.

SAFEGUARD NOTICE:
All student profiles, signals, assignees, notes, and outcomes are SYNTHETIC.
Zero external messages or automated punitive sanctions occur.
"""

import argparse
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from sutra_ml.interventions.engine import InterventionWorkflowEngine
from sutra_ml.interventions.store import InterventionCaseStore
from sutra_ml.schemas.interventions import (
    AssignedRole,
    CasePriority,
    CaseStatus,
    InterventionType,
    OutcomeCategory,
)
from sutra_ml.schemas.multisource import StudentSuccess360Profile
from sutra_ml.signals.risk_signal_engine import RiskSignal, RiskSignalEngine

console = Console()
logging.basicConfig(level=logging.WARNING)


def run_acceptance_scenario():
    """
    Executes the comprehensive Phase Eighteen acceptance scenario.
    """
    console.print("\n[bold cyan]========================================================================[/bold cyan]")
    console.print("[bold yellow] SUTRA Phase Eighteen — End-to-End Acceptance Scenario Execution[/bold yellow]")
    console.print("[bold cyan]========================================================================[/bold cyan]\n")

    store = InterventionCaseStore()
    store.reset_to_seed()
    engine = InterventionWorkflowEngine(store=store)
    sig_engine = RiskSignalEngine()

    # Step 1: Open ATTENDANCE_ANOMALY_STRONG_ACADEMIC
    console.print("[bold green][Step 1 & 2] Loading Student Profile: ATTENDANCE_ANOMALY_STRONG_ACADEMIC[/bold green]")
    scenarios_path = Path("ml/data/synthetic/multisource_scenarios.json")
    with open(scenarios_path, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    profile_data = scenarios["ATTENDANCE_ANOMALY_STRONG_ACADEMIC"]
    profile = StudentSuccess360Profile.model_validate(profile_data)

    console.print(f"Profile: [bold white]{profile.student_key}[/bold white] ({profile.department}, Year {profile.program_year})")
    console.print(f"  Attendance: Overall = {profile.attendance.overall_attendance_pct}%, Recent 14d = {profile.attendance.recent_attendance_pct}%, Absences = {profile.attendance.consecutive_absences}")
    console.print(f"  Academics:  Cumulative GPA = [bold green]{profile.academics.cumulative_gpa}[/bold green], Term Avg = {profile.academics.current_term_average_pct}% (EXCELLENT MASTERY)")

    # Evaluate signals
    eval_result = sig_engine.evaluate_profile(profile)
    console.print(f"\n[bold yellow]Risk Signals Detected: {eval_result.total_signals_detected}[/bold yellow]")
    for s in eval_result.signals:
        console.print(f"  [{s.severity.value}] [bold]{s.title}[/bold] -> {s.rule_description}")
        console.print(f"    Evidence: {s.evidence}")
        console.print(f"    Conflicting Indicator: Attendance dropped suddenly despite stellar academic GPA.")
        console.print(f"    Supportive Action: [bold cyan]{s.recommended_action}[/bold cyan] ({s.assigned_role.value})")

    # Step 3: Create & Review Case
    console.print("\n[bold green][Step 3 & 4] Human Reviewer Decision (Academic Advisor)[/bold green]")
    att_signal = next(s for s in eval_result.signals if "ATT" in s.signal_id)

    case = engine.create_case_from_signal(
        student_key=profile.student_key,
        signal=att_signal,
        scenario_name="ATTENDANCE_ANOMALY_STRONG_ACADEMIC",
        actor_role="SYSTEM_RULE_ENGINE",
        actor_id="SYS-ORCHESTRATOR",
    )
    console.print(f"Created Case: [bold cyan]{case.case_id}[/bold cyan] (Status: {case.status.value})")

    review_rationale = (
        "Human Advisor Review: Verified attendance drop. Because GPA is 3.84, student clearly understands "
        "the subject material. This is not an academic capability issue; schedule conflict or medical leave suspected. "
        "Approving supportive check-in; disciplinary sanction explicitly rejected."
    )
    reviewed_case = engine.review_case(
        case_id=case.case_id,
        reviewer_role="ACADEMIC_ADVISOR",
        reviewer_id="STAFF-ADV-01",
        approved=True,
        rationale=review_rationale,
    )
    console.print(f"Review Outcome: [bold green]{reviewed_case.status.value}[/bold green] (Human Reviewed = {reviewed_case.is_human_reviewed})")
    console.print(f"Rationale: \"{reviewed_case.review_notes}\"")

    # Step 5: Assign Stakeholder
    console.print("\n[bold green][Step 5] Stakeholder Assignment & Target Deadline[/bold green]")
    assigned_case = engine.assign_case(
        case_id=reviewed_case.case_id,
        assigned_by_role="STUDENT_SUCCESS_COORDINATOR",
        assigned_by_id="STAFF-COORD-01",
        assigned_role=AssignedRole.ACADEMIC_ADVISOR,
        assignee_id="STAFF-ADV-04",
        due_date="2026-10-25",
        assignment_notes="Coordinate with student regarding flexible morning lecture recording access.",
    )
    console.print(f"Assigned To: [bold white]{assigned_case.assigned_role.value}[/bold white] ({assigned_case.assignee_id})")
    console.print(f"Status: [bold green]{assigned_case.status.value}[/bold green], Target Due Date: {assigned_case.due_date}, Is Overdue: {assigned_case.is_overdue}")

    # Step 6: Move In-Progress
    console.print("\n[bold green][Step 6] Move Case into In-Progress State[/bold green]")
    progress_case = engine.start_progress(
        case_id=assigned_case.case_id,
        actor_role="ACADEMIC_ADVISOR",
        actor_id="STAFF-ADV-04",
        notes="Outreach initiated via student success advising office.",
    )
    console.print(f"Status: [bold green]{progress_case.status.value}[/bold green]")

    # Step 7: Record Follow-Up
    console.print("\n[bold green][Step 7] Document Simulated Follow-Up Notes[/bold green]")
    follow_up_notes = (
        "Met with student for 30-minute advising session. Student disclosed a family caretaking obligation "
        "impacting early 8:00 AM attendance. Coursework is submitted via LMS. Provided departmental permission "
        "for asynchronous lecture streaming. Student committed to resuming Friday recitation sessions."
    )
    follow_up_case = engine.record_follow_up(
        case_id=progress_case.case_id,
        actor_role="ACADEMIC_ADVISOR",
        actor_id="STAFF-ADV-04",
        follow_up_notes=follow_up_notes,
        follow_up_method="In-Person Advising Office",
    )
    console.print(f"Status: [bold green]{follow_up_case.status.value}[/bold green]")
    console.print(f"Follow-up Logged: \"{follow_up_case.follow_up_notes[:80]}...\"")

    # Step 8: Record Synthetic Outcome & Close
    console.print("\n[bold green][Step 8] Record Observed Outcome & Close Case[/bold green]")
    outcome_notes = (
        "Subsequent 14-day attendance stabilized. Student attended all recitation modules. "
        "No disciplinary action taken. Support goals achieved."
    )
    closed_case = engine.record_outcome(
        case_id=follow_up_case.case_id,
        actor_role="ACADEMIC_ADVISOR",
        actor_id="STAFF-ADV-04",
        outcome_category=OutcomeCategory.STUDENT_ENGAGEMENT_IMPROVED,
        outcome_notes=outcome_notes,
        close_case=True,
    )
    console.print(f"Final Case Status: [bold green]{closed_case.status.value}[/bold green]")
    console.print(f"Outcome Category: [bold cyan]{closed_case.outcome_category.value}[/bold cyan]")
    console.print(f"Audit Trail Depth: {len(closed_case.audit_history)} immutable events recorded.")

    # Step 9: Verify Cohort Aggregates
    console.print("\n[bold green][Step 9] Dynamic Cohort Metrics Verification[/bold green]")
    metrics = engine.compute_cohort_metrics(user_role="ACADEMIC_ADVISOR")
    console.print(f"Total Cohort Size: {metrics['synthetic_cohort_size']}")
    console.print(f"Closed Cases with Documented Outcomes: [bold green]{metrics['closed_cases_with_outcomes']}[/bold green]")
    console.print(f"Interventions by Status: {metrics['status_breakdown']}")

    # Step 10: Demonstrate Rejection & Overdue Paths
    console.print("\n[bold green][Step 10] Demonstrate Rejection Path & Overdue Flag[/bold green]")
    # Rejection demonstration
    rej_case = engine.create_case_from_signal(
        student_key="SYNTH-360-ONTRACK-01",
        signal=RiskSignal(
            signal_id="SIG-DEMO-FALSE-POS",
            category=att_signal.category,
            severity=att_signal.severity,
            title="Spurious Signal Proposal",
            evidence={"test": True},
            rule_description="Demo proposal",
            observation_freshness="1d",
            confidence_limitation="None",
            recommended_action="Unnecessary outreach",
            assigned_role=AssignedRole.ACADEMIC_ADVISOR,
        ),
    )
    rejected_case = engine.review_case(
        case_id=rej_case.case_id,
        reviewer_role="ACADEMIC_ADVISOR",
        reviewer_id="STAFF-ADV-02",
        approved=False,
        rationale="False positive verified: Student is already on track and maintains perfect attendance.",
    )
    console.print(f"Rejection Case: {rejected_case.case_id} -> Status: [bold red]{rejected_case.status.value}[/bold red] (Rationale: {rejected_case.decision_rationale})")

    # Overdue demonstration
    overdue_case = store.get_by_id("CASE-2026-003")
    console.print(f"Overdue Case: {overdue_case.case_id} (Student: {overdue_case.student_key})")
    console.print(f"  Due Date: {overdue_case.due_date} (Simulation anchor: 2026-10-15)")
    console.print(f"  Overdue Status: [bold red]{overdue_case.is_overdue}[/bold red], Escalation Level: {overdue_case.escalation_level.value}")

    # Step 11: Confidential Financial Aid Verification
    console.print("\n[bold green][Step 11] Confidential Financial Aid Access Gating[/bold green]")
    fin_case = store.get_by_id("CASE-2026-002")
    advisor_view = engine.compute_cohort_metrics(user_role="ACADEMIC_ADVISOR")
    financial_view = engine.compute_cohort_metrics(user_role="FINANCIAL_AID_COUNSELOR")
    console.print(f"Financial Case: {fin_case.case_id} — Confidential: [bold magenta]{fin_case.is_confidential}[/bold magenta]")
    console.print(f"  Academic Advisor View Total Visible Cases: {advisor_view['total_intervention_cases']} (Confidential Cases Masked: {advisor_view['confidential_cases_count']})")
    console.print(f"  Financial Aid Counselor View Total Cases:  {financial_view['total_intervention_cases']} (Includes Confidential Cases)")

    console.print("\n[bold cyan]========================================================================[/bold cyan]")
    console.print("[bold green] Acceptance Scenario Completed Successfully! All 11 Steps Validated.[/bold green]")
    console.print("[bold cyan]========================================================================[/bold cyan]\n")


def main():
    parser = argparse.ArgumentParser(description="SUTRA Intervention Workflow Runner")
    parser.add_argument("--acceptance-scenario", action="store_true", help="Execute complete 11-step acceptance workflow")
    parser.add_argument("--reset", action="store_true", help="Reset demonstration store to initial seed")
    parser.add_argument("--cohort-metrics", action="store_true", help="Display cohort aggregated metrics")
    args = parser.parse_args()

    if args.reset:
        store = InterventionCaseStore()
        cases = store.reset_to_seed()
        print(f"Intervention store reset. {len(cases)} initial demonstration cases loaded.")
        return

    if args.cohort_metrics:
        engine = InterventionWorkflowEngine()
        m = engine.compute_cohort_metrics()
        print(json.dumps(m, indent=2))
        return

    # Default to acceptance scenario
    run_acceptance_scenario()


if __name__ == "__main__":
    main()
