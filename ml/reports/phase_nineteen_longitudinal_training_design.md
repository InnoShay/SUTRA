# SUTRA Phase Nineteen — Longitudinal ML Training Architecture Design

**Milestone:** CODEX 3.0 PS6 Applied ML Roadmap & Longitudinal Feasibility Audit  
**Author:** Senior Applied ML Scientist and Longitudinal Student Analytics Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Architecture Blueprint Complete  

---

## 1. Executive Summary

This document specifies the technical, mathematical, and data-engineering architecture for SUTRA's future **Longitudinal Student Success Machine Learning Pipeline**.

Transitioning from a single-snapshot Day-30 model to a longitudinal system requires solving four critical challenges:
1. **Point-in-Time Correctness:** Strict temporal censoring to eliminate backward-in-time target leakage and retroactive data revisions.
2. **Panel Correlation Structure:** Correctly modeling repeated snapshot observations per student without violating independent-and-identically-distributed (i.i.d.) assumptions.
3. **Policy Endogeneity (Intervention Confounding):** Disentangling natural student trajectory from the positive impact of institutional support actions.
4. **Reproducible Snapshot Schemas:** An auditable, immutable data contract linking each observation timestamp to historical feature windows and prospective labels.

---

## 2. Workstream E — Point-in-Time Correctness & Snapshot Schema

```
Observation History: [Registration, Past Terms, Prior Semesters]
Course Start:        Day 0
                     │
Snapshot 1 (Day 15): ├─── [Input Window: -30d to +15d] ───► Cutoff T1
                     │                                      │◄────── Label Window: +16d to End of Term ──────► [Final Outcome]
Snapshot 2 (Day 30): ├─────── [Input Window: -30d to +30d] ───────► Cutoff T2
                     │                                             │◄─── Label Window: +31d to End of Term ──► [Final Outcome]
Snapshot 3 (Day 60): ├─────────────── [Input Window: -30d to +60d] ───────────────► Cutoff T3
                     │                                                            │◄── Label Window: +61d ───► [Final Outcome]
```

### 2.1. Auditable Longitudinal Snapshot Schema

Each training row corresponds to a single **Student-Course-Snapshot** tuple:

```python
class LongitudinalSnapshotRecord(BaseModel):
    """
    Immutable training instance for longitudinal risk modeling.
    Guarantees strict point-in-time correctness.
    """
    # Entity Primary Keys
    snapshot_id: str             # e.g. "SNAP-2026F-CS101-STU1042-D30"
    student_id: str              # Unique institutional student identifier (de-identified)
    course_id: str               # Institutional course code, e.g. "CS101"
    term_id: str                 # Academic semester, e.g. "2026-FALL"
    
    # Temporal Coordinates
    course_start_date: str       # ISO date: YYYY-MM-DD
    snapshot_date: str           # ISO date: YYYY-MM-DD
    snapshot_relative_day: int   # Calendar days elapsed since course start (e.g. 15, 30, 60)
    
    # Observation Windows (Strictly <= snapshot_date)
    feature_window_start: str    # ISO date (e.g. course_start - 30 days)
    feature_window_end: str      # ISO date (snapshot_date 23:59:59 UTC)
    
    # Feature Vectors (Point-in-Time Censored)
    academic_features: dict      # Cumulative GPA to date, formative assessment scores <= snapshot_date
    lms_features: dict           # Clicks, logins, forum velocity <= snapshot_date
    attendance_features: dict    # Session scan rates, consecutive absences <= snapshot_date
    demographic_features: dict   # Fixed pre-course administrative attributes
    
    # Data Quality & Latency Metadata
    max_data_latency_hours: float# Delay between event occurrence and registrar/LMS sync
    had_missing_feeder: bool     # True if any upstream connector was lagging at snapshot_date
    
    # Prospective Target Labels (Strictly > snapshot_date)
    label_window_start: str      # snapshot_date + 1 day
    label_window_end: str        # End of semester grade submission date
    target_terminal_failure: int # 1 = Course Fail or Withdraw; 0 = Pass / Distinction
    target_near_term_decline: Optional[int] # 1 if grade drop or attendance drop in [t+1, t+30]
    
    # Intervention Confounding Flags
    had_recorded_intervention: bool        # True if advisor outreach occurred after snapshot_date
    first_intervention_date: Optional[str] # Date of earliest support action
    intervention_type: Optional[str]       # e.g. "ACADEMIC_TUTORING", "ADVISOR_CHECK_IN"
```

### 2.2. Rules for Handling Delayed and Revised Data
In real institutional IT environments, grades are regraded, attendance is corrected post-hoc, and LMS clicks are batch-synced with latency.
- **Bi-Temporal Modeling:** Every event must store both `event_timestamp` (when the student clicked or submitted) and `system_ingest_timestamp` (when the database recorded it).
- **Leakage Prevention Rule:**
  $$\text{An event is eligible for feature inclusion if and only if: } \text{system\_ingest\_timestamp} \le T_{\text{snapshot}}$$
  If an instructor regrades an assignment at Day 45 with an effective submission date of Day 28, that revised grade **MUST NOT** appear in the Day-30 snapshot. Including it would inject future grading decisions into an earlier prediction.

---

