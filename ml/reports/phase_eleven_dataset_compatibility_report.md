# SUTRA Phase Eleven — External Dataset Compatibility Audit Report: KDD Cup 2015

**Date:** 2026-10-12  
**Auditor:** SUTRA External Evaluation & ML Governance Review Team  
**Scope:** Investigation of KDD Cup 2015 (XuetangX) for SUTRA External Validation  
**Current Production Model:** Regularized Logistic Regression v1.0.0 (SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`) at Threshold `0.46`  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Executive Summary

Phase Ten established that all four historical semesters in the Open University Learning Analytics Dataset (OULAD) have been examined in prior diagnostic and evaluation phases. Consequently, **no genuinely untouched temporal holdout remains within OULAD**.

Phase Eleven investigated the suitability of the widely benchmarked **KDD Cup 2015** competition dataset (derived from Tsinghua University's XuetangX MOOC platform) as an external validation benchmark for SUTRA's Day-30 early-warning prediction system.

### Definitive Finding:
**KDD Cup 2015 is structurally and semantically incompatible with SUTRA's predictive task.**
1. **Target Semantics (Category Error):** SUTRA predicts formal university academic outcome risk (`Fail` or `Withdrawn` in accredited, tuition-paying higher education modules; prevalence $45.6\%$). KDD Cup 2015 predicts **MOOC platform inactivity** (whether a user had zero click events in the final 10 days of an open online course; prevalence **$79.3\%$**). In a MOOC, learners freely audit or browse without academic penalty; treating MOOC non-completion as equivalent to formal degree failure is methodologically unsound.
2. **Missing Feature Categories:** SUTRA's 25-feature production schema relies heavily on demographic predictors (`imd_band`, `highest_education`, `age_band`, `region`, `disability`) and formal assessment submission milestones (`assessments_submitted_d30`, `assessment_banked_d30`). KDD Cup 2015 has **zero student demographic fields** and **zero formal tutor-marked assessments**.
3. **Direct Model Transfer (Design A) is Impossible:** SUTRA's production pipeline cannot be evaluated on KDD Cup 2015 without fabricating or dummy-imputing missing feature categories, which would violate basic ML integrity standards.
4. **Separate Research Model (Design B) Does Not Validate SUTRA:** Training a distinct model on KDD Cup 2015 would address a different task (open MOOC disengagement) with different features, providing zero evidence regarding SUTRA's real-world higher-education performance.

**Formal Recommendation:** **Option C — Reject the dataset for this purpose and identify the characteristics a better dataset must satisfy.**

---

## 2. Dataset Provenance, Scope, and Licensing

| Attribute | Official / Authoritative Value | Primary Sources |
| :--- | :--- | :--- |
| **Dataset Title** | KDD Cup 2015: Predicting MOOC Dropout | [ACM SIGKDD Archive](https://www.kdd.org/kdd-cup/view/kdd-cup-2015) |
| **Organizers** | ACM SIGKDD & Tsinghua University (Knowledge Engineering Group) | [Tsinghua KEG](http://keg.cs.tsinghua.edu.cn) |
| **Platform Origin** | XuetangX (Chinese MOOC platform based on edX architecture) | [XuetangX Portal](https://www.xuetangx.com) |
| **Competition Year** | 2015 (KDD 2015 Conference, Sydney, Australia) | [KDD 2015 Proceedings](https://www.kdd.org/kdd2015/) |
| **Total Enrollments** | 200,904 total enrollments ($120,542$ train; $80,362$ test) | [`enrollment_train.csv`](https://biendata.com/competition/kddcup2015/) |
| **Total Students** | Approx. $79,186$ unique learners in training partition | XuetangX log records |
| **Courses Covered** | 39 distinct online courses across diverse disciplines | `course_info.csv` |
| **Total Log Events** | $13,545,124$ total interaction events ($8,157,277$ train; $5,387,847$ test) | `log_train.csv`, `log_test.csv` |
| **Target Distribution** | **79.3% Dropout** ($95,581$ enrollments) / **20.7% Active** ($24,961$ enrollments) | `truth_train.csv` |
| **License / Terms** | Non-commercial educational and academic research use only; attribution required to Tsinghua University and ACM SIGKDD. Commercial redistribution prohibited. | [KDD Cup 2015 Rules](https://biendata.com/competition/kddcup2015/) |
| **Access Location** | Available via official competition mirrors (Biendata, Kaggle, Figshare repository). | Figshare (10.6084/m9.figshare.14761446) |

---

## 3. Compatibility Matrix: SUTRA vs. KDD Cup 2015

| Evaluation Dimension | SUTRA Specification (OULAD Higher Education) | KDD Cup 2015 Specification (XuetangX MOOC) | Compatibility Classification |
| :--- | :--- | :--- | :---: |
| **1. Prediction Unit** | Student registration: `(id_student, code_module, code_presentation)` | Course enrollment: `(username, course_id, enrollment_id)` | **Compatible only with documented mapping** |
| **2. Target Definition** | Academic outcome risk: `Fail` or `Withdrawn` (credit-bearing course failure) | Platform Inactivity: No recorded log events in the final 10 days of course | **INCOMPATIBLE** |
| **3. Baseline Prevalence** | 45.64% at-risk (8,335 / 18,263 training records) | 79.30% dropout (95,581 / 120,542 training records) | **INCOMPATIBLE** |
| **4. Eligible Population** | Registrations actively enrolled after Day 30 | All users who registered an `enrollment_id` | **Compatible only with documented mapping** |
| **5. Prediction Cutoff** | Fixed calendar Day 30 relative to course start date (`Day 0`) | Variable course lengths (30–90 days); competition used fixed observation windows | **Compatible only with documented mapping** |
| **6. Demographic Features** | 6 features: `imd_band`, `highest_education`, `age_band`, `region`, `gender`, `disability` | **ZERO demographics** (strictly anonymized `username` only) | **INCOMPATIBLE** |
| **7. Academic Progress Features**| `studied_credits`, `num_of_prev_attempts`, `days_registered_before_start` | Total enrollment count per user; no degree credits or historical retakes | **INCOMPATIBLE** |
| **8. Assessment Features** | `assessments_submitted_d30`, `assessment_banked_d30`, `has_early_assessment_submission_d30` | Interactive `problem` check logs; no tutor-marked coursework or credit exams | **INCOMPATIBLE** |
| **9. VLE Clickstream Logs** | Open University VLE events (`oucontent`, `quiz`, `forumng`, `homepage`, `other`) | edX interaction events (`video`, `problem`, `wiki`, `access`, `navigate`, `discussion`) | **Compatible only with documented mapping** |
| **10. Module Grouping** | `code_module` (7 university departments: AAA to GGG) | `course_id` (39 individual open course offerings) | **Compatible** |
| **11. Learner Grouping / Splits** | Student-grouped (`id_student`) GroupKFold to prevent identity leakage | Learners overlap across train/test unless grouped by `username` | **Compatible only with documented mapping** |
| **12. Licensing & Access** | Open Government Licence / Creative Commons (OULAD) | Non-commercial research competition license (Tsinghua / ACM SIGKDD) | **Compatible for non-commercial research** |

---

## 4. Assessment of Evaluation Designs

### Design A: External-Domain Evaluation (Direct Transfer of SUTRA v1.0.0)
- **Concept:** Take SUTRA's saved production pipeline (`baseline_logistic_regression.joblib`) and run predictions directly on KDD Cup 2015 records.
- **Evaluation:** **REJECTED AS METHODOLOGICALLY INVALID**.
  1. **Feature Contract Violation:** SUTRA's `ColumnTransformer` strictly requires 25 specific input columns, including 6 demographic columns (`imd_band`, `region`, `gender`, etc.) and formal assessment milestones. KDD Cup 2015 contains none of these fields.
  2. **Unacceptable Imputation:** Dummy-filling missing demographics (e.g. imputing median IMD band or most frequent region) would feed meaningless synthetic constants into the model, corrupting log-odds calculations and invalidating risk scores.
  3. **Event Semantic Mismatch:** Equating Open University `oucontent` clicks with edX `video` watch events is an arbitrary heuristic that lacks construct validity.

### Design B: Separate Research Model on KDD Cup 2015
- **Concept:** Train a brand-new model from scratch on KDD Cup 2015 logs to predict 10-day MOOC dropout at an arbitrary cutoff (e.g. Day 30).
- **Evaluation:** **INAPPROPRIATE FOR SUTRA MODEL VALIDATION**.
  1. While technically feasible as an independent data science exercise, this model would predict open online course disengagement rather than formal degree completion.
  2. Success or failure of a model on KDD Cup 2015 provides **zero evidential support** for whether SUTRA's Day-30 model will accurately flag failing university students in accredited higher education programs.
  3. Conflating open MOOC abandonment with accredited university dropout would introduce false confidence into institutional student-support workflows.

---

## 5. Blueprint: What a Defensible External Dataset Must Satisfy

To provide valid external confirmation of SUTRA's Day-30 early-warning approach, an external dataset must satisfy the following **Seven Institutional Criteria**:

1. **Higher Education Institutional Context:** Must originate from an accredited university or college where students pay tuition and earn degree credits, ensuring non-trivial completion stakes.
2. **Standard Academic Outcome Target:** Ground truth must represent official end-of-term academic outcomes (`Course Failure`, `Official Withdrawal`, or `Degree Non-Completion`), not transient platform inactivity.
3. **Structured Temporal Cutoff:** Activity logs must support a strict Day-30 (or Week 4 / first-month) prediction boundary relative to course launch, with complete censoring of post-cutoff data.
4. **Co-occurring Activity & Administrative Data:** Must contain both LMS interaction logs (Moodle, Canvas, Blackboard, or Brightspace) and student administrative context (enrollment timing, credit load, course discipline).
5. **Assessment Milestones:** Must record early formal assignment submissions or diagnostic quizzes within the first 30 days.
6. **Unique Student Grouping:** Must provide de-identified learner IDs to enforce student-grouped evaluation and prevent cross-fold identity leakage.
7. **Transparent Licensing & Research Governance:** Must permit academic research, ethical evaluation of early-warning systems, and auditing under clear institutional data agreements.

---

## 6. Formal Go/No-Go Decision

```
[RECOMMENDATION] Option C: Reject KDD Cup 2015 for SUTRA External Model Validation
```

### Strategic Action Plan:
1. **Do Not Download KDD Cup 2015:** Prevent unnecessary storage expansion and pipeline distortion.
2. **Prioritize Prospective Institutional Staging (Phase Ten Mandate):** As recommended in the Phase Ten Governance Memo, evaluate the module-relative Logistic Regression candidate via **read-only prospective shadow deployment** during an upcoming active academic term.
3. **Seek HE-Specific External Repositories:** If external multi-institutional benchmarks are pursued, explore accredited university LMS archives (e.g. Canvas Network Higher Ed open datasets or multi-campus Moodle research databases) that fulfill the Seven Institutional Criteria.
