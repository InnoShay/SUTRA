# SUTRA Phase Fifteen — Evaluation Gate Consistency Review & Statistical Specification

**Date:** 2026-10-12  
**Role:** Senior ML Governance Analyst & Evaluation Protocol Reviewer  
**Status:** Pre-Pilot Gate Consistency Review  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary & Review Objectives

This review resolves the documented ambiguities between the lexicographic hierarchy and hard vetoes identified in Phase Fourteen, and formalizes the exact statistical procedures required to make prospective evaluation claims fully reproducible.

### Core Consistency Determinations:
1. **Resolution of Hierarchy vs. Veto Conflict:** Veto conditions act as **strict non-compensatory gates**. A candidate must clear every safety and operational veto concurrently before ranking metrics are evaluated. Ranking performance ($\Delta \text{ROC-AUC}$) cannot compensate for increased false alarms, dropped recall, or probability miscalibration.
2. **Reproducible Test for False Alarm Reduction:** Specified the **Paired McNemar Test** on discordant classifications among non-failing students ($y=0$) at $\alpha = 0.01$, accompanied by student-clustered bootstrap confidence intervals for $\Delta \text{FP}$.
3. **Dual Calibration Standard:** Pre-registered both **Brier Score** (proper scoring rule, bin-independent) and **Expected Calibration Error (ECE)** (10 probability bins) to ensure calibration is not judged on a single bin-dependent heuristic.
4. **Transparent Sample Size & Power Policy:** Formally declared the $N \ge 3,500$ sample-size claim as dependent on high paired model ranking correlation ($\rho_{\text{paired}} \ge 0.89$), with an explicit protocol for re-evaluating empirical power upon prospective data collection.

---

## 2. Definitive Promotion Gate Structure: Absolute Vetoes vs. Minimum Targets

To eliminate any ambiguity between competing goals, evaluation gates are structured into three distinct layers:

```
                            [ EVALUATION GATE PIPELINE ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ LAYER 1: ABSOLUTE VETOES ]                   [ LAYER 2: MINIMUM THRESHOLDS ]
      (Any failure triggers immediate                (Must be satisfied concurrently)
       automatic rejection)                                      │
                 │                                               ▼
                 │                                  [ LAYER 3: RANKING TARGETS ]
                 │                                   (Evaluated only if Layers 1 & 2 pass)
                 ▼                                               │
      ◄────── REJECT / HOLD ─────────────────────────────────────┘
```

### Layer 1: Absolute Governance & Safety Vetoes (Non-Compensatory)
If any of the following conditions is triggered, model promotion is **IMMEDIATELY REJECTED OR HELD**, regardless of ROC-AUC:

1. **Veto 1 (Candidate Provenance Veto):** Candidate artifact hash differs from the authorized binary or lacks signed governance approval. $\implies$ **REJECT.**
2. **Veto 2 (Data Leakage Veto):** Input telemetry contains post-Day-30 activity ($t > 30$) or target/outcome fields. $\implies$ **REJECT.**
3. **Veto 3 (Student Safety Veto):** Recall on true failing students drops by more than $2.0\%$ points relative to production:
   $$\text{Recall}_{\text{exp}} < \text{Recall}_{\text{prod}} - 0.020 \implies \mathbf{HARD\text{-}BLOCK\ (REJECT)}$$
   *Rationale:* Reducing advisor false alarms by failing to flag at-risk students is unacceptable.
4. **Veto 4 (Advisor Burden Veto):** Total advisor false alarms increase or show no statistically significant decrease at $\tau = 0.46$:
   $$\Delta \text{FP} \ge 0 \quad \text{or} \quad p_{\text{McNemar}} \ge 0.01 \implies \mathbf{HARD\text{-}BLOCK\ (REJECT)}$$
   *Rationale:* SUTRA's core institutional mission is false alarm reduction; models that increase alert fatigue are barred.
5. **Veto 5 (Severe Miscalibration Veto):** Expected Calibration Error exceeds $0.070$ or Brier score degrades:
   $$\text{ECE} > 0.070 \quad \text{or} \quad \text{Brier}_{\text{exp}} > \text{Brier}_{\text{prod}} \implies \mathbf{HARD\text{-}BLOCK\ (REJECT)}$$
6. **Veto 6 (Fairness Screening Veto):** Disparate Impact Ratio on any protected demographic falls outside $[0.80, 1.25]$ after multiplicity correction:
   $$\text{DIR}(g) < 0.80 \quad \text{or} \quad \text{DIR}(g) > 1.25 \implies \mathbf{HOLD\ FOR\ ETHICS\ REVIEW}$$

### Layer 2: Minimum Operational Requirements
Must be satisfied concurrently:
- $\text{ECE} \le 0.050$ across 10 probability bins.
- $\text{Brier}_{\text{exp}} \le \text{Brier}_{\text{prod}} - 0.005$.
- Unmaturated outcome rate $\le 3.0\%$.

