"""
Regularized Logistic Regression baseline model training and validation.
"""

import time
from typing import Any, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from sutra_ml.evaluation.metrics import compute_comprehensive_metrics
from sutra_ml.observability.resources import MonitoredSection
from sutra_ml.observability.tracker import TrainingProgressTracker
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_preprocessor,
)
from sutra_ml.training.split import get_student_grouped_cv


def cross_validate_baseline(
    train_df: pd.DataFrame,
    numerical_features: list[str],
    categorical_features: list[str],
    params: dict[str, Any],
    n_splits: int = 5,
    tracker: Optional[TrainingProgressTracker] = None,
) -> tuple[np.ndarray, dict[str, Any]]:
    """
    Perform 5-fold student-grouped cross-validation for Logistic Regression.
    Returns out-of-fold probability predictions and aggregated CV metrics.
    """
    feature_cols = numerical_features + categorical_features
    X = train_df[feature_cols]
    y = train_df["target"].to_numpy().astype(int)

    splits = get_student_grouped_cv(train_df, n_splits=n_splits, group_col="id_student")
    oof_probs = np.zeros(len(train_df))
    fold_metrics = []
    clean_params = {k: v for k, v in params.items() if k != "model_type"}

    for fold_idx, (t_idx, v_idx) in enumerate(splits):
        t0 = time.perf_counter()
        X_train_f, y_train_f = X.iloc[t_idx], y[t_idx]
        X_val_f, y_val_f = X.iloc[v_idx], y[v_idx]

        train_students = int(train_df.iloc[t_idx]["id_student"].nunique())
        val_students = int(train_df.iloc[v_idx]["id_student"].nunique())

        fold_event = None
        if tracker is not None:
            fold_event = tracker.record_fold_start(
                fold_idx=fold_idx + 1,
                train_rows=len(t_idx),
                val_rows=len(v_idx),
                train_students=train_students,
                val_students=val_students,
                estimator_type="LogisticRegression",
            )

        # 1. Honest Preprocessing fit on train fold ONLY
        t_prep_start = time.perf_counter()
        preprocessor = build_preprocessor(numerical_features, categorical_features)
        X_train_trans = preprocessor.fit_transform(X_train_f)
        preproc_sec = time.perf_counter() - t_prep_start

        # 2. Honest Estimator fit on transformed train fold ONLY
        classifier = LogisticRegression(**clean_params)
        with MonitoredSection(f"LR_fold_{fold_idx+1}") as mon:
            t_fit_start = time.perf_counter()
            classifier.fit(X_train_trans, y_train_f)
            fit_sec = time.perf_counter() - t_fit_start
        resource_summary = mon.get_summary()

        # 3. Assemble validated pipeline for inference
        pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ])

        # 4. Out-of-fold prediction
        val_probs = pipe.predict_proba(X_val_f)[:, 1]
        oof_probs[v_idx] = val_probs

        metrics_f = compute_comprehensive_metrics(y_val_f, val_probs)
        fold_metrics.append(metrics_f)
        elapsed_fold = time.perf_counter() - t0

        iters = int(classifier.n_iter_[0]) if hasattr(classifier, "n_iter_") else None
        convergence_info = {
            "iterations": iters,
            "solver": getattr(classifier, "solver", "unknown"),
            "tol": getattr(classifier, "tol", 1e-4),
        }

        if tracker is not None and fold_event is not None:
            tracker.record_fold_completion(
                event=fold_event,
                wall_sec=elapsed_fold,
                preproc_sec=preproc_sec,
                estimator_sec=fit_sec,
                convergence_info=convergence_info,
                fold_metrics=metrics_f,
                resource_summary=resource_summary,
            )
        else:
            print(
                f"      [Fold {fold_idx+1}/{n_splits}] Trained on {len(t_idx):,} rows, validated on {len(v_idx):,} rows "
                f"({elapsed_fold:.2f}s, iters={iters}) -> ROC-AUC: {metrics_f['roc_auc']:.4f} | PR-AUC: {metrics_f['pr_auc']:.4f}"
            )

    # Compute overall out-of-fold metrics
    overall_cv_metrics = compute_comprehensive_metrics(y, oof_probs)
    overall_cv_metrics["mean_fold_roc_auc"] = round(float(np.mean([m["roc_auc"] for m in fold_metrics])), 4)
    overall_cv_metrics["mean_fold_pr_auc"] = round(float(np.mean([m["pr_auc"] for m in fold_metrics])), 4)
    overall_cv_metrics["std_fold_roc_auc"] = round(float(np.std([m["roc_auc"] for m in fold_metrics])), 4)

    return oof_probs, overall_cv_metrics


def train_final_baseline(
    train_df: pd.DataFrame,
    numerical_features: list[str],
    categorical_features: list[str],
    params: dict[str, Any],
) -> Pipeline:
    """
    Fit final Logistic Regression pipeline on entire training partition.
    """
    feature_cols = numerical_features + categorical_features
    X_train = train_df[feature_cols]
    y_train = train_df["target"].to_numpy().astype(int)

    t0 = time.time()
    pipe = build_logistic_regression_pipeline(
        numerical_features, categorical_features, params
    )
    pipe.fit(X_train, y_train)
    elapsed = time.time() - t0
    iters = int(pipe.named_steps["classifier"].n_iter_[0]) if hasattr(pipe.named_steps["classifier"], "n_iter_") else None
    print(f"    [✓] Fitted final Regularized Logistic Regression on {len(X_train):,} training rows ({elapsed:.2f}s, iters={iters})")
    return pipe
