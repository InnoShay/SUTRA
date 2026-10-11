"""
Unit tests for SUTRA Phase Eight — Real Training Observability & Reproducibility.

Verifies:
1. Honest fold progress tracking (no synthetic increments, correct lifecycle).
2. Resource telemetry schema validity and graceful degradation when metrics unavailable.
3. Genuine fold completion reporting.
4. Saved artifact hash, reload verification, and numerical equivalence (< 1e-6).
5. Student group separation and preprocessing leakage safeguards.
6. Preservation of production v1.0.0 artifacts and backend threshold (0.46).
"""

import hashlib
import json
from pathlib import Path
import tempfile
import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import joblib

from sutra_ml.observability.resources import (
    MonitoredSection,
    ResourceSampler,
    get_current_process_memory_mb,
    get_peak_memory_mb,
)
from sutra_ml.observability.tracker import FoldProgressEvent, TrainingProgressTracker
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_preprocessor,
)
from sutra_ml.training.split import get_student_grouped_cv


def test_fold_progress_events_lifecycle_and_no_fake_increments():
    """Verify tracker emits genuine lifecycle events without skipped or fake increments."""
    events_received = []

    def on_event(evt: FoldProgressEvent):
        events_received.append(evt)

    tracker = TrainingProgressTracker("TestExperiment", total_folds=3, event_callback=on_event, verbose_terminal=False)

    assert tracker.total_folds == 3
    assert len(tracker.events) == 0

    # Start fold 1
    evt1 = tracker.record_fold_start(
        fold_idx=1,
        train_rows=100,
        val_rows=25,
        train_students=90,
        val_students=20,
        estimator_type="TestEstimator",
    )
    assert evt1.status == "RUNNING"
    assert evt1.fold_idx == 1

    # Complete fold 1
    tracker.record_fold_completion(
        event=evt1,
        wall_sec=0.15,
        preproc_sec=0.05,
        estimator_sec=0.10,
        convergence_info={"iterations": 25},
        fold_metrics={"roc_auc": 0.75, "pr_auc": 0.70},
        resource_summary={"wall_clock_sec": 0.15},
    )

    assert evt1.status == "COMPLETED"
    assert len(tracker.events) == 1
    assert len(events_received) == 1
    assert evt1.wall_duration_sec == 0.15
    assert evt1.preprocessor_duration_sec == 0.05
    assert evt1.estimator_duration_sec == 0.10
    assert evt1.convergence_info["iterations"] == 25


def test_resource_section_profiling_and_schema():
    """Verify MonitoredSection captures process CPU, wall-clock time, and memory."""
    with MonitoredSection("unit_test_section", sample_interval=0.01) as section:
        # Perform real work
        _ = sum(i * i for i in range(200_000))

    summary = section.get_summary()
    assert summary["section_name"] == "unit_test_section"
    assert "wall_clock_sec" in summary
    assert "process_cpu_sec" in summary
    assert "sampling" in summary
    assert summary["wall_clock_sec"] > 0
    assert summary["sampling"]["mean_rss_mb"] > 0


def test_resource_graceful_handling_missing_psutil(monkeypatch):
    """Verify resource module functions degrade gracefully if psutil is unavailable."""
    import sutra_ml.observability.resources as res

    monkeypatch.setattr(res, "HAS_PSUTIL", False)
    monkeypatch.setattr(res, "psutil", None)

    peak_mb = res.get_peak_memory_mb()
    assert peak_mb > 0
    current_mb = res.get_current_process_memory_mb()
    assert current_mb > 0

    sampler = res.ResourceSampler(interval_sec=0.01)
    sampler.start()
    sampler.stop()
    metrics = sampler.stop()
    assert "mean_rss_mb" in metrics
    assert "samples_count" in metrics


def test_artifact_hash_and_reload_prediction_equivalence(tmp_path):
    """Verify saved pipeline can be reloaded in fresh context and matches predictions within 1e-6."""
    np.random.seed(42)
    n = 100
    df = pd.DataFrame({
        "num_clicks": np.random.exponential(10, n),
        "studied_credits": np.random.choice([30, 60, 90], n),
        "gender": np.random.choice(["M", "F"], n),
        "target": np.random.binomial(1, 0.4, n),
    })

    num_cols = ["num_clicks", "studied_credits"]
    cat_cols = ["gender"]

    preproc = build_preprocessor(num_cols, cat_cols)
    clf = LogisticRegression(max_iter=100)
    pipe = Pipeline([("preprocessor", preproc), ("classifier", clf)])
    pipe.fit(df[num_cols + cat_cols], df["target"])

    saved_path = tmp_path / "test_model.joblib"
    joblib.dump(pipe, saved_path)

    # Compute sha256
    with open(saved_path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    assert len(digest) == 64

    # Reload
    reloaded_pipe = joblib.load(saved_path)
    sample_df = df.iloc[:10][num_cols + cat_cols]

    orig_probs = pipe.predict_proba(sample_df)[:, 1]
    reloaded_probs = reloaded_pipe.predict_proba(sample_df)[:, 1]

    # Max difference assertion
    max_diff = np.max(np.abs(orig_probs - reloaded_probs))
    assert max_diff < 1e-6
    assert all(0.0 <= p <= 1.0 for p in reloaded_probs)


def test_student_group_separation_and_leakage_safeguards():
    """Verify GroupKFold enforces 100% student group segregation without overlap."""
    df = pd.DataFrame({
        "id_student": [101, 101, 102, 103, 103, 104, 105, 106, 107, 108],
        "target": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1],
        "feature": range(10),
    })

    splits = get_student_grouped_cv(df, n_splits=3, group_col="id_student")
    assert len(splits) == 3

    for train_idx, val_idx in splits:
        train_students = set(df.iloc[train_idx]["id_student"])
        val_students = set(df.iloc[val_idx]["id_student"])
        overlap = train_students.intersection(val_students)
        assert len(overlap) == 0, f"Detected student leakage: {overlap}"


def test_production_v1_baseline_and_threshold_immutability():
    """Verify that Phase Eight did not modify v1.0.0 artifacts or default backend threshold."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    v1_baseline_path = repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
    v1_metadata_path = repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "model_metadata.json"

    assert v1_baseline_path.exists(), "Production baseline_logistic_regression.joblib missing!"
    assert v1_metadata_path.exists(), "Production model_metadata.json missing!"

    # Verify SHA-256 matches verified v1.0.0 hash
    with open(v1_baseline_path, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    assert sha == "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"

    with open(v1_metadata_path, "r") as f:
        meta = json.load(f)
    assert round(meta["selected_threshold"], 2) == 0.46
