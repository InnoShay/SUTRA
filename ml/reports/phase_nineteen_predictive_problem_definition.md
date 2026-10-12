# SUTRA Phase Nineteen — Predictive Problem Definition & Baseline Audit

**Milestone:** CODEX 3.0 PS6 Applied ML Roadmap & Longitudinal Feasibility Audit  
**Author:** Senior Applied ML Scientist and Longitudinal Student Analytics Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Audit & Formulation Complete (Non-Modifying Governance Phase)  

---

## 1. Executive Summary

SUTRA currently operates on a frozen, Day-30 academic-risk prediction model trained on the Open University Learning Analytics Dataset (OULAD), coupled with a Phase Seventeen/Eighteen six-domain synthetic data generator, explainable risk-signal engine, and human-in-the-loop intervention orchestration workflow.

The objective of Phase Nineteen is to determine the exact technical, data, and governance requirements for evolving SUTRA from a static single-snapshot Day-30 model and synthetic rule engine into a **validated, longitudinal machine learning system** that forecasts student academic decline, stability, and improvement over time.

### Non-Negotiable Governance Invariants
1. **Model & Artifact Freezing:** The production Regularized Logistic Regression Baseline (v1.0.0, threshold 0.46, SHA-256 `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`) remains unmodified.
2. **Quarantine Preserved:** The Phase Nine experimental module-relative candidate remains in closed shadow mode (`candidate_provenance_verified = False`).
3. **No Retraining on Synthetic Data:** Synthetic data is strictly for interface and workflow verification; it is never used as real ML training data.
4. **Audit Scope:** This phase introduces zero model weights, modifies no schemas, and downloads no external datasets.

---

## 2. Workstream A — Factual Inventory of the Current System

A rigorous audit of the current SUTRA repository reveals a sharp structural division between trained ML components and operational heuristic rules:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CURRENT SUTRA INVENTORY                                          │
│                                                                                                    │
│   ┌──────────────────────────────────────────────┐  ┌───────────────────────────────────────────┐  │
│   │           TRAINED MACHINE LEARNING           │  │             DETERMINISTIC RULES           │  │
│   │                                              │  │                                           │  │
│   │  Model: Regularized Logistic Regression      │  │  Engine: RiskSignalEngine (12 Rules)      │  │
│   │  Artifact: baseline_logistic_regression.joblib│ │  Schema: StudentSuccess360Profile (6 dom) │  │
│   │  Version: v1.0.0 (Threshold: 0.46)           │  │  Score: PrototypeCompositeRiskScore (pts) │  │
│   │  Dataset: Real OULAD (18,263 train records)  │  │  Dataset: 100% Synthetic (Seed 42)        │  │
│   │  Features: 25 Day-30 Observable Features     │  │  Domains: Attendance, Academics, LMS,     │  │
│   │  Target: Binary final_result (Fail/Withdrawn)│  │           Fees, Skills, Faculty Obs       │  │
│   └──────────────────────┬───────────────────────┘  └─────────────────────┬─────────────────────┘  │
│                          │                                                │                        │
│                          └──────────────────────┬─────────────────────────┘                        │
│                                                 ▼                                                  │
│                              ┌──────────────────────────────────────────┐                          │
│                              │       INTERVENTION WORKFLOW ENGINE       │                          │
│                              │       - Human-in-the-Loop State Machine  │                          │
│                              │       - Support Evidence Ledger (SQLite) │                          │
│                              │       - Confidentiality Routing          │                          │
│                              └──────────────────────────────────────────┘                          │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Trained Production Model Inventory
- **Model Type:** Scikit-learn Pipeline with `StandardScaler`, `OneHotEncoder`, and L2-regularized `LogisticRegression`.
- **Artifact Path:** `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`
- **Features Used (25 Total):**
  - *19 Numerical Features:* `num_of_prev_attempts`, `studied_credits`, `days_registered_before_start`, `has_missing_registration_date`, `vle_total_clicks_d30`, `vle_active_days_d30`, `vle_clicks_precourse`, `vle_clicks_poststart_d30`, `vle_clicks_last_7d`, `vle_days_since_last_click`, `vle_clicks_forumng_d30`, `vle_clicks_oucontent_d30`, `vle_clicks_quiz_d30`, `vle_clicks_homepage_d30`, `vle_clicks_other_d30`, `has_vle_activity_d30`, `assessments_submitted_d30`, `assessment_banked_d30`, `has_early_assessment_submission_d30`.
  - *6 Categorical Features:* `gender`, `region`, `highest_education`, `imd_band`, `age_band`, `disability`.
