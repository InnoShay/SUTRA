#!/usr/bin/env python3
"""
SUTRA Phase Six: Diagnostic Evaluation, Error Analysis & Controlled Experimentation Pipeline.

Executes:
1. Reproducible Baseline Recomputation & Ledger Generation
2. Row-Level Error Analysis (TP, FP, TN, FN) & Probability Margin Analysis
3. Subgroup & Module Disaggregated Diagnostics with Wilson Confidence Intervals
4. Feature Contribution, Error Attribution & Collinearity Diagnostics
5. Probability Calibration, ROC/PR Curves & Threshold Workload Curves
6. Controlled Validation-Only Experiments (5-Fold Student-Grouped CV)
7. Generates Comprehensive Figures, Metrics Ledgers, and Markdown Reports
"""

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
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    precision_recall_curve,
    roc_curve,
)
from sklearn.pipeline import Pipeline
import xgboost as xgb
import yaml

# Resolve local package paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.evaluation.calibration import compute_calibration_assessment
from sutra_ml.evaluation.diagnostics import (
    analyze_error_subsets,
    categorize_row_level_errors,
    compute_comprehensive_subgroup_diagnostics,
    compute_threshold_operating_curve,
    evaluate_model_on_dataset,
    extract_deidentified_error_samples,
)
from sutra_ml.evaluation.metrics import (
    compute_comprehensive_metrics,
    find_threshold_for_target_recall,
)
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_preprocessor,
    build_xgboost_pipeline,
)
from sutra_ml.training.split import get_student_grouped_cv, make_temporal_split