## 3. Panel Correlation & Student-Course Grouping Design

```
Semester 1 (2024-Fall)        Semester 2 (2025-Spring)       Semester 3 (2025-Fall)        Semester 4 (2026-Spring)
┌───────────────────────┐     ┌───────────────────────┐      ┌───────────────────────┐     ┌───────────────────────┐
│     TRAIN SET         │     │     TRAIN SET         │      │    VALIDATION SET     │     │     TEST SET          │
│                       │     │                       │      │                       │     │ (Untouched Holdout)   │
│ All Students in Term  │     │ All Students in Term  │      │ All Students in Term  │     │ All Students in Term  │
│ Clustered on id_stu   │     │ Clustered on id_stu   │      │ Clustered on id_stu   │     │ Clustered on id_stu   │
└───────────────────────┘     └───────────────────────┘      └───────────────────────┘     └───────────────────────┘
  (Snapshots: D15, D30, D60)    (Snapshots: D15, D30, D60)     (Snapshots: D15, D30, D60)    (Snapshots: D15, D30, D60)
```

### 3.1. Temporal Split Structure
To test true real-world forecasting ability, the dataset must be partitioned temporally across contiguous academic terms:
- **Training Partition (Terms $1 \dots K-2$):** Historical academic semesters (e.g. Fall 2024, Spring 2025).
- **Validation Partition (Term $K-1$):** Intermediate tuning semester (e.g. Fall 2025). Used for hyperparameter tuning, feature selection, and probability calibration.
- **Test Partition (Term $K$):** Prospective untouched holdout semester (e.g. Spring 2026). Never touched during training or calibration.

### 3.2. Clustered Grouping Across Repeated Snapshots
A single student may generate multiple training rows:
- Multiple snapshots in the same course (e.g. Day 15, Day 30, Day 60).
- Multiple courses taken in the same term (e.g. CS101 and MATH201).
- Multiple terms over their academic career (Freshman to Senior year).

**Strict Grouping Invariant:**
- Grouping must cluster on `student_id`.
- **Identity Leakage Prohibition:** Under no circumstances may rows belonging to `student_id = X` appear in both Train and Test. If a student took courses in Fall 2024 and Spring 2026, their historical records must not leak forward identity features into prospective test evaluation.
- Within the training set, $K$-fold cross-validation must use `GroupKFold(n_splits=5, groups=student_id)` to ensure all snapshots of a student belong entirely to a single fold.

---

## 4. Modeling Methodologies for Longitudinal Trajectories

Two architectures should be benchmarked:

### Architecture A: Multi-Model Independent Landmark Architecture (Recommended for SUTRA Phase 20)
Train separate, dedicated models for each discrete milestone:
1. $M_{\text{Day 15}}$: Early Pre-Course & Launch Model (relies heavily on registration timeliness, initial logins).
2. $M_{\text{Day 30}}$: SUTRA Primary Early-Warning Model (25-feature observable engagement and first assessment).
3. $M_{\text{Day 60}}$: Midterm Progress Model (incorporates midterm grade, attendance velocity, and change features).

**Advantages:**
- Inherently explainable; identical to SUTRA's current production pipeline structure.
- Accommodates differing feature availability across milestones without complex padding.
- Allows computing velocity delta directly: $\Delta \hat{P} = \hat{P}_{60} - \hat{P}_{30}$.

### Architecture B: Recurrent / Temporal Sequential Architecture (Long-Term Research)
Input is a variable-length sequence of weekly observation vectors: $\mathbf{x}_1, \mathbf{x}_2, \dots, \mathbf{x}_t$.
- Model: Temporal Convolutional Network (TCN) or Gated Recurrent Unit (GRU).
- Captures dynamic interaction velocity directly.
- **Drawback:** Requires extensive historical training volume (tens of thousands of students); difficult to audit and explain to human advisors; vulnerable to covariate shift across different semester schedules.

---

## 5. Policy Endogeneity & Intervention Confounding

The most critical methodological challenge in educational data science is **intervention confounding**:

```
                  ┌────────────────────────────────────────┐
                  │    Early Risk Detected at Day 30       │
                  │    P(Risk) = 0.82                      │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │     Institutional Intervention         │
                  │     (Tutoring, Advising, Care Plan)    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │        Student Recovers & Passes       │
                  │        Observed Terminal Label = 0     │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
         ┌────────────────────────────────────────────────────────┐
         │ Paradox: Naive Evaluation Counts This as a "FALSE POSITIVE" │
         │ Model Precision appears to DEGRADE because it WORKED!  │
         └────────────────────────────────────────────────────────┘
```

### Mitigation Strategy:
1. **Explicit Intervention Logging:** The Support Evidence Ledger must record exact timestamps of all support deliveries.
2. **Censored Post-Intervention Evaluation:**
   - In offline evaluation, evaluate baseline predictive accuracy on historical terms where the early-warning system was **not active** (unconfounded natural trajectory).
   - In live deployment, evaluate models on pre-intervention outcomes (e.g. midterm milestone before support) or use causal survival models that treat intervention as a time-dependent covariate.
3. **Never Infer Causality from Observational Risk:** An advisor check-in correlated with a pass does not prove the check-in caused the pass. The system must report observed synthetic outcomes separately from causal claims.