- **Target Definition:**
  $$\text{Target} = \begin{cases} 1 & \text{if } \text{final\_result} \in \{\text{'Withdrawn'}, \text{'Fail'}\} \\ 0 & \text{if } \text{final\_result} \in \{\text{'Pass'}, \text{'Distinction'}\} \end{cases}$$
  - Prevalence in historical training set ($2013\text{B}, 2013\text{J}, 2014\text{B}$): **$45.64\%$** ($8,335 / 18,263$ enrollments).
- **Temporal Cutoff:** Exactly **Day 30** relative to course official start (`date = 0`). All post-Day-30 LMS clicks and assessments are strictly censored.
- **Evaluation Partition:** Temporal holdout $2014\text{J}$ ($4,756$ enrollments). Evaluated in Phase Three and Phase Ten.

### 2.2. Features Present ONLY in Synthetic Multisource Profiles
The following features are **entirely absent from OULAD** and exist exclusively in SUTRA's synthetic data generators (`multisource_generator.py`):
1. **Attendance:** `overall_attendance_pct`, `recent_attendance_pct`, `consecutive_absences`, `lecture_attendance_pct`, `lab_attendance_pct`, `attendance_trend`, `last_attendance_date`.
2. **Academic Progress:** `cumulative_gpa`, `current_term_average_pct`, `assessments_overdue`, `failed_assessments_count`, `recent_quiz_average_pct`, `academic_standing`.
3. **Fee Status:** `status` (`PAID`, `OVERDUE`, `GRACE_PERIOD`, etc.), `days_past_due`, `has_financial_hold`, `financial_aid_status`, `bursary_eligibility_flag`.
4. **Skills & Placement:** `technical_skills_score`, `soft_skills_rating`, `resume_reviewed`, `mock_interview_completed`, `placement_readiness_tier`, `internship_status`.
5. **Faculty Feedback:** Structured observations with `faculty_role`, `course_code`, `sentiment`, `evidence_category`, and `summary_notes`.

### 2.3. Baseline System Limitations
1. **Zero Pre-Course Behavioral Baseline:** OULAD captures pre-course registration and clicks, but lacks historical term-over-term GPA or past course completion trajectories.
2. **Static Single-Point Horizon:** Day 30 is an arbitrary static landmark. It cannot identify students who engage well in month one but disengage after midterm exams (Day 60–90), nor can it observe recovery.
3. **Module Heterogeneity:** Historical evaluation in Phase Six and Ten revealed module error disparities (e.g., recall on STEM module `CCC` was $71.6\%$ vs $51.2\%$ on Humanities module `BBB`), indicating that a single global model struggles with differing curriculum paces.
4. **Absence of Real Multisource Ground Truth:** SUTRA currently has **zero real historical training rows** containing in-person attendance, financial records, skills assessments, or instructor text linked to student outcomes.

---

## 3. Workstream B — Candidate Longitudinal Prediction Tasks

To evolve SUTRA into a longitudinal system, we formulate and evaluate four distinct machine learning tasks.

```
Timeline:    Day 0             Day 30            Day 60            Day 90           End of Term
               │                 │                 │                 │                   │
Task 1:        ├─────────────────┼───────────────────────────────────────────────────────► [Terminal Outcome]
(Academic      │◄─── Input ─────►│                                                       
Outcome)       │                 │◄─────────────── Forecast Horizon ────────────────────►│

Task 2:        │                 │                 │
(Near-Term     │◄─── Input ─────►│                 │
Decline)       │                 │◄── Horizon ────►│ [Decline in Window?]

Task 3:        │                 │                 │
(Near-Term     │◄─── Input ─────►│                 │
Improvement)   │ (Struggling at t)│◄── Horizon ────►│ [Recovery in Window?]

Task 4:        │        t1       │        t2       │        t3       │        t4
(Trajectory    ├────────┼────────┼────────┼────────┼────────┼────────┼────────┼──────────►
Monitoring)    │   P(Risk)=0.2   │   P(Risk)=0.5   │   P(Risk)=0.8   │   P(Risk)=0.4 [After Support]
```

