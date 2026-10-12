# SUTRA Phase Twenty — Longitudinal Model Training & Evaluation Readiness Plan

**Milestone:** CODEX 3.0 PS6 Institutional Dataset Readiness & Longitudinal Data Contract  
**Author:** Senior ML Data Engineer and Student Analytics Data Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Canonical Training Blueprint (Pre-Execution)  

---

## 1. Executive Summary

This plan outlines the rigorous training, validation, and audit protocol that SUTRA must follow when an authorized, compatible historical higher-education dataset is acquired.

### Non-Negotiable Training Safeguards
1. **Zero Preprocessing Leakage:** All feature scalers, encoders, and missingness imputers must be fitted **exclusively inside training folds**.
2. **Student Identity Grouping:** All snapshot records for a given `student_id_hash` must be assigned to the same partition to eliminate cross-fold identity leakage.
3. **Historical 2014J Classification:** The historical OULAD semester $2014\text{J}$ is classified as **previously inspected development data**; it cannot serve as an independent test set for future model releases.
4. **No Arbitrary Threshold Carryover:** SUTRA's current serving threshold of **$0.46$** is specific to the Day-30 OULAD baseline (which achieved $78.0\%$ recall on $45.6\%$ prevalence). Future models must calibrate operational thresholds directly on the validation partition based on institutional advisor triage capacity.

---

## 2. Workstream E — Longitudinal Training Workflow & Partitioning Design

```
CONTIGUOUS INSTITUTIONAL SEMESTERS:
Semester 1 (Fall 2024)       Semester 2 (Spring 2025)      Semester 3 (Fall 2025)       Semester 4 (Spring 2026)
┌──────────────────────┐     ┌──────────────────────┐      ┌──────────────────────┐     ┌──────────────────────┐
│   TRAINING SET       │     │   TRAINING SET       │      │   VALIDATION SET     │     │   INDEPENDENT TEST   │
│                      │     │                      │      │                      │     │   (FROZEN HOLDOUT)   │
│ GroupKFold (k=5)     │     │ GroupKFold (k=5)     │      │ - Hyperparameter Opt │     │ - Evaluated ONCE     │
│ Clustered on student │     │ Clustered on student │      │ - Probability Calib  │     │ - Zero Retraining    │
│ Fitted Preprocessing │     │ Fitted Preprocessing │      │ - Threshold Tuning   │     │ - Subgroup Audit     │
└──────────────────────┘     └──────────────────────┘      └──────────────────────┘     └──────────────────────┘
```

### 2.1. Strict Temporal and Clustered Partitioning
To guarantee valid prospective generalization, data must be split along temporal semester boundaries:
1. **Training Partition (Semesters 1 & 2):** Used for fitting model estimators and internal 5-fold cross-validation.
2. **Validation Partition (Semester 3):** Used for model selection, regularization tuning, Platt scaling / isotonic probability calibration, and selecting operational decision thresholds.
3. **Independent Test Holdout (Semester 4):** Completely sealed during development. Unblinded exactly **once** to compute definitive benchmark metrics.

### 2.2. Student Clustered Cross-Validation
Within the training partition:
- Use `GroupKFold(n_splits=5)` clustered on `student_id_hash`.
- A student who took courses across both Semester 1 and Semester 2 must have all their rows allocated to a single fold.
- Preprocessing transformations (`StandardScaler`, `OneHotEncoder`, simple imputers) must be encapsulated in an `imblearn` or `sklearn.pipeline.Pipeline` so they are fit only on training folds.

---

## 3. Modeling Methodology & Landmark Architectures

When institutional data is ingested, SUTRA will benchmark two complementary modeling approaches:

### Architecture 1: Dual Independent Landmark Models (Recommended Baseline)
Train two distinct, interpretability-focused pipelines:
- **Model 1 ($M_{\text{Day 30}}$):** Evaluates risk at Day 30 based on early course engagement and diagnostic quizzes.
- **Model 2 ($M_{\text{Day 60}}$):** Evaluates risk at Day 60 incorporating mature midterm examination performance and attendance trajectories.

