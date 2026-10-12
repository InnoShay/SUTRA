# SUTRA Phase Twenty — Institutional Longitudinal Data Contract & Specification

**Milestone:** CODEX 3.0 PS6 Institutional Dataset Readiness & Longitudinal Data Contract  
**Author:** Senior ML Data Engineer and Student Analytics Data Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Canonical Data Contract Specification  

---

## 1. Executive Summary

This specification establishes the **SUTRA Longitudinal Data Contract (v1.0.0)** governing the ingestion, point-in-time validation, and feature preparation for future longitudinal machine learning models.

### Core Architecture & Governance Decisions
1. **Initial Task Formalization:** Official academic course outcome prediction at progressive dual milestones: **Day 30** (Early-Warning) and **Day 60** (Midterm Progress).
2. **Domain Prioritization:**
   - **Tier 1 (Core Predictive Features):** Historical & Term Academic Progress, LMS Digital Engagement, and Classroom/Lab Attendance (conditional on institutional availability).
   - **Tier 2 (Ethical & Sparsity Exclusions):** Fee status is **strictly excluded** from predictive ML feature sets (retained exclusively in confidential advisor workflows). Skills assessments and subjective faculty notes are **deferred**.
3. **Point-in-Time Correctness:** Strict temporal censoring ensures that zero observations recorded after the snapshot cutoff date are accessible to the model.
4. **Zero Identifiable Student Data:** All student identifiers must be pseudonymized cryptographic hashes prior to ingestion.

---

## 2. Workstream A — Task Definition & Ingestion Boundaries

```
Academic Term Timeline:
Day -30             Day 0 (Start)             Day 30 (Milestone 1)     Day 60 (Milestone 2)      End of Term
   │                     │                              │                        │                   │
   ├─────────────────────┼──────────────────────────────┤                        │                   │
   │ Pre-Course Inputs   │ Day-30 Observation Window    │                        │                   │
   │ (Credits, Reg Date) │ (Early LMS, First Quiz)      │                        │                   │
   │                     │                              │                        │                   │
   ├─────────────────────┼──────────────────────────────┴────────────────────────┤                   │
   │ Pre-Course Inputs   │ Day-60 Observation Window (Midterm Exam, Attendance)  │                   │
   │                     │                                                       │                   │
   │                     │                              │◄── Target Horizon 1 ───┴──────────────────►│
   │                     │                              │   (Prediction from Day 30)                 │ [Official Gradebook:
   │                     │                                                       │◄ Target Horizon 2►│  Pass vs Fail/Withdrawn]
   │                     │                                                       │ (Midterm Predict) │
```

### 2.1. Prediction Unit & Entity Keys
A longitudinal observation row is uniquely identified by the 4-tuple:
$$\text{Unit} = (\text{student\_id\_hash}, \text{course\_id}, \text{term\_id}, \text{cutoff\_milestone})$$
- `student_id_hash`: SHA-256 salted hash of the institutional student ID ($\ge 8$ alphanumeric characters).
- `course_id`: Catalog subject and course number (e.g. `CS101`, `MATH205`).
- `term_id`: Academic semester presentation code (e.g. `2026-FALL`, `2027-SPRING`).
- `cutoff_milestone`: Landmark snapshot identifier: `DAY_30` or `DAY_60`.

### 2.2. Eligibility Criteria at Each Milestone
An enrollment is eligible for model evaluation at milestone $T_{\text{cutoff}}$ if and only if:
1. The student is registered in a formal, credit-bearing higher education course.
2. The registration was active on or before $T_{\text{cutoff}}$.
3. **Withdrawal Filter:** If a student formally withdrew, dropped, or cancelled their enrollment *prior* to $T_{\text{cutoff}}$ (e.g., Day 12), that record is **ineligible** at Day 30 and Day 60. Evaluating students who already dropped before the cutoff introduces backward-in-time leakage.
4. Auditing, guest, or non-credit enrollments are excluded.

