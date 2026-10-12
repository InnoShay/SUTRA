#!/usr/bin/env python3
"""
SUTRA ML Phase Twenty-Two — Dual-Cutoff Academic Forecasting Experiments.

Trains and evaluates separate Day-30 and Day-60 academic-outcome models on OULAD.
Evaluates whether observable information gained between Day 30 and Day 60 improves
predictive discrimination and calibration, while strictly excluding unrecorded assessment marks.

Protocols:
1. 5-Fold Student-Grouped Cross-Validation (Primary Development Evidence)
2. Temporal Holdout on 2014J (Historical Diagnostic Comparison, strictly non-independent):
   - Setting 1: Unseen-Student Cohort Ingress (disjoint students only)
   - Setting 2: Campus-Wide Deployment (all active students)

Usage:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_dual_cutoff_experiments.py
"""

import hashlib
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def compute_calibration_curve_metrics(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> Dict[str, Any]:
    """Calculate empirical calibration bins, expected calibration error (ECE), and Brier score."""
    brier = float(brier_score_loss(y_true, y_prob))
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    bin_indices = np.digitize(y_prob, bin_edges[1:-1])

    bin_data = []
    ece = 0.0
    total_samples = len(y_true)

    for i in range(n_bins):
        mask = bin_indices == i
        count = int(np.sum(mask))
        if count > 0:
            avg_prob = float(np.mean(y_prob[mask]))
            actual_frac = float(np.mean(y_true[mask]))
            bin_ece = abs(avg_prob - actual_frac) * (count / total_samples)
            ece += bin_ece
            bin_data.append({
                "bin": i,
                "count": count,
                "mean_predicted_prob": round(avg_prob, 4),
                "fraction_positive": round(actual_frac, 4),
            })

    return {
        "brier_score": round(brier, 4),
        "expected_calibration_error": round(float(ece), 4),
        "bins": bin_data,
    }


def evaluate_predictions_at_thresholds(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    thresholds: List[float] = [0.30, 0.40, 0.46, 0.50],
) -> Dict[str, Any]:
    """Calculate classification performance at pre-specified operating points."""
    roc_auc = float(roc_auc_score(y_true, y_prob))
    pr_auc = float(average_precision_score(y_true, y_prob))
    calib = compute_calibration_curve_metrics(y_true, y_prob)

    results_by_thresh = {}
    best_f1 = -1.0
    optimal_thresh = 0.50

    # Search fine grid for optimal F1
    search_grid = np.linspace(0.20, 0.80, 61)
    for t in search_grid:
        preds = (y_prob >= t).astype(int)
        f = f1_score(y_true, preds, zero_division=0)
        if f > best_f1:
            best_f1 = f
            optimal_thresh = round(float(t), 3)

    all_eval_threshs = sorted(list(set(thresholds + [optimal_thresh])))

    for t in all_eval_threshs:
        preds = (y_prob >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, preds).ravel()
        prec = float(precision_score(y_true, preds, zero_division=0))
        rec = float(recall_score(y_true, preds, zero_division=0))
        f1 = float(f1_score(y_true, preds, zero_division=0))
        alert_rate = float((tp + fp) / len(y_true))

        t_key = f"t_{t:.2f}" if t in thresholds else f"optimal_f1_t_{t:.2f}"
        results_by_thresh[t_key] = {
            "threshold": round(float(t), 3),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "alert_rate": round(alert_rate, 4),
        }

    return {
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "brier_score": calib["brier_score"],
        "expected_calibration_error": calib["expected_calibration_error"],
        "class_prevalence": round(float(np.mean(y_true)), 4),
        "total_eval_samples": len(y_true),
        "optimal_f1_threshold": optimal_thresh,
        "operating_points": results_by_thresh,
        "calibration_bins": calib["bins"],
    }


def run_student_grouped_cv(
    df: pd.DataFrame,
    feature_cols: List[str],
    cat_cols: List[str],
    model_factory,
    n_splits: int = 5,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """5-Fold GroupKFold cross-validation grouped by student ID."""
    gkf = GroupKFold(n_splits=n_splits)
    groups = df["id_student"].values
    y = df["target"].values

    num_cols = [c for c in feature_cols if c not in cat_cols]
    oof_probs = np.zeros(len(df), dtype=float)

    fold_metrics = []

    for fold_idx, (train_idx, val_idx) in enumerate(gkf.split(df, y, groups=groups)):
        train_df = df.iloc[train_idx]
        val_df = df.iloc[val_idx]

        # Verify strict disjoint student sets
        train_students = set(train_df["id_student"])
        val_students = set(val_df["id_student"])
        if train_students.intersection(val_students):
            raise ValueError(f"Cross-fold student leakage detected in fold {fold_idx}!")

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), num_cols),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ],
            remainder="drop",
        )

        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", model_factory()),
        ])

        pipeline.fit(train_df[feature_cols], train_df["target"])
        val_probs = pipeline.predict_proba(val_df[feature_cols])[:, 1]
        oof_probs[val_idx] = val_probs

        val_roc = roc_auc_score(val_df["target"], val_probs)
        val_pr = average_precision_score(val_df["target"], val_probs)
        fold_metrics.append({
            "fold": fold_idx + 1,
            "train_size": len(train_idx),
            "val_size": len(val_idx),
            "roc_auc": round(float(val_roc), 4),
            "pr_auc": round(float(val_pr), 4),
        })

    overall_results = evaluate_predictions_at_thresholds(y, oof_probs)
    overall_results["folds"] = fold_metrics
    return oof_probs, overall_results


