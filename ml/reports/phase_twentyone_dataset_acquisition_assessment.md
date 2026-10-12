# SUTRA Phase Twenty-One — Dataset Acquisition Assessment & Route Strategy

**Milestone:** CODEX 3.0 PS6 Dataset Acquisition & Evaluation Readiness  
**Author:** Senior Applied ML Scientist, Data Acquisition Analyst, and Evaluation Protocol Auditor  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Canonical Acquisition Strategy Document  

---

## 1. Executive Summary

Phase Twenty established the SUTRA Longitudinal Data Contract (v1.0.0) and confirmed that **no real multisource training dataset currently exists in the repository**. Training a prospective longitudinal model cannot proceed until suitable, authorized real data is secured.

This report conducts an exhaustive, evidence-based assessment of three distinct routes to acquiring historical data:
1. **Route 1: Authorized Institutional Partnership** (Primary Recommended Route for Multisource Deployment)
2. **Route 2: Public Higher-Education Datasets** (Evaluated & Audited)
3. **Route 3: Permitted Scope Expansion of OULAD** (Secondary Fallback for LMS + Academic Progression Benchmarking)

### Key Strategic Decisions
- **Primary Recommendation:** **Route 1 (Institutional Partnership)** is the only route capable of validating the full multi-domain operational vision (including classroom attendance and early assessment progress linked to degree outcomes).
- **Secondary Fallback:** **Route 3 (OULAD Dual-Cutoff Expansion)** provides an immediately accessible, unconfounded fallback to prototype and validate the longitudinal code architecture (Day 30 vs Day 60 multi-landmark modeling) using real historical clickstream and coursework data without violating licensing terms.
- **Route 2 (Public Datasets):** Systematically audited and **rejected** as primary training routes due to severe domain omissions, task misalignment, or non-accredited open MOOC browsing behaviors.

---

## 2. Workstream A — Minimum Viable Training Dataset Specification

To distinguish between the **minimum viable dataset required to train the first real model** and the **broader six-domain information required for SUTRA's operational dashboard**, we establish two explicit data boundary tiers:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SUTRA DATA TIERING FRAMEWORK                                   │
│                                                                                                  │
│   TIER 1: MINIMUM VIABLE ML TRAINING DATASET (Model Input Vector)                                 │
│   ├── Pseudonymous Identifier: student_id_hash (Salted SHA-256)                                  │
│   ├── Context Keys: course_id, term_id, cutoff_milestone (DAY_30 / DAY_60)                       │
│   ├── Academic Progress: Prior cumulative GPA, term credits attempted, formative scores to date │
│   ├── LMS Engagement: Clicks to date, active days, last interaction latency, recent 7d velocity  │
│   ├── Attendance: Session presence % and absence streaks (Conditional on campus availability)    │
│   └── Target Outcome: Official mature final result (1 = Fail/Withdrawn, 0 = Pass/Distinction)    │
│                                                                                                  │
│   TIER 2: OPERATIONAL INTERVENTION WORKFLOW ONLY (EXCLUDED FROM ML FEATURES)                     │
│   ├── Fee Status: Billing balances, bursary eligibility, payment holds (CONFIDENTIAL TO AID)     │
│   ├── Skills & Placement: Resume reviews, mock interview scores (DEFERRED due to MNAR sparsity)  │
│   └── Faculty Observations: Subjective notes (DEFERRED from ML to prevent bias amplification)    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Minimum Required Fields for First Real Model
1. **Entity Keys:** `student_id_hash`, `course_id`, `term_id`, `cutoff_milestone`, `cutoff_date`.
2. **Academic Domain Inputs (Observed $\le T_{\text{cutoff}}$):**
   - `prior_cumulative_gpa`: Historical grade point average from completed terms.
   - `term_credits_attempted`: Initial course load.
   - `assessments_due_to_cutoff`: Number of scheduled assessment milestones to date.
   - `assessments_submitted_to_cutoff`: Number of submitted assessment milestones to date.
   - `weighted_coursework_score_to_cutoff`: Formative coursework score percentage to date.
   - `failed_assessments_to_cutoff`: Count of graded assessments scoring $<40\%$.
3. **LMS Digital Engagement Inputs (Observed $\le T_{\text{cutoff}}$):**
   - `lms_total_clicks_to_cutoff`: Platform interactions accumulated up to cutoff.
   - `lms_active_days_to_cutoff`: Distinct calendar days with recorded LMS events.
   - `lms_days_since_last_interaction`: Recency of study engagement.
   - `lms_recent_7d_clicks`: Velocity indicator (interaction volume in $[T-7\text{d}, T]$).
4. **Classroom / Lab Attendance Inputs (Conditional):**
   - `attendance_pct_to_cutoff`: Cumulative physical/virtual attendance rate to date.
   - `consecutive_absences_at_cutoff`: Current run of missed sessions.
5. **Ground Truth Target (Observed at Term End):**
   - `target_academic_risk`: Binary official outcome ($1 = \text{Fail/Withdrawn}, 0 = \text{Pass/Distinction}$).
6. **Temporal & Audit Provenance:**
   - `source_event_max_timestamp` ($\le T_{\text{cutoff}}$), `system_ingest_timestamp`, `is_outcome_mature` ($= \text{True}$).

### 2.2. Explicit Exclusions from the ML Training Vector
- **Fee Status Excluded:** Billing amounts, payment delays, and bursary applications are strictly excluded from predictive feature vectors. Including fee status as an ML input penalizes low-income students with higher algorithmic risk scores.
- **Faculty Free-Text Notes Excluded:** Qualitative instructor notes contain subjective sentiment that introduces demographic bias. They remain operational human-review context only.

---

## 3. Workstream B — Comparative Assessment of Data Acquisition Routes