### 2.3. Target Ground Truth Definition
Ground truth is derived strictly from official, mature institutional gradebook records posted at the conclusion of the academic semester:
$$Y_{\text{risk}} = \begin{cases} 1 & \text{if final outcome is } \text{'Fail'} \text{ or } \text{'Withdrawn'} \text{ (after } T_{\text{cutoff}}\text{)} \\ 0 & \text{if final outcome is } \text{'Pass'} \text{ or } \text{'Distinction'} \text{ (credit earned)} \end{cases}$$
- **Maturity Requirement:** Training sets must have **$100\%$ outcome maturity**. Records with pending grade changes, unresolved academic dishonesty investigations, or incomplete deferral marks ('I') are excluded from training until final grades are posted.

### 2.4. Permitted vs. Forbidden Columns

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                COLUMN ACCESS BOUNDARY ENFORCEMENT                                  │
│                                                                                                    │
│   PERMITTED FEATURES (<= T_cutoff)                                                                 │
│   ✓ Student historical GPA from prior completed semesters.                                         │
│   ✓ Course credits attempted and registered course count.                                          │
│   ✓ Days registered prior to course launch.                                                        │
│   ✓ LMS click counts, active days, forum posts, resource accesses strictly <= T_cutoff.           │
│   ✓ Formative assessment scores, submission dates, and overdue counts <= T_cutoff.                 │
│   ✓ Classroom / lab attendance scans and absence streaks <= T_cutoff.                             │
│   ✓ Pre-course demographic bands (education level, age band, socioeconomic band).                  │
│                                                                                                    │
│   FORBIDDEN LEAKAGE COLUMNS (Strictly Rejected by Ingestion Validator)                             │
│   ✗ final_result, final_grade, final_score, exam_score, final_exam_grade                           │
│   ✗ date_unregistered, withdrawal_date, withdrawal_reason                                          │
│   ✗ post_cutoff_clicks, post_cutoff_assessments, post_cutoff_gpa, future_attendance_pct            │
│   ✗ disciplinary_record                                                                            │
│   ✗ financial_hold_active, fee_balance_amount (Ethically excluded from ML feature vectors)         │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.5. Distinct Evaluation Settings for Day 30 vs. Day 60
- **Independent Models:** The Day-30 model and Day-60 model must be trained, tuned, and evaluated as separate pipelines.
- **No Direct Naive Comparison:** The Day-60 model naturally has access to 30 additional days of dense engagement data and the midterm examination score. Comparing Day-60 ROC-AUC directly to Day-30 ROC-AUC without acknowledging different information availability is scientifically invalid.

---

## 3. Workstream B — Six-Domain Data Dictionary

The table below defines the formal **SUTRA Data Dictionary (v1.0.0)**.

