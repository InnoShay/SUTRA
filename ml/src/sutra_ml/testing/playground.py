"""
SUTRA Interactive Prediction Testing Playground.

Enables manual inspection, single-record scoring, batch synthetic evaluation,
and evidence attribution inspection using the production Regularized Logistic Regression model.
"""

from dataclasses import asdict
import json
from pathlib import Path
import time
from typing import Any, Optional
import numpy as np
import pandas as pd
from pydantic import ValidationError

from app.core.config import DEFAULT_METADATA_PATH, DEFAULT_MODEL_PATH
from app.schemas.features import StudentFeatureInput
from sutra_ml.inference.predictor import PredictionResult, SutraRiskPredictor
from sutra_ml.schemas.evidence_card import RiskTier

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


class SutraPlaygroundRunner:
    """
    Runner for manual and automated local model testing.
    """

    def __init__(
        self,
        model_path: Optional[Path | str] = None,
        metadata_path: Optional[Path | str] = None,
    ):
        self.model_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
        self.metadata_path = Path(metadata_path) if metadata_path else DEFAULT_METADATA_PATH
        self.predictor = SutraRiskPredictor(
            model_path=self.model_path,
            metadata_path=self.metadata_path,
        )
        self.console = Console() if RICH_AVAILABLE else None

    @property
    def is_ready(self) -> bool:
        return self.predictor.is_ready

    def score_record(self, raw_record: dict[str, Any]) -> dict[str, Any]:
        """
        Validate raw input using StudentFeatureInput, score using production predictor,
        and return serializable result dictionary with explanation.
        """
        # Exclude description if present
        payload_data = {k: v for k, v in raw_record.items() if k != "description"}

        # 1. Validate through strict Pydantic v2 contract
        validated_input = StudentFeatureInput(**payload_data)
        feature_dict = validated_input.to_feature_dict()

        # 2. Score with loaded model and compute local explanations
        t0 = time.perf_counter()
        result: PredictionResult = self.predictor.predict_single(
            feature_data=feature_dict,
            record_id=validated_input.record_id,
            module_code=validated_input.code_module,
            presentation_code=validated_input.code_presentation,
        )
        latency_ms = (time.perf_counter() - t0) * 1000.0

        # 3. Assemble serializable output
        card = result.evidence_card
        output = {
            "record_id": result.record_id,
            "module_code": card.course_context.module_code,
            "presentation_code": card.course_context.presentation_code,
            "model_name": result.model_name,
            "model_version": result.model_version,
            "operational_threshold": result.operational_threshold,
            "risk_probability": result.risk_probability,
            "review_recommended": result.review_recommended,
            "risk_tier": result.risk_tier.value,
            "latency_ms": round(latency_ms, 2),
            "input_features": feature_dict,
            "top_risk_drivers": [
                {
                    "title": f.factor_title,
                    "observed_raw": f.observed_raw_value,
                    "weight": round(f.contribution_weight, 4),
                    "summary": f.plain_english_summary,
                }
                for f in card.top_risk_drivers
            ],
            "top_protective_factors": [
                {
                    "title": f.factor_title,
                    "observed_raw": f.observed_raw_value,
                    "weight": round(f.contribution_weight, 4),
                    "summary": f.plain_english_summary,
                }
                for f in card.top_protective_factors
            ],
            "governance_notices": {
                "non_causal_disclaimer": card.governance_notices.non_causal_disclaimer,
                "data_boundary_caveat": card.governance_notices.data_boundary_caveat,
                "human_in_the_loop_mandate": card.governance_notices.human_in_the_loop_mandate,
            },
        }
        return output

    def display_prediction(self, res: dict[str, Any]) -> None:
        """Render a formatted view of the prediction and explanation."""
        if not RICH_AVAILABLE:
            print("\n" + "=" * 60)
            print(f"Record ID: {res['record_id']} ({res['module_code']} / {res['presentation_code']})")
            print(f"Model: {res['model_name']} ({res['model_version']})")
            print(f"Threshold: {res['operational_threshold']:.2f}")
            print(f"P(At-Risk): {res['risk_probability']:.4f}")
            print(f"Review Recommended: {res['review_recommended']} [{res['risk_tier']}]")
            print("-" * 60)
            print("Top Risk Drivers:")
            for d in res["top_risk_drivers"]:
                print(f"  + {d['title']}: {d['observed_raw']} (weight: {d['weight']:+.4f}) - {d['summary']}")
            print("Top Protective Factors:")
            for p in res["top_protective_factors"]:
                print(f"  - {p['title']}: {p['observed_raw']} (weight: {p['weight']:+.4f}) - {p['summary']}")
            print("=" * 60 + "\n")
            return

        # Rich rendering
        tier = res["risk_tier"]
        tier_color = "red" if tier == "HIGH" else "yellow" if tier == "ELEVATED" else "cyan" if tier == "MODERATE" else "green"
        rec_color = "bold red" if res["review_recommended"] else "bold green"

        header = Text()
        header.append(f"Record: {res['record_id']} ", style="bold white")
        header.append(f"[{res['module_code']} / {res['presentation_code']}]\n", style="dim")
        header.append(f"Model: {res['model_name']} ({res['model_version']})  |  ", style="dim white")
        header.append(f"Decision Boundary: {res['operational_threshold']:.2f}\n", style="dim white")
        header.append("Estimated Risk Probability: ", style="bold")
        header.append(f"{res['risk_probability']:.4f}  ", style="bold yellow" if res['risk_probability'] >= 0.46 else "bold cyan")
        header.append(f"[{tier}]  ", style=f"bold {tier_color}")
        header.append("Review Recommended: ", style="bold")
        header.append(f"{'YES' if res['review_recommended'] else 'NO'}", style=rec_color)

        self.console.print(Panel(header, title="[bold blue]SUTRA Prediction Result[/bold blue]", border_style="blue"))

        # Evidence Card Table
        card_table = Table(title="[bold]SUTRA Evidence Card (Local Linear Decomposition)[/bold]", border_style="dim")
        card_table.add_column("Type", style="bold", width=12)
        card_table.add_column("Factor", style="cyan", width=28)
        card_table.add_column("Observed Value", style="white", width=18)
        card_table.add_column("Weight (Log-Odds)", justify="right", width=18)
        card_table.add_column("Advisor Plain-English Summary", style="dim white", width=42)

        for d in res["top_risk_drivers"]:
            card_table.add_row(
                "[red]Risk Driver[/red]",
                d["title"],
                str(d["observed_raw"]),
                f"[red]{d['weight']:+.4f}[/red]",
                d["summary"],
            )
        for p in res["top_protective_factors"]:
            card_table.add_row(
                "[green]Protective[/green]",
                p["title"],
                str(p["observed_raw"]),
                f"[green]{p['weight']:+.4f}[/green]",
                p["summary"],
            )

        self.console.print(card_table)

        # Governance Notice Box
        gov = res["governance_notices"]
        gov_text = (
            f"[dim]• Non-Causal: {gov['non_causal_disclaimer']}\n"
            f"• Data Boundary: {gov['data_boundary_caveat']}\n"
            f"• Advisor Mandate: {gov['human_in_the_loop_mandate']}[/dim]"
        )
        self.console.print(Panel(gov_text, title="[bold yellow]Governance Guardrails[/bold yellow]", border_style="yellow"))

    def display_input_features(self, feat_dict: dict[str, Any]) -> None:
        """Display table of the 25 input features."""
        if not RICH_AVAILABLE:
            print("\nInput Features (25):")
            for k, v in feat_dict.items():
                print(f"  {k}: {v}")
            return

        table = Table(title="[bold]Observable Day-30 Feature Vector (25 Features)[/bold]", border_style="dim")
        table.add_column("Feature Key", style="cyan", width=35)
        table.add_column("Type", style="dim", width=12)
        table.add_column("Value", style="bold white", width=25)

        for k, v in feat_dict.items():
            feat_type = "Categorical" if isinstance(v, str) else "Numerical"
            table.add_row(k, feat_type, str(v))

        self.console.print(table)

    def run_batch_synthetic(
        self,
        batch_records: list[dict[str, Any]],
        export_path: Optional[Path | str] = None,
    ) -> dict[str, Any]:
        """
        Run inference over a batch of synthetic records and compute summary statistics.
        """
        results = []
        t_start = time.perf_counter()

        for rec in batch_records:
            res = self.score_record(rec)
            results.append(res)

        total_time_ms = (time.perf_counter() - t_start) * 1000.0
        n = len(results)
        probs = [r["risk_probability"] for r in results]
        alerts = [r for r in results if r["review_recommended"]]
        tiers = [r["risk_tier"] for r in results]

        summary = {
            "total_records_scored": n,
            "total_execution_time_ms": round(total_time_ms, 2),
            "mean_latency_ms_per_record": round(total_time_ms / max(1, n), 2),
            "model_name": self.predictor.model_name,
            "model_version": self.predictor.model_version,
            "operational_threshold": self.predictor.operational_threshold,
            "risk_probability_statistics": {
                "min": round(float(np.min(probs)), 4),
                "max": round(float(np.max(probs)), 4),
                "mean": round(float(np.mean(probs)), 4),
                "median": round(float(np.median(probs)), 4),
                "std": round(float(np.std(probs)), 4),
            },
            "alerts_recommended": len(alerts),
            "alert_rate_pct": round((len(alerts) / max(1, n)) * 100.0, 2),
            "tier_counts": {
                "LOW": tiers.count("LOW"),
                "MODERATE": tiers.count("MODERATE"),
                "ELEVATED": tiers.count("ELEVATED"),
                "HIGH": tiers.count("HIGH"),
            },
            "synthetic_notice": (
                "STATISTICAL SUMMARY OVER SYNTHETIC TESTING RECORDS ONLY. "
                "NOT A REPRESENTATION OF HISTORICAL OR PROSPECTIVE POPULATION ACCURACY."
            ),
        }

        if export_path:
            out_file = Path(export_path)
            out_file.parent.mkdir(parents=True, exist_ok=True)
            export_payload = {
                "summary": summary,
                "predictions": results,
            }
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(export_payload, f, indent=2)

        return {"summary": summary, "results": results}

    def display_batch_summary(self, summary: dict[str, Any]) -> None:
        """Display formatted batch summary."""
        if not RICH_AVAILABLE:
            print("\n" + "=" * 60)
            print("BATCH EXECUTION SUMMARY (SYNTHETIC RECORDS)")
            print(f"Total Scored: {summary['total_records_scored']}")
            print(f"Mean Latency: {summary['mean_latency_ms_per_record']} ms/record")
            print(f"Alerts Triggered: {summary['alerts_recommended']} ({summary['alert_rate_pct']}%)")
            print(f"Probabilities: min={summary['risk_probability_statistics']['min']}, "
                  f"mean={summary['risk_probability_statistics']['mean']}, "
                  f"max={summary['risk_probability_statistics']['max']}")
            print(f"Tiers: {summary['tier_counts']}")
            print("=" * 60 + "\n")
            return

        table = Table(title="[bold]Synthetic Batch Inference Summary (N = %d)[/bold]" % summary["total_records_scored"])
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="bold white")

        table.add_row("Model Version", f"{summary['model_name']} ({summary['model_version']})")
        table.add_row("Operational Decision Threshold", f"{summary['operational_threshold']:.2f}")
        table.add_row("Total Records Scored", str(summary["total_records_scored"]))
        table.add_row("Mean Latency per Record", f"{summary['mean_latency_ms_per_record']} ms")
        table.add_row(
            "Alerts (Review Recommended >= 0.46)",
            f"{summary['alerts_recommended']} ({summary['alert_rate_pct']}%)",
        )
        table.add_row("Min Risk Probability", f"{summary['risk_probability_statistics']['min']:.4f}")
        table.add_row("Mean Risk Probability", f"{summary['risk_probability_statistics']['mean']:.4f}")
        table.add_row("Median Risk Probability", f"{summary['risk_probability_statistics']['median']:.4f}")
        table.add_row("Max Risk Probability", f"{summary['risk_probability_statistics']['max']:.4f}")
        table.add_row(
            "Risk Tier Breakdown",
            f"LOW: {summary['tier_counts']['LOW']}  |  MODERATE: {summary['tier_counts']['MODERATE']}  |  "
            f"ELEVATED: {summary['tier_counts']['ELEVATED']}  |  HIGH: {summary['tier_counts']['HIGH']}",
        )

        self.console.print(table)
        self.console.print(Panel(f"[dim]{summary['synthetic_notice']}[/dim]", border_style="yellow"))

    def run_negative_test_suite(self, negative_cases: dict[str, Any]) -> dict[str, Any]:
        """
        Execute negative test cases to prove fail-closed validation behavior.
        """
        outcomes = {}
        for name, case_info in negative_cases.items():
            record = case_info["record"]
            expected = case_info["expected_error"]
            desc = case_info["description"]
            try:
                StudentFeatureInput(**record)
                outcomes[name] = {
                    "rejected": False,
                    "error_message": "Unexpectedly accepted without error",
                    "status": "FAIL",
                    "description": desc,
                }
            except ValidationError as exc:
                err_msgs = [e.get("msg", "") for e in exc.errors()]
                outcomes[name] = {
                    "rejected": True,
                    "error_message": "; ".join(err_msgs),
                    "status": "PASS",
                    "description": desc,
                    "expected_error": expected,
                }
            except Exception as exc:
                outcomes[name] = {
                    "rejected": True,
                    "error_message": str(exc),
                    "status": "PASS",
                    "description": desc,
                    "expected_error": expected,
                }
        return outcomes

    def display_negative_results(self, outcomes: dict[str, Any]) -> None:
        """Display formatted negative testing results table."""
        if not RICH_AVAILABLE:
            print("\nNegative Schema Validation Rejections:")
            for k, v in outcomes.items():
                print(f"  [{v['status']}] {k}: {v['error_message']}")
            return

        table = Table(title="[bold red]Negative Test Cases: Fail-Closed Schema Rejection Verification[/bold red]")
        table.add_column("Case Name", style="bold white", width=28)
        table.add_column("Description", style="dim", width=36)
        table.add_column("Rejected?", justify="center", width=12)
        table.add_column("Validation Error Encountered", style="red", width=42)

        for name, out in outcomes.items():
            status_text = "[green]REJECTED (PASS)[/green]" if out["rejected"] else "[red]ACCEPTED (FAIL)[/red]"
            table.add_row(name, out["description"], status_text, out["error_message"])

        self.console.print(table)
