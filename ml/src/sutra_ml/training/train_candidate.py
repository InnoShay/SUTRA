import time
from typing import Any
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from sutra_ml.evaluation.metrics import compute_comprehensive_metrics
from sutra_ml.training.pipeline import build_xgboost_pipeline
from sutra_ml.training.split import get_student_grouped_cv


def cross_validate_candidate(
    train_df: pd.DataFrame,
    numerical_features: list[str],
    categorical_features: list[str],
    params: dict[str, Any],
    n_splits: int = 5,
) -> tuple[np.ndarray, dict[str, Any]]:
    """
    Perform 5-fold student-grouped cross-validation for XGBoost candidate.
    Returns out-of-fold probability predictions and aggregated CV metrics.
    """
    feature_cols = numerical_features + categorical_features
    X = train_df[feature_cols]
    y = train_df["target"].to_numpy().astype(int)

    splits = get_student_grouped_cv(train_df, n_splits=n_splits, group_col="id_student")
    oof_probs = np.zeros(len(train_df))
    fold_metrics = []
    n_est = params.get("n_estimators", 150)
    max_d = params.get("max_depth", 4)
    lr_rate = params.get("learning_rate", 0.05)

    for fold_idx, (t_idx, v_idx) in enumerate(splits):
        t0 = time.time()
        X_train_f, y_train_f = X.iloc[t_idx], y[t_idx]
        X_val_f, y_val_f = X.iloc[v_idx], y[v_idx]

        pipe = build_xgboost_pipeline(
            numerical_features, categorical_features, params
        )
        pipe.fit(X_train_f, y_train_f)

        val_probs = pipe.predict_proba(X_val_f)[:, 1]
        oof_probs[v_idx] = val_probs

        metrics_f = compute_comprehensive_metrics(y_val_f, val_probs)
        fold_metrics.append(metrics_f)
        elapsed_fold = time.time() - t0
        print(f"      [Fold {fold_idx+1}/{n_splits}] Trained XGBoost ({n_est} trees, depth={max_d}, lr={lr_rate}) on {len(t_idx):,} rows ({elapsed_fold:.2f}s) -> Val ROC-AUC: {metrics_f['roc_auc']:.4f} | PR-AUC: {metrics_f['pr_auc']:.4f}")

    overall_cv_metrics = compute_comprehensive_metrics(y, oof_probs)
    overall_cv_metrics["mean_fold_roc_auc"] = round(float(np.mean([m["roc_auc"] for m in fold_metrics])), 4)
    overall_cv_metrics["mean_fold_pr_auc"] = round(float(np.mean([m["pr_auc"] for m in fold_metrics])), 4)
    overall_cv_metrics["std_fold_roc_auc"] = round(float(np.std([m["roc_auc"] for m in fold_metrics])), 4)

    return oof_probs, overall_cv_metrics


def train_final_candidate(
    train_df: pd.DataFrame,
    numerical_features: list[str],
    categorical_features: list[str],
    params: dict[str, Any],
) -> Pipeline:
    """
    Fit final XGBoost pipeline on entire training partition.
    """
    feature_cols = numerical_features + categorical_features
    X_train = train_df[feature_cols]
    y_train = train_df["target"].to_numpy().astype(int)
    n_est = params.get("n_estimators", 150)
    max_d = params.get("max_depth", 4)

    t0 = time.time()
    pipe = build_xgboost_pipeline(
        numerical_features, categorical_features, params
    )
    pipe.fit(X_train, y_train)
    elapsed = time.time() - t0
    print(f"    [✓] Fitted final Candidate XGBoost ({n_est} trees, depth={max_d}) on {len(X_train):,} training rows ({elapsed:.2f}s)")
    return pipe
