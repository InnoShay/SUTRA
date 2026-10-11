#!/usr/bin/env python3
"""
SUTRA Phase Nine — Module-Relative Engagement Feature Experiment Pipeline.

Compares standard 25-feature baseline against 36-feature module-relative
augmented models using identical 5-fold student-grouped cross-validation.
Evaluates both Logistic Regression and Constrained XGBoost.

Usage:
    python3 ml/pipelines/run_module_relative_experiment.py
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Optional

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yaml

# Path resolution
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from sutra_ml.evaluation.calibration import compute_calibration_assessment
from sutra_ml.evaluation.metrics import (
    compute_comprehensive_metrics,
)
from sutra_ml.features.module_relative import (
    DEFAULT_ENGAGEMENT_FEATURES,
    ModuleRelativeTransformer,
)
from sutra_ml.training.pipeline import (
    build_logistic_regression_pipeline,
    build_module_relative_lr_pipeline,
    build_module_relative_xgboost_pipeline,
    build_xgboost_pipeline,
)
from sutra_ml.training.split import get_student_grouped_cv, make_temporal_split


def compute_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def run_experiment(output_dir: Optional[Path] = None, verbose: bool = True) -> dict[str, Any]:
    start_time = time.perf_counter()
    exp_dir = output_dir or (ML_DIR / "artifacts" / "experiments" / "phase_nine_module_relative")
    exp_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("SUTRA PHASE NINE: MODULE-RELATIVE ENGAGEMENT FEATURE EXPERIMENT")
    print(f"Artifact Destination: {exp_dir}")
    print("=" * 80)

    # 1. Load Data
    config_path = ML_DIR / "configs" / "training.yaml"
    with open(config_path) as f:
        cfg = yaml.safe_load(f)

    dataset_path = ML_DIR / cfg["data"]["dataset_path"]
    dataset_hash = compute_sha256(dataset_path)
    df = pd.read_csv(dataset_path)

    print(f"\n[1] Ingested Dataset: {dataset_path.name} ({len(df):,} rows)")
    print(f"    SHA-256: {dataset_hash}")

    train_presentations = cfg["data"]["train_presentations"]
    test_presentation = cfg["data"]["test_presentation"]

    train_df, test_df, split_stats = make_temporal_split(
        df, train_presentations=train_presentations, test_presentation=test_presentation
    )
    _, test_disjoint_df, _ = make_temporal_split(
        df, train_presentations=train_presentations, test_presentation=test_presentation, ensure_disjoint_students=True
    )
    print(f"[2] Temporal Partition: Train={train_presentations} ({len(train_df):,} rows, {train_df['id_student'].nunique():,} students)")
    print(f"    Holdout={test_presentation} ({len(test_df):,} rows, {test_df['id_student'].nunique():,} students)")
    print(f"    Disjoint Holdout: {len(test_disjoint_df):,} rows")

    num_features = cfg["features"]["numerical"]
    cat_features = cfg["features"]["categorical"]
    eng_features = DEFAULT_ENGAGEMENT_FEATURES
    all_feature_cols = ["code_module"] + num_features + cat_features

    # Verify features exist
    for f in eng_features:
        if f not in train_df.columns:
            raise ValueError(f"Engagement feature {f} missing from dataset!")

    print(f"[3] Feature Schemas:")
    print(f"    Baseline Schema: {len(num_features)} num + {len(cat_features)} cat = {len(num_features) + len(cat_features)} features")
    print(f"    Module-Relative Schema: {len(num_features) + len(eng_features)} num ({len(eng_features)} relative) + {len(cat_features)} cat = {len(num_features) + len(eng_features) + len(cat_features)} features")
    print(f"    Selected Engagement Predictors for Relative Standardization ({len(eng_features)}):")
    for ef in eng_features:
        print(f"      - {ef}")

    # 2. 5-Fold Student-Grouped Split
    print("\n[4] Generating 5-Fold Student-Grouped Cross-Validation Splits...")
    splits = get_student_grouped_cv(train_df, n_splits=5, group_col="id_student")
    for idx, (t_idx, v_idx) in enumerate(splits):
        t_students = set(train_df.iloc[t_idx]["id_student"])
        v_students = set(train_df.iloc[v_idx]["id_student"])
        assert len(t_students.intersection(v_students)) == 0
        print(f"    Fold {idx+1}: {len(t_idx):,} train ({len(t_students):,} students), {len(v_idx):,} val ({len(v_students):,} students)")

    # Model Hyperparameters
    lr_params = cfg["baseline_logistic_regression"]
    xgb_params = {
        "n_estimators": 150,
        "max_depth": 3,
        "learning_rate": 0.05,
        "subsample": 0.80,
        "colsample_bytree": 0.70,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "scale_pos_weight": 1.20,
        "random_state": 42,
        "n_jobs": -1,
    }

    # Tracking storage
    y_train = train_df["target"].to_numpy().astype(int)
    N = len(train_df)

    oof_base_lr = np.zeros(N)
    oof_exp_lr = np.zeros(N)
    oof_base_xgb = np.zeros(N)
    oof_exp_xgb = np.zeros(N)

    fold_metrics_base_lr = []
    fold_metrics_exp_lr = []
    fold_metrics_base_xgb = []
    fold_metrics_exp_xgb = []

    print("\n[5] Executing 5-Fold Cross-Validation Across All 4 Models...")
    for fold_idx, (t_idx, v_idx) in enumerate(splits):
        t0 = time.perf_counter()
        train_fold = train_df.iloc[t_idx]
        val_fold = train_df.iloc[v_idx]

        y_t = y_train[t_idx]
        y_v = y_train[v_idx]

        X_t_base = train_fold[num_features + cat_features]
        X_v_base = val_fold[num_features + cat_features]

        X_t_exp = train_fold[all_feature_cols]
        X_v_exp = val_fold[all_feature_cols]

        # 1. Base LR
        p_base_lr = build_logistic_regression_pipeline(num_features, cat_features, lr_params)
        p_base_lr.fit(X_t_base, y_t)
        v_base_lr = p_base_lr.predict_proba(X_v_base)[:, 1]
        oof_base_lr[v_idx] = v_base_lr
        m_base_lr = compute_comprehensive_metrics(y_v, v_base_lr, threshold=0.46)
        fold_metrics_base_lr.append(m_base_lr)

        # 2. Exp LR
        p_exp_lr = build_module_relative_lr_pipeline(num_features, cat_features, eng_features, lr_params)
        p_exp_lr.fit(X_t_exp, y_t)
        v_exp_lr = p_exp_lr.predict_proba(X_v_exp)[:, 1]
        oof_exp_lr[v_idx] = v_exp_lr
        m_exp_lr = compute_comprehensive_metrics(y_v, v_exp_lr, threshold=0.46)
        fold_metrics_exp_lr.append(m_exp_lr)

        # 3. Base XGB
        p_base_xgb = build_xgboost_pipeline(num_features, cat_features, xgb_params)
        p_base_xgb.fit(X_t_base, y_t)
        v_base_xgb = p_base_xgb.predict_proba(X_v_base)[:, 1]
        oof_base_xgb[v_idx] = v_base_xgb
        m_base_xgb = compute_comprehensive_metrics(y_v, v_base_xgb, threshold=0.46)
        fold_metrics_base_xgb.append(m_base_xgb)

        # 4. Exp XGB
        p_exp_xgb = build_module_relative_xgboost_pipeline(num_features, cat_features, eng_features, xgb_params)
        p_exp_xgb.fit(X_t_exp, y_t)
        v_exp_xgb = p_exp_xgb.predict_proba(X_v_exp)[:, 1]
        oof_exp_xgb[v_idx] = v_exp_xgb
        m_exp_xgb = compute_comprehensive_metrics(y_v, v_exp_xgb, threshold=0.46)
        fold_metrics_exp_xgb.append(m_exp_xgb)

        dur = time.perf_counter() - t0
        print(f"  • Fold {fold_idx+1}/5 ({dur:.2f}s):")
        print(f"    - LR:  Base AUC={m_base_lr['roc_auc']:.4f} | Exp AUC={m_exp_lr['roc_auc']:.4f} (Δ={m_exp_lr['roc_auc']-m_base_lr['roc_auc']:+.4f}) | Base FP={m_base_lr['confusion_matrix']['fp']} | Exp FP={m_exp_lr['confusion_matrix']['fp']}")
        print(f"    - XGB: Base AUC={m_base_xgb['roc_auc']:.4f} | Exp AUC={m_exp_xgb['roc_auc']:.4f} (Δ={m_exp_xgb['roc_auc']-m_base_xgb['roc_auc']:+.4f}) | Base FP={m_base_xgb['confusion_matrix']['fp']} | Exp FP={m_exp_xgb['confusion_matrix']['fp']}")

    # 3. Pooled Out-of-Fold Metrics
    print("\n[6] Computing Pooled Out-of-Fold Cross-Validation Metrics (N=18,263, t=0.46)...")
    pooled_base_lr = compute_comprehensive_metrics(y_train, oof_base_lr, threshold=0.46)
    pooled_exp_lr = compute_comprehensive_metrics(y_train, oof_exp_lr, threshold=0.46)
    pooled_base_xgb = compute_comprehensive_metrics(y_train, oof_base_xgb, threshold=0.46)
    pooled_exp_xgb = compute_comprehensive_metrics(y_train, oof_exp_xgb, threshold=0.46)

    # Calibration Assessment
    cal_base_lr = compute_calibration_assessment(y_train, oof_base_lr, n_bins=10)
    cal_exp_lr = compute_calibration_assessment(y_train, oof_exp_lr, n_bins=10)
    cal_base_xgb = compute_calibration_assessment(y_train, oof_base_xgb, n_bins=10)
    cal_exp_xgb = compute_calibration_assessment(y_train, oof_exp_xgb, n_bins=10)

    pooled_base_lr["ece"] = cal_base_lr["expected_calibration_error_ece"]
    pooled_exp_lr["ece"] = cal_exp_lr["expected_calibration_error_ece"]
    pooled_base_xgb["ece"] = cal_base_xgb["expected_calibration_error_ece"]
    pooled_exp_xgb["ece"] = cal_exp_xgb["expected_calibration_error_ece"]

    # Module-by-Module Error Analysis
    print("\n[7] Computing Module-by-Module Subgroup Breakdown...")
    modules = sorted(train_df["code_module"].unique())
    module_breakdown = {}
    for mod in modules:
        mod_mask = (train_df["code_module"] == mod).to_numpy()
        y_mod = y_train[mod_mask]
        m_count = int(mod_mask.sum())
        pos_count = int((y_mod == 1).sum())

        m_res_base_lr = compute_comprehensive_metrics(y_mod, oof_base_lr[mod_mask], threshold=0.46)
        m_res_exp_lr = compute_comprehensive_metrics(y_mod, oof_exp_lr[mod_mask], threshold=0.46)
        m_res_base_xgb = compute_comprehensive_metrics(y_mod, oof_base_xgb[mod_mask], threshold=0.46)
        m_res_exp_xgb = compute_comprehensive_metrics(y_mod, oof_exp_xgb[mod_mask], threshold=0.46)

        module_breakdown[mod] = {
            "total_students": m_count,
            "actual_positives": pos_count,
            "prevalence": round(pos_count / max(1, m_count), 4),
            "lr": {
                "base_roc_auc": m_res_base_lr["roc_auc"],
                "exp_roc_auc": m_res_exp_lr["roc_auc"],
                "auc_delta": round(m_res_exp_lr["roc_auc"] - m_res_base_lr["roc_auc"], 4),
                "base_recall": m_res_base_lr["recall"],
                "exp_recall": m_res_exp_lr["recall"],
                "base_fp": m_res_base_lr["confusion_matrix"]["fp"],
                "exp_fp": m_res_exp_lr["confusion_matrix"]["fp"],
                "fp_delta": m_res_exp_lr["confusion_matrix"]["fp"] - m_res_base_lr["confusion_matrix"]["fp"],
            },
            "xgb": {
                "base_roc_auc": m_res_base_xgb["roc_auc"],
                "exp_roc_auc": m_res_exp_xgb["roc_auc"],
                "auc_delta": round(m_res_exp_xgb["roc_auc"] - m_res_base_xgb["roc_auc"], 4),
                "base_recall": m_res_base_xgb["recall"],
                "exp_recall": m_res_exp_xgb["recall"],
                "base_fp": m_res_base_xgb["confusion_matrix"]["fp"],
                "exp_fp": m_res_exp_xgb["confusion_matrix"]["fp"],
                "fp_delta": m_res_exp_xgb["confusion_matrix"]["fp"] - m_res_base_xgb["confusion_matrix"]["fp"],
            },
        }

    # 4. Secondary 2014J Holdout Comparison
    print("\n[8] Secondary Evaluation on 2014J Temporal Cohort (Historical Context Only)...")
    X_train_full_base = train_df[num_features + cat_features]
    X_train_full_exp = train_df[all_feature_cols]

    X_test_base = test_df[num_features + cat_features]
    X_test_exp = test_df[all_feature_cols]
    y_test = test_df["target"].to_numpy().astype(int)

    final_base_lr = build_logistic_regression_pipeline(num_features, cat_features, lr_params)
    final_base_lr.fit(X_train_full_base, y_train)
    p_test_base_lr = final_base_lr.predict_proba(X_test_base)[:, 1]

    final_exp_lr = build_module_relative_lr_pipeline(num_features, cat_features, eng_features, lr_params)
    final_exp_lr.fit(X_train_full_exp, y_train)
    p_test_exp_lr = final_exp_lr.predict_proba(X_test_exp)[:, 1]

    final_base_xgb = build_xgboost_pipeline(num_features, cat_features, xgb_params)
    final_base_xgb.fit(X_train_full_base, y_train)
    p_test_base_xgb = final_base_xgb.predict_proba(X_test_base)[:, 1]

    final_exp_xgb = build_module_relative_xgboost_pipeline(num_features, cat_features, eng_features, xgb_params)
    final_exp_xgb.fit(X_train_full_exp, y_train)
    p_test_exp_xgb = final_exp_xgb.predict_proba(X_test_exp)[:, 1]

    holdout_2014j = {
        "base_lr": compute_comprehensive_metrics(y_test, p_test_base_lr, threshold=0.46),
        "exp_lr": compute_comprehensive_metrics(y_test, p_test_exp_lr, threshold=0.46),
        "base_xgb": compute_comprehensive_metrics(y_test, p_test_base_xgb, threshold=0.46),
        "exp_xgb": compute_comprehensive_metrics(y_test, p_test_exp_xgb, threshold=0.46),
    }

    # 5. Serialize Artifacts in Isolated Phase Nine Directory
    print(f"\n[9] Serializing Artifacts to {exp_dir}...")
    lr_art_path = exp_dir / "experimental_module_relative_lr.joblib"
    xgb_art_path = exp_dir / "experimental_module_relative_xgb.joblib"
    cfg_path = exp_dir / "config.yaml"
    schema_path = exp_dir / "feature_schema.json"
    metrics_path = exp_dir / "validation_metrics.json"

    joblib.dump(final_exp_lr, lr_art_path)
    joblib.dump(final_exp_xgb, xgb_art_path)

    relative_feature_names = [f"{f}_module_z" for f in eng_features]
    with open(schema_path, "w") as f:
        json.dump({
            "base_numerical_features": num_features,
            "base_categorical_features": cat_features,
            "module_column": "code_module",
            "engagement_features_standardized": eng_features,
            "module_relative_features_created": relative_feature_names,
            "total_input_features": len(all_feature_cols),
            "total_modeled_features": len(num_features) + len(relative_feature_names) + len(cat_features),
        }, f, indent=2)

    with open(cfg_path, "w") as f:
        yaml.safe_dump({
            "experiment": "phase_nine_module_relative_features",
            "operating_threshold": 0.46,
            "transformer_settings": {
                "module_col": "code_module",
                "min_module_samples": 10,
                "clip_bound": [-5.0, 5.0],
                "std_eps": 1e-6,
            },
            "logistic_regression": lr_params,
            "xgboost": xgb_params,
        }, f)

    # 6. Artifact Reload & Fresh Inference Verification
    print("[10] Verifying Saved Artifact Reload Equivalence...")
    reloaded_lr = joblib.load(lr_art_path)
    reloaded_xgb = joblib.load(xgb_art_path)

    sample_5 = X_test_exp.iloc[:5].copy()
    preds_fresh_lr = final_exp_lr.predict_proba(sample_5)[:, 1]
    preds_reload_lr = reloaded_lr.predict_proba(sample_5)[:, 1]
    preds_fresh_xgb = final_exp_xgb.predict_proba(sample_5)[:, 1]
    preds_reload_xgb = reloaded_xgb.predict_proba(sample_5)[:, 1]

    max_diff_lr = float(np.max(np.abs(preds_fresh_lr - preds_reload_lr)))
    max_diff_xgb = float(np.max(np.abs(preds_fresh_xgb - preds_reload_xgb)))
    assert max_diff_lr < 1e-6, f"LR reload mismatch: {max_diff_lr}"
    assert max_diff_xgb < 1e-6, f"XGB reload mismatch: {max_diff_xgb}"

    # Test unseen module fallback
    unseen_sample = sample_5.copy()
    unseen_sample["code_module"] = "UNSEEN_DISCIPLINE_XYZ"
    unseen_preds_lr = reloaded_lr.predict_proba(unseen_sample)[:, 1]
    unseen_preds_xgb = reloaded_xgb.predict_proba(unseen_sample)[:, 1]
    assert all(0.0 <= p <= 1.0 for p in unseen_preds_lr), "Unseen module produced invalid LR probs!"
    assert all(0.0 <= p <= 1.0 for p in unseen_preds_xgb), "Unseen module produced invalid XGB probs!"
    print(f"    [✓] Reload Equivalence: LR Δ={max_diff_lr:.2e}, XGB Δ={max_diff_xgb:.2e}")
    print(f"    [✓] Unseen Module Fallback Test: PASSED (Probabilities strictly in [0, 1])")

    # Hash verification
    lr_hash = compute_sha256(lr_art_path)
    xgb_hash = compute_sha256(xgb_art_path)

    # Compile Full Metrics Dictionary
    total_time = time.perf_counter() - start_time
    full_metrics = {
        "experiment_name": "phase_nine_module_relative_features",
        "dataset_hash": dataset_hash,
        "execution_duration_sec": round(total_time, 2),
        "operating_threshold": 0.46,
        "pooled_oof_cross_validation": {
            "baseline_logistic_regression": pooled_base_lr,
            "experimental_module_relative_lr": pooled_exp_lr,
            "baseline_xgboost": pooled_base_xgb,
            "experimental_module_relative_xgb": pooled_exp_xgb,
        },
        "fold_level_metrics": {
            "baseline_lr": fold_metrics_base_lr,
            "experimental_lr": fold_metrics_exp_lr,
            "baseline_xgb": fold_metrics_base_xgb,
            "experimental_xgb": fold_metrics_exp_xgb,
        },
        "module_breakdown": module_breakdown,
        "secondary_2014j_holdout": holdout_2014j,
        "artifacts": {
            "experimental_lr": {
                "path": str(lr_art_path),
                "sha256": lr_hash,
                "size_bytes": lr_art_path.stat().st_size,
            },
            "experimental_xgb": {
                "path": str(xgb_art_path),
                "sha256": xgb_hash,
                "size_bytes": xgb_art_path.stat().st_size,
            },
        },
    }

    with open(metrics_path, "w") as f:
        json.dump(full_metrics, f, indent=2)

    # Save to canonical reports metrics
    rep_metrics_path = ML_DIR / "reports" / "metrics" / "phase_nine_metrics.json"
    rep_metrics_path.parent.mkdir(parents=True, exist_ok=True)
    with open(rep_metrics_path, "w") as f:
        json.dump(full_metrics, f, indent=2)

    # 7. Generate Model Comparison Figure
    print("[11] Generating Comparison Figures...")
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))

    # (A) Overall ROC-AUC & PR-AUC Comparison
    models_labels = ["Base LR", "Exp LR (Rel)", "Base XGB", "Exp XGB (Rel)"]
    roc_aucs = [pooled_base_lr["roc_auc"], pooled_exp_lr["roc_auc"], pooled_base_xgb["roc_auc"], pooled_exp_xgb["roc_auc"]]
    pr_aucs = [pooled_base_lr["pr_auc"], pooled_exp_lr["pr_auc"], pooled_base_xgb["pr_auc"], pooled_exp_xgb["pr_auc"]]

    x = np.arange(len(models_labels))
    width = 0.35
    axes[0, 0].bar(x - width/2, roc_aucs, width, label="ROC-AUC", color="#1E88E5", alpha=0.9)
    axes[0, 0].bar(x + width/2, pr_aucs, width, label="PR-AUC", color="#FFC107", alpha=0.9)
    axes[0, 0].set_ylim(0.65, 0.77)
    axes[0, 0].set_xticks(x)
    axes[0, 0].set_xticklabels(models_labels, fontweight="bold")
    axes[0, 0].set_title("Cross-Validated Ranking Metrics (Pooled OOF)", fontsize=12, fontweight="bold")
    axes[0, 0].set_ylabel("Score")
    axes[0, 0].grid(axis="y", linestyle="--", alpha=0.5)
    axes[0, 0].legend()
    for i, v in enumerate(roc_aucs):
        axes[0, 0].text(i - width/2, v + 0.002, f"{v:.4f}", ha="center", fontsize=9)
    for i, v in enumerate(pr_aucs):
        axes[0, 0].text(i + width/2, v + 0.002, f"{v:.4f}", ha="center", fontsize=9)

    # (B) False Alarms vs Recall at t=0.46
    fps = [pooled_base_lr["confusion_matrix"]["fp"], pooled_exp_lr["confusion_matrix"]["fp"],
           pooled_base_xgb["confusion_matrix"]["fp"], pooled_exp_xgb["confusion_matrix"]["fp"]]
    recalls = [pooled_base_lr["recall"] * 100, pooled_exp_lr["recall"] * 100,
               pooled_base_xgb["recall"] * 100, pooled_exp_xgb["recall"] * 100]

    colors = ["#757575", "#00897B", "#5E35B1", "#D81B60"]
    for i in range(4):
        axes[0, 1].scatter(fps[i], recalls[i], color=colors[i], s=180, label=models_labels[i], zorder=4)
        axes[0, 1].annotate(models_labels[i], (fps[i] + 15, recalls[i] - 0.15), fontsize=10, fontweight="bold")
    axes[0, 1].set_title("Operational Trade-off at Threshold t=0.46", fontsize=12, fontweight="bold")
    axes[0, 1].set_xlabel("False Alarms (Advisor Workload)")
    axes[0, 1].set_ylabel("Recall % (At-Risk Students Caught)")
    axes[0, 1].grid(linestyle="--", alpha=0.5)

    # (C) Module-Level ROC-AUC Comparison (LR Base vs Exp)
    mod_names = list(module_breakdown.keys())
    base_lr_mod_auc = [module_breakdown[m]["lr"]["base_roc_auc"] for m in mod_names]
    exp_lr_mod_auc = [module_breakdown[m]["lr"]["exp_roc_auc"] for m in mod_names]

    x_mod = np.arange(len(mod_names))
    axes[1, 0].plot(x_mod, base_lr_mod_auc, marker="o", linewidth=2, color="#1E88E5", label="Baseline LR (25 feats)")
    axes[1, 0].plot(x_mod, exp_lr_mod_auc, marker="s", linewidth=2, linestyle="--", color="#00897B", label="Module-Relative LR (36 feats)")
    axes[1, 0].set_xticks(x_mod)
    axes[1, 0].set_xticklabels([f"Mod {m}\n(N={module_breakdown[m]['total_students']:,})" for m in mod_names])
    axes[1, 0].set_title("Logistic Regression ROC-AUC by Course Module", fontsize=12, fontweight="bold")
    axes[1, 0].set_ylabel("ROC-AUC")
    axes[1, 0].grid(linestyle="--", alpha=0.5)
    axes[1, 0].legend()

    # (D) Fold-by-Fold Delta (Exp - Base)
    fold_x = np.arange(1, 6)
    delta_lr_auc = [fold_metrics_exp_lr[i]["roc_auc"] - fold_metrics_base_lr[i]["roc_auc"] for i in range(5)]
    delta_xgb_auc = [fold_metrics_exp_xgb[i]["roc_auc"] - fold_metrics_base_xgb[i]["roc_auc"] for i in range(5)]

    axes[1, 1].bar(fold_x - 0.15, delta_lr_auc, 0.3, label="Δ LR ROC-AUC", color="#00897B")
    axes[1, 1].bar(fold_x + 0.15, delta_xgb_auc, 0.3, label="Δ XGB ROC-AUC", color="#D81B60")
    axes[1, 1].axhline(0, color="black", linestyle="--", linewidth=1)
    axes[1, 1].set_xticks(fold_x)
    axes[1, 1].set_xticklabels([f"Fold {f}" for f in fold_x])
    axes[1, 1].set_title("Fold-by-Fold Discrimination Delta (Exp - Baseline)", fontsize=12, fontweight="bold")
    axes[1, 1].set_ylabel("ROC-AUC Difference")
    axes[1, 1].grid(axis="y", linestyle="--", alpha=0.5)
    axes[1, 1].legend()

    plt.tight_layout()
    fig_path = ML_DIR / "reports" / "figures" / "phase_nine_model_comparison.png"
    fig_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"    [✓] Comparison figure saved to: {fig_path}")

    print("\n" + "=" * 80)
    print(f"[SUCCESS] Phase Nine experiment completed in {total_time:.2f}s.")
    print("=" * 80)

    return full_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SUTRA Phase Nine Module-Relative Feature Experiment")
    args = parser.parse_args()
    run_experiment()
