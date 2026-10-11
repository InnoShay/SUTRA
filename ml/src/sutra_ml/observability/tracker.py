"""
Progress and verification tracking for SUTRA ML training.

Ensures transparent, honest live progress reporting where steps advance only
when genuine fitting, cross-validation, and verification operations complete.
"""

from dataclasses import asdict, dataclass, field
import datetime
import time
from typing import Any, Callable, Optional


@dataclass
class FoldProgressEvent:
    experiment_name: str
    phase: str
    fold_idx: int
    total_folds: int
    train_rows: int
    val_rows: int
    train_unique_students: int
    val_unique_students: int
    start_time_iso: str
    end_time_iso: str = ""
    wall_duration_sec: float = 0.0
    preprocessor_duration_sec: float = 0.0
    estimator_duration_sec: float = 0.0
    estimator_type: str = ""
    convergence_info: dict[str, Any] = field(default_factory=dict)
    fold_metrics: dict[str, Any] = field(default_factory=dict)
    resource_summary: dict[str, Any] = field(default_factory=dict)
    status: str = "IN_PROGRESS"


class TrainingProgressTracker:
    """
    Honest progress tracker that emits structured events as genuine operations finish.
    """

    def __init__(
        self,
        experiment_name: str,
        total_folds: int = 5,
        event_callback: Optional[Callable[[FoldProgressEvent], None]] = None,
        verbose_terminal: bool = True,
    ):
        self.experiment_name = experiment_name
        self.total_folds = total_folds
        self.event_callback = event_callback
        self.verbose_terminal = verbose_terminal
        self.events: list[FoldProgressEvent] = []
        self.current_phase: str = "INITIALIZED"
        self.start_wall_time = time.perf_counter()

    def set_phase(self, phase_name: str, message: str = ""):
        self.current_phase = phase_name
        if self.verbose_terminal:
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] [{self.experiment_name}] Phase: {phase_name.upper()}{' - ' + message if message else ''}")

    def record_fold_start(
        self,
        fold_idx: int,
        train_rows: int,
        val_rows: int,
        train_students: int,
        val_students: int,
        estimator_type: str,
    ) -> FoldProgressEvent:
        event = FoldProgressEvent(
            experiment_name=self.experiment_name,
            phase="cross_validation",
            fold_idx=fold_idx,
            total_folds=self.total_folds,
            train_rows=train_rows,
            val_rows=val_rows,
            train_unique_students=train_students,
            val_unique_students=val_students,
            start_time_iso=datetime.datetime.now().isoformat(),
            estimator_type=estimator_type,
            status="RUNNING",
        )
        if self.verbose_terminal:
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            print(
                f"  [{ts}] [Fold {fold_idx}/{self.total_folds}] START fitting {estimator_type} | "
                f"Train: {train_rows:,} rows ({train_students:,} students) | "
                f"Val: {val_rows:,} rows ({val_students:,} students)"
            )
        return event

    def record_fold_completion(
        self,
        event: FoldProgressEvent,
        wall_sec: float,
        preproc_sec: float,
        estimator_sec: float,
        convergence_info: dict[str, Any],
        fold_metrics: dict[str, Any],
        resource_summary: dict[str, Any],
    ):
        event.end_time_iso = datetime.datetime.now().isoformat()
        event.wall_duration_sec = round(wall_sec, 4)
        event.preprocessor_duration_sec = round(preproc_sec, 4)
        event.estimator_duration_sec = round(estimator_sec, 4)
        event.convergence_info = convergence_info
        event.fold_metrics = fold_metrics
        event.resource_summary = resource_summary
        event.status = "COMPLETED"

        self.events.append(event)
        if self.event_callback is not None:
            self.event_callback(event)

        if self.verbose_terminal:
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            conv_str = ""
            if "iterations" in convergence_info:
                conv_str = f" | iters: {convergence_info['iterations']}"
            elif "trees_fitted" in convergence_info:
                conv_str = f" | trees: {convergence_info['trees_fitted']}"

            cpu_pct = resource_summary.get("sampling", {}).get("peak_process_cpu_percent", 0.0)
            mem_mb = resource_summary.get("sampling", {}).get("peak_rss_mb", 0.0)

            print(
                f"  [{ts}] [Fold {event.fold_idx}/{self.total_folds}] COMPLETE ({wall_sec:.3f}s total: "
                f"preproc={preproc_sec:.3f}s, fit={estimator_sec:.3f}s{conv_str}) | "
                f"ROC-AUC: {fold_metrics.get('roc_auc', 0.0):.4f} | PR-AUC: {fold_metrics.get('pr_auc', 0.0):.4f} | "
                f"Peak CPU: {cpu_pct:.1f}% | Peak RSS: {mem_mb:.1f} MB"
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "experiment_name": self.experiment_name,
            "total_folds": self.total_folds,
            "total_duration_sec": round(time.perf_counter() - self.start_wall_time, 4),
            "completed_folds_count": len(self.events),
            "events": [asdict(e) for e in self.events],
        }