### Layer 3: Primary Ranking Discrimination Target
Evaluated if and only if Layers 1 and 2 pass:
- $\Delta \text{ROC-AUC} \ge +0.015$ with $95\%$ student-clustered bootstrap confidence interval lower bound $> 0$.
- $\Delta \text{PR-AUC} \ge +0.020$ with $95\%$ bootstrap confidence interval lower bound $> 0$.

---

## 3. Fully Reproducible Statistical Specifications

### 3.1 False Alarm Reduction Test (McNemar Discordant Test)
To evaluate whether the candidate model significantly reduces false alarms among non-failing students ($y_i = 0$):

1. **Cohort:** All eligible students who ultimately passed or achieved distinction ($N_0 = \sum \mathbb{I}(y_i = 0)$).
2. **Discordant Contingency Table:**
   - $b$: Count of students where Production sounded a false alarm but Candidate was silent:
     $$b = \sum_{i \in \{y=0\}} \mathbb{I}\left(P_{\text{prod}, i} \ge 0.46 \text{ and } P_{\text{exp}, i} < 0.46\right)$$
   - $c$: Count of students where Production was silent but Candidate sounded a false alarm:
     $$c = \sum_{i \in \{y=0\}} \mathbb{I}\left(P_{\text{prod}, i} < 0.46 \text{ and } P_{\text{exp}, i} \ge 0.46\right)$$
3. **Statistical Test:** One-sided McNemar Test:
   $$H_0: b \le c \quad \text{vs.} \quad H_1: b > c$$
   $$\chi^2 = \frac{(b - c)^2}{b + c} \sim \chi^2(1)$$
4. **Decision Rule:** Reject $H_0$ if $p < 0.01$ and $b > c$.
5. **Confidence Interval:** Accompanied by $B = 1,000$ student-clustered bootstrap resamples reporting the $95\%\text{ CI}$ for net false alarm delta $\Delta \text{FP} = c - b$.

### 3.2 Primary Discrimination Comparison (DeLong Paired Test)
1. **Paired Test Statistic:** DeLong test for correlated ROC curves on the identical prospective cohort:
   $$Z = \frac{\hat{\theta}_{\text{exp}} - \hat{\theta}_{\text{prod}}}{\sqrt{\mathbb{V}(\hat{\theta}_{\text{exp}} - \hat{\theta}_{\text{prod}})}} \sim \mathcal{N}(0, 1)$$
2. **Confidence Intervals:** $95\%$ paired student-cluster bootstrap confidence intervals constructed over $B = 1,000$ iterations grouped by `id_student`.
3. **Decision Rule:** Statistically significant improvement confirmed if two-sided $p < 0.01$ and $95\%\text{ CI}$ lower bound exceeds $0$.

### 3.3 Dual Probability Calibration Assessment
Calibration will not rely on a single bin-dependent heuristic:
1. **Brier Score (Bin-Independent):**
   $$\text{Brier} = \frac{1}{N} \sum_{i=1}^N (P_i - y_i)^2$$
   Candidate must achieve $\text{Brier}_{\text{exp}} \le \text{Brier}_{\text{prod}}$.
2. **Expected Calibration Error (ECE):**
   Evaluated across $M = 10$ uniform probability bins $[0, 0.1), [0.1, 0.2), \dots, [0.9, 1.0]$:
   $$\text{ECE} = \sum_{m=1}^{10} \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
   Candidate must achieve $\text{ECE} \le 0.050$.
3. **Calibration Slope & Intercept:** Computed via logistic regression of true outcomes on logit-transformed probabilities. Slope must fall within $[0.85, 1.15]$.

### 3.4 Multiplicity Adjustment for Subgroups
Auditing performance across 5 demographic dimensions entails evaluating 20+ simultaneous subgroup comparisons.
- **Benjamini-Hochberg (BH) False Discovery Rate Procedure:**
  Rank sorted $p$-values $p_{(1)} \le p_{(2)} \le \dots \le p_{(k)}$.
  Find largest $i$ such that $p_{(i)} \le \frac{i}{k} q$ with $q = 0.05$.
- Only adjusted disparities with $q < 0.05$ will be deemed statistically significant.

---

## 4. Policy Choices Pending Human Governance Approval

The following protocol options involve institutional policy decisions and are submitted for reviewer selection:

| Decision Area | Option A (Conservative) | Option B (Balanced) | Governance Recommendation |
| :--- | :--- | :--- | :--- |
| **Recall Tolerance** | Zero recall drop permitted ($\text{Recall}_{\text{exp}} \ge \text{Recall}_{\text{prod}}$) | Up to $2.0\%$ recall drop permitted if false alarms drop by $>10\%$ | **Option B** (Pre-registered in Layer 1 Veto 3) |
| **Inconclusive Evaluation** | Pause evaluation and extend shadow run for another academic semester | Retain production v1.0.0 and terminate candidate | **Option A** (Provides sufficient power) |
| **Multi-Module Students** | Resample clustered by `id_student` | Take only primary enrollment per student | **Option A** (Evaluates complete cohort reality) |