---

### Task 1: Academic Outcome Prediction at Progressive Snapshot Cutoffs

- **Description:** Estimate a student's eventual course completion outcome from all administrative and engagement information observable up to a specified milestone cutoff date $T_{\text{cutoff}}$.
- **Prediction Unit:** `(student_id, course_id, term_id, T_cutoff)`.
- **Prediction Cutoff & Input Window:**
  - Milestone 1: Early-Warning ($T_{\text{cutoff}} = \text{Day 30}$). Input window: $[\text{Day } -30, \text{Day } +30]$.
  - Milestone 2: Midterm ($T_{\text{cutoff}} = \text{Day 60}$). Input window: $[\text{Day } -30, \text{Day } +60]$.
- **Forecast Horizon:** End-of-term final grade deadline (typically Day 180–240).
- **Exact Target Definition:**
  $$Y_{\text{outcome}} = \begin{cases} 1 & \text{if final grade} < \text{Passing Grade (e.g. } < 40\% \text{ or 'F') or student officially withdraws} \\ 0 & \text{if student completes course with grade} \ge \text{Passing Grade} \end{cases}$$
  - *Label Source:* Official Institutional Registrar Gradebook / SIS Final Results.
- **Eligibility Criteria:** Active enrollment in credit-bearing course at $T_{\text{cutoff}}$ (students who officially dropped prior to $T_{\text{cutoff}}$ are excluded).
- **Required Features:** Longitudinal LMS engagement aggregates, early assessment milestone submissions/scores, historical GPA, academic standing.
- **Evaluation Split & Metrics:**
  - Student-grouped temporal split (Train on Terms $1\dots K-1$; Test on Term $K$).
  - Primary Metric: PR-AUC (Average Precision) and Recall at fixed Precision $\ge 0.70$. Calibration: Brier Score and Expected Calibration Error (ECE).
- **Principal Risks:**
  - *Survival Bias:* Students who withdraw before Day 30 drop out of the cohort, making later cutoffs evaluate progressively selected populations.
  - *Intervention Confounding:* If an institution intervenes on high-risk students at Day 30 and helps them pass, the observed target is 0, which penalizes the model as a "false positive" despite a correct early detection.

---

### Task 2: Near-Term Academic Decline Forecasting

- **Description:** Predict whether a currently active or satisfactory student will experience a defined performance deterioration over a bounded forward-looking window $[T, T + \Delta t]$ (e.g., next 30 days).
- **Prediction Unit:** `(student_id, course_id, term_id, snapshot_date T)`.
- **Prediction Cutoff & Input Window:** Evaluated weekly or bi-weekly at date $T$. Input window: $[T - 30, T]$.
- **Forecast Horizon:** Short-term window: $[T + 1, T + 30]$.
- **Exact Target Definition:**
  $$Y_{\text{decline}} = \begin{cases} 1 & \text{if in } [T+1, T+30]: \text{ (1) fails scheduled milestone } (<40\%), \text{ OR (2) misses } \ge 1 \text{ due assessment,} \\ & \text{ OR (3) attendance drops by } \ge 25\% \text{ points vs prior window} \\ 0 & \text{otherwise} \end{cases}$$
  - *Label Source:* Gradebook weekly logs and attendance scanners over $[T+1, T+30]$.
- **Eligibility Criteria:** Student must be in good academic standing at snapshot $T$ (GPA $\ge 2.0$ and current term average $\ge 60\%$).
- **Required Features:** 14-day attendance slope, LMS click velocity (ratio of last 7 days vs prior 14 days), forum interaction drops, assignment submission timeliness.
- **Evaluation Split & Metrics:**
  - Temporal forward-chaining split (train on rolling historical weeks).
  - Primary Metric: ROC-AUC and Recall at top $10\%$ triage capacity.
- **Principal Risks:**
  - *Window Assessment Sparsity:* If a course has no scheduled assessment or exam within $[T+1, T+30]$, academic decline cannot be measured through grades, introducing label censoring.
  - *Arbitrary Thresholding:* Defining decline as $\ge 25\%$ drop or $<40\%$ score creates artificial binary boundary effects.

---

### Task 3: Near-Term Academic Improvement / Recovery Forecasting

