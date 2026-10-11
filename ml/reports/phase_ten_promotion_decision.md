# SUTRA Phase Ten — Formal Model Promotion Decision Memo

**To:** SUTRA Project Leadership, Academic Advisory Board, and ML Governance Committee  
**From:** Senior ML Systems Auditor & Evaluation Engineer  
**Date:** 2026-10-12  
**Subject:** Promotion Readiness Review — Module-Relative Logistic Regression Candidate (Phase Nine)  
**Status:** **GOVERNANCE DECISION MEMO**  

---

## Executive Recommendation

```
[FINAL RECOMMENDATION] 
Advance the Experimental Model to External / Prospective Validation 
(Conditional on Shadow-Mode Staging; Retain Logistic Regression v1.0.0 in Active Production)
```

**Summary Rationale:**
The Phase Nine module-relative Logistic Regression candidate demonstrates the strongest, most consistent predictive and operational improvements observed in the SUTRA project (+0.0254 ROC-AUC, +0.0378 PR-AUC, and -400 false alarms saved across cross-validation). However, because **no untouched temporal holdout remains in the historical OULAD benchmark**, promoting the candidate directly to live student intervention without prospective confirmation would violate empirical ML governance standards.

Therefore, the candidate model is recommended for **formal progression to prospective shadow validation**, while **Logistic Regression v1.0.0 at threshold 0.46 remains the active production model**.

---

## Direct Answers to the Eight Governance Criteria

### 1. Does the Phase Nine gain reproduce?
**Yes.** Re-executing 5-fold student-grouped cross-validation reproduced the exact Phase Nine metrics:
- Pooled ROC-AUC improved from `0.7230` to `0.7484` (+0.0254).
- Pooled PR-AUC improved from `0.6939` to `0.7317` (+0.0378).
- Every single validation fold independently demonstrated an improvement (+0.0215 to +0.0281).
- At threshold $0.46$, false alarms decreased from $4,007$ to $3,607$ (-400 false alarms).

### 2. How uncertain is the estimated improvement?
**The improvement is statistically robust and bounded away from zero.**  
A 1,000-iteration student-cluster bootstrap (resampling unique students to account for correlated registrations) produced tight 95% confidence intervals:
- $\Delta \text{ROC-AUC}$: $+0.0253$ ($95\%\text{ CI: }[+0.0215, +0.0292]$)
- $\Delta \text{PR-AUC}$: $+0.0379$ ($95\%\text{ CI: }[+0.0328, +0.0432]$)
- $\Delta \text{False Alarms}$: $-401.7$ ($95\%\text{ CI: }[-469.7, -325.8]$)  
The probability that the true discrimination gain is zero or negative is $p < 0.001$.

### 3. Are false-alert reductions consistent across modules?
**No; false-alert changes reflect a principled disciplinary trade-off.**
- In humanities and social science courses (`BBB` and `GGG`), where students rely heavily on physical reading rather than VLE clicks, false alarms plummeted by **$-689$ combined** (-29.3% in BBB and -46.3% in GGG).
- In technical STEM courses (`DDD`, `EEE`, `FFF`), where click volume is high, relative normalization raised sensitivity, catching **$373$ additional at-risk students** while increasing false alarms by $280$ across these modules.
- The net overall reduction across all modules is exactly **$-400$ false alarms**.

### 4. Is calibration adequate for the intended use?
**Yes.** The candidate maintains excellent probability calibration:
- Brier score improved from `0.2117` to `0.2021` (sharper probabilistic discrimination).
- Expected Calibration Error (ECE) is `0.0385` across 10 decile bins (matching baseline `0.0384`).
- Calibration error remained stable under 5, 10, 15, and 20 bin partitions ($\text{ECE} \le 0.0405$).
- Predicted risk probabilities are suitable for direct advisor risk scoring and Evidence Card presentation.

### 5. Is there a genuinely untouched temporal validation set?
**No.** All four historical course presentations in OULAD (`2013B`, `2013J`, `2014B`, `2014J`) have been evaluated during Phases Three through Nine. Semester `2014J` has been repeatedly examined for error diagnostics and secondary comparisons. Claiming 2014J as an "independent confirmation test" would be methodologically deceptive.

### 6. What risks remain for subgroup performance, distribution shift, and real-world use?
1. **Disciplinary Shift Risk:** For a newly launched academic course with zero historical data, the module-relative transformer falls back to global university statistics. While mathematically safe, the model's advantage on that specific course will be lower until baseline data accumulates.
2. **Pedagogical Shift Risk:** If a module changes its syllabus (e.g. shifts from offline textbooks to online quizzes), historical module means $\mu_m$ will underestimate peer engagement until updated.
3. **STEM Workload Increase:** Advisory teams in STEM departments will experience slightly higher caseloads (+100 alerts in FFF, +113 alerts in DDD), which must be staffed appropriately.

### 7. What additional evidence is required before deployment?
Before replacing `v1.0.0` in live student decision workflows:
1. **Prospective Shadow-Mode Deployment:** Run the module-relative pipeline in parallel with `v1.0.0` for one full upcoming academic semester. Log predictions without triggering interventions and audit performance against end-of-term results.
2. **Advisor Evidence Card Review:** Conduct user-acceptance testing with academic advisors using the augmented Evidence Cards to verify that module-relative percentiles are intuitive.
3. **External Institution Validation:** If LMS data from an external university is available, test whether cross-institutional generalization holds.

### 8. Should the experiment remain research-only, proceed to external validation, or be considered for a later promotion review?
**The model should proceed to External / Prospective Validation.**  
It has outgrown the exploratory research stage by demonstrating statistically validated gains, zero leakage, robust fallback behavior, and full interpretability. However, direct live deployment without prospective staging is premature.

---

## Action Plan & Phased Staging Conditions

```
[STAGE 1: CURRENT]
Production: Logistic Regression v1.0.0 (25 features) at threshold 0.46.
Serving: Active in backend/app/main.py.

[STAGE 2: PROSPECTIVE SHADOW RUN]
Action: Ingest live Day-30 telemetry for active cohort.
Evaluate: Run both v1.0.0 and Module-Relative pipelines concurrently in read-only shadow mode.
Deliverable: Shadow evaluation report comparing true alert outcomes.

[STAGE 3: PROMOTION GATE]
Condition: If shadow validation confirms ROC-AUC >= 0.74 and advisor workload reduction >= 8%,
Action: Promote Module-Relative model to v2.0.0, update backend schema, and archive v1.0.0.
```

No production model binaries or API serving settings have been modified. All Phase Ten audit objectives are complete.