def run_temporal_diagnostic_evaluation(
    df: pd.DataFrame,
    feature_cols: List[str],
    cat_cols: List[str],
    model_factory,
    train_presentations: List[str] = ["2013B", "2013J", "2014B"],
    test_presentation: str = "2014J",
) -> Dict[str, Any]:
    """
    Train on historical presentations and evaluate on 2014J under:
    - Setting 1: Unseen Students (strictly disjoint from training)
    - Setting 2: Campus-Wide Deployment (all active students)
    
    NOTE: 2014J has been previously inspected; this serves strictly as development diagnostic evidence.
    """
    train_df = df[df["code_presentation"].isin(train_presentations)].copy().reset_index(drop=True)
    test_df_all = df[df["code_presentation"] == test_presentation].copy().reset_index(drop=True)

    train_students = set(train_df["id_student"])
    test_students = set(test_df_all["id_student"])
    overlap_students = train_students.intersection(test_students)

    # Setting 1: Disjoint only
    test_df_unseen = test_df_all[~test_df_all["id_student"].isin(overlap_students)].copy().reset_index(drop=True)

    num_cols = [c for c in feature_cols if c not in cat_cols]
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="drop",
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", model_factory()),
    ])

    pipeline.fit(train_df[feature_cols], train_df["target"])

    # Predictions Setting 1
    probs_unseen = pipeline.predict_proba(test_df_unseen[feature_cols])[:, 1]
    results_setting1 = evaluate_predictions_at_thresholds(test_df_unseen["target"].values, probs_unseen)

    # Predictions Setting 2
    probs_all = pipeline.predict_proba(test_df_all[feature_cols])[:, 1]
    results_setting2 = evaluate_predictions_at_thresholds(test_df_all["target"].values, probs_all)

    return {
        "train_cohort": {
            "presentations": train_presentations,
            "rows": len(train_df),
            "unique_students": len(train_students),
            "at_risk_prevalence": round(float(train_df["target"].mean()), 4),
        },
        "test_presentation": test_presentation,
        "overlapping_students_count": len(overlap_students),
        "setting_1_unseen_students": {
            "deployment_scenario": "First-year / Transfer student ingress (zero prior history)",
            "rows": len(test_df_unseen),
            "unique_students": int(test_df_unseen["id_student"].nunique()),
            "metrics": results_setting1,
        },
        "setting_2_campus_deployment": {
            "deployment_scenario": "Ecological campus-wide cohort (continuing + new students)",
            "rows": len(test_df_all),
            "unique_students": int(test_df_all["id_student"].nunique()),
            "metrics": results_setting2,
        },
    }


