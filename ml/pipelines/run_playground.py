#!/usr/bin/env python3
"""
SUTRA Phase Sixteen — Interactive ML Testing Playground.

Usage:
    # 1. Interactive terminal menu:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py

    # 2. Run specific named scenario:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario HIGH_ENGAGEMENT_ON_TRACK
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario LOW_ENGAGEMENT_AT_RISK

    # 3. Run full synthetic batch and export results:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --batch-synthetic --export ml/reports/playground_results.json

    # 4. Run negative validation test cases:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --negative-tests

    # 5. Run custom JSON record or batch:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --input path/to/record.json
"""

import argparse
import json
from pathlib import Path
import sys

# Setup package paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.data.synthetic import SyntheticDataGenerator
from sutra_ml.testing.playground import SutraPlaygroundRunner

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt
    from rich.table import Table
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


def load_or_generate_synthetic_artifacts():
    synth_dir = ML_DIR / "data" / "synthetic"
    named_path = synth_dir / "named_scenarios.json"
    batch_path = synth_dir / "synthetic_batch_100.json"
    negative_path = synth_dir / "negative_test_cases.json"

    gen = SyntheticDataGenerator(seed=42)

    if not named_path.exists():
        synth_dir.mkdir(parents=True, exist_ok=True)
        named = gen.generate_named_scenarios()
        with open(named_path, "w", encoding="utf-8") as f:
            json.dump(named, f, indent=2)
    else:
        with open(named_path, "r", encoding="utf-8") as f:
            named = json.load(f)

    if not batch_path.exists():
        synth_dir.mkdir(parents=True, exist_ok=True)
        batch = gen.generate_batch(100)
        with open(batch_path, "w", encoding="utf-8") as f:
            json.dump(batch, f, indent=2)
    else:
        with open(batch_path, "r", encoding="utf-8") as f:
            batch = json.load(f)

    if not negative_path.exists():
        synth_dir.mkdir(parents=True, exist_ok=True)
        negative = gen.generate_negative_cases()
        with open(negative_path, "w", encoding="utf-8") as f:
            json.dump(negative, f, indent=2)
    else:
        with open(negative_path, "r", encoding="utf-8") as f:
            negative = json.load(f)

    return named, batch, negative


def run_interactive_menu(runner: SutraPlaygroundRunner, named: dict, batch: list, negative: dict):
    console = Console() if RICH_AVAILABLE else None

    while True:
        if RICH_AVAILABLE:
            console.print("\n")
            menu_table = Table(title="[bold blue]SUTRA ML Testing Playground — Main Menu[/bold blue]", border_style="blue")
            menu_table.add_column("Option", style="bold cyan", width=8, justify="center")
            menu_table.add_column("Action", style="bold white", width=50)
            menu_table.add_column("Description", style="dim", width=40)

            menu_table.add_row("1", "Scenario: High Engagement (On-Track)", "LMS 650 clicks, regular velocity, early submit")
            menu_table.add_row("2", "Scenario: Low Engagement (At-Risk)", "LMS 14 clicks, 22 days inactive, no submit")
            menu_table.add_row("3", "Scenario: Mixed Signals (Moderate)", "Good pre-course, steep post-start drop")
            menu_table.add_row("4", "Scenario: Edge Case Zero Values", "Valid absolute lower-bound features")
            menu_table.add_row("5", "Scenario: Edge Case Maximum Values", "Valid upper-tier workload and 3,200 clicks")
            menu_table.add_row("6", "Scenario: Unseen Module ('XXX')", "Robustness fallback on unmodeled course code")
            menu_table.add_row("7", "Run Full Synthetic Batch (100 Records)", "Batch latency & score distribution stats")
            menu_table.add_row("8", "Negative Schema Validation Cases", "Fail-closed check on invalid inputs/leakage")
            menu_table.add_row("9", "View Model Governance & Thresholds", "Inspect active production v1.0.0 contract")
            menu_table.add_row("0", "Exit Playground", "Terminate interactive session")

            console.print(menu_table)
            choice = Prompt.ask("\nSelect an option", choices=[str(i) for i in range(10)], default="1")
        else:
            print("\n--- SUTRA ML Playground Menu ---")
            print("1: Scenario: High Engagement")
            print("2: Scenario: Low Engagement")
            print("3: Scenario: Mixed Signals")
            print("4: Scenario: Edge Case Zero")
            print("5: Scenario: Edge Case Max")
            print("6: Scenario: Unseen Module ('XXX')")
            print("7: Run Full Synthetic Batch (100 Records)")
            print("8: Negative Schema Validation Cases")
            print("9: View Model Governance")
            print("0: Exit")
            choice = input("Select an option [1-9, 0]: ").strip()

        if choice == "0":
            if RICH_AVAILABLE:
                console.print("[green]Exiting SUTRA Playground. Goodbye![/green]")
            else:
                print("Exiting.")
            break

        scenario_map = {
            "1": "HIGH_ENGAGEMENT_ON_TRACK",
            "2": "LOW_ENGAGEMENT_AT_RISK",
            "3": "MIXED_SIGNALS_MODERATE",
            "4": "EDGE_CASE_ZERO_VALUES",
            "5": "EDGE_CASE_MAX_VALUES",
            "6": "UNSEEN_MODULE_FALLBACK",
        }

        if choice in scenario_map:
            s_name = scenario_map[choice]
            raw_rec = named[s_name]
            if RICH_AVAILABLE:
                console.print(f"\n[bold green]>>> Running Scenario: {s_name}[/bold green]")
                console.print(f"[dim]{raw_rec.get('description', '')}[/dim]")
            res = runner.score_record(raw_rec)
            runner.display_prediction(res)

            show_features = Prompt.ask("Show input features used? (y/N)", default="n") if RICH_AVAILABLE else input("Show input features? (y/n): ")
            if show_features.strip().lower() == "y":
                runner.display_input_features(res["input_features"])

        elif choice == "7":
            if RICH_AVAILABLE:
                console.print("\n[bold green]>>> Running Batch Scoring (100 Synthetic Records)...[/bold green]")
            batch_res = runner.run_batch_synthetic(
                batch,
                export_path=ML_DIR / "reports" / "playground_batch_100_results.json",
            )
            runner.display_batch_summary(batch_res["summary"])
            if RICH_AVAILABLE:
                console.print(f"[dim]Results saved to: ml/reports/playground_batch_100_results.json[/dim]")

        elif choice == "8":
            if RICH_AVAILABLE:
                console.print("\n[bold green]>>> Running Negative Test Suite (7 Validation Cases)...[/bold green]")
            outcomes = runner.run_negative_test_suite(negative)
            runner.display_negative_results(outcomes)

        elif choice == "9":
            gov_panel = (
                f"Model Algorithm: {runner.predictor.model_name}\n"
                f"Model Artifact Version: {runner.predictor.model_version}\n"
                f"Artifact Path: {runner.model_path}\n"
                f"Decision Boundary: {runner.predictor.operational_threshold} (Human Review Recommendation)\n"
                f"Total Observable Features: 25 (19 numerical, 6 categorical)\n"
                f"Observation Window: Up to Day 30\n"
                f"Assessment Marks: Excluded due to grading latency\n"
                f"Primary Principle: Non-Causal Early Warning Decision Support"
            )
            if RICH_AVAILABLE:
                console.print(Panel(gov_panel, title="[bold cyan]Active Production Model Governance Contract[/bold cyan]", border_style="cyan"))
            else:
                print(gov_panel)