- **Description:** Predict whether a student currently identified in academic distress will exhibit measurable academic recovery over the subsequent 30-day window.
- **Prediction Unit:** `(student_id, course_id, term_id, snapshot_date T)`.
- **Conditioning Criterion:** Student must currently be flagged at-risk at date $T$ (e.g., failed most recent quiz or attendance $<60\%$).
- **Forecast Horizon:** Short-term recovery window $[T+1, T+30]$.
- **Exact Target Definition:**
  $$Y_{\text{recovery}} = \begin{cases} 1 & \text{if in } [T+1, T+30]: \text{ student passes next assessment } (\ge 60\%) \text{ AND attendance recovers to } \ge 75\% \\ 0 & \text{otherwise} \end{cases}$$
- **Principal Risks:**
  - *Severe Sample Truncation:* Restricting to at-risk students substantially shrinks training size.
  - *Confounding by Intervention:* Recovery is heavily driven by institutional support (tutoring, advising check-ins). Without modeling intervention exposure, the model confuses student resilience with advisor effectiveness.

---

### Task 4: Longitudinal Trajectory Monitoring (Dynamic Multi-Snapshot Risk Progression)

- **Description:** Compute sequential risk predictions at fixed calendar intervals $(T_1, T_2, T_3, \dots, T_k)$ to enable advisor dashboards to display risk trajectory over time (e.g., *Rising Risk*, *Stable*, *Recovering*).
- **Prediction Unit:** Panel sequence of snapshots $\tau \in \{T_1, T_2, \dots, T_k\}$ for each `(student_id, course_id, term_id)`.
- **Target Definition:** Dual output:
  1. Updated calibrated posterior probability $P(Y_{\text{outcome}} = 1 \mid \mathbf{X}_{1:k})$.
  2. Trajectory slope: $\Delta \hat{P} = \hat{P}(T_k) - \hat{P}(T_{k-1})$.
- **Evaluation Strategy:**
  - Grouped panel cross-validation (GroupKFold clustered on `student_id`).
  - Dynamic Brier score tracking calibration drift across successive term weeks.

---

## 4. Primary Recommendation for the First Real Longitudinal Model

### Recommended Primary Task: Task 1 (Academic Outcome Prediction at Progressive Dual Cutoffs: Day 30 and Day 60)

| Evaluation Dimension | Task 1: Dual-Cutoff Outcome | Task 2: Near-Term Decline | Task 3: Near-Term Recovery | Task 4: Continuous Sequence |
|---|:---:|:---:|:---:|:---:|
| **Ground Truth Clarity** | **High** (Registrar grade) | Medium (Window dependent) | Low (Sparsity & confounding) | **High** (Registrar grade) |
| **Data Availability** | **High** (Universally recorded) | Low (Requires weekly tests) | Low (Restricted cohort) | Medium (Requires panel logs) |
| **Continuity with SUTRA** | **Direct** (Extends v1.0.0) | Disconnected (New target) | Disconnected (New target) | Direct (Adds snapshot) |
| **Advisor Usability** | **Immediate** (Term milestones) | Medium (Alert fatigue) | Medium (Specialized triage) | **High** (Trend display) |
| **Susceptibility to Noise** | **Low** (Terminal status) | High (Assessment timing) | High (Intervention noise) | Medium (Multi-snapshot noise)|

### Rationale
1. **Defensible Ground Truth:** Terminal course outcome (`Pass` vs `Fail/Withdrawn`) is unambiguously recorded in official student information systems. It requires no arbitrary heuristics regarding what constitutes a "minor" versus "major" decline.
2. **Immediate Architectural Continuity:** SUTRA already has a validated, audited Day-30 pipeline. Expanding to a **Dual-Cutoff Architecture** ($T_{\text{early}} = \text{Day 30}$, $T_{\text{midterm}} = \text{Day 60}$) enables longitudinal comparison:
   $$\Delta \hat{P}_{\text{risk}} = \hat{P}_{\text{Day 60}} - \hat{P}_{\text{Day 30}}$$
   Advisors can immediately see whether a student's risk profile improved, stabilized, or escalated after the initial early warning.
3. **Avoids Window-Dependent Label Missingness:** Near-term 30-day decline forecasting fails in courses where assessments are clustered at midterm and finals, leaving empty observation windows. Task 1 works uniformly across all curriculum designs.