def compute_sha256_of_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    print("=" * 80)
    print("SUTRA ML Phase Twenty-Two — Dual-Cutoff Academic Forecasting Experiments")
    print("=" * 80)

    processed_dir = ML_DIR / "data" / "processed"
    artifacts_dir = ML_DIR / "artifacts" / "experiments" / "phase_twenty_two"
    metrics_dir = ML_DIR / "reports" / "metrics"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)

    d30_path = processed_dir / "phase22_day30_features.csv"
    d60_path = processed_dir / "phase22_day60_features.csv"

    if not d30_path.is_file() or not d60_path.is_file():
        raise FileNotFoundError("Dual-cutoff datasets not found. Run run_dual_cutoff_prep.py first.")

    print(f"[*] Loading Day-30 Dataset: {d30_path.name}")
    df30 = pd.read_csv(d30_path)
    print(f"[*] Loading Day-60 Dataset: {d60_path.name}")
    df60 = pd.read_csv(d60_path)

    cat_cols = ["gender", "region", "highest_education", "imd_band", "age_band", "disability"]
    drop_cols = ["code_module", "code_presentation", "id_student", "target", "target_name", "raw_final_result"]

    feat_cols_30 = [c for c in df30.columns if c not in drop_cols]
    feat_cols_60 = [c for c in df60.columns if c not in drop_cols]

    print(f"    - Day-30 Predictors: {len(feat_cols_30)} columns ({len(feat_cols_30) - len(cat_cols)} num, {len(cat_cols)} cat)")
    print(f"    - Day-60 Predictors: {len(feat_cols_60)} columns ({len(feat_cols_60) - len(cat_cols)} num, {len(cat_cols)} cat)")

    experiments_report: Dict[str, Any] = {
        "metadata": {
            "phase": "Phase Twenty-Two",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "day30_dataset_sha256": compute_sha256_of_file(d30_path),
            "day60_dataset_sha256": compute_sha256_of_file(d60_path),
        },
        "day30": {},
        "day60": {},
        "comparison": {},
    }

    # Model Factories
    lr_factory = lambda: LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    xgb_factory = lambda: XGBClassifier(
        n_estimators=100, max_depth=4, learning_rate=0.08, subsample=0.8,
        colsample_bytree=0.8, random_state=42, eval_metric="logloss"
    )

    # -------------------------------------------------------------
    # 1. Day-30 Experiments
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[1] Running Day-30 Experiments...")
    print("-" * 70)

    print("  -> Running Day-30 Logistic Regression (5-Fold Student-Grouped CV)...")
    oof_30_lr, cv_30_lr = run_student_grouped_cv(df30, feat_cols_30, cat_cols, lr_factory)
    print(f"     [✓] Day-30 LR CV: ROC-AUC={cv_30_lr['roc_auc']:.4f}, PR-AUC={cv_30_lr['pr_auc']:.4f}, Brier={cv_30_lr['brier_score']:.4f}")

    print("  -> Running Day-30 XGBoost (5-Fold Student-Grouped CV)...")
    oof_30_xgb, cv_30_xgb = run_student_grouped_cv(df30, feat_cols_30, cat_cols, xgb_factory)
    print(f"     [✓] Day-30 XGB CV: ROC-AUC={cv_30_xgb['roc_auc']:.4f}, PR-AUC={cv_30_xgb['pr_auc']:.4f}, Brier={cv_30_xgb['brier_score']:.4f}")

    print("  -> Running Day-30 Temporal Holdout (2014J Diagnostic)...")
    temp_30_lr = run_temporal_diagnostic_evaluation(df30, feat_cols_30, cat_cols, lr_factory)
    temp_30_xgb = run_temporal_diagnostic_evaluation(df30, feat_cols_30, cat_cols, xgb_factory)

    experiments_report["day30"] = {
        "features": feat_cols_30,
        "sample_size": len(df30),
        "unique_students": int(df30["id_student"].nunique()),
        "at_risk_prevalence": round(float(df30["target"].mean()), 4),
        "logistic_regression": {
            "cross_validation_grouped": cv_30_lr,
            "temporal_diagnostic_2014j": temp_30_lr,
        },
        "xgboost": {
            "cross_validation_grouped": cv_30_xgb,
            "temporal_diagnostic_2014j": temp_30_xgb,
        },
    }

    # -------------------------------------------------------------
    # 2. Day-60 Experiments
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[2] Running Day-60 Experiments...")
    print("-" * 70)

    print("  -> Running Day-60 Logistic Regression (5-Fold Student-Grouped CV)...")
    oof_60_lr, cv_60_lr = run_student_grouped_cv(df60, feat_cols_60, cat_cols, lr_factory)
    print(f"     [✓] Day-60 LR CV: ROC-AUC={cv_60_lr['roc_auc']:.4f}, PR-AUC={cv_60_lr['pr_auc']:.4f}, Brier={cv_60_lr['brier_score']:.4f}")

    print("  -> Running Day-60 XGBoost (5-Fold Student-Grouped CV)...")
    oof_60_xgb, cv_60_xgb = run_student_grouped_cv(df60, feat_cols_60, cat_cols, xgb_factory)
    print(f"     [✓] Day-60 XGB CV: ROC-AUC={cv_60_xgb['roc_auc']:.4f}, PR-AUC={cv_60_xgb['pr_auc']:.4f}, Brier={cv_60_xgb['brier_score']:.4f}")

    print("  -> Running Day-60 Temporal Holdout (2014J Diagnostic)...")
    temp_60_lr = run_temporal_diagnostic_evaluation(df60, feat_cols_60, cat_cols, lr_factory)
    temp_60_xgb = run_temporal_diagnostic_evaluation(df60, feat_cols_60, cat_cols, xgb_factory)

    experiments_report["day60"] = {
        "features": feat_cols_60,
        "sample_size": len(df60),
        "unique_students": int(df60["id_student"].nunique()),
        "at_risk_prevalence": round(float(df60["target"].mean()), 4),
        "logistic_regression": {
            "cross_validation_grouped": cv_60_lr,
            "temporal_diagnostic_2014j": temp_60_lr,
        },
        "xgboost": {
            "cross_validation_grouped": cv_60_xgb,
            "temporal_diagnostic_2014j": temp_60_xgb,
        },
    }

    # -------------------------------------------------------------
    # 3. Fit & Save Final Research Models
    # -------------------------------------------------------------
    print("\n" + "-" * 70)
    print("[3] Fitting and Saving Full-Cohort Research Models...")
    print("-" * 70)

    def fit_and_save_pipeline(df, feats, cats, factory, filename):
        num_c = [c for c in feats if c not in cats]
        pre = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), num_c),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cats),
            ],
            remainder="drop",
        )
        pipe = Pipeline([
            ("preprocessor", pre),
            ("classifier", factory()),
        ])
        pipe.fit(df[feats], df["target"])
        target_path = artifacts_dir / filename
        joblib.dump(pipe, target_path)
        sha = compute_sha256_of_file(target_path)
        print(f"     [✓] Saved: {filename} ({target_path.stat().st_size} bytes, SHA256: {sha[:16]}...)")
        return {
            "artifact_path": str(target_path.relative_to(REPO_ROOT)),
            "file_size_bytes": target_path.stat().st_size,
            "sha256": sha,
        }

    model_metadata = {
        "day30_lr": fit_and_save_pipeline(df30, feat_cols_30, cat_cols, lr_factory, "day30_logistic_regression.joblib"),
        "day60_lr": fit_and_save_pipeline(df60, feat_cols_60, cat_cols, lr_factory, "day60_logistic_regression.joblib"),
        "day30_xgb": fit_and_save_pipeline(df30, feat_cols_30, cat_cols, xgb_factory, "day30_xgboost.joblib"),
        "day60_xgb": fit_and_save_pipeline(df60, feat_cols_60, cat_cols, xgb_factory, "day60_xgboost.joblib"),
    }
    experiments_report["models"] = model_metadata

    # -------------------------------------------------------------
    # 4. Comparative Synthesis
    # -------------------------------------------------------------
    diff_lr_roc = cv_60_lr["roc_auc"] - cv_30_lr["roc_auc"]
    diff_lr_pr = cv_60_lr["pr_auc"] - cv_30_lr["pr_auc"]
    diff_lr_brier = cv_60_lr["brier_score"] - cv_30_lr["brier_score"]

    diff_xgb_roc = cv_60_xgb["roc_auc"] - cv_30_xgb["roc_auc"]
    diff_xgb_pr = cv_60_xgb["pr_auc"] - cv_30_xgb["pr_auc"]

    experiments_report["comparison"] = {
        "logistic_regression": {
            "cv_roc_auc_gain": round(diff_lr_roc, 4),
            "cv_pr_auc_gain": round(diff_lr_pr, 4),
            "cv_brier_improvement": round(-diff_lr_brier, 4),
        },
        "xgboost": {
            "cv_roc_auc_gain": round(diff_xgb_roc, 4),
            "cv_pr_auc_gain": round(diff_xgb_pr, 4),
        },
    }

    # Save detailed JSON report
    metrics_path = metrics_dir / "phase_twenty_two_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(experiments_report, f, indent=2)
    print(f"\n[✓] Comprehensive Metrics Saved: {metrics_path}")

    print("\n" + "=" * 80)
    print("EXPERIMENTAL SUMMARY RESULTS (Student-Grouped Cross-Validation):")
    print(f"  Day-30 LR Baseline:  ROC-AUC = {cv_30_lr['roc_auc']:.4f} | PR-AUC = {cv_30_lr['pr_auc']:.4f} | Brier = {cv_30_lr['brier_score']:.4f}")
    print(f"  Day-60 LR Baseline:  ROC-AUC = {cv_60_lr['roc_auc']:.4f} | PR-AUC = {cv_60_lr['pr_auc']:.4f} | Brier = {cv_60_lr['brier_score']:.4f}")
    print(f"  -> Delta LR Gain:    ΔROC = {diff_lr_roc:+.4f} | ΔPR = {diff_lr_pr:+.4f} | ΔBrier = {-diff_lr_brier:+.4f}")
    print(f"  Day-30 XGBoost:      ROC-AUC = {cv_30_xgb['roc_auc']:.4f} | PR-AUC = {cv_30_xgb['pr_auc']:.4f}")
    print(f"  Day-60 XGBoost:      ROC-AUC = {cv_60_xgb['roc_auc']:.4f} | PR-AUC = {cv_60_xgb['pr_auc']:.4f}")
    print(f"  -> Delta XGB Gain:   ΔROC = {diff_xgb_roc:+.4f} | ΔPR = {diff_xgb_pr:+.4f}")
    print("=" * 80)


if __name__ == "__main__":
    main()