def run_phase_six_diagnostics() -> None:
    t_start = time.time()
    print("=" * 80)
    print("SUTRA ML — PHASE SIX: DIAGNOSTIC EVALUATION & ERROR ANALYSIS")
    print("=" * 80)

    # 1. Paths and Setup
    data_path = ML_DIR / "data" / "processed" / "day30_features.csv"
    models_dir = ML_DIR / "artifacts" / "models" / "v1.0.0"
    baseline_path = models_dir / "baseline_logistic_regression.joblib"
    xgb_path = models_dir / "candidate_xgboost.joblib"
    meta_path = models_dir / "model_metadata.json"
    cfg_path = ML_DIR / "configs" / "training.yaml"

    figures_dir = ML_DIR / "reports" / "figures"
    metrics_dir = ML_DIR / "reports" / "metrics"
    experiments_dir = ML_DIR / "artifacts" / "experiments" / "phase_six"

    figures_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)
    experiments_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/7] Loading configuration and artifacts...")
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    num_features = meta["features"]["numerical"]
    cat_features = meta["features"]["categorical"]
    feature_cols = num_features + cat_features

    df = pd.read_csv(data_path)
    print(f"      Loaded processed dataset: {len(df):,} total student-course records")

    # Temporal Partitions
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

    print(f"      Training partition (2013B, 2013J, 2014B): {len(train_df):,} rows")
    print(f"      Full test holdout (2014J): {len(test_df):,} rows")
    print(f"      Disjoint unseen-student holdout: {len(test_disjoint_df):,} rows")

    # Load Saved Models
    baseline_model = joblib.load(baseline_path)
    xgb_model = joblib.load(xgb_path)
    print(f"      Loaded baseline pipeline: {type(baseline_model).__name__}")
    print(f"      Loaded candidate pipeline: {type(xgb_model).__name__}")

    # =========================================================================
    # PHASE ONE: Reproducible Baseline Recomputation
    # =========================================================================
    print("\n[2/7] Phase One: Computing Reproducible Evaluation Baselines...")

    X_test = test_df[feature_cols]
    y_test = test_df["target"].to_numpy().astype(int)
    X_disjoint = test_disjoint_df[feature_cols]
    y_disjoint = test_disjoint_df["target"].to_numpy().astype(int)

    # 1. Full Holdout Predictions
    probs_base_test = baseline_model.predict_proba(X_test)[:, 1]
    probs_xgb_test = xgb_model.predict_proba(X_test)[:, 1]

    # Metrics at threshold 0.50
    m_base_t50 = compute_comprehensive_metrics(y_test, probs_base_test, threshold=0.50)
    m_xgb_t50 = compute_comprehensive_metrics(y_test, probs_xgb_test, threshold=0.50)

    # Metrics at operational threshold 0.46
    m_base_t46 = compute_comprehensive_metrics(y_test, probs_base_test, threshold=0.46)
    m_xgb_t46 = compute_comprehensive_metrics(y_test, probs_xgb_test, threshold=0.46)

    # Disjoint Holdout Predictions
    probs_base_disjoint = baseline_model.predict_proba(X_disjoint)[:, 1]
    probs_xgb_disjoint = xgb_model.predict_proba(X_disjoint)[:, 1]
    m_base_disjoint_t46 = compute_comprehensive_metrics(y_disjoint, probs_base_disjoint, threshold=0.46)
    m_xgb_disjoint_t46 = compute_comprehensive_metrics(y_disjoint, probs_xgb_disjoint, threshold=0.46)

    # Calibration Assessment
    calib_base = compute_calibration_assessment(y_test, probs_base_test)
    calib_xgb = compute_calibration_assessment(y_test, probs_xgb_test)

    # Print baseline verification summary
    print(f"      Logistic Regression (Holdout 2014J at t=0.46):")
    print(f"        ROC-AUC: {m_base_t46['roc_auc']:.4f} | PR-AUC: {m_base_t46['pr_auc']:.4f} | Brier: {m_base_t46['brier_score']:.4f}")
    print(f"        Recall: {m_base_t46['recall']*100:.2f}% | Precision: {m_base_t46['precision']*100:.2f}% | FP: {m_base_t46['confusion_matrix']['fp']:,}")
    print(f"        Alert Rate: {m_base_t46['operational_workload']['alert_rate_pct']:.2f}% ({m_base_t46['operational_workload']['total_alerts_fired']:,} alerts)")
    print(f"      XGBoost Candidate (Holdout 2014J at t=0.46):")
    print(f"        ROC-AUC: {m_xgb_t46['roc_auc']:.4f} | PR-AUC: {m_xgb_t46['pr_auc']:.4f} | Brier: {m_xgb_t46['brier_score']:.4f}")
    print(f"        Recall: {m_xgb_t46['recall']*100:.2f}% | Precision: {m_xgb_t46['precision']*100:.2f}% | FP: {m_xgb_t46['confusion_matrix']['fp']:,}")

    # =========================================================================
    # PHASE TWO: Row-Level Error Analysis
    # =========================================================================
    print("\n[3/7] Phase Two: Row-Level Error Analysis & Breakdown...")

    error_base_df = categorize_row_level_errors(test_df, y_test, probs_base_test, threshold=0.46)
    error_xgb_df = categorize_row_level_errors(test_df, y_test, probs_xgb_test, threshold=0.46)

    err_stats_base = analyze_error_subsets(error_base_df, num_features)
    err_stats_xgb = analyze_error_subsets(error_xgb_df, num_features)

    print(f"      Logistic Regression Error Distribution (Total: {len(test_df):,}):")
    for cat, data in err_stats_base["categories"].items():
        print(f"        {cat}: {data['count']:,} ({data['percentage']:.2f}%) | Mean prob: {data['probability_distribution']['mean']:.4f}")

    print(f"      FN Deep Dive (Missed Vulnerable Students):")
    fn_dive = err_stats_base["false_negative_deep_dive"]
    print(f"        Total Missed (FN): {fn_dive['total_missed_students']:,}")
    print(f"        Borderline misses (0.35 <= p < 0.46): {fn_dive['borderline_misses_p35_to_p46']:,} ({fn_dive['borderline_pct']:.2f}%)")
    print(f"        Deep misses (p < 0.20): {fn_dive['deep_misses_under_p20']:,} ({fn_dive['deep_misses_pct']:.2f}%)")

    # Export de-identified sample error cases
    deid_samples = extract_deidentified_error_samples(error_base_df, n_per_category=15)
    deid_samples_path = metrics_dir / "phase_six_error_records.csv"
    deid_samples.to_csv(deid_samples_path, index=False)
    print(f"      [✓] Exported {len(deid_samples)} de-identified error records to: {deid_samples_path.name}")

    # Plot Confusion Matrices
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    cm_base = np.array([
        [m_base_t46["confusion_matrix"]["tn"], m_base_t46["confusion_matrix"]["fp"]],
        [m_base_t46["confusion_matrix"]["fn"], m_base_t46["confusion_matrix"]["tp"]],
    ])
    cm_xgb = np.array([
        [m_xgb_t46["confusion_matrix"]["tn"], m_xgb_t46["confusion_matrix"]["fp"]],
        [m_xgb_t46["confusion_matrix"]["fn"], m_xgb_t46["confusion_matrix"]["tp"]],
    ])

    sns.heatmap(cm_base, annot=True, fmt="d", cmap="Blues", cbar=False, ax=axes[0],
                xticklabels=["Pred On-Track", "Pred At-Risk"],
                yticklabels=["Actual On-Track", "Actual At-Risk"])
    axes[0].set_title(f"Logistic Regression Baseline (t=0.46)\nRecall: {m_base_t46['recall']*100:.1f}% | FP: {cm_base[0,1]:,}")
    axes[0].set_ylabel("Actual Status")
    axes[0].set_xlabel("Predicted Status")

    sns.heatmap(cm_xgb, annot=True, fmt="d", cmap="Greens", cbar=False, ax=axes[1],
                xticklabels=["Pred On-Track", "Pred At-Risk"],
                yticklabels=["Actual On-Track", "Actual At-Risk"])
    axes[1].set_title(f"XGBoost Candidate (t=0.46)\nRecall: {m_xgb_t46['recall']*100:.1f}% | FP: {cm_xgb[0,1]:,}")
    axes[1].set_ylabel("Actual Status")
    axes[1].set_xlabel("Predicted Status")

    plt.tight_layout()
    fig.savefig(figures_dir / "confusion_matrices.png", dpi=300)
    plt.close(fig)

    # Plot Probability Distributions Split by Actual Class
    fig, ax = plt.subplots(figsize=(9, 5))
    sns.histplot(data=error_base_df, x="predicted_probability", hue="actual_target",
                 bins=40, kde=True, palette={0: "#2b5c8f", 1: "#d95f02"},
                 stat="density", common_norm=False, ax=ax)
    ax.axvline(0.46, color="red", linestyle="--", linewidth=2, label="Threshold t=0.46")
    ax.axvline(0.50, color="gray", linestyle=":", linewidth=1.5, label="Default t=0.50")
    ax.set_title("Logistic Regression Predicted Risk Probability by True Outcome (2014J)")
    ax.set_xlabel("Predicted P(At-Risk)")
    ax.set_ylabel("Density")
    ax.legend(["KDE At-Risk", "KDE On-Track", "Threshold (0.46)", "Default (0.50)", "Actual At-Risk (1)", "Actual On-Track (0)"])
    plt.tight_layout()
    fig.savefig(figures_dir / "probability_distributions.png", dpi=300)
    plt.close(fig)

    # =========================================================================
    # PHASE THREE: Subgroup and Module Diagnostics
    # =========================================================================
    print("\n[4/7] Phase Three: Disaggregated Subgroup and Module Diagnostics...")

    subgroups_base_df = compute_comprehensive_subgroup_diagnostics(
        test_df, y_test, probs_base_test, threshold=0.46
    )
    subgroups_base_df["model"] = "LogisticRegression"

    subgroups_xgb_df = compute_comprehensive_subgroup_diagnostics(
        test_df, y_test, probs_xgb_test, threshold=0.46
    )
    subgroups_xgb_df["model"] = "XGBoost"

    subgroups_combined_df = pd.concat([subgroups_base_df, subgroups_xgb_df], ignore_index=True)
    subgroup_csv_path = metrics_dir / "phase_six_subgroup_metrics.csv"
    subgroups_combined_df.to_csv(subgroup_csv_path, index=False)
    print(f"      [✓] Exported subgroup metrics across 6 dimensions to: {subgroup_csv_path.name}")

    # Report module performance highlights
    print("      Module Diagnostics (Logistic Regression at t=0.46):")
    mod_df = subgroups_base_df[subgroups_base_df["dimension"] == "code_module"]
    for _, r in mod_df.iterrows():
        print(f"        Module {r['subgroup']}: N={r['sample_size']:,} | At-Risk Prev: {r['prevalence']*100:.1f}% | Recall: {r['recall']*100:.1f}% | FPR: {r['false_positive_rate']*100:.1f}% | Alerts: {r['alert_rate_pct']:.1f}%")

    # =========================================================================
    # PHASE FOUR: Feature Contributions & Collinearity Diagnostics
    # =========================================================================
    print("\n[5/7] Phase Four: Feature Contribution & Collinearity Diagnostics...")

    # Correlation Matrix of Engagement Features
    corr_features = [
        "vle_total_clicks_d30",
        "vle_active_days_d30",
        "vle_clicks_poststart_d30",
        "vle_clicks_precourse",
        "vle_clicks_last_7d",
        "vle_days_since_last_click",
        "vle_clicks_forumng_d30",
        "vle_clicks_oucontent_d30",
        "vle_clicks_quiz_d30",
        "vle_clicks_homepage_d30",
        "vle_clicks_other_d30",
        "assessments_submitted_d30",
        "studied_credits",
        "num_of_prev_attempts",
    ]
    corr_df = test_df[corr_features].corr()

    # Identify pairs with r > 0.70
    collinear_pairs = []
    for i in range(len(corr_features)):
        for j in range(i + 1, len(corr_features)):
            r_val = corr_df.iloc[i, j]
            if abs(r_val) >= 0.70:
                collinear_pairs.append({
                    "feature_1": corr_features[i],
                    "feature_2": corr_features[j],
                    "pearson_r": round(float(r_val), 4),
                })

    print(f"      High Collinearity Pairs (|r| >= 0.70):")
    for cp in collinear_pairs:
        print(f"        {cp['feature_1']} <-> {cp['feature_2']}: r = {cp['pearson_r']:.4f}")

    # Plot Correlation Matrix
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(corr_df, annot=True, fmt=".2f", cmap="coolwarm", vmin=-1, vmax=1, ax=ax, cbar=True)
    ax.set_title("Pearson Correlation Matrix — Day-30 Predictors (2014J)")
    plt.tight_layout()
    fig.savefig(figures_dir / "feature_correlation_matrix.png", dpi=300)
    plt.close(fig)

    # Feature Means Comparison: Correct vs Errors (TP, TN, FP, FN)
    key_comp_features = [
        "vle_total_clicks_d30",
        "vle_active_days_d30",
        "vle_days_since_last_click",
        "vle_clicks_last_7d",
        "studied_credits",
        "num_of_prev_attempts",
    ]
    comp_records = []
    for cat in ["TP", "TN", "FP", "FN"]:
        sub = error_base_df[error_base_df["error_category"] == cat]
        for feat in key_comp_features:
            comp_records.append({
                "error_category": cat,
                "feature": feat,
                "mean_value": float(sub[feat].mean()),
            })
    comp_df = pd.DataFrame(comp_records)

    # Plot Feature Means by Error Group
    fig, axes = plt.subplots(2, 3, figsize=(14, 8))
    axes = axes.flatten()
    for idx, feat in enumerate(key_comp_features):
        sub_feat = comp_df[comp_df["feature"] == feat]
        palette = {"TP": "#d95f02", "TN": "#2b5c8f", "FP": "#e7298a", "FN": "#7570b3"}
        sns.barplot(data=sub_feat, x="error_category", y="mean_value", order=["TP", "FN", "FP", "TN"],
                    palette=palette, ax=axes[idx])
        axes[idx].set_title(feat)
        axes[idx].set_xlabel("")
        axes[idx].set_ylabel("Mean Observed Value")
    plt.suptitle("Predictor Profiles across Error Categories (TP, FN, FP, TN) — Logistic Regression", fontsize=14)
    plt.tight_layout()
    fig.savefig(figures_dir / "feature_attributions_errors.png", dpi=300)
    plt.close(fig)

    # =========================================================================
    # PHASE FIVE: Probability & Threshold Diagnostics
    # =========================================================================
    print("\n[6/7] Phase Five: Probability Calibration & Threshold Curves...")

    # Plot Calibration Reliability Curves
    fig, ax = plt.subplots(figsize=(8, 6))
    prob_true_base, prob_pred_base = calibration_curve(y_test, probs_base_test, n_bins=10)
    prob_true_xgb, prob_pred_xgb = calibration_curve(y_test, probs_xgb_test, n_bins=10)

    ax.plot([0, 1], [0, 1], "k:", label="Perfect Calibration")
    ax.plot(prob_pred_base, prob_true_base, "s-", color="#2b5c8f",
            label=f"Logistic Regression (ECE: {calib_base['expected_calibration_error_ece']:.4f}, Brier: {calib_base['brier_score']:.4f})")
    ax.plot(prob_pred_xgb, prob_true_xgb, "o-", color="#2ca02c",
            label=f"XGBoost Candidate (ECE: {calib_xgb['expected_calibration_error_ece']:.4f}, Brier: {calib_xgb['brier_score']:.4f})")
    ax.set_xlabel("Mean Predicted Probability P(At-Risk)")
    ax.set_ylabel("Empirical Fraction of Positives")
    ax.set_title("Reliability Diagram — Probability Calibration on Holdout (2014J)")
    ax.legend(loc="lower right")
    plt.tight_layout()
    fig.savefig(figures_dir / "calibration_curves.png", dpi=300)
    plt.close(fig)

    # Plot ROC & PR Curves
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fpr_base, tpr_base, _ = roc_curve(y_test, probs_base_test)
    fpr_xgb, tpr_xgb, _ = roc_curve(y_test, probs_xgb_test)

    axes[0].plot([0, 1], [0, 1], "k:")
    axes[0].plot(fpr_base, tpr_base, color="#2b5c8f", label=f"Logistic Regression (AUC = {m_base_t46['roc_auc']:.4f})")
    axes[0].plot(fpr_xgb, tpr_xgb, color="#2ca02c", label=f"XGBoost (AUC = {m_xgb_t46['roc_auc']:.4f})")
    axes[0].set_title("ROC Curves — Discrimination (2014J)")
    axes[0].set_xlabel("False Positive Rate")
    axes[0].set_ylabel("True Positive Rate (Recall)")
    axes[0].legend(loc="lower right")

    prec_base, rec_base, _ = precision_recall_curve(y_test, probs_base_test)
    prec_xgb, rec_xgb, _ = precision_recall_curve(y_test, probs_xgb_test)
    axes[1].plot(rec_base, prec_base, color="#2b5c8f", label=f"Logistic Regression (PR-AUC = {m_base_t46['pr_auc']:.4f})")
    axes[1].plot(rec_xgb, prec_xgb, color="#2ca02c", label=f"XGBoost (PR-AUC = {m_xgb_t46['pr_auc']:.4f})")
    axes[1].axhline(y_test.mean(), color="gray", linestyle=":", label=f"Prevalence ({y_test.mean():.3f})")
    axes[1].set_title("Precision-Recall Curves (2014J)")
    axes[1].set_xlabel("Recall")
    axes[1].set_ylabel("Precision")
    axes[1].legend(loc="lower left")

    plt.tight_layout()
    fig.savefig(figures_dir / "roc_pr_curves.png", dpi=300)
    plt.close(fig)

    # Threshold Sweep on Holdout
    thresh_sweep_base = compute_threshold_operating_curve(y_test, probs_base_test)
    thresh_sweep_xgb = compute_threshold_operating_curve(y_test, probs_xgb_test)

    # Plot Threshold Workload Trade-offs
    fig, ax = plt.subplots(figsize=(10, 5))
    t_vals = [r["threshold"] for r in thresh_sweep_base]
    rec_vals = [r["recall"] * 100 for r in thresh_sweep_base]
    prec_vals = [r["precision"] * 100 for r in thresh_sweep_base]
    alert_vals = [r["alert_rate_pct"] for r in thresh_sweep_base]

    ax.plot(t_vals, rec_vals, "o-", color="#d95f02", label="Recall (% Vulnerable Identified)")
    ax.plot(t_vals, prec_vals, "s-", color="#2b5c8f", label="Precision (% Alerts Truly At-Risk)")
    ax.plot(t_vals, alert_vals, "^--", color="#7570b3", label="Alert Burden (% Cohort Flagged)")
    ax.axvline(0.46, color="red", linestyle="--", label="Operational Threshold t=0.46")
    ax.axvline(0.50, color="gray", linestyle=":", label="Default Threshold t=0.50")
    ax.set_title("Operational Threshold Trade-offs — Logistic Regression Baseline")
    ax.set_xlabel("Decision Threshold")
    ax.set_ylabel("Percentage (%)")
    ax.legend(loc="center right")
    plt.tight_layout()
    fig.savefig(figures_dir / "threshold_tradeoffs.png", dpi=300)
    plt.close(fig)

    # =========================================================================
    # PHASE SIX: Controlled Experiments on Training Partition (Validation-Only)
    # =========================================================================
    print("\n[7/7] Phase Six: Running Controlled Experiments on Training CV (Preserving Holdout)...")
    splits = get_student_grouped_cv(train_df, n_splits=5, group_col="id_student")
    y_train = train_df["target"].to_numpy().astype(int)

    experiment_results = []

    # Baseline CV Benchmark
    oof_probs_base = np.zeros(len(train_df))
    for t_idx, v_idx in splits:
        pipe = build_logistic_regression_pipeline(num_features, cat_features, cfg["baseline_logistic_regression"])
        pipe.fit(train_df.iloc[t_idx][feature_cols], y_train[t_idx])
        oof_probs_base[v_idx] = pipe.predict_proba(train_df.iloc[v_idx][feature_cols])[:, 1]

    cv_base_m = compute_comprehensive_metrics(y_train, oof_probs_base, threshold=0.46)
    cv_base_calib = compute_calibration_assessment(y_train, oof_probs_base)
    experiment_results.append({
        "experiment_id": "EXP-00-BASELINE",
        "description": "Production Baseline: All 25 features, C=1.0, balanced weights, L2 penalty",
        "feature_count": 25,
        "cv_roc_auc": cv_base_m["roc_auc"],
        "cv_pr_auc": cv_base_m["pr_auc"],
        "cv_recall_t46": cv_base_m["recall"],
        "cv_precision_t46": cv_base_m["precision"],
        "cv_brier_score": cv_base_calib["brier_score"],
        "cv_ece": cv_base_calib["expected_calibration_error_ece"],
        "cv_alert_rate_pct": cv_base_m["operational_workload"]["alert_rate_pct"],
        "cv_false_alarms": cv_base_m["confusion_matrix"]["fp"],
    })
    print(f"      [Exp 0 Baseline] CV ROC-AUC: {cv_base_m['roc_auc']:.4f} | PR-AUC: {cv_base_m['pr_auc']:.4f} | Recall: {cv_base_m['recall']*100:.2f}% | FP: {cv_base_m['confusion_matrix']['fp']:,}")

    # Experiment 1: Collinearity Pruning (Remove redundant granular sub-activity clicks)
    # Exclude: vle_clicks_forumng_d30, vle_clicks_oucontent_d30, vle_clicks_quiz_d30, vle_clicks_homepage_d30, vle_clicks_other_d30, vle_clicks_poststart_d30
    pruned_num_features = [
        c for c in num_features
        if c not in ["vle_clicks_forumng_d30", "vle_clicks_oucontent_d30", "vle_clicks_quiz_d30",
                     "vle_clicks_homepage_d30", "vle_clicks_other_d30", "vle_clicks_poststart_d30"]
    ]
    pruned_cols = pruned_num_features + cat_features
    oof_probs_exp1 = np.zeros(len(train_df))
    for t_idx, v_idx in splits:
        pipe = build_logistic_regression_pipeline(pruned_num_features, cat_features, cfg["baseline_logistic_regression"])
        pipe.fit(train_df.iloc[t_idx][pruned_cols], y_train[t_idx])
        oof_probs_exp1[v_idx] = pipe.predict_proba(train_df.iloc[v_idx][pruned_cols])[:, 1]

    cv_exp1_m = compute_comprehensive_metrics(y_train, oof_probs_exp1, threshold=0.46)
    cv_exp1_calib = compute_calibration_assessment(y_train, oof_probs_exp1)
    experiment_results.append({
        "experiment_id": "EXP-01-COLLINEARITY-PRUNING",
        "description": "Pruned 6 collinear sub-activity click features, retaining 19 core features",
        "feature_count": len(pruned_cols),
        "cv_roc_auc": cv_exp1_m["roc_auc"],
        "cv_pr_auc": cv_exp1_m["pr_auc"],
        "cv_recall_t46": cv_exp1_m["recall"],
        "cv_precision_t46": cv_exp1_m["precision"],
        "cv_brier_score": cv_exp1_calib["brier_score"],
        "cv_ece": cv_exp1_calib["expected_calibration_error_ece"],
        "cv_alert_rate_pct": cv_exp1_m["operational_workload"]["alert_rate_pct"],
        "cv_false_alarms": cv_exp1_m["confusion_matrix"]["fp"],
    })
    print(f"      [Exp 1 Pruning]  CV ROC-AUC: {cv_exp1_m['roc_auc']:.4f} | PR-AUC: {cv_exp1_m['pr_auc']:.4f} | Recall: {cv_exp1_m['recall']*100:.2f}% | FP: {cv_exp1_m['confusion_matrix']['fp']:,}")

    # Experiment 2: Regularization Tuning (C parameter sweep: C=0.10)
    params_c01 = dict(cfg["baseline_logistic_regression"])
    params_c01["C"] = 0.10
    oof_probs_exp2 = np.zeros(len(train_df))
    for t_idx, v_idx in splits:
        pipe = build_logistic_regression_pipeline(num_features, cat_features, params_c01)
        pipe.fit(train_df.iloc[t_idx][feature_cols], y_train[t_idx])
        oof_probs_exp2[v_idx] = pipe.predict_proba(train_df.iloc[v_idx][feature_cols])[:, 1]

    cv_exp2_m = compute_comprehensive_metrics(y_train, oof_probs_exp2, threshold=0.46)
    cv_exp2_calib = compute_calibration_assessment(y_train, oof_probs_exp2)
    experiment_results.append({
        "experiment_id": "EXP-02-REGULARIZATION-C01",
        "description": "Stronger L2 Regularization (C=0.10 vs C=1.0) with balanced weights",
        "feature_count": 25,
        "cv_roc_auc": cv_exp2_m["roc_auc"],
        "cv_pr_auc": cv_exp2_m["pr_auc"],
        "cv_recall_t46": cv_exp2_m["recall"],
        "cv_precision_t46": cv_exp2_m["precision"],
        "cv_brier_score": cv_exp2_calib["brier_score"],
        "cv_ece": cv_exp2_calib["expected_calibration_error_ece"],
        "cv_alert_rate_pct": cv_exp2_m["operational_workload"]["alert_rate_pct"],
        "cv_false_alarms": cv_exp2_m["confusion_matrix"]["fp"],
    })
    print(f"      [Exp 2 Reg C=0.1] CV ROC-AUC: {cv_exp2_m['roc_auc']:.4f} | PR-AUC: {cv_exp2_m['pr_auc']:.4f} | Recall: {cv_exp2_m['recall']*100:.2f}% | FP: {cv_exp2_m['confusion_matrix']['fp']:,}")

    # Experiment 3: Platt Probability Calibration (Sigmoid on CV)
    oof_probs_exp3 = np.zeros(len(train_df))
    for t_idx, v_idx in splits:
        pipe = build_logistic_regression_pipeline(num_features, cat_features, cfg["baseline_logistic_regression"])
        calib_clf = CalibratedClassifierCV(estimator=pipe, method="sigmoid", cv=3)
        calib_clf.fit(train_df.iloc[t_idx][feature_cols], y_train[t_idx])
        oof_probs_exp3[v_idx] = calib_clf.predict_proba(train_df.iloc[v_idx][feature_cols])[:, 1]

    # Find optimal threshold for calibrated probabilities targeting ~70% recall
    opt_t_calib = find_threshold_for_target_recall(y_train, oof_probs_exp3, target_recall=0.70)
    cv_exp3_m = compute_comprehensive_metrics(y_train, oof_probs_exp3, threshold=opt_t_calib)
    cv_exp3_calib = compute_calibration_assessment(y_train, oof_probs_exp3)
    experiment_results.append({
        "experiment_id": "EXP-03-PLATT-CALIBRATION",
        "description": "Platt Sigmoid post-hoc calibration layer targeting ECE reduction",
        "feature_count": 25,
        "cv_roc_auc": cv_exp3_m["roc_auc"],
        "cv_pr_auc": cv_exp3_m["pr_auc"],
        "cv_recall_t46": cv_exp3_m["recall"],
        "cv_precision_t46": cv_exp3_m["precision"],
        "cv_brier_score": cv_exp3_calib["brier_score"],
        "cv_ece": cv_exp3_calib["expected_calibration_error_ece"],
        "cv_alert_rate_pct": cv_exp3_m["operational_workload"]["alert_rate_pct"],
        "cv_false_alarms": cv_exp3_m["confusion_matrix"]["fp"],
        "calibrated_optimal_threshold": opt_t_calib,
    })
    print(f"      [Exp 3 Calib]    CV ROC-AUC: {cv_exp3_m['roc_auc']:.4f} | ECE: {cv_exp3_calib['expected_calibration_error_ece']:.4f} (vs {cv_base_calib['expected_calibration_error_ece']:.4f}) | Brier: {cv_exp3_calib['brier_score']:.4f}")

    # Experiment 4: Constrained XGBoost Candidate (Depth 3 vs 4, colsample 0.70)
    params_xgb_constrained = dict(cfg["candidate_xgboost"])
    params_xgb_constrained["max_depth"] = 3
    params_xgb_constrained["colsample_bytree"] = 0.70
    oof_probs_exp4 = np.zeros(len(train_df))
    for t_idx, v_idx in splits:
        pipe = build_xgboost_pipeline(num_features, cat_features, params_xgb_constrained)
        pipe.fit(train_df.iloc[t_idx][feature_cols], y_train[t_idx])
        oof_probs_exp4[v_idx] = pipe.predict_proba(train_df.iloc[v_idx][feature_cols])[:, 1]

    cv_exp4_m = compute_comprehensive_metrics(y_train, oof_probs_exp4, threshold=0.46)
    cv_exp4_calib = compute_calibration_assessment(y_train, oof_probs_exp4)
    experiment_results.append({
        "experiment_id": "EXP-04-XGBOOST-CONSTRAINED",
        "description": "Regularized XGBoost: max_depth=3 (vs 4), colsample=0.70 to curtail overconfidence",
        "feature_count": 25,
        "cv_roc_auc": cv_exp4_m["roc_auc"],
        "cv_pr_auc": cv_exp4_m["pr_auc"],
        "cv_recall_t46": cv_exp4_m["recall"],
        "cv_precision_t46": cv_exp4_m["precision"],
        "cv_brier_score": cv_exp4_calib["brier_score"],
        "cv_ece": cv_exp4_calib["expected_calibration_error_ece"],
        "cv_alert_rate_pct": cv_exp4_m["operational_workload"]["alert_rate_pct"],
        "cv_false_alarms": cv_exp4_m["confusion_matrix"]["fp"],
    })
    print(f"      [Exp 4 XGB-D3]   CV ROC-AUC: {cv_exp4_m['roc_auc']:.4f} | PR-AUC: {cv_exp4_m['pr_auc']:.4f} | Recall: {cv_exp4_m['recall']*100:.2f}% | FP: {cv_exp4_m['confusion_matrix']['fp']:,}")

    # Save Experiment Ledger
    exp_ledger_path = metrics_dir / "phase_six_experiments.json"
    with open(exp_ledger_path, "w", encoding="utf-8") as f:
        json.dump(experiment_results, f, indent=2)
    print(f"      [✓] Exported {len(experiment_results)} controlled experiments to: {exp_ledger_path.name}")

    # =========================================================================
    # COMPREHENSIVE METRICS LEDGER (JSON)
    # =========================================================================
    full_metrics_ledger = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "execution_duration_seconds": round(time.time() - t_start, 2),
        "split_statistics": split_stats,
        "holdout_evaluation": {
            "logistic_regression": {
                "threshold_0_46": m_base_t46,
                "threshold_0_50": m_base_t50,
                "disjoint_holdout_0_46": m_base_disjoint_t46,
                "calibration": calib_base,
            },
            "xgboost": {
                "threshold_0_46": m_xgb_t46,
                "threshold_0_50": m_xgb_t50,
                "disjoint_holdout_0_46": m_xgb_disjoint_t46,
                "calibration": calib_xgb,
            },
        },
        "row_level_error_summary": {
            "logistic_regression": err_stats_base,
            "xgboost": err_stats_xgb,
        },
        "collinear_feature_pairs": collinear_pairs,
        "controlled_experiments_cv": experiment_results,
    }

    ledger_path = metrics_dir / "phase_six_metrics.json"
    with open(ledger_path, "w", encoding="utf-8") as f:
        json.dump(full_metrics_ledger, f, indent=2)
    print(f"\n[✓] Exported comprehensive metrics ledger to: {ledger_path.name}")

    elapsed = time.time() - t_start
    print(f"\n[✓] Phase Six diagnostic pipeline executed successfully in {elapsed:.2f} seconds!")


if __name__ == "__main__":
    run_phase_six_diagnostics()
