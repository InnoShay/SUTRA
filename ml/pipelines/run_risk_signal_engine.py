#!/usr/bin/env python3
"""
SUTRA Phase Seventeen — Explainable Risk Signal Engine & 360 Profile Inspector.

Executes transparent risk signal evaluations across multisource student profiles,
demonstrating explainable indicators, evidence citations, supportive interventions,
and confidential support routing.

Usage:
    # 1. Interactive terminal inspector:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_risk_signal_engine.py

    # 2. Evaluate a specific demonstration scenario:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_risk_signal_engine.py --scenario ATTENDANCE_ANOMALY_STRONG_ACADEMIC
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_risk_signal_engine.py --scenario FINANCIAL_SUPPORT_NEEDED

    # 3. Batch evaluation over 100 multisource profiles:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_risk_signal_engine.py --batch-multisource --export ml/reports/multisource_batch_100_signals.json
"""

import argparse
import json
from pathlib import Path
import sys
from typing import Any, Optional

# Setup package paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.data.multisource_generator import MultisourceDataGenerator
from sutra_ml.schemas.multisource import StudentSuccess360Profile
from sutra_ml.signals.integration_boundary import MultisourceOrchestrator

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt
    from rich.table import Table
    from rich.text import Text
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


def load_or_generate_multisource_data():
    synth_dir = ML_DIR / "data" / "synthetic"
    scenarios_path = synth_dir / "multisource_scenarios.json"
    batch_path = synth_dir / "multisource_batch_100.json"

    gen = MultisourceDataGenerator(seed=42)

    if not scenarios_path.exists():
        synth_dir.mkdir(parents=True, exist_ok=True)
        scenarios = gen.generate_named_scenarios()
        with open(scenarios_path, "w", encoding="utf-8") as f:
            json.dump({k: v.model_dump() for k, v in scenarios.items()}, f, indent=2)
    else:
        with open(scenarios_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            scenarios = {k: StudentSuccess360Profile(**v) for k, v in raw.items()}

    if not batch_path.exists():
        synth_dir.mkdir(parents=True, exist_ok=True)
        batch = gen.generate_batch(100)
        with open(batch_path, "w", encoding="utf-8") as f:
            json.dump([p.model_dump() for p in batch], f, indent=2)
    else:
        with open(batch_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            batch = [StudentSuccess360Profile(**p) for p in raw]

    return scenarios, batch


def display_integrated_card(card, console: Optional[Any] = None):
    """Render a comprehensive 360 student success card."""
    if not RICH_AVAILABLE or console is None:
        print("\n" + "=" * 70)
        print(f"360 STUDENT SUCCESS CARD: {card.student_key} ({card.department}, Year {card.program_year})")
        print(f"Term: {card.academic_term} | Cutoff: {card.snapshot_timestamp}")
        print(f"Prototype Composite Priority: {card.prototype_composite.composite_score_0_to_100}/100 [{card.prototype_composite.priority_level}]")
        print("-" * 70)
        print("ACTIVE RISK & SUPPORT SIGNALS:")
        for s in card.active_risk_signals:
            print(f"  [{s.severity.value}] {s.title} ({s.category.value})")
            print(f"       Assigned: {s.assigned_role.value}")
            print(f"       Evidence: {s.evidence}")
            print(f"       Action: {s.recommended_action}")
        if card.confidential_support_signals:
            print("-" * 70)
            print("CONFIDENTIAL SUPPORT SIGNALS (RESTRICTED TO FINANCIAL AID):")
            for cs in card.confidential_support_signals:
                print(f"  [RESTRICTED - {cs.severity.value}] {cs.title}")
                print(f"       Assigned: {cs.assigned_role.value}")
                print(f"       Action: {cs.recommended_action}")
        print("=" * 70 + "\n")
        return

    # Header Panel
    comp = card.prototype_composite
    comp_color = "red" if comp.priority_level == "CRITICAL" else "yellow" if comp.priority_level == "HIGH" else "cyan" if comp.priority_level == "MEDIUM" else "green"

    header = Text()
    header.append(f"Student Key: {card.student_key}  ", style="bold white")
    header.append(f"[{card.department} | Year {card.program_year} | {card.academic_term}]\n", style="dim")
    header.append("Prototype Composite Triage Index: ", style="bold")
    header.append(f"{comp.composite_score_0_to_100:.1f} / 100  ", style=f"bold {comp_color}")
    header.append(f"[{comp.priority_level}]  ", style=f"bold {comp_color}")
    header.append("(Configurable Rule Summation — Not an ML Probability)\n", style="dim")
    header.append(f"Cutoff Observation Date: {card.snapshot_timestamp}", style="dim white")

    console.print(Panel(header, title="[bold blue]CODEX 3.0 Student Success 360° Profile[/bold blue]", border_style="blue"))

    # Active Signals Table
    if card.active_risk_signals:
        sig_table = Table(title="[bold red]Active Multisource Risk & Support Signals[/bold red]", border_style="red")
        sig_table.add_column("Severity", style="bold", width=12)
        sig_table.add_column("Category", style="cyan", width=22)
        sig_table.add_column("Signal Title", style="bold white", width=34)
        sig_table.add_column("Assigned Role", style="yellow", width=24)
        sig_table.add_column("Recommended Action (Supportive)", style="dim white", width=42)

        for s in card.active_risk_signals:
            sev_style = "bold red" if s.severity.value in ["CRITICAL", "HIGH"] else "yellow" if s.severity.value == "MEDIUM" else "green"
            sig_table.add_row(
                f"[{sev_style}]{s.severity.value}[/{sev_style}]",
                s.category.value,
                s.title,
                s.assigned_role.value,
                s.recommended_action,
            )
        console.print(sig_table)
    else:
        console.print(Panel("[green]✓ No active academic, attendance, or participation risk signals detected.[/green]", border_style="green"))

    # Confidential Signals (Financial Aid)
    if card.confidential_support_signals:
        conf_table = Table(title="[bold magenta]Confidential Support Signals (Restricted Access: Financial Aid Office)[/bold magenta]", border_style="magenta")
        conf_table.add_column("Severity", style="bold", width=12)
        conf_table.add_column("Signal Title", style="bold white", width=34)
        conf_table.add_column("Assigned Role", style="magenta", width=24)
        conf_table.add_column("Confidential Guidance & Next Steps", style="dim white", width=50)

        for cs in card.confidential_support_signals:
            conf_table.add_row(
                cs.severity.value,
                cs.title,
                cs.assigned_role.value,
                cs.recommended_action,
            )
        console.print(conf_table)

    # ML Isolation Notice
    ml_panel = (
        f"[bold cyan]Architectural Isolation Boundary Status:[/bold cyan]\n"
        f"• Production ML Model: {card.boundary_contract.ml_model_name} ({card.boundary_contract.ml_model_version})\n"
        f"• ML Access to Multisource Attributes: [bold green]NONE (Zero Attendance, Fee, or Skills Exposure)[/bold green]\n"
        f"• Risk Signal Engine: [bold green]Transparent Rule-Based Heuristics (Deterministic Orchestration)[/bold green]\n"
        f"• Non-Punitive Mandate: [dim]{card.governance_mandates['non_punitive']}[/dim]"
    )
    console.print(Panel(ml_panel, border_style="cyan"))


def run_batch_summary(orchestrator, batch: list, export_path: Optional[str] = None):
    console = Console() if RICH_AVAILABLE else None
    results = [orchestrator.process_student_360(p) for p in batch]

    total = len(results)
    urgent_count = sum(1 for r in results if r.prototype_composite.priority_level in ["CRITICAL", "HIGH"])
    confidential_count = sum(1 for r in results if len(r.confidential_support_signals) > 0)

    category_counts = {}
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    role_counts = {}

    for r in results:
        for s in r.active_risk_signals + r.confidential_support_signals:
            cat = s.category.value
            sev = s.severity.value
            role = s.assigned_role.value
            category_counts[cat] = category_counts.get(cat, 0) + 1
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            role_counts[role] = role_counts.get(role, 0) + 1

    summary = {
        "total_cohort_profiles": total,
        "high_or_critical_priority_profiles": urgent_count,
        "urgent_priority_rate_pct": round((urgent_count / max(1, total)) * 100.0, 1),
        "confidential_financial_referrals": confidential_count,
        "signals_by_severity": severity_counts,
        "signals_by_category": category_counts,
        "tasks_by_assigned_role": role_counts,
    }

    if export_path:
        out_p = Path(export_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "summary": summary,
            "profiles": [r.model_dump() for r in results],
        }
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"[+] Batch results exported to {out_p}")

    if not RICH_AVAILABLE or console is None:
        print("\nBATCH 360 COHORT SUMMARY (N = 100):")
        print(f"Total Profiles: {total}")
        print(f"High / Critical Profiles: {urgent_count} ({summary['urgent_priority_rate_pct']}%)")
        print(f"Confidential Financial Referrals: {confidential_count}")
        print(f"Signals by Severity: {severity_counts}")
        print(f"Signals by Category: {category_counts}")
        print(f"Role Assignments: {role_counts}\n")
        return

    table = Table(title="[bold]Multisource 360 Cohort Signal Summary (N = 100)[/bold]", border_style="blue")
    table.add_column("Cohort Metric", style="cyan", width=36)
    table.add_column("Count / Distribution", style="bold white", width=36)

    table.add_row("Total Student Profiles Evaluated", str(total))
    table.add_row(
        "Triage Priority: High / Critical",
        f"{urgent_count} ({summary['urgent_priority_rate_pct']}%)",
    )
    table.add_row(
        "Confidential Financial Support Referrals",
        f"{confidential_count} (routed to Financial Aid)",
    )
    table.add_row(
        "Signal Breakdown by Severity",
        f"CRIT: {severity_counts['CRITICAL']} | HIGH: {severity_counts['HIGH']} | MED: {severity_counts['MEDIUM']} | LOW: {severity_counts['LOW']}",
    )
    table.add_row(
        "Signal Categories Triggered",
        f"ATT: {category_counts.get('ATTENDANCE', 0)} | ACAD: {category_counts.get('ACADEMIC', 0)} | LMS: {category_counts.get('PARTICIPATION', 0)} | FIN: {category_counts.get('FINANCIAL_SUPPORT', 0)}",
    )
    table.add_row(
        "Primary Action Ownership",
        f"Advisor: {role_counts.get('ACADEMIC_ADVISOR', 0)} | Instructor: {role_counts.get('COURSE_INSTRUCTOR', 0)} | FinAid: {role_counts.get('FINANCIAL_AID_COUNSELOR', 0)}",
    )

    console.print(table)


def run_interactive_menu(orchestrator, scenarios: dict, batch: list):
    console = Console() if RICH_AVAILABLE else None

    scenario_keys = list(scenarios.keys())

    while True:
        if RICH_AVAILABLE:
            console.print("\n")
            menu = Table(title="[bold blue]SUTRA CODEX 3.0 — Multisource 360 Risk Signal Engine[/bold blue]", border_style="blue")
            menu.add_column("Option", style="bold cyan", width=8, justify="center")
            menu.add_column("Scenario / Action", style="bold white", width=44)
            menu.add_column("Behavioral Archetype", style="dim", width=46)

            for i, name in enumerate(scenario_keys, 1):
                clean_name = name.replace("_", " ").title()
                desc = scenarios[name].scenario_name or "Curated scenario"
                menu.add_row(str(i), clean_name, desc)

            menu.add_row("B", "Evaluate Full Cohort Batch (100 Profiles)", "Batch cross-domain signal triage statistics")
            menu.add_row("0", "Exit Inspector", "Return to shell")

            console.print(menu)
            choice = Prompt.ask("\nSelect scenario or action", default="1")
        else:
            print("\nSelect an option:")
            for i, name in enumerate(scenario_keys, 1):
                print(f"  {i}: {name}")
            print("  B: Batch 100 Profiles")
            print("  0: Exit")
            choice = input("Enter choice: ").strip()

        if choice == "0":
            break

        if choice.upper() == "B":
            run_batch_summary(orchestrator, batch, export_path=str(ML_DIR / "reports" / "multisource_batch_100_signals.json"))
            continue

        try:
            idx = int(choice) - 1
            if 0 <= idx < len(scenario_keys):
                name = scenario_keys[idx]
                prof = scenarios[name]
                card = orchestrator.process_student_360(prof)
                display_integrated_card(card, console)
        except ValueError:
            print("[!] Invalid selection.")


def main():
    parser = argparse.ArgumentParser(description="SUTRA Multisource Risk Signal Engine Inspector")
    parser.add_argument("--scenario", type=str, help="Named scenario to evaluate")
    parser.add_argument("--batch-multisource", action="store_true", help="Run batch evaluation over 100 profiles")
    parser.add_argument("--input", type=str, help="Path to custom 360 profile JSON file")
    parser.add_argument("--export", type=str, help="Path to export results as JSON")
    args = parser.parse_args()

    scenarios, batch = load_or_generate_multisource_data()
    orchestrator = MultisourceOrchestrator()
    console = Console() if RICH_AVAILABLE else None

    if args.scenario:
        if args.scenario not in scenarios:
            print(f"[!] Unknown scenario '{args.scenario}'. Available: {list(scenarios.keys())}")
            sys.exit(1)
        prof = scenarios[args.scenario]
        card = orchestrator.process_student_360(prof)
        display_integrated_card(card, console)
        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(card.model_dump(), f, indent=2)
            print(f"[+] Output exported to {args.export}")
        return

    if args.batch_multisource:
        export_p = args.export or str(ML_DIR / "reports" / "multisource_batch_100_signals.json")
        run_batch_summary(orchestrator, batch, export_path=export_p)
        return

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        prof = StudentSuccess360Profile(**data)
        card = orchestrator.process_student_360(prof)
        display_integrated_card(card, console)
        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(card.model_dump(), f, indent=2)
            print(f"[+] Output exported to {args.export}")
        return

    run_interactive_menu(orchestrator, scenarios, batch)


if __name__ == "__main__":
    main()
