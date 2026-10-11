# SUTRA Phase Fifteen — Research Candidate Authorization Packet

**Date:** 2026-10-12  
**Role:** Senior ML Governance Analyst & Evaluation Protocol Reviewer  
**Target Candidate Artifact:** `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_lr.joblib`  
**Status:** Prepared for Designated Human Reviewer (Pending Authorization)  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary & Purpose

This authorization packet provides the formal review dossier for the **Phase Nine Module-Relative Logistic Regression Candidate Model**.

### Critical Governance Boundary:
```
[ GOVERNANCE NOTICE ]
This document DOES NOT authorize candidate execution, an institutional pilot,
production model replacement, or external data collection.
Candidate execution in ShadowModeEvaluator remains PROGRAMMATICALLY BLOCKED
(candidate_provenance_verified = False) until an authorized human reviewer
formally executes and signs the Decision Form in Phase Fifteen.
```

The purpose of this packet is to present the complete, reconciled technical evidence, historical development metrics, module-level operational tradeoffs, and residual risks so that the responsible reviewer can make an informed, defensible governance decision.

---

## 2. Technical Profile of the Candidate Model

| Parameter | Specification / Observed Value | Verification Source |
| :--- | :--- | :--- |
| **Model Artifact Path** | `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_lr.joblib` | Filesystem |
| **Cryptographic Hash (SHA-256)** | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` | `shasum -a 256` |
| **Physical File Size** | 13,025 bytes | Stat metadata |
| **Estimator Type** | Regularized Logistic Regression (`scikit-learn 1.7.2`) | Pipeline inspector |
| **Hyperparameters** | $C = 1.0$, `class_weight='balanced'`, `penalty='l2'`, `solver='lbfgs'`, `random_state=42` | `config.yaml` |
| **Transformer Pipeline** | `ModuleRelativeTransformer` $\to$ `ColumnTransformer` $\to$ `LogisticRegression` | Serialized steps |
| **Input Feature Schema** | 26 features (25 baseline SUTRA features + course identifier `code_module`) | `feature_schema.json` |
| **Modeled Predictors** | 36 features: 19 base numerical, 11 module-standardized relative $z$-scores, 6 categorical | `feature_schema.json` |
| **One-Hot Encoded Dimension** | 66 columns (19 numerical + 11 relative $z$ + 36 one-hot category levels) | Pipeline `coef_.shape` |
| **Operating Threshold** | $\tau = 0.46$ (strictly locked to match production baseline) | `config.yaml` |

---

## 3. Provenance & Execution Trace Evidence

The candidate binary is verified as the authentic product of the Phase Nine research pipeline:

1. **Pipeline Source Code:** Formally trained by [`ml/pipelines/run_module_relative_experiment.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/pipelines/run_module_relative_experiment.py) on development semesters `2013B`, `2013J`, and `2014B` ($N = 18,263$ rows, 17,188 students).
2. **Programmatic Metric Artifact:** Lines 1043–1045 of `ml/reports/metrics/phase_nine_metrics.json` recorded the exact SHA-256 hash `2a2727aa...` and byte size 13,025 upon completion of the training script.
3. **Forensic Prediction Reproduction:** Reloading the binary and executing predictions on the secondary historical holdout (`2014J`, $N = 9,203$) reproduced saved validation outputs exactly:
   - **ROC-AUC:** $0.7345$ (Matches saved `0.7345`)
   - **PR-AUC:** $0.6742$ (Matches saved `0.6742`)
   - **Brier Score:** $0.2104$ (Matches saved `0.2104`)
   - **Total Alerts:** $5,209$ (Matches saved `5,209`)
4. **Resolution of Markdown Text Discrepancy:** The hash `951f2dd1...` (8,881 B) documented in Phase Nine report text was captured from an uncommitted prototype run prior to the final script execution. The physical binary on disk is authentic and intact.

---

## 4. Retrospective Development Metrics

The following metrics represent **internal historical development evidence** on OULAD. They must **NOT** be interpreted as prospective validation:

### 4.1 5-Fold Student-Grouped Cross-Validation (Pooled OOF, $N = 18,263$)
Evaluated on training semesters `2013B`, `2013J`, and `2014B` with GroupKFold segregated by `id_student`:

| Metric | Production Baseline (v1.0.0) | Research Candidate (Exp LR) | Delta ($\Delta$) | Statistical Significance |
| :--- | :---: | :---: | :---: | :---: |
| **ROC-AUC** | 0.7230 | **0.7484** | $+0.0254$ | $p < 0.001$ ($95\%\text{ CI: } [+0.0215, +0.0292]$) |
| **PR-AUC** | 0.6939 | **0.7318** | $+0.0379$ | $p < 0.001$ ($95\%\text{ CI: } [+0.0328, +0.0432]$) |
| **Brier Score** | 0.2117 | **0.2021** | $-0.0096$ | Better probability calibration |
| **Expected Calibration Error** | 0.0405 | **0.0384** | $-0.0021$ | Stable across 10 uniform bins |
| **Recall at $\tau = 0.46$** | 65.00% | **64.91%** | $-0.09\%$ | Statistically indistinguishable ($\approx$ zero loss) |
| **Advisor False Alarms** | 3,218 | **2,818** | **$-400$** | **$-12.4\%$ reduction** ($p < 0.001$) |
| **Total Cohort Alert Rate** | 47.29% | **44.82%** | $-2.47\%$ | 450 fewer total alerts fired |

### 4.2 Secondary Historical Holdout Partition (`2014J`, $N = 9,203$)
Evaluated on the fourth historical OULAD semester:
- **Baseline v1.0.0:** ROC-AUC $0.7107$, PR-AUC $0.6409$, False Alarms $1,818$, Recall $64.09\%$.
- **Research Candidate:** ROC-AUC $0.7345$ ($+0.0238$), PR-AUC $0.6742$ ($+0.0333$), False Alarms $1,664$ ($-154$ false alarms, $-8.5\%$), Recall $63.89\%$.
- **Governance Classification:** `2014J` is classified as previously inspected historical evidence, not an untouched prospective test set.

---

## 5. Module-Level Tradeoffs & Operational Risks

While the candidate achieves a net reduction of $400$ false alarms across the pooled training population, module-level analysis reveals substantial variance across academic disciplines:

```
  Module False Alarm Changes (Candidate vs. Baseline):
  AAA:  +13   (Mild increase in Humanities)
  BBB: -342   (Major reduction in Social Science)
  CCC:   -4   (Neutral in STEM)
  DDD: +113   (Increase in STEM course DDD)
  EEE:  +67   (Increase in Education)
  FFF: +100   (Increase in Computing)
  GGG: -347   (Major reduction in Open Foundation)
  -----------------------------------------------
  Net: -400   (13 + (-342) - 4 + 113 + 67 + 100 - 347 = -400)
```

### Critical Operational Risks:
1. **Disciplinary Workload Redistribution:** In modules `DDD`, `EEE`, and `FFF`, academic advisors would experience a slight increase in alerted students ($+67$ to $+113$), while advisors in `BBB` and `GGG` would see major workload relief ($-342$ to $-347$).
2. **Curricular Drift & Unseen Modules:** If an institutional partner introduces novel course codes or modules with sample sizes $N < 10$, the candidate must fall back to training global statistics, temporarily losing its relative standardization advantage.
3. **No Prospective Performance Data:** The candidate has never operated in prospective shadow mode on an active semester. All metrics to date are retrospective.

---

## 6. Required Human Decisions

The responsible ML Governance Reviewer must review this dossier and execute the formal Decision Form ([`ml/reports/phase_fifteen_human_decision_form.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_human_decision_form.md)), selecting one of the following decisions:

1. **Option 1: Approve for Research-Only Shadow Evaluation:**  
   Authorizes unblocking candidate execution exclusively in isolated, read-only shadow evaluation (`candidate_provenance_verified = True`) for an authorized future cohort. Keeps production v1.0.0 strictly active and candidate predictions permanently blinded from student interventions.
2. **Option 2: Return for Remediation:**  
   Withholds authorization until specified technical or methodological gaps are addressed.
3. **Option 3: Reject Candidate:**  
   Formally terminates candidate progression; retains v1.0.0 as the permanent standard.
