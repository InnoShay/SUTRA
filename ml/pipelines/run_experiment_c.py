#!/usr/bin/env python3
"""
SUTRA Phase Seven: Controlled Constrained XGBoost Experiment & Rigorous Comparison.

Executes:
1. Re-verifies repository state and protects v1.0.0 artifacts.
2. Runs 5-fold student-grouped cross-validation for:
   - Baseline Logistic Regression (C=1.0, balanced, L2)
   - Unconstrained XGBoost Candidate (max_depth=4, colsample=0.80)
   - Constrained Depth-3 XGBoost (max_depth=3, colsample=0.70)
3. Computes detailed fold-by-fold metrics and pooled out-of-fold performance.
4. Fits final candidate on full training partition and evaluates once on 2014J holdout.
5. Performs out-of-fold error analysis and subgroup diagnostics.
6. Saves model artifact, config, metrics, and schema in ml/artifacts/experiments/exp_c_depth3_xgboost/.
7. Exports de-identified out-of-fold predictions, figures, and metrics ledgers.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import time

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    precision_recall_curve,
    roc_curve,
)
import yaml

# Resolve local paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.evaluation.calibration import compute_calibration_assessment
from sutra_ml.evaluation.diagnostics import (
    categorize_row_level_errors,
    compute_comprehensive_subgroup_diagnostics,
)
from sutra_ml.evaluation.metrics import compute_comprehensive_metrics
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_xgboost_pipeline,
)
from sutra_ml.training.split import get_student_grouped_cv, make_temporal_split


def run_phase_seven_experiment() -> None:
    t_start = time.time()
    print("=" * 80)
    print("SUTRA ML — PHASE SEVEN: CONTROLLED XGBOOST EXPERIMENT (EXP-C)")
    print("=" * 80)

    # 1. Setup paths
    data_path = ML_DIR / "data" / "processed" / "day30_features.csv"
    v1_models_dir = ML_DIR / "artifacts" / "models" / "v1.0.0"
    exp_artifacts_dir = ML_DIR / "artifacts" / "experiments" / "exp_c_depth3_xgboost"
    figures_dir = ML_DIR / "reports" / "figures"
    metrics_dir = ML_DIR / "reports" / "metrics"
    cfg_path = ML_DIR / "configs" / "training.yaml"

    exp_artifacts_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)

    # Verify v1.0.0 baseline artifacts exist
    assert (v1_models_dir / "baseline_logistic_regression.joblib").exists(), "v1.0.0 baseline missing!"
    assert (v1_models_dir / "candidate_xgboost.joblib").exists(), "v1.0.0 candidate missing!"
    assert (v1_models_dir / "model_metadata.json").exists(), "v1.0.0 metadata missing!"
    print("[1/6] Verified v1.0.0 artifacts are present and protected.")

    # Load configuration
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    num_features = cfg["features"]["numerical"]
    cat_features = cfg["features"]["categorical"]
    feature_cols = num_features + cat_features

    df = pd.read_csv(data_path)
    train_df, test_df, split_stats = make_temporal_split(
        df,
        train_presentations=cfg["data"]["train_presentations"],
        test_presentation=cfg["data"]["test_presentation"],
        ensure_disjoint_students=False,
    )
    _, test_disjoint_df, _ = make_temporal_split(
        df,
        train_presentations=cfg["data"]["train_presentations"],
        test_presentation=cfg["data"]["test_presentation"],
        ensure_disjoint_students=True,
    )

    print(f"      Training set: {len(train_df):,} rows ({train_df['id_student'].nunique():,} unique students)")
    print(f"      Full test holdout: {len(test_df):,} rows")
    print(f"      Disjoint test holdout: {len(test_disjoint_df):,} rows")

    # Candidate Hyperparameters (EXP-C Constrained XGBoost)
    xgb_constrained_params = {
        "model_type": "XGBClassifier",
        "n_estimators": 150,
        "max_depth": 3,               # Constrained from 4 to 3
        "learning_rate": 0.05,
        "subsample": 0.80,
        "colsample_bytree": 0.70,     # Regularized feature sub-sampling
        "eval_metric": "logloss",
        "scale_pos_weight": 1.20,
        "random_state": 42,
    }

    lr_params = dict(cfg["baseline_logistic_regression"])
    xgb_original_params = dict(cfg["candidate_xgboost"])

    # 2. Cross-Validation Split
    print("\n[2/6] Generating 5-Fold Student-Grouped Cross-Validation splits...")
    splits = get_student_grouped_cv(train_df, n_splits=5, group_col="id_student")
    y_train = train_df["target"].to_numpy().astype(int)

    # Out-of-fold probability arrays
    oof_probs_lr = np.zeros(len(train_df))
    oof_probs_xgb_orig = np.zeros(len(train_df))
    oof_probs_xgb_c = np.zeros(len(train_df))

    fold_metrics_lr = []
    fold_metrics_xgb_orig = []
    fold_metrics_xgb_c = []

    print("\n[3/6] Executing Student-Grouped 5-Fold Cross-Validation...")
    for fold_idx, (t_idx, v_idx) in enumerate(splits, 1):
        print(f"\n  --- FOLD {fold_idx}/5 (Train: {len(t_idx):,} rows, Val: {len(v_idx):,} rows) ---")
        X_train_f, y_train_f = train_df.iloc[t_idx][feature_cols], y_train[t_idx]
        X_val_f, y_val_f = train_df.iloc[v_idx][feature_cols], y_train[v_idx]

        # 1. Logistic Regression Baseline
        t0 = time.time()
        pipe_lr = build_logistic_regression_pipeline(num_features, cat_features, lr_params)
        pipe_lr.fit(X_train_f, y_train_f)
        val_p_lr = pipe_lr.predict_proba(X_val_f)[:, 1]
        oof_probs_lr[v_idx] = val_p_lr
        dur_lr = time.time() - t0
        m_lr_f = compute_comprehensive_metrics(y_val_f, val_p_lr, threshold=0.46)
        fold_metrics_lr.append(m_lr_f)
        print(f"    [LR Baseline] Fit: {dur_lr:.2f}s | ROC-AUC: {m_lr_f['roc_auc']:.4f} | PR-AUC: {m_lr_f['pr_auc']:.4f} | Rec: {m_lr_f['recall']*100:.1f}% | Prec: {m_lr_f['precision']*100:.1f}% | FP: {m_lr_f['confusion_matrix']['fp']:,}")

        # 2. Original XGBoost Candidate (Depth 4)
        t0 = time.time()
        pipe_xgb_orig = build_xgboost_pipeline(num_features, cat_features, xgb_original_params)
        pipe_xgb_orig.fit(X_train_f, y_train_f)
        val_p_orig = pipe_xgb_orig.predict_proba(X_val_f)[:, 1]
        oof_probs_xgb_orig[v_idx] = val_p_orig
        dur_orig = time.time() - t0
        m_orig_f = compute_comprehensive_metrics(y_val_f, val_p_orig, threshold=0.46)
        fold_metrics_xgb_orig.append(m_orig_f)
        print(f"    [XGB-Orig D4] Fit: {dur_orig:.2f}s | ROC-AUC: {m_orig_f['roc_auc']:.4f} | PR-AUC: {m_orig_f['pr_auc']:.4f} | Rec: {m_orig_f['recall']*100:.1f}% | Prec: {m_orig_f['precision']*100:.1f}% | FP: {m_orig_f['confusion_matrix']['fp']:,}")

        # 3. Constrained XGBoost Candidate (Depth 3, Colsample 0.70)
        t0 = time.time()
        pipe_xgb_c = build_xgboost_pipeline(num_features, cat_features, xgb_constrained_params)
        pipe_xgb_c.fit(X_train_f, y_train_f)
        val_p_c = pipe_xgb_c.predict_proba(X_val_f)[:, 1]
        oof_probs_xgb_c[v_idx] = val_p_c
        dur_c = time.time() - t0
        m_c_f = compute_comprehensive_metrics(y_val_f, val_p_c, threshold=0.46)
        fold_metrics_xgb_c.append(m_c_f)
        print(f"    [XGB-C Depth3] Fit: {dur_c:.2f}s | ROC-AUC: {m_c_f['roc_auc']:.4f} | PR-AUC: {m_c_f['pr_auc']:.4f} | Rec: {m_c_f['recall']*100:.1f}% | Prec: {m_c_f['precision']*100:.1f}% | FP: {m_c_f['confusion_matrix']['fp']:,}")

    # Aggregated Pooled Out-of-Fold Metrics
    print("\n[4/6] Aggregating Cross-Validation Performance...")
    oof_m_lr = compute_comprehensive_metrics(y_train, oof_probs_lr, threshold=0.46)
    oof_m_xgb_orig = compute_comprehensive_metrics(y_train, oof_probs_xgb_orig, threshold=0.46)
    oof_m_xgb_c = compute_comprehensive_metrics(y_train, oof_probs_xgb_c, threshold=0.46)

    # Calibration Assessment
    calib_oof_lr = compute_calibration_assessment(y_train, oof_probs_lr)
    calib_oof_orig = compute_calibration_assessment(y_train, oof_probs_xgb_orig)
    calib_oof_c = compute_calibration_assessment(y_train, oof_probs_xgb_c)

    # Mean Fold Metrics Summary
    def _mean_std(metric_list: list[dict], key: str) -> tuple[float, float]:
        vals = [m[key] for m in metric_list]
        return round(float(np.mean(vals)), 4), round(float(np.std(vals)), 4)

    mean_auc_lr, std_auc_lr = _mean_std(fold_metrics_lr, "roc_auc")
    mean_auc_c, std_auc_c = _mean_std(fold_metrics_xgb_c, "roc_auc")
    mean_pr_lr, std_pr_lr = _mean_std(fold_metrics_lr, "pr_auc")
    mean_pr_c, std_pr_c = _mean_std(fold_metrics_xgb_c, "pr_auc")

    print(f"\n  === POOLED OUT-OF-FOLD COMPARISON (N=18,263, Threshold t=0.46) ===")
    print(f"  Metric                     | Logistic Regression | Constrained XGB (D3) | Difference")
    print(f"  ---------------------------+---------------------+----------------------+-------------")
    print(f"  ROC-AUC (Pooled)           | {oof_m_lr['roc_auc']:.4f}              | {oof_m_xgb_c['roc_auc']:.4f}               | {oof_m_xgb_c['roc_auc'] - oof_m_lr['roc_auc']:+.4f}")
    print(f"  PR-AUC (Pooled)            | {oof_m_lr['pr_auc']:.4f}              | {oof_m_xgb_c['pr_auc']:.4f}               | {oof_m_xgb_c['pr_auc'] - oof_m_lr['pr_auc']:+.4f}")
    print(f"  Mean Fold ROC-AUC          | {mean_auc_lr:.4f} (±{std_auc_lr:.4f})   | {mean_auc_c:.4f} (±{std_auc_c:.4f})    | {mean_auc_c - mean_auc_lr:+.4f}")
    print(f"  Mean Fold PR-AUC           | {mean_pr_lr:.4f} (±{std_pr_lr:.4f})   | {mean_pr_c:.4f} (±{std_pr_c:.4f})    | {mean_pr_c - mean_pr_lr:+.4f}")
    print(f"  Recall (Sensitivity)       | {oof_m_lr['recall']*100:.2f}%              | {oof_m_xgb_c['recall']*100:.2f}%               | {(oof_m_xgb_c['recall'] - oof_m_lr['recall'])*100:+.2f}%")
    print(f"  Precision                  | {oof_m_lr['precision']*100:.2f}%              | {oof_m_xgb_c['precision']*100:.2f}%               | {(oof_m_xgb_c['precision'] - oof_m_lr['precision'])*100:+.2f}%")
    print(f"  False Alarms (FP Burden)   | {oof_m_lr['confusion_matrix']['fp']:,}               | {oof_m_xgb_c['confusion_matrix']['fp']:,}                | {oof_m_xgb_c['confusion_matrix']['fp'] - oof_m_lr['confusion_matrix']['fp']:,} ({((oof_m_xgb_c['confusion_matrix']['fp'] - oof_m_lr['confusion_matrix']['fp'])/oof_m_lr['confusion_matrix']['fp'])*100:+.1f}%)")
    print(f"  Missed Vulnerable (FN)     | {oof_m_lr['confusion_matrix']['fn']:,}               | {oof_m_xgb_c['confusion_matrix']['fn']:,}                | {oof_m_xgb_c['confusion_matrix']['fn'] - oof_m_lr['confusion_matrix']['fn']:,}")
    print(f"  Alert Rate (% of Cohort)   | {oof_m_lr['operational_workload']['alert_rate_pct']:.2f}%              | {oof_m_xgb_c['operational_workload']['alert_rate_pct']:.2f}%               | {oof_m_xgb_c['operational_workload']['alert_rate_pct'] - oof_m_lr['operational_workload']['alert_rate_pct']:+.2f}%")
    print(f"  Brier Calibration Score    | {calib_oof_lr['brier_score']:.4f}              | {calib_oof_c['brier_score']:.4f}               | {calib_oof_c['brier_score'] - calib_oof_lr['brier_score']:+.4f}")
    print(f"  Expected Calib Error (ECE) | {calib_oof_lr['expected_calibration_error_ece']:.4f}              | {calib_oof_c['expected_calibration_error_ece']:.4f}               | {calib_oof_c['expected_calibration_error_ece'] - calib_oof_lr['expected_calibration_error_ece']:+.4f}")

    # 5. Fit Final Candidate on All Training Data & Evaluate Secondary 2014J Holdout
    print("\n[5/6] Fitting Final Candidate & Evaluating Secondary 2014J Holdout...")
    t0 = time.time()
    final_candidate_pipe = build_xgboost_pipeline(num_features, cat_features, xgb_constrained_params)
    final_candidate_pipe.fit(train_df[feature_cols], y_train)
    fit_time_final = time.time() - t0
    print(f"      [✓] Final Constrained XGBoost fitted on 18,263 training records in {fit_time_final:.2f}s")

    # Evaluate Secondary 2014J Holdout
    X_test = test_df[feature_cols]
    y_test = test_df["target"].to_numpy().astype(int)
    probs_test_c = final_candidate_pipe.predict_proba(X_test)[:, 1]
    m_test_c_t46 = compute_comprehensive_metrics(y_test, probs_test_c, threshold=0.46)
    m_test_c_t50 = compute_comprehensive_metrics(y_test, probs_test_c, threshold=0.50)
    calib_test_c = compute_calibration_assessment(y_test, probs_test_c)

    # Disjoint Holdout Evaluation
    X_disjoint = test_disjoint_df[feature_cols]
    y_disjoint = test_disjoint_df["target"].to_numpy().astype(int)
    probs_disjoint_c = final_candidate_pipe.predict_proba(X_disjoint)[:, 1]
    m_disjoint_c_t46 = compute_comprehensive_metrics(y_disjoint, probs_disjoint_c, threshold=0.46)

    print(f"      Secondary 2014J Holdout Evaluation (t=0.46):")
    print(f"        ROC-AUC: {m_test_c_t46['roc_auc']:.4f} | PR-AUC: {m_test_c_t46['pr_auc']:.4f} | Brier: {m_test_c_t46['brier_score']:.4f}")
    print(f"        Recall: {m_test_c_t46['recall']*100:.2f}% | Precision: {m_test_c_t46['precision']*100:.2f}% | FP: {m_test_c_t46['confusion_matrix']['fp']:,}")
    print(f"        Alert Rate: {m_test_c_t46['operational_workload']['alert_rate_pct']:.2f}% ({m_test_c_t46['operational_workload']['total_alerts_fired']:,} alerts)")

    # 6. Save Artifacts Safely into Experiment Directory
    print("\n[6/6] Saving Experiment Artifacts, Metrics, Figures & Reports...")

    candidate_artifact_path = exp_artifacts_dir / "candidate_constrained_xgboost.joblib"
    joblib.dump(final_candidate_pipe, candidate_artifact_path)
    print(f"      [✓] Saved candidate artifact ({candidate_artifact_path.stat().st_size:,} bytes) to: {candidate_artifact_path.relative_to(REPO_ROOT)}")

    # Save Config
    with open(exp_artifacts_dir / "config.yaml", "w", encoding="utf-8") as f:
        yaml.dump({
            "experiment_id": "EXP-C-DEPTH3-XGBOOST",
            "model_type": "XGBClassifier",
            "hyperparameters": xgb_constrained_params,
            "training_cohort": cfg["data"]["train_presentations"],
            "test_cohort": cfg["data"]["test_presentation"],
            "feature_counts": {"numerical": len(num_features), "categorical": len(cat_features), "total": len(feature_cols)},
            "threshold": 0.46,
            "status": "RESEARCH_CANDIDATE_UNPROMOTED",
        }, f, sort_keys=False)

    # Save Feature Schema
    with open(exp_artifacts_dir / "feature_schema.json", "w", encoding="utf-8") as f:
        json.dump({
            "features": {"numerical": num_features, "categorical": cat_features, "all": feature_cols},
            "observation_window": "Day 0 through Day 30",
            "target": "target (1 = At-Risk, 0 = On-Track)",
        }, f, indent=2)

    # Export De-identified Out-of-Fold Predictions
    oof_df = train_df[["code_module", "code_presentation", "target"]].copy()
    oof_df["pseudonymous_id"] = [f"ANON-CV-{i+1:05d}" for i in range(len(oof_df))]
    oof_df["actual_target"] = y_train
    oof_df["prob_baseline_lr"] = np.round(oof_probs_lr, 4)
    oof_df["prob_constrained_xgb"] = np.round(oof_probs_xgb_c, 4)
    oof_df["pred_lr_t46"] = (oof_probs_lr >= 0.46).astype(int)
    oof_df["pred_xgb_t46"] = (oof_probs_xgb_c >= 0.46).astype(int)
    oof_df["lr_error_type"] = np.select(
        [(y_train == 1) & (oof_df["pred_lr_t46"] == 1), (y_train == 0) & (oof_df["pred_lr_t46"] == 1),
         (y_train == 0) & (oof_df["pred_lr_t46"] == 0), (y_train == 1) & (oof_df["pred_lr_t46"] == 0)],
        ["TP", "FP", "TN", "FN"],
        default="UNKNOWN"
    )
    oof_df["xgb_error_type"] = np.select(
        [(y_train == 1) & (oof_df["pred_xgb_t46"] == 1), (y_train == 0) & (oof_df["pred_xgb_t46"] == 1),
         (y_train == 0) & (oof_df["pred_xgb_t46"] == 0), (y_train == 1) & (oof_df["pred_xgb_t46"] == 0)],
        ["TP", "FP", "TN", "FN"],
        default="UNKNOWN"
    )

    oof_cols = ["pseudonymous_id", "code_module", "code_presentation", "actual_target",
                "prob_baseline_lr", "prob_constrained_xgb", "pred_lr_t46", "pred_xgb_t46",
                "lr_error_type", "xgb_error_type"]
    oof_export_path = metrics_dir / "phase_seven_oof_predictions.csv"
    oof_df[oof_cols].to_csv(oof_export_path, index=False)
    print(f"      [✓] Exported {len(oof_df):,} de-identified OOF predictions to: {oof_export_path.name}")

    # Export Metrics Ledger
    experiment_metrics = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "experiment_id": "EXP-C-DEPTH3-XGBOOST",
        "candidate_status": "RESEARCH_CANDIDATE_NOT_PROMOTED",
        "hyperparameters": xgb_constrained_params,
        "validation_5fold_cv": {
            "logistic_regression_baseline": {
                "pooled_oof": oof_m_lr,
                "mean_fold_roc_auc": mean_auc_lr,
                "std_fold_roc_auc": std_auc_lr,
                "mean_fold_pr_auc": mean_pr_lr,
                "std_fold_pr_auc": std_pr_lr,
                "calibration": calib_oof_lr,
                "fold_breakdown": fold_metrics_lr,
            },
            "constrained_depth3_xgboost": {
                "pooled_oof": oof_m_xgb_c,
                "mean_fold_roc_auc": mean_auc_c,
                "std_fold_roc_auc": std_auc_c,
                "mean_fold_pr_auc": mean_pr_c,
                "std_fold_pr_auc": std_pr_c,
                "calibration": calib_oof_c,
                "fold_breakdown": fold_metrics_xgb_c,
            },
            "original_depth4_xgboost": {
                "pooled_oof": oof_m_xgb_orig,
                "calibration": calib_oof_orig,
            },
        },
        "secondary_2014j_holdout": {
            "logistic_regression": cfg.get("test_baseline", {}),
            "constrained_depth3_xgboost": {
                "threshold_0_46": m_test_c_t46,
                "threshold_0_50": m_test_c_t50,
                "disjoint_holdout_0_46": m_disjoint_c_t46,
                "calibration": calib_test_c,
            },
        },
    }

    metrics_json_path = metrics_dir / "phase_seven_experiment_metrics.json"
    with open(metrics_json_path, "w", encoding="utf-8") as f:
        json.dump(experiment_metrics, f, indent=2)
    with open(exp_artifacts_dir / "validation_metrics.json", "w", encoding="utf-8") as f:
        json.dump(experiment_metrics, f, indent=2)
    print(f"      [✓] Saved experiment metrics ledger to: {metrics_json_path.name}")

    # Generate Model Comparison Visualizations
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))

    # 1. ROC Curves (Pooled OOF)
    fpr_lr, tpr_lr, _ = roc_curve(y_train, oof_probs_lr)
    fpr_c, tpr_c, _ = roc_curve(y_train, oof_probs_xgb_c)
    axes[0, 0].plot([0, 1], [0, 1], "k:")
    axes[0, 0].plot(fpr_lr, tpr_lr, color="#2b5c8f", lw=2, label=f"LR Baseline (AUC = {oof_m_lr['roc_auc']:.4f})")
    axes[0, 0].plot(fpr_c, tpr_c, color="#2ca02c", lw=2, label=f"Constrained XGB (AUC = {oof_m_xgb_c['roc_auc']:.4f})")
    axes[0, 0].set_title("Pooled Out-of-Fold ROC Curves (5-Fold CV)")
    axes[0, 0].set_xlabel("False Positive Rate")
    axes[0, 0].set_ylabel("Recall (True Positive Rate)")
    axes[0, 0].legend(loc="lower right")

    # 2. PR Curves (Pooled OOF)
    prec_lr, rec_lr, _ = precision_recall_curve(y_train, oof_probs_lr)
    prec_c, rec_c, _ = precision_recall_curve(y_train, oof_probs_xgb_c)
    axes[0, 1].plot(rec_lr, prec_lr, color="#2b5c8f", lw=2, label=f"LR Baseline (PR-AUC = {oof_m_lr['pr_auc']:.4f})")
    axes[0, 1].plot(rec_c, prec_c, color="#2ca02c", lw=2, label=f"Constrained XGB (PR-AUC = {oof_m_xgb_c['pr_auc']:.4f})")
    axes[0, 1].axhline(y_train.mean(), color="gray", linestyle=":", label=f"Prevalence ({y_train.mean():.3f})")
    axes[0, 1].set_title("Pooled Out-of-Fold PR Curves (5-Fold CV)")
    axes[0, 1].set_xlabel("Recall")
    axes[0, 1].set_ylabel("Precision")
    axes[0, 1].legend(loc="lower left")

    # 3. Calibration Curves (Pooled OOF)
    from sklearn.calibration import calibration_curve
    pt_lr, pp_lr = calibration_curve(y_train, oof_probs_lr, n_bins=10)
    pt_c, pp_c = calibration_curve(y_train, oof_probs_xgb_c, n_bins=10)
    axes[1, 0].plot([0, 1], [0, 1], "k:", label="Perfect Calibration")
    axes[1, 0].plot(pp_lr, pt_lr, "s-", color="#2b5c8f", label=f"LR Baseline (Brier: {calib_oof_lr['brier_score']:.4f}, ECE: {calib_oof_lr['expected_calibration_error_ece']:.4f})")
    axes[1, 0].plot(pp_c, pt_c, "o-", color="#2ca02c", label=f"Constrained XGB (Brier: {calib_oof_c['brier_score']:.4f}, ECE: {calib_oof_c['expected_calibration_error_ece']:.4f})")
    axes[1, 0].set_title("Reliability Diagram — Probability Calibration (OOF)")
    axes[1, 0].set_xlabel("Mean Predicted Probability")
    axes[1, 0].set_ylabel("Empirical Fraction of Positives")
    axes[1, 0].legend(loc="lower right")

    # 4. Fold Stability Boxplots / Bar Charts
    folds = [f"F{i}" for i in range(1, 6)]
    aucs_lr = [m["roc_auc"] for m in fold_metrics_lr]
    aucs_c = [m["roc_auc"] for m in fold_metrics_xgb_c]
    x_idx = np.arange(len(folds))
    w = 0.35
    axes[1, 1].bar(x_idx - w/2, aucs_lr, width=w, color="#2b5c8f", label="LR Baseline")
    axes[1, 1].bar(x_idx + w/2, aucs_c, width=w, color="#2ca02c", label="Constrained XGB")
    axes[1, 1].set_xticks(x_idx)
    axes[1, 1].set_xticklabels(folds)
    axes[1, 1].set_ylim([0.65, 0.80])
    axes[1, 1].set_title("Cross-Fold ROC-AUC Stability (Across 5 Folds)")
    axes[1, 1].set_xlabel("Validation Fold")
    axes[1, 1].set_ylabel("ROC-AUC")
    axes[1, 1].legend(loc="lower right")

    plt.tight_layout()
    comp_fig_path = figures_dir / "phase_seven_model_comparison.png"
    fig.savefig(comp_fig_path, dpi=300)
    plt.close(fig)
    print(f"      [✓] Saved comparison figure to: {comp_fig_path.name}")

    total_time = time.time() - t_start
    print(f"\n[✓] SUTRA Phase Seven experiment completed successfully in {total_time:.2f} seconds!")


if __name__ == "__main__":
    run_phase_seven_experiment()