| Field Name | Type | Units / Format | Source Feeder | Event Timestamp | Ingest Timestamp | Missingness Semantics | Sensitivity |
|---|---|---|---|---|---|---|---|
| `student_id_hash` | String | Salted SHA-256 | SIS / Identity | Pre-course | Batch Sync | Non-nullable ($\ge 8$ chars) | SENSITIVE |
| `course_id` | String | Catalog string | SIS Registrar | Pre-course | Batch Sync | Non-nullable | PUBLIC |
| `term_id` | String | `YYYY-[FALL\|SPRING]` | SIS Registrar | Pre-course | Batch Sync | Non-nullable | PUBLIC |
| `cutoff_milestone` | Enum | `DAY_30`, `DAY_60` | Pipeline config | Milestone date | Run time | Non-nullable | INTERNAL |
| `cutoff_date` | Date | `YYYY-MM-DD` | Academic calendar| Milestone date | Run time | Non-nullable | INTERNAL |
| `prior_cumulative_gpa`| Float | $0.00 - 4.00$ | SIS Transcript | Prior term end | Batch Sync | Nullable (First-term freshman) | INTERNAL |
| `term_credits_attempted`| Integer| $1 - 40$ credits | SIS Registration | Course launch | Batch Sync | Non-nullable | INTERNAL |
| `assessments_due_to_cutoff` | Integer | Count $\ge 0$ | LMS Gradebook | Due date | Event Sync | Non-nullable ($0$ if none due) | INTERNAL |
| `assessments_submitted_to_cutoff`| Integer | Count $\ge 0$ | LMS Gradebook | Submission time | Event Sync | Non-nullable | INTERNAL |
| `weighted_coursework_score`| Float | $0.0 - 100.0\%$ | LMS Gradebook | Grading time | Event Sync | Nullable if $0$ assessments due | INTERNAL |
| `failed_assessments_count` | Integer | Count $\ge 0$ | LMS Gradebook | Grading time | Event Sync | Non-nullable | INTERNAL |
| `lms_total_clicks_to_cutoff` | Integer | Count $\ge 0$ | LMS Access Log | Click event | Log Sync | Non-nullable ($0$ = no activity)| INTERNAL |
| `lms_active_days_to_cutoff` | Integer | $0 - 60$ days | LMS Access Log | Daily aggregate| Log Sync | Non-nullable | INTERNAL |
| `lms_days_since_last_click` | Integer | Days $\ge 0$ | LMS Access Log | Last click time | Log Sync | Non-nullable ($30/60$ if zero) | INTERNAL |
| `lms_recent_7d_clicks` | Integer | Count $\ge 0$ | LMS Access Log | Last 7 calendar d| Log Sync | Non-nullable | INTERNAL |
| `attendance_pct_to_cutoff` | Float | $0.0 - 100.0\%$ | Badge / RFID Scans| Session end | Daily Sync | Nullable (if unrecorded) | INTERNAL |
| `consecutive_absences` | Integer | Count $\ge 0$ | Badge / RFID Scans| Session end | Daily Sync | Nullable (if unrecorded) | INTERNAL |
| `highest_education_level` | String | Standard categorical| SIS Admissions | Application time| Batch Sync | Nullable / Imputed "Unknown" | SENSITIVE |
| `target_academic_risk` | Integer | $0$ or $1$ | SIS Registrar | Term end | Grade Finalization| Non-nullable ($100\%$ mature) | INTERNAL |
| `source_event_max_timestamp`| ISO UTC| `YYYY-MM-DDTHH:MM:SSZ`| Feature Builder | Computed | Computed | Non-nullable ($\le$ cutoff_date) | INTERNAL |
| `system_ingest_timestamp`| ISO UTC| `YYYY-MM-DDTHH:MM:SSZ`| Data Warehouse | Ingest time | System run | Non-nullable | INTERNAL |

---

## 4. Workstream C — Point-in-Time Correctness & Ingestion Rules

```
Four-Timestamp Verification Framework:
             
   t_event                t_source_record            t_sutra_ingest            t_cutoff
      │                         │                          │                       │
      ▼                         ▼                          ▼                       ▼
Student Clicks LMS     LMS Database Logs Event     SUTRA Warehouse Syncs    Prediction Date
(2026-10-10 14:00)      (2026-10-10 14:05)          (2026-10-11 02:00)      (2026-10-15 00:00)
      │                         │                          │                       │
      └─────────────────────────┴──────────────────────────┴───────────────────────┘
                                   All Must Be <= t_cutoff
```

### 4.1. Point-in-Time Ingestion Rules
An event is legally permitted in snapshot $T_{\text{cutoff}}$ if and only if all four conditions hold:
$$t_{\text{event}} \le T_{\text{cutoff}} \quad \land \quad t_{\text{source\_record}} \le T_{\text{cutoff}} \quad \land \quad t_{\text{sutra\_ingest}} \le T_{\text{cutoff}}$$

### 4.2. Handling Late Events, Regrades, and Revisions
1. **Late Submissions:** If an assessment is submitted after $T_{\text{cutoff}}$, it cannot appear in the submission count at $T_{\text{cutoff}}$, even if the student claims extenuating circumstances.
2. **Grade Regrades:** If an assignment submitted on Day 25 is regraded on Day 45, the Day-30 snapshot must reflect the grade **as it was recorded on Day 30** (or unrecorded if ungraded). Feeding the post-cutoff regrade into Day 30 leaks the instructor's future grading decision.
3. **Clock Skew / Future Dates:** Any record where $t_{\text{event}} > t_{\text{sutra\_ingest}}$ represents system clock corruption and must fail closed.

### 4.3. Fail-Closed Validation Guardrails
The [`LongitudinalDatasetValidator`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/data/longitudinal_validator.py) enforces:
- **Zero Silent Repairs:** Out-of-bounds percentages or negative click counts are never silently clipped to valid ranges; the row is marked invalid.
- **Corrupt Label Rejection:** If `target_academic_risk` is missing, NaN, or non-binary ($Y \notin \{0, 1\}$), the dataset is rejected.
- **Audit Logging:** Every rejection is logged with exact row indices and field names, with student IDs masked.
