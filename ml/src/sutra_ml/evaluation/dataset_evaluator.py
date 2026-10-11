"""
SUTRA Labeled Dataset Evaluator.

Provides standardized evaluation of the approved production model against
real, labeled datasets with verified binary target semantics.
"""

from pathlib import Path
from typing import Any, Optional
import numpy as np
import pandas as pd

from app.core.config import DEFAULT_METADATA_PATH, DEFAULT_MODEL_PATH
from sutra_ml.evaluation.calibration import compute_calibration_assessment
from sutra_ml.evaluation.metrics import compute_comprehensive_metrics
from sutra_ml.inference.predictor import SutraRiskPredictor

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


def evaluate_dataset(
    data_path: Path | str,
    target_col: str = "target",
    presentation: Optional[str] = None,
    threshold: float = 0.46,
    dataset_label: str = "OULAD Day-30 Processed Data",
    model_path: Optional[Path | str] = None,
    metadata_path: Optional[Path | str] = None,
) -> dict[str, Any]:
    """
    Run frozen production model evaluation on approved labeled data.
    """
    data_path = Path(data_path)
    if not data_path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at: {data_path}")

    # 1. Load data
    df = pd.read_csv(data_path)
    total_raw_rows = len(df)

    # 2. Check target presence and compatibility
    if target_col not in df.columns:
        raise ValueError(
            f"Actionable Error: Target column '{target_col}' not found in {data_path.name}. "
            f"Model evaluation requires an explicit, verified ground-truth column. "
            f"Available columns: {list(df.columns[:10])}..."
        )

    # 3. Filter presentation partition if requested
    partition_note = "Full Cohort"
    if presentation:
        if "code_presentation" not in df.columns:
            raise ValueError(
                f"Partition filter '--presentation {presentation}' requested, but 'code_presentation' column missing."
            )
        df = df[df["code_presentation"] == presentation].copy()
        partition_note = f"Presentation {presentation}"
        if len(df) == 0:
            raise ValueError(f"No records found matching presentation='{presentation}'.")

    # 4. Validate binary target semantics
    unique_targets = set(df[target_col].dropna().unique())
    if not unique_targets.issubset({0, 1}):
        raise ValueError(
            f"Actionable Error: Target column '{target_col}' has non-binary values {unique_targets}. "
            "SUTRA model evaluation requires binary target semantics (0 = On-Track, 1 = At-Risk)."
        )

    # 5. Load production predictor (frozen pipeline)
    predictor = SutraRiskPredictor(
        model_path=model_path or DEFAULT_MODEL_PATH,
        metadata_path=metadata_path or DEFAULT_METADATA_PATH,
    )
    if not predictor.is_ready:
        raise RuntimeError("Production model artifact failed to load.")

    # 6. Check required features
    missing_feats = [col for col in predictor.feature_cols if col not in df.columns]
    if missing_feats:
        raise ValueError(
            f"Actionable Error: Dataset is missing required production features: {missing_feats}"
        )

    # 7. Check and clean missing values
    df_clean = df.dropna(subset=[target_col] + predictor.feature_cols).copy()
    rejected_missing = len(df) - len(df_clean)

    y_true = df_clean[target_col].astype(int).values
    X = df_clean[predictor.feature_cols].copy()

    # 8. Score using frozen pipeline (no refitting, no target exposure)
    pipeline = predictor.pipeline
    y_prob = pipeline.predict_proba(X)[:, 1]

    # 9. Compute comprehensive metrics
    perf_metrics = compute_comprehensive_metrics(y_true, y_prob, threshold=threshold)
    cal_metrics = compute_calibration_assessment(y_true, y_prob, n_bins=10)

    # 10. Historical Partition Flagging
    is_2014J = presentation == "2014J" or ("2014J" in str(df.get("code_presentation", "")))
    provenance_warning = None
    if is_2014J:
        provenance_warning = (
            "HISTORICAL PARTITION NOTICE: Presentation 2014J represents previously inspected "
            "development evidence. It must NEVER be reported as an untouched prospective test set. "
            "Real-world generalization must be assessed on authentic, prospectively collected cohorts."
        )

    report = {
        "dataset_metadata": {
            "dataset_label": dataset_label,
            "data_file": str(data_path),
            "partition": partition_note,
            "raw_rows_examined": total_raw_rows,
            "partition_rows": len(df),
            "evaluated_rows": len(df_clean),
            "rejected_missing_rows": rejected_missing,
            "target_column": target_col,
            "class_prevalence": round(float(np.mean(y_true)), 4),
            "actual_at_risk_count": int(np.sum(y_true == 1)),
            "actual_on_track_count": int(np.sum(y_true == 0)),
        },
        "model_metadata": {
            "model_name": predictor.model_name,
            "model_version": predictor.model_version,
            "operational_threshold": threshold,
        },
        "threshold_independent_metrics": {
            "roc_auc": perf_metrics["roc_auc"],
            "pr_auc": perf_metrics["pr_auc"],
            "brier_score": cal_metrics["brier_score"],
            "expected_calibration_error_ece": cal_metrics["expected_calibration_error_ece"],
            "maximum_calibration_error_mce": cal_metrics["maximum_calibration_error_mce"],
        },
        "threshold_dependent_metrics": {
            "threshold": threshold,
            "accuracy": perf_metrics["accuracy"],
            "balanced_accuracy": perf_metrics["balanced_accuracy"],
            "precision": perf_metrics["precision"],
            "recall": perf_metrics["recall"],
            "specificity": perf_metrics["specificity"],
            "false_positive_rate": perf_metrics["false_positive_rate"],
            "f1_score": perf_metrics["f1_score"],
            "confusion_matrix": perf_metrics["confusion_matrix"],
            "operational_workload": perf_metrics["operational_workload"],
        },
        "reliability_table": cal_metrics["reliability_bins"],
        "provenance_warning": provenance_warning,
    }
    return report


