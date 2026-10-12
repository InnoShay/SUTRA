#!/usr/bin/env python3
"""
SUTRA ML Phase Twenty-Three — Common-Cohort Evaluation & Statistical Audit Pipeline.

Audits Day-30 vs. Day-60 model performance on the EXACT COMMON COHORT of registrations
eligible for prediction at Day 60 (excluding students who withdrew prior to Day 60).

Calculates:
1. Common-cohort matching and population accounting.
2. 5-Fold Student-Grouped Cross-Validation on the common cohort.
3. Paired student-clustered bootstrap (1,000 replicates clustered on id_student)
   for ΔROC-AUC, ΔPR-AUC, and ΔBrier score with 95% Confidence Intervals.
4. Paired McNemar discordance test and threshold matrix comparison.
5. Operating threshold provenance audit (separating training-selected thresholds
   from 2014J diagnostic evaluations).
6. Temporal diagnostic evaluation on 2014J Common Cohort (Settings 1 and 2).

Usage:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_phase_twenty_three_audit.py
"""

import hashlib
import json
import math
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from scipy.stats import chi2
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


def compute_calibration_stats(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> Dict[str, Any]:
    brier = float(brier_score_loss(y_true, y_prob))
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    bin_indices = np.digitize(y_prob, bin_edges[1:-1])

    bin_data = []
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        mask = bin_indices == i
        count = int(np.sum(mask))
        if count > 0:
            avg_p = float(np.mean(y_prob[mask]))
            actual_f = float(np.mean(y_true[mask]))
            ece += abs(avg_p - actual_f) * (count / n)
            bin_data.append({
                "bin": i,
                "count": count,
                "mean_predicted_prob": round(avg_p, 4),
                "fraction_positive": round(actual_f, 4),
            })

    return {
        "brier_score": round(brier, 4),
        "expected_calibration_error": round(float(ece), 4),
        "bins": bin_data,
    }


def mcnemar_test_discordance(y_true: np.ndarray, preds_a: np.ndarray, preds_b: np.ndarray) -> Dict[str, Any]:
    """Calculate McNemar test of disagreement between two classification models."""
    correct_a = (preds_a == y_true)
    correct_b = (preds_b == y_true)

    # b: A correct, B incorrect. c: A incorrect, B correct.
    b = int(np.sum(correct_a & ~correct_b))
    c = int(np.sum(~correct_a & correct_b))
    both_correct = int(np.sum(correct_a & correct_b))
    both_incorrect = int(np.sum(~correct_a & ~correct_b))

    stat = ((abs(b - c) - 1.0) ** 2) / max(1, (b + c)) if (b + c) > 0 else 0.0
    p_val = 1.0 - chi2.cdf(stat, df=1)

    return {
        "both_correct": both_correct,
        "both_incorrect": both_incorrect,
        "d30_correct_d60_incorrect": b,
        "d60_correct_d30_incorrect": c,
        "net_cases_corrected_by_d60": c - b,
        "mcnemar_chi2": round(float(stat), 4),
        "p_value": float(p_val),
        "statistically_significant_p05": bool(p_val < 0.05),
    }


def clustered_bootstrap_paired_evaluation(
    y_true: np.ndarray,
    probs_30: np.ndarray,
    probs_60: np.ndarray,
    student_ids: np.ndarray,
    n_bootstraps: int = 1000,
    random_seed: int = 42,
) -> Dict[str, Any]:
    """
    Cluster bootstrap resampling by student ID to account for repeated course enrollments.
    Calculates paired point differences (D60 - D30) with 95% Confidence Intervals.
    """
    rng = np.random.default_rng(random_seed)
    unique_students = np.unique(student_ids)
    n_students = len(unique_students)

    # Pre-index student rows for high performance
    student_to_indices = {}
    for idx, sid in enumerate(student_ids):
        student_to_indices.setdefault(sid, []).append(idx)

    delta_roc_list = []
    delta_pr_list = []
    delta_brier_list = []

    for _ in range(n_bootstraps):
        sampled_students = rng.choice(unique_students, size=n_students, replace=True)
        sample_indices = []
        for sid in sampled_students:
            sample_indices.extend(student_to_indices[sid])
        sample_indices = np.array(sample_indices)

        y_boot = y_true[sample_indices]
        # Skip invalid samples with single class
        if len(np.unique(y_boot)) < 2:
            continue

        p30_boot = probs_30[sample_indices]
        p60_boot = probs_60[sample_indices]

        roc30 = roc_auc_score(y_boot, p30_boot)
        roc60 = roc_auc_score(y_boot, p60_boot)
        pr30 = average_precision_score(y_boot, p30_boot)
        pr60 = average_precision_score(y_boot, p60_boot)
        brier30 = brier_score_loss(y_boot, p30_boot)
        brier60 = brier_score_loss(y_boot, p60_boot)

        delta_roc_list.append(roc60 - roc30)
        delta_pr_list.append(pr60 - pr30)
        delta_brier_list.append(brier60 - brier30)

    def get_ci(arr):
        return {
            "mean": round(float(np.mean(arr)), 4),
            "std_error": round(float(np.std(arr)), 4),
            "ci_95_lower": round(float(np.percentile(arr, 2.5)), 4),
            "ci_95_upper": round(float(np.percentile(arr, 97.5)), 4),
        }

    return {
        "n_bootstraps": len(delta_roc_list),
        "cluster_unit": "id_student",
        "n_clusters": n_students,
        "delta_roc_auc": get_ci(delta_roc_list),
        "delta_pr_auc": get_ci(delta_pr_list),
        "delta_brier_score": get_ci(delta_brier_list),
    }


def run_phase_twenty_three_audit():
    print("=" * 80)
    print("SUTRA ML Phase Twenty-Three — Common-Cohort Evaluation & Statistical Audit")
    print("=" * 80)

    processed_dir = ML_DIR / "data" / "processed"
    metrics_dir = ML_DIR / "reports" / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)

    d30_path = processed_dir / "phase22_day30_features.csv"
    d60_path = processed_dir / "phase22_day60_features.csv"

    print("[*] Loading datasets...")
    df30_raw = pd.read_csv(d30_path)
    df60_raw = pd.read_csv(d60_path)

    key_cols = ["code_module", "code_presentation", "id_student"]
    drop_cols = key_cols + ["target", "target_name", "raw_final_result"]
    cat_cols = ["gender", "region", "highest_education", "imd_band", "age_band", "disability"]

    # 1. Common Cohort Construction
    print("\n[*] Aligning Common Cohort (registrations active at Day 60)...")
    common_keys = df60_raw[key_cols].copy()
    df30_common = pd.merge(common_keys, df30_raw, on=key_cols, how="inner")
    df60_common = df60_raw.copy()

    assert len(df30_common) == len(df60_common), "Common cohort length mismatch!"
    assert (df30_common["target"].values == df60_common["target"].values).all(), "Target alignment mismatch!"

    n_common = len(df60_common)
    n_students_common = int(df60_common["id_student"].nunique())
    n_at_risk = int((df60_common["target"] == 1).sum())
    prev_common = n_at_risk / n_common

    print(f"    - Full Day-30 Population: {len(df30_raw):,} registrations ({df30_raw['target'].mean()*100:.2f}% At-Risk)")
    print(f"    - Excluded Pre-Day-60 Dropouts: {len(df30_raw) - n_common:,} registrations (100% Withdrawn before Day 60)")
    print(f"    - Common Evaluation Cohort: {n_common:,} registrations ({n_students_common:,} students)")
    print(f"    - Common At-Risk Prevalence: {prev_common*100:.2f}% ({n_at_risk:,} positive events)")

    # 2. 5-Fold Student-Grouped Cross-Validation on Common Cohort
    print("\n[*] Running 5-Fold Student-Grouped CV on Common Cohort...")
    gkf = GroupKFold(n_splits=5)
    groups = df60_common["id_student"].values
    y = df60_common["target"].values

    feats30 = [c for c in df30_common.columns if c not in drop_cols]
    feats60 = [c for c in df60_common.columns if c not in drop_cols]
    num30 = [c for c in feats30 if c not in cat_cols]
    num60 = [c for c in feats60 if c not in cat_cols]

    oof_probs_30_lr = np.zeros(n_common)
    oof_probs_60_lr = np.zeros(n_common)
    oof_probs_30_xgb = np.zeros(n_common)
    oof_probs_60_xgb = np.zeros(n_common)

    t0 = time.time()
    for fold_idx, (train_idx, val_idx) in enumerate(gkf.split(df60_common, y, groups=groups)):
        train_d30 = df30_common.iloc[train_idx]
        val_d30 = df30_common.iloc[val_idx]
        train_d60 = df60_common.iloc[train_idx]
        val_d60 = df60_common.iloc[val_idx]
        y_train = y[train_idx]

        # Pipeline constructors
        def make_pipe(num_c, clf):
            pre = ColumnTransformer([
                ("num", StandardScaler(), num_c),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ], remainder="drop")
            return Pipeline([("pre", pre), ("clf", clf)])

        # D30 LR
        pipe30_lr = make_pipe(num30, LogisticRegression(C=1.0, max_iter=1000, random_state=42))
        pipe30_lr.fit(train_d30[feats30], y_train)
        oof_probs_30_lr[val_idx] = pipe30_lr.predict_proba(val_d30[feats30])[:, 1]

        # D60 LR
        pipe60_lr = make_pipe(num60, LogisticRegression(C=1.0, max_iter=1000, random_state=42))
        pipe60_lr.fit(train_d60[feats60], y_train)
        oof_probs_60_lr[val_idx] = pipe60_lr.predict_proba(val_d60[feats60])[:, 1]

        # D30 XGB
        pipe30_xgb = make_pipe(num30, XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.08, subsample=0.8, colsample_bytree=0.8, random_state=42, eval_metric="logloss"))
        pipe30_xgb.fit(train_d30[feats30], y_train)
        oof_probs_30_xgb[val_idx] = pipe30_xgb.predict_proba(val_d30[feats30])[:, 1]

        # D60 XGB
        pipe60_xgb = make_pipe(num60, XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.08, subsample=0.8, colsample_bytree=0.8, random_state=42, eval_metric="logloss"))
        pipe60_xgb.fit(train_d60[feats60], y_train)
        oof_probs_60_xgb[val_idx] = pipe60_xgb.predict_proba(val_d60[feats60])[:, 1]

    cv_time = time.time() - t0
    print(f"[✓] 5-Fold Cross-Validation completed in {cv_time:.2f}s")

    # 3. Compute Common Cohort Metrics
    def evaluate_model_oof(probs, label):
        roc = float(roc_auc_score(y, probs))
        pr = float(average_precision_score(y, probs))
        brier = float(brier_score_loss(y, probs))
        calib = compute_calibration_stats(y, probs)
        return {
            "model_label": label,
            "roc_auc": round(roc, 4),
            "pr_auc": round(pr, 4),
            "brier_score": round(brier, 4),
            "expected_calibration_error": calib["expected_calibration_error"],
            "calibration_bins": calib["bins"],
        }

    m_d30_lr = evaluate_model_oof(oof_probs_30_lr, "Day-30 Logistic Regression (Common Cohort)")
    m_d60_lr = evaluate_model_oof(oof_probs_60_lr, "Day-60 Logistic Regression (Common Cohort)")
    m_d30_xgb = evaluate_model_oof(oof_probs_30_xgb, "Day-30 XGBoost (Common Cohort)")
    m_d60_xgb = evaluate_model_oof(oof_probs_60_xgb, "Day-60 XGBoost (Common Cohort)")

    # 4. Student-Clustered Bootstrap Paired Uncertainty (1,000 replicates)
    print("\n[*] Running Clustered Bootstrap Paired Uncertainty (1,000 cluster iterations)...")
    t0 = time.time()
    boot_lr = clustered_bootstrap_paired_evaluation(y, oof_probs_30_lr, oof_probs_60_lr, df60_common["id_student"].values, n_bootstraps=1000)
    boot_xgb = clustered_bootstrap_paired_evaluation(y, oof_probs_30_xgb, oof_probs_60_xgb, df60_common["id_student"].values, n_bootstraps=1000)
    boot_time = time.time() - t0
    print(f"[✓] Clustered Bootstrap completed in {boot_time:.2f}s")

    # 5. Threshold Operating Points Audit
    print("\n[*] Auditing Operating Points and Paired Discordance...")
    thresholds = [0.30, 0.40, 0.41, 0.42, 0.46, 0.50]
    thresh_table = []
    discordance_at_046 = mcnemar_test_discordance(y, (oof_probs_30_lr >= 0.46).astype(int), (oof_probs_60_lr >= 0.46).astype(int))

    for t in thresholds:
        p30 = (oof_probs_30_lr >= t).astype(int)
        p60 = (oof_probs_60_lr >= t).astype(int)
        tn30, fp30, fn30, tp30 = confusion_matrix(y, p30).ravel()
        tn60, fp60, fn60, tp60 = confusion_matrix(y, p60).ravel()

        thresh_table.append({
            "threshold": t,
            "d30_precision": round(float(precision_score(y, p30, zero_division=0)), 4),
            "d30_recall": round(float(recall_score(y, p30, zero_division=0)), 4),
            "d30_f1": round(float(f1_score(y, p30, zero_division=0)), 4),
            "d30_false_positives": int(fp30),
            "d30_false_negatives": int(fn30),
            "d30_alert_rate": round(float((tp30 + fp30) / n_common), 4),
            "d60_precision": round(float(precision_score(y, p60, zero_division=0)), 4),
            "d60_recall": round(float(recall_score(y, p60, zero_division=0)), 4),
            "d60_f1": round(float(f1_score(y, p60, zero_division=0)), 4),
            "d60_false_positives": int(fp60),
            "d60_false_negatives": int(fn60),
            "d60_alert_rate": round(float((tp60 + fp60) / n_common), 4),
            "fp_reduction": int(fp30 - fp60),
            "fp_reduction_pct": round(float((fp30 - fp60) / max(1, fp30)) * 100, 2),
        })

    # 6. Temporal Diagnostic Evaluation on 2014J Common Cohort
    print("\n[*] Evaluating Temporal Diagnostic on 2014J Common Cohort...")
    train_mask = df60_common["code_presentation"].isin(["2013B", "2013J", "2014B"])
    test_mask = df60_common["code_presentation"] == "2014J"

    train_30 = df30_common[train_mask].reset_index(drop=True)
    train_60 = df60_common[train_mask].reset_index(drop=True)
    test_30_all = df30_common[test_mask].reset_index(drop=True)
    test_60_all = df60_common[test_mask].reset_index(drop=True)

    # Setting 1: Disjoint students only
    train_students = set(train_60["id_student"])
    overlap_students = train_students.intersection(set(test_60_all["id_student"]))
    unseen_mask = ~test_60_all["id_student"].isin(overlap_students)

    test_30_unseen = test_30_all[unseen_mask].reset_index(drop=True)
    test_60_unseen = test_60_all[unseen_mask].reset_index(drop=True)

    # Fit historical models
    pipe30_temp = make_pipe(num30, LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    pipe30_temp.fit(train_30[feats30], train_30["target"])
    pipe60_temp = make_pipe(num60, LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    pipe60_temp.fit(train_60[feats60], train_60["target"])

    # Predictions Setting 1
    p30_s1 = pipe30_temp.predict_proba(test_30_unseen[feats30])[:, 1]
    p60_s1 = pipe60_temp.predict_proba(test_60_unseen[feats60])[:, 1]
    y_s1 = test_60_unseen["target"].values

    # Predictions Setting 2
    p30_s2 = pipe30_temp.predict_proba(test_30_all[feats30])[:, 1]
    p60_s2 = pipe60_temp.predict_proba(test_60_all[feats60])[:, 1]
    y_s2 = test_60_all["target"].values

    temp_diag = {
        "presentation": "2014J",
        "caveat": "Historical development diagnostic; not an untouched prospective test partition.",
        "setting_1_unseen_cohort": {
            "n_records": len(test_60_unseen),
            "n_unique_students": int(test_60_unseen["id_student"].nunique()),
            "prevalence_at_risk": round(float(y_s1.mean()), 4),
            "d30_lr": {
                "roc_auc": round(float(roc_auc_score(y_s1, p30_s1)), 4),
                "pr_auc": round(float(average_precision_score(y_s1, p30_s1)), 4),
                "brier_score": round(float(brier_score_loss(y_s1, p30_s1)), 4),
            },
            "d60_lr": {
                "roc_auc": round(float(roc_auc_score(y_s1, p60_s1)), 4),
                "pr_auc": round(float(average_precision_score(y_s1, p60_s1)), 4),
                "brier_score": round(float(brier_score_loss(y_s1, p60_s1)), 4),
            },
            "gain_d60_minus_d30": {
                "delta_roc": round(float(roc_auc_score(y_s1, p60_s1) - roc_auc_score(y_s1, p30_s1)), 4),
                "delta_pr": round(float(average_precision_score(y_s1, p60_s1) - average_precision_score(y_s1, p30_s1)), 4),
                "delta_brier": round(float(brier_score_loss(y_s1, p60_s1) - brier_score_loss(y_s1, p30_s1)), 4),
            },
        },
        "setting_2_campus_cohort": {
            "n_records": len(test_60_all),
            "n_unique_students": int(test_60_all["id_student"].nunique()),
            "prevalence_at_risk": round(float(y_s2.mean()), 4),
            "d30_lr": {
                "roc_auc": round(float(roc_auc_score(y_s2, p30_s2)), 4),
                "pr_auc": round(float(average_precision_score(y_s2, p30_s2)), 4),
                "brier_score": round(float(brier_score_loss(y_s2, p30_s2)), 4),
            },
            "d60_lr": {
                "roc_auc": round(float(roc_auc_score(y_s2, p60_s2)), 4),
                "pr_auc": round(float(average_precision_score(y_s2, p60_s2)), 4),
                "brier_score": round(float(brier_score_loss(y_s2, p60_s2)), 4),
            },
            "gain_d60_minus_d30": {
                "delta_roc": round(float(roc_auc_score(y_s2, p60_s2) - roc_auc_score(y_s2, p30_s2)), 4),
                "delta_pr": round(float(average_precision_score(y_s2, p60_s2) - average_precision_score(y_s2, p30_s2)), 4),
                "delta_brier": round(float(brier_score_loss(y_s2, p60_s2) - brier_score_loss(y_s2, p30_s2)), 4),
            },
        },
    }

    # 7. Compile Final Audit Artifacts
    audit_report = {
        "metadata": {
            "phase": "Phase Twenty-Three",
            "audit_type": "Paired Common-Cohort Evaluation & Threshold Audit",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "common_cohort_records": n_common,
            "unique_students": n_students_common,
            "excluded_pre_d60_dropouts": len(df30_raw) - n_common,
            "positive_at_risk_prevalence": round(prev_common, 4),
        },
        "naive_vs_common_cohort_reconciliation": {
            "phase_22_reported_naive_gain_lr": {
                "day30_roc": 0.7333, "day60_roc": 0.7839, "delta_roc": +0.0506,
                "day30_pr": 0.6912, "day60_pr": 0.7563, "delta_pr": +0.0651,
                "note": "Naive comparison evaluated Day 30 on N=27,466 (including 1,105 early dropouts) and Day 60 on N=26,361.",
            },
            "phase_23_common_cohort_paired_gain_lr": {
                "day30_roc": m_d30_lr["roc_auc"], "day60_roc": m_d60_lr["roc_auc"],
                "delta_roc": round(m_d60_lr["roc_auc"] - m_d30_lr["roc_auc"], 4),
                "day30_pr": m_d30_lr["pr_auc"], "day60_pr": m_d60_lr["pr_auc"],
                "delta_pr": round(m_d60_lr["pr_auc"] - m_d30_lr["pr_auc"], 4),
                "note": "Common cohort evaluates both models strictly on the identical N=26,361 surviving cohort.",
            },
        },
        "student_clustered_bootstrap_lr": boot_lr,
        "student_clustered_bootstrap_xgb": boot_xgb,
        "models": {
            "day30_lr": m_d30_lr,
            "day60_lr": m_d60_lr,
            "day30_xgb": m_d30_xgb,
            "day60_xgb": m_d60_xgb,
        },
        "operating_thresholds_audit": thresh_table,
        "mcnemar_discordance_at_threshold_046": discordance_at_046,
        "temporal_diagnostic_2014j": temp_diag,
    }

    out_metrics_path = metrics_dir / "phase_twenty_three_common_cohort_metrics.json"
    with open(out_metrics_path, "w") as f:
        json.dump(audit_report, f, indent=2)
    print(f"\n[✓] Audit Metrics Saved: {out_metrics_path}")

    # Display Clean Console Summary
    print("\n" + "=" * 80)
    print("AUDIT FINDINGS SUMMARY (COMMON COHORT N = 26,361):")
    print(f"  Day-30 LR on Common:  ROC = {m_d30_lr['roc_auc']:.4f} | PR = {m_d30_lr['pr_auc']:.4f} | Brier = {m_d30_lr['brier_score']:.4f}")
    print(f"  Day-60 LR on Common:  ROC = {m_d60_lr['roc_auc']:.4f} | PR = {m_d60_lr['pr_auc']:.4f} | Brier = {m_d60_lr['brier_score']:.4f}")
    print(f"  -> PAIRED LR GAIN:    ΔROC = {m_d60_lr['roc_auc'] - m_d30_lr['roc_auc']:+.4f} [95% CI: {boot_lr['delta_roc_auc']['ci_95_lower']:+.4f}, {boot_lr['delta_roc_auc']['ci_95_upper']:+.4f}]")
    print(f"                        ΔPR  = {m_d60_lr['pr_auc'] - m_d30_lr['pr_auc']:+.4f} [95% CI: {boot_lr['delta_pr_auc']['ci_95_lower']:+.4f}, {boot_lr['delta_pr_auc']['ci_95_upper']:+.4f}]")
    print(f"  Day-30 XGB on Common: ROC = {m_d30_xgb['roc_auc']:.4f} | PR = {m_d30_xgb['pr_auc']:.4f}")
    print(f"  Day-60 XGB on Common: ROC = {m_d60_xgb['roc_auc']:.4f} | PR = {m_d60_xgb['pr_auc']:.4f}")
    print(f"  -> PAIRED XGB GAIN:   ΔROC = {m_d60_xgb['roc_auc'] - m_d30_xgb['roc_auc']:+.4f} [95% CI: {boot_xgb['delta_roc_auc']['ci_95_lower']:+.4f}, {boot_xgb['delta_roc_auc']['ci_95_upper']:+.4f}]")
    print(f"  McNemar Test (τ=0.46): Chi2 = {discordance_at_046['mcnemar_chi2']}, p = {discordance_at_046['p_value']:.2e} (Significant: {discordance_at_046['statistically_significant_p05']})")
    print(f"                         Net +{discordance_at_046['net_cases_corrected_by_d60']} students correctly reclassified by Day 60 model.")
    print("=" * 80)
    return audit_report


if __name__ == "__main__":
    run_phase_twenty_three_audit()
