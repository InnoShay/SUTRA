# SUTRA Phase Eleven — Initial Codebase & Production Protection Inspection

**Date:** 2026-10-12  
**Auditor:** SUTRA External Evaluation & ML Governance Team  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Executive Summary

Phase Eleven initiates an external dataset compatibility investigation focusing on the **KDD Cup 2015** competition dataset (originating from Tsinghua University's XuetangX MOOC platform).

In accordance with project governance protocols established in Phase Ten:
- **Zero Production Modification:** The active production model remains [Logistic Regression v1.0.0](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib) at operating threshold `0.46`.
- **Zero Training / Zero Data Mutation:** Phase Eleven is strictly an audit and feasibility investigation. No model training, dataset merging, feature pipeline modification, or premature downloading will occur.
- **Artifact Protection:** All existing models, reports, figures, metrics, and experimental checkpoints remain completely preserved.

---

## 2. Baseline Model Artifact State & Production Verification

| Artifact Name | Path | Size | SHA-256 Checksum | Operational Role | Status |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `baseline_logistic_regression.joblib` | `ml/artifacts/models/v1.0.0/` | 7,105 B | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | Production Model | **Active & Frozen** |
| `candidate_xgboost.joblib` | `ml/artifacts/models/v1.0.0/` | 270,054 B | `28759b1d12f0d2ad5af2875a92c1cc76094347732a838b200d4975041dec976f` | Reference Candidate | **Archived** |
| `model_metadata.json` | `ml/artifacts/models/v1.0.0/` | 6,758 B | `747c216d65377f293fcadc135153113dbfa4d01c0a26fb33b9218af8b495de8b` | v1.0.0 Governance Record | **Frozen** |
| `experimental_module_relative_lr.joblib` | `ml/artifacts/experiments/phase_nine_module_relative/` | 8,881 B | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` | Phase 9 Research Candidate | **Isolated** |

### Backend API Serving Status:
- **Serving Script:** [`backend/app/main.py`](file:///Users/neemaysmac/Desktop/Sutra/backend/app/main.py)
- **Configuration:** [`backend/app/core/config.py`](file:///Users/neemaysmac/Desktop/Sutra/backend/app/core/config.py)
- **Active Serving Threshold:** `0.46`
- **Active Model File:** `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`
- **API Health:** Verified active and passing all 23 backend tests.

---

## 3. Review of the Canonical Phase Ten Promotion Memo

The Phase Ten governance audit ([`ml/reports/phase_ten_promotion_decision.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_ten_promotion_decision.md)) established that:
1. The Phase Nine module-relative Logistic Regression model demonstrated statistically validated improvements ($\Delta \text{ROC-AUC} = +0.0253$, 95% CI: $[+0.0215, +0.0292]$; $-400$ false alarms saved).
2. **Crucial Evidence Gap:** All four historical presentations in OULAD (`2013B`, `2013J`, `2014B`, `2014J`) were previously examined. **No untouched temporal holdout remains in OULAD**.
3. **Formal Governance Decision:** The committee ruled that direct live deployment without prospective or external validation would violate empirical standards. The experimental model was advanced to external/prospective validation while keeping v1.0.0 in active production.

Phase Eleven directly addresses this decision by investigating the feasibility of external validation using KDD Cup 2015.

---

## 4. Current Feature Schema Inventory (Day-30 Boundary)

From [`ml/artifacts/experiments/phase_nine_module_relative/feature_schema.json`](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/experiments/phase_nine_module_relative/feature_schema.json):

### Base Numerical Predictors (19 features):
1. `num_of_prev_attempts`: Previous module registration attempts
2. `studied_credits`: Academic credit load
3. `days_registered_before_start`: Days enrolled before course start (negative integer)
4. `has_missing_registration_date`: Binary indicator for missing registration date
5. `vle_total_clicks_d30`: Cumulative clicks through Day 30
6. `vle_active_days_d30`: Distinct calendar days with VLE interaction
7. `vle_clicks_precourse`: Clicks prior to Day 0
8. `vle_clicks_poststart_d30`: Clicks between Day 0 and Day 30
9. `vle_clicks_last_7d`: Clicks in the 7 days prior to cutoff (Days 24–30)
10. `vle_days_since_last_click`: Days elapsed since last recorded interaction
11. `vle_clicks_forumng_d30`: Forum clicks
12. `vle_clicks_oucontent_d30`: Core course content clicks
13. `vle_clicks_quiz_d30`: Practice quiz clicks
14. `vle_clicks_homepage_d30`: Course homepage clicks
15. `vle_clicks_other_d30`: Miscellaneous VLE clicks
16. `has_vle_activity_d30`: Binary activity flag
17. `assessments_submitted_d30`: Assessment count submitted prior to Day 30
18. `assessment_banked_d30`: Transferred credit count
19. `has_early_assessment_submission_d30`: Binary indicator for early assessment submission

### Base Categorical Predictors (6 features):
1. `gender`: Gender (`M`, `F`)
2. `region`: UK geographic region (13 regions)
3. `highest_education`: Prior qualification (5 categories)
4. `imd_band`: Index of Multiple Deprivation decile band (10 categories)
5. `age_band`: Age bracket (`0-35`, `35-55`, `55<=`)
6. `disability`: Disability declared (`Y`, `N`)

### Module-Relative Standardized Predictors (11 features):
Z-score normalized versions of the 11 continuous engagement features standardized against the student's module cohort:
`{feat}_module_z = clip((feat - mean_module) / std_module, -5.0, 5.0)`

**Total Input Features:** 26 (including `code_module` as grouping context)  
**Total Modeled Predictors:** 36 features
