# SUTRA Phase Eleven — Execution Record: External Dataset Compatibility Audit

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Governance Engineer  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Git Branch:** `Neemay-ml`  

---

## 1. Execution Summary

Phase Eleven performed an audit-only investigation into whether the **KDD Cup 2015** competition dataset (originating from Tsinghua University's XuetangX MOOC platform) is suitable for external evaluation of SUTRA's Day-30 student risk prediction model.

- **Phase Nature:** Audit-only governance investigation.
- **Strict Guardrails Enforced:**
  - **No full dataset downloaded** (avoided importing unvalidated or incompatible external corpora).
  - **No models trained or refit**.
  - **No datasets merged or feature pipelines modified**.
  - **No production model promotion or threshold modification** (Production remains Logistic Regression v1.0.0 at threshold `0.46`).
- **Deliverables Generated:**
  - [`ml/reports/phase_eleven_initial_inspection.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_initial_inspection.md)
  - [`ml/reports/phase_eleven_dataset_compatibility_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_dataset_compatibility_report.md)
  - [`ml/reports/phase_eleven_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_execution_record.md)
- **Final Governance Decision:** **Option C — Reject KDD Cup 2015 for SUTRA model validation** and establish the Seven Institutional Criteria required for an accredited higher-education benchmark dataset.

---

## 2. Baseline & Production Integrity Verification

Prior to conducting external research, the current SUTRA production configuration and Phase Ten governance status were inspected and verified:

| Checkpoint | Expected / Recorded State | Verification Status |
| :--- | :--- | :---: |
| **Active Production Model** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | Confirmed Present |
| **Model Artifact Hash (SHA-256)** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | Verified Identical |
| **Active Serving Threshold** | `0.46` in `backend/app/main.py` | Verified (Untouched) |
| **Phase Ten Promotion Memo** | [`ml/reports/phase_ten_promotion_decision.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_ten_promotion_decision.md) | Verified (Read-only status) |
| **OULAD Processed Dataset Hash** | `e6f6e4f9c3cacc48a59b3ed1f5b814fcae1d8e350964c0340eed6aa61e4ee3b9` | Verified Unchanged |

---

## 3. Authoritative Sources Consulted

All findings regarding KDD Cup 2015 were established using authoritative competition repositories, academic papers, and official documentation:

1. **ACM SIGKDD Official Competition Archive:**  
   URL: [https://www.kdd.org/kdd-cup/view/kdd-cup-2015](https://www.kdd.org/kdd-cup/view/kdd-cup-2015)  
   *Verified:* Competition organizers, problem definition, task specification, and platform background.
2. **Biendata MOOCData Official Hosting Mirror & Rules:**  
   URL: [https://biendata.com/competition/kddcup2015/](https://biendata.com/competition/kddcup2015/)  
   *Verified:* Data schemas (`enrollment_train.csv`, `log_train.csv`, `truth_train.csv`, `course_info.csv`), terms of use, licensing, and competition rules.
3. **KDD Cup 2015 Research Dataset Mirror (Figshare Repository):**  
   URL: [https://doi.org/10.6084/m9.figshare.14761446](https://doi.org/10.6084/m9.figshare.14761446)  
   *Verified:* File record counts, enrollment sizes ($120,542$ train; $80,362$ test), log event volume ($13.5\text{M}$ total interactions), and ground truth label distribution ($79.3\%$ dropout rate).
4. **KDD 2015 Conference Proceedings & Competition Overview Papers:**  
   URL: [https://www.kdd.org/kdd2015/](https://www.kdd.org/kdd2015/)  
   *Verified:* The exact target operationalization: binary dropout defined as zero interaction logs in the final 10 days of a course run.
5. **XuetangX Learning Platform Architecture Documentation:**  
   URL: [https://www.xuetangx.com](https://www.xuetangx.com)  
   *Verified:* edX open-source platform lineage, interaction log types (`video`, `problem`, `wiki`, `access`, `navigate`, `discussion`), and zero demographic capture for anonymous learners.

---

## 4. Step-by-Step Audit Progression

### Step 1: Initial Workspace Inspection & Baseline Protection
- Inspected repository status on branch `Neemay-ml`.
- Confirmed that the production model artifact SHA-256 matches `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`.
- Confirmed serving threshold remains `0.46` in `backend/app/main.py`.
- Generated [`ml/reports/phase_eleven_initial_inspection.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_initial_inspection.md).

### Step 2: Provenance, Scope, and Licensing Audit
- Traced the origin of KDD Cup 2015 to Tsinghua University's Knowledge Engineering Group (KEG) and the XuetangX platform.
- Audited license: Non-commercial academic research use permitted under strict attribution to Tsinghua and ACM SIGKDD; commercial redistribution prohibited.
- Extracted official volume metrics: 39 courses, 200,904 enrollments, 13,545,124 click events.
- Identified target distribution: $79.30\%$ dropout ($95,581 / 120,542$ enrollments in train), reflecting the high browsing/auditing disengagement typical of free MOOCs.

### Step 3: Comparative Analysis & Compatibility Matrix
- Evaluated the 12 primary dimensions of compatibility between SUTRA's OULAD Day-30 task and KDD Cup 2015.
- Discovered 5 fundamental incompatibilities:
  1. **Target Semantics:** Accredited university course failure/withdrawal ($45.64\%$) vs. uncredentialed MOOC 10-day inactivity ($79.30\%$).
  2. **Demographics:** Complete absence of student background or equity indicators (`imd_band`, `highest_education`, `region`, `age_band`, `disability`, `gender`).
  3. **Assessments:** Complete absence of formal tutor-marked assignment milestones (`assessments_submitted_d30`, `assessment_banked_d30`).
  4. **Academic Progress:** Absence of degree credits or historical course attempts (`studied_credits`, `num_of_prev_attempts`).
  5. **Construct Equivalence:** Clicks on open edX video players do not correspond to engagement with accredited virtual learning environments and formal tutoring.

### Step 4: Assessment of Validation Designs
- **Design A (Direct Model Transfer):** Evaluated and definitively **rejected**. SUTRA's production pipeline requires 25 specific features; running inference on KDD Cup 2015 would require fabricating synthetic dummy demographics and assessment milestones, which produces methodologically invalid predictions.
- **Design B (Separate Research Model):** Evaluated and concluded to be **unfit for SUTRA model validation**. Developing a separate model for MOOC dropout predicts a fundamentally different phenomenon and cannot be cited as validation of SUTRA's higher-education system.

### Step 5: Formulation of HE Benchmark Requirements & Final Recommendation
- Formulated the **Seven Institutional Criteria** required for a valid external benchmark.
- Issued **Option C: Reject KDD Cup 2015 for SUTRA External Model Validation**.
- Reaffirmed the Phase Ten recommendation: Prioritize prospective shadow-mode evaluation on an active higher-education semester, or pursue LMS datasets from accredited institutions.

---

## 5. Test Suite Verification

To confirm that the audit-only investigation introduced zero regressions or unintended code mutations, the complete SUTRA automated test suite was executed:

- **Command:** `PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests`
- **Output:**
  - Total tests executed: 91
  - Total passed: 91
  - Total failed: 0
  - Execution duration: 0.53 seconds
  - Exit code: 0

---

## 6. Audit Deliverables Checklist

- [x] Initial Inspection Memo: [`ml/reports/phase_eleven_initial_inspection.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_initial_inspection.md)
- [x] External Dataset Compatibility Report: [`ml/reports/phase_eleven_dataset_compatibility_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_dataset_compatibility_report.md)
- [x] Execution Record: [`ml/reports/phase_eleven_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_eleven_execution_record.md)
- [x] Production Model Intact (`baseline_logistic_regression.joblib` hash verified)
- [x] Production Serving Threshold Intact (`0.46`)
- [x] Full Test Suite Passing (91/91 tests green)