def main():
    parser = argparse.ArgumentParser(description="SUTRA ML Testing Playground")
    parser.add_argument("--scenario", type=str, help="Named scenario to run")
    parser.add_argument("--batch-synthetic", action="store_true", help="Run 100-record synthetic batch")
    parser.add_argument("--negative-tests", action="store_true", help="Run negative test suite")
    parser.add_argument("--input", type=str, help="Path to custom JSON or CSV input file")
    parser.add_argument("--export", type=str, help="Path to export results as JSON")
    parser.add_argument("--show-features", action="store_true", help="Display full input feature vector")
    parser.add_argument("--interactive", action="store_true", help="Launch interactive terminal menu")
    args = parser.parse_args()

    named, batch, negative = load_or_generate_synthetic_artifacts()
    runner = SutraPlaygroundRunner()

    # Direct CLI scenario execution
    if args.scenario:
        if args.scenario not in named:
            print(f"[!] Unknown scenario '{args.scenario}'. Available: {list(named.keys())}")
            sys.exit(1)
        raw_rec = named[args.scenario]
        print(f"[*] Running Scenario: {args.scenario}")
        res = runner.score_record(raw_rec)
        runner.display_prediction(res)
        if args.show_features:
            runner.display_input_features(res["input_features"])
        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(res, f, indent=2)
            print(f"[+] Result exported to {args.export}")
        return

    # Direct batch execution
    if args.batch_synthetic:
        print("[*] Running 100-record synthetic batch...")
        export_file = args.export or str(ML_DIR / "reports" / "playground_batch_100_results.json")
        batch_res = runner.run_batch_synthetic(batch, export_path=export_file)
        runner.display_batch_summary(batch_res["summary"])
        print(f"[+] Batch results exported to {export_file}")
        return

    # Negative test execution
    if args.negative_tests:
        print("[*] Running negative validation test suite...")
        outcomes = runner.run_negative_test_suite(negative)
        runner.display_negative_results(outcomes)
        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(outcomes, f, indent=2)
            print(f"[+] Negative test results exported to {args.export}")
        return

    # Custom input file execution
    if args.input:
        in_path = Path(args.input)
        if not in_path.exists():
            print(f"[!] File not found: {in_path}")
            sys.exit(1)
        print(f"[*] Loading input from {in_path}...")
        with open(in_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            export_file = args.export or str(ML_DIR / "reports" / "playground_custom_batch_results.json")
            batch_res = runner.run_batch_synthetic(data, export_path=export_file)
            runner.display_batch_summary(batch_res["summary"])
            print(f"[+] Custom batch results exported to {export_file}")
        elif isinstance(data, dict):
            res = runner.score_record(data)
            runner.display_prediction(res)
            if args.show_features:
                runner.display_input_features(res["input_features"])
            if args.export:
                with open(args.export, "w", encoding="utf-8") as f:
                    json.dump(res, f, indent=2)
                print(f"[+] Result exported to {args.export}")
        return

    # Default to interactive menu if no specific flags
    run_interactive_menu(runner, named, batch, negative)


if __name__ == "__main__":
    main()