```
Longitudinal Pipeline Structure:
                     ┌──────────────────┐
Day-30 Snapshot ───► │  Pipeline M_30   │ ───► P_30 (Early Warning Probability)
                     └──────────────────┘
                                                       ┌──────────────────────────────────────┐
                                                       │ Trajectory Slope:                    │
                     ┌──────────────────┐              │ Δ P = P_60 - P_30                    │
Day-60 Snapshot ───► │  Pipeline M_60   │ ───► P_60 ──►│ Categorization:                      │
                     └──────────────────┘              │ - Escalating Risk (Δ P > +0.20)      │
                                                       │ - Stabilizing / Recovering (Δ P < 0) │
                                                       │ - Persistent Low Risk                │
                                                       └──────────────────────────────────────┘
```

### Architecture 2: Gradient-Boosted Trees with Monotonicity Constraints
Benchmark LightGBM / XGBoost against regularized Logistic Regression.
- Enforce **Monotone Constraints** on key behavioral features:
  - Clicks, active learning days, quiz scores, and attendance must have monotonic non-increasing risk constraints ($\frac{\partial \hat{P}}{\partial x} \le 0$).
  - Consecutive absences and days since last interaction must have monotonic non-decreasing risk constraints ($\frac{\partial \hat{P}}{\partial x} \ge 0$).
- Guarantees that improving attendance or studying more can **never** paradoxically increase a student's risk score.

---

## 4. Threshold Selection & Probability Calibration Protocol

### 4.1. The 0.46 Legacy Threshold Rule
- SUTRA's current serving threshold of **$0.46$** was established in Phase Three specifically for the Day-30 OULAD Logistic Regression baseline to achieve $\ge 70.0\%$ recall on a $45.6\%$ baseline prevalence.
- **MANDATORY POLICY: A new model candidate must NOT automatically inherit threshold 0.46.**
- Threshold selection must be formally derived on the **Validation Partition (Semester 3)** according to institutional triage capacity:

```
Triage Capacity Optimization:
Advising Office Capacity: C = Top 15% of cohort (e.g. 150 students per advisor)
Threshold Selection Rule:
  θ* = argmin_θ | P(P_hat(X) >= θ) - C |
Subject to:
  Recall(θ*) >= 0.70  AND  Precision(θ*) >= 0.55
```

### 4.2. Probability Calibration Standards
Because risk scores drive human advisor decision-making, raw model logits must be calibrated:
- Fit **Platt Scaling** (Logistic Calibration) or **Isotonic Regression** on the validation partition.
- Compute the **Brier Score** ($BS = \frac{1}{N}\sum (\hat{P}_i - Y_i)^2$) and **Expected Calibration Error (ECE)** across 10 equal-width bins.
- A model candidate must achieve **$\text{ECE} \le 0.05$** across the validation set before being eligible for prospective evaluation.

---

## 5. Comprehensive Evaluation & Reporting Standards

Definitive evaluation on the independent test holdout (Semester 4) must report:

1. **Discrimination Metrics:**
   - Precision-Recall AUC (PR-AUC / Average Precision) — Primary metric for imbalanced outcomes.
   - Receiver Operating Characteristic AUC (ROC-AUC).
   - Recall at fixed Precision targets ($\ge 0.60, \ge 0.70$).
   - Precision and Specificity at target Recall $\ge 0.75$.
2. **Calibration & Uncertainty Metrics:**
   - Calibration Curve plot and 10-bin ECE.
   - Brier Score.
   - Paired cluster bootstrap uncertainty intervals ($B=1,000$ resamples clustered on `student_id_hash`).
3. **Subgroup Parity & Fairness Audit:**
   - Evaluated across academic departments (STEM vs Humanities).
   - Evaluated across demographic bands (age bands, socioeconomic quartiles, prior qualification levels).
   - True Positive Rate parity and False Positive Rate balance audits.

---

## 6. Reproducibility & Model Versioning Contract

To ensure complete regulatory and scientific auditability:
- **Dataset Artifact:** SHA-256 hash of the cleaned training, validation, and test CSV/Parquet files.
- **Git Commit:** Exact Git commit SHA of the training pipeline code.
- **Environment Freeze:** `requirements.txt` with exact pinned library versions.
- **Model Metadata File:** Machine-readable `model_metadata.json` documenting:
  - Model class and hyperparameter dictionary.
  - Selected decision threshold $\theta^*$ and rationale.
  - Timestamp of training completion.
  - Performance metrics on training, validation, and test partitions with 95% bootstrap intervals.
  - Feature catalog with exact column indices and transformation mappings.