def display_evaluation_report(report: dict[str, Any]) -> None:
    """Format and display labeled dataset evaluation report."""
    ds = report["dataset_metadata"]
    md = report["model_metadata"]
    ti = report["threshold_independent_metrics"]
    td = report["threshold_dependent_metrics"]
    wl = td["operational_workload"]
    cm = td["confusion_matrix"]

    if not RICH_AVAILABLE:
        print("\n" + "=" * 60)
        print(f"SUTRA MODEL EVALUATION REPORT: {ds['dataset_label']} ({ds['partition']})")
        print(f"Model: {md['model_name']} ({md['model_version']}) | Threshold: {td['threshold']}")
        print(f"Evaluated Records: {ds['evaluated_rows']} (Prevalence: {ds['class_prevalence']:.2%})")
        print("-" * 60)
        print("Threshold-Independent Discrimination & Calibration:")
        print(f"  ROC-AUC: {ti['roc_auc']:.4f}  |  PR-AUC: {ti['pr_auc']:.4f}")
        print(f"  Brier Score: {ti['brier_score']:.4f}  |  ECE (10 bins): {ti['expected_calibration_error_ece']:.4f}")
        print("-" * 60)
        print(f"Threshold-Dependent Operational Performance (at {td['threshold']}):")
        print(f"  Recall (Safety): {td['recall']:.2%}  |  Precision: {td['precision']:.2%}")
        print(f"  Alert Rate: {wl['alert_rate_pct']}%  |  False Alarms: {wl['false_alarms_advisor_burden']}")
        print(f"  Confusion Matrix: TP={cm['tp']}, FP={cm['fp']}, FN={cm['fn']}, TN={cm['tn']}")
        if report.get("provenance_warning"):
            print(f"WARNING: {report['provenance_warning']}")
        print("=" * 60 + "\n")
        return

    console = Console()
    console.print("\n")
    title = f"[bold blue]SUTRA Production Model Evaluation: {ds['dataset_label']} ({ds['partition']})[/bold blue]"

    meta_table = Table(title=title, border_style="blue")
    meta_table.add_column("Property", style="cyan")
    meta_table.add_column("Value", style="bold white")

    meta_table.add_row("Model Architecture", f"{md['model_name']} ({md['model_version']})")
    meta_table.add_row("Evaluation Population", f"{ds['evaluated_rows']:,} records (Prevalence: {ds['class_prevalence']:.2%})")
    meta_table.add_row("Actual Class Counts", f"At-Risk: {ds['actual_at_risk_count']:,} | On-Track: {ds['actual_on_track_count']:,}")
    meta_table.add_row("Rejected Records", f"{ds['rejected_missing_rows']} rows with missing values")
    meta_table.add_row("Operational Decision Threshold", f"{td['threshold']:.2f}")

    console.print(meta_table)

    perf_table = Table(title="[bold]Discrimination, Calibration & Operational Metrics[/bold]", border_style="green")
    perf_table.add_column("Metric Group", style="bold yellow", width=26)
    perf_table.add_column("Metric Name", style="cyan", width=32)
    perf_table.add_column("Observed Value", style="bold white", width=18)

    perf_table.add_row("Threshold-Independent", "ROC-AUC", f"{ti['roc_auc']:.4f}")
    perf_table.add_row("Threshold-Independent", "PR-AUC", f"{ti['pr_auc']:.4f}")
    perf_table.add_row("Threshold-Independent", "Brier Score (Calibration)", f"{ti['brier_score']:.4f}")
    perf_table.add_row("Threshold-Independent", "Expected Calibration Error (ECE)", f"{ti['expected_calibration_error_ece']:.4f}")
    perf_table.add_row("Threshold-Independent", "Max Calibration Error (MCE)", f"{ti['maximum_calibration_error_mce']:.4f}")

    perf_table.add_row("Operational (Threshold 0.46)", "Recall (Student Safety)", f"[bold green]{td['recall']:.2%}[/bold green]")
    perf_table.add_row("Operational (Threshold 0.46)", "Precision", f"{td['precision']:.2%}")
    perf_table.add_row("Operational (Threshold 0.46)", "Specificity", f"{td['specificity']:.2%}")
    perf_table.add_row("Operational (Threshold 0.46)", "Balanced Accuracy", f"{td['balanced_accuracy']:.2%}")
    perf_table.add_row("Operational (Threshold 0.46)", "F1 Score", f"{td['f1_score']:.4f}")
    perf_table.add_row("Operational Workload", "Alert Rate", f"{wl['alert_rate_pct']}% ({wl['total_alerts_fired']:,} alerts)")
    perf_table.add_row("Operational Workload", "Successful Catches (TP)", f"{wl['successful_proactive_catches']:,}")
    perf_table.add_row("Operational Workload", "False Alarms / Advisor Burden (FP)", f"[yellow]{wl['false_alarms_advisor_burden']:,}[/yellow]")
    perf_table.add_row("Operational Workload", "Missed At-Risk (FN)", f"[red]{wl['missed_at_risk_students']:,}[/red]")

    console.print(perf_table)

    if report.get("provenance_warning"):
        console.print(Panel(
            f"[bold yellow]GOVERNANCE WARNING:[/bold yellow]\n{report['provenance_warning']}",
            border_style="yellow",
        ))