We evaluate three potential data acquisition routes against technical, temporal, legal, and operational criteria:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THREE DATA ACQUISITION ROUTES                                  │
│                                                                                                  │
│   Route 1: Institutional Partnership (PRIMARY)                                                   │
│   ├── Supported Task: Dual Milestone Outcome Prediction across Academic + LMS + Attendance      │
│   ├── Pros: Genuine multi-domain real data, authentic campus context, direct clinical validity    │
│   └── Cons: Requires formal DUA, IRB review, campus IT extract coordination                      │
│                                                                                                  │
│   Route 2: Public Higher-Ed Datasets (REJECTED AS PRIMARY)                                      │
│   ├── Evaluated: KDD Cup 2015, Canvas Network, OpenEdu, EdX Open                                │
│   ├── Pros: Immediately downloadable                                                             │
│   └── Cons: MOOC non-completion != Degree Failure; 0 demographics, 0 fees, 0 attendance          │
│                                                                                                  │
│   Route 3: OULAD Permitted Dual-Cutoff Expansion (SECONDARY FALLBACK)                            │
│   ├── Supported Task: Academic + LMS Outcome Prediction at Day 30 and Day 60                     │
│   ├── Pros: Open Government Licence, 10.6M real events, zero external bureaucracy, unconfounded  │
│   └── Cons: Zero attendance, distance-learning only, static module structure                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Route Comparative Analysis

| Evaluation Dimension | Route 1: Authorized Institutional Partnership | Route 2: Public Datasets (e.g. KDD Cup / Canvas) | Route 3: OULAD Permitted Expansion |
|---|---|---|---|
| **1. Supported Task** | Academic outcome prediction at Day 30 & Day 60 across Registrar + LMS + Attendance. | Platform inactivity prediction (MOOC dropout) or platform course completion. | Academic outcome prediction at Day 30 & Day 60 across Registrar + VLE. |
| **2. Feature Availability** | **Complete:** Cumulative GPA, term credits, formative scores, LMS events, badge scans. | **Severe Deficits:** Zero student demographics, zero formal assessments, zero attendance. | **Partial:** Real VLE clicks, real assessment scores/dates, static demographics. Zero attendance. |
| **3. Target Label Availability** | **Authentic:** Official accredited degree grades (`Pass`, `Fail`, `Withdrawn`). | **Incompatible:** Platform click inactivity in final 10 days of course ($79.3\%$ dropout). | **Authentic:** Official Open University module grades (`Pass`, `Fail`, `Withdrawn`). |
| **4. Temporal Coverage & Terms** | 4 to 6 contiguous semesters (e.g. Fall 2023 through Spring 2026). | Variable course durations (30 to 90 days); non-contiguous open enrollments. | **4 Semesters:** 2013B, 2013J, 2014B, 2014J (February & October presentations). |
| **5. Repeated-Student Structure** | Authentic multi-course, multi-term degree pursuit across semesters. | Transient single-course auditing; high unlinked visitor traffic. | Real student identifiers (`id_student`) linked across multiple modules and terms. |
| **6. Licensing & Access Terms** | **Data Use Agreement (DUA)** with university; FERPA/GDPR compliance; IRB exemption. | Non-commercial competition / research license (e.g. Tsinghua, edX). | **Open Government Licence (OGL)**; Creative Commons CC-BY 4.0. Fully authorized. |
| **7. Snapshot Compatibility** | Compatible with arbitrary calendar cutoffs (Day 30, Day 60, Midterm). | Incompatible with fixed early-warning milestones due to irregular self-paced MOOCs. | **Fully Compatible:** Event timestamps (`date` relative to day 0) permit Day 30 and Day 60 cutoffs. |
| **8. Generalization Limitations** | Specific to partner institution's grading culture, LMS type, and curriculum structure. | Fails completely to generalize to accredited degree-granting universities. | Specific to distance-learning UK Open University pedagogy (2013–2014). |
| **9. Feasibility Verdict** | **PRIMARY RECOMMENDED ROUTE** | **REJECTED FOR MODEL TRAINING** | **SECONDARY ARCHITECTURAL FALLBACK** |

---

## 4. Route Execution Strategy

### 4.1. Primary Route: Institutional Partnership (The Target Pathway)
- **Objective:** Partner with an accredited higher-education institution to obtain 4 to 6 contiguous semesters of de-identified Student Information System (SIS), LMS (Canvas/Moodle/Blackboard), and badge-scan attendance data.
- **Why It Is Primary:** It is the only route that provides the full empirical ground truth needed for SUTRA's multi-domain vision.
- **Exact Next Actions:**
  1. Package the **Institutional Data Specification Packet** (Workstream D) for university review.
  2. Execute a bilateral **Data Use Agreement (DUA)** establishing educational research scope.
  3. Secure institutional **IRB Human Subjects Exemption**.
  4. Coordinate university IT pipeline to execute client-side pseudonymization (`student_id_hash`) and bi-temporal logging.

### 4.2. Secondary Route: OULAD Permitted Expansion (The Active Engineering Fallback)
- **Objective:** Re-extract OULAD's existing 22 CSV tables to construct an expanded longitudinal dataset featuring **both Day-30 and Day-60 snapshots**, leveraging real VLE clickstreams and intermediate tutor-marked assessments (`TMA`).
- **Why It Is Fallback:** OULAD is already resident in SUTRA's data warehouse under the Open Government Licence. It enables the team to build, debug, and validate the dual-landmark longitudinal training code, temporal splitting logic, and trajectory monitoring interfaces without waiting for external legal DUA negotiations.
- **Limitations Acknowledged:** OULAD cannot evaluate classroom attendance, fee workflows, or faculty observations. It tests the ML engineering pipeline for LMS and assessment progression only.
