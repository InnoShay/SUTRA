# SUTRA Phase Twenty-One — Institutional Data Acquisition Specification Packet

**Milestone:** CODEX 3.0 PS6 Dataset Acquisition & Evaluation Readiness  
**Document Type:** Partner-Facing Technical Data Specification  
**Audience:** University Registrar IT, Institutional Research (IR), and LMS Administrators  
**Date:** October 2026  
**Status:** Pre-Negotiation Technical Packet  

---

> [!IMPORTANT]
> **DISCLAIMER:** This document represents an engineering and research data specification. It does NOT constitute legal advice, a binding legal contract, an executed Data Use Agreement (DUA), or an authorized Institutional Review Board (IRB) ethics exemption. Formal data transfer may occur only after appropriate institutional legal agreements and ethics protocols are executed.

---

## 1. Research Objective & Predictive Scope

SUTRA is an early-warning student success decision-support engine developed for higher-education advising centers.

### Primary Purpose:
To provide academic advisors with explainable early-warning indicators of student academic distress at progressive semester milestones (**Day 30** and **Day 60**), enabling timely, non-punitive supportive interventions (tutoring, advising meetings, schedule counseling) before course failure or dropout occurs.

### Prediction Target:
Eventual course outcome in credit-bearing higher education courses:
$$Y = \begin{cases} 1 & \text{Course Status: Fail or Official Withdrawal (Academic Risk)} \\ 0 & \text{Course Status: Pass or Distinction (Credit Earned)} \end{cases}$$

---

## 2. Technical Data Requirements

The partner institution is requested to provide de-identified historical data spanning **4 to 6 contiguous completed academic semesters** (e.g., Fall 2023 through Spring 2026).

```
INSTITUTIONAL FEEDER LINKAGES:
┌────────────────────────────┐    ┌────────────────────────────┐    ┌────────────────────────────┐
│   Student Information (SIS)│    │      LMS Access Logs       │    │     Attendance Records     │
│   - Registration Dates     │    │   - Daily Click Volumes    │    │   - Lecture / Lab Scans    │
│   - Prior Term GPAs        │    │   - Active Days to Cutoff  │    │   - Absence Streaks        │
│   - Milestone Scores       │    │   - Forum Posts to Cutoff  │    │   - Session Scan Pct       │
│   - Final Official Grades  │    │   - Last Access Timestamp  │    │   (Optional / Conditional) │
└─────────────┬──────────────┘    └─────────────┬──────────────┘    └─────────────┬──────────────┘
              │                                 │                                 │
              └────────────────────────┬────────┴─────────────────────────────────┘
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │ Client-Side Pseudonymization (Hash Salt) │
                  │ student_id -> SHA256(student_id + SALT)  │
                  └────────────────────┬─────────────────────┘
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │       SUTRA Longitudinal Extract         │
                  └──────────────────────────────────────────┘
```

### 2.1. Required Tables and Fields
1. **Student Registration & Context Table (`sis_registrations.csv`):**
   - `student_id_hash`: Salted SHA-256 hash of student ID ($\ge 8$ chars).
   - `course_id`: Catalog department and number (e.g. `BIO101`, `ENG102`).
   - `term_id`: Semester presentation code (e.g. `2024-FALL`).
   - `registration_date`: Date student enrolled in course.
   - `course_start_date`: Official semester launch date (`Day 0`).
   - `credits_attempted`: Total credit hours attempted in term.
   - `prior_cumulative_gpa`: Cumulative GPA up to the preceding term ($0.00 - 4.00$, null for new freshmen).
   - `final_academic_outcome`: Official registrar grade (`Pass`, `Fail`, `Withdrawn`).
2. **Formative Assessment Table (`sis_assessments.csv`):**
   - `student_id_hash`, `course_id`, `term_id`.
   - `assessment_id`: Milestone identifier (e.g. `Quiz 1`, `Midterm Exam`).
   - `due_date`: Official deadline date.
   - `submission_date`: Date student submitted work.
   - `score_pct`: Formative score percentage ($0.0 - 100.0\%$).
   - `weight_pct`: Contribution to final grade.
3. **LMS Daily Interaction Table (`lms_daily_activity.csv`):**
   - `student_id_hash`, `course_id`, `term_id`, `activity_date`.
   - `click_count`: Total clicks on LMS course page on `activity_date`.
   - `forum_posts_count`: Discussion posts authored on `activity_date`.
   - `resource_views_count`: Digital readings / lecture materials opened.
4. **Attendance Register Table (Optional / Conditional) (`campus_attendance.csv`):**
   - `student_id_hash`, `course_id`, `term_id`, `session_date`.
   - `was_present`: Boolean ($1 = \text{Present}, 0 = \text{Absent}$).

---

## 3. Strict Point-in-Time Correctness & Leakage Safeguards

To prevent target leakage and an invalid predictive evaluation:
1. **Bi-Temporal Timestamps:** Every event must include:
   - `event_timestamp`: When the student performed the activity.
   - `system_ingest_timestamp`: When the institution's database recorded the row.
2. **Censoring Invariant:**
   For an observation evaluated at landmark Day 30, **zero events recorded after Day 30 may be included in the feature payload**.
3. **Regrade Censoring:** If an assignment submitted on Day 25 is regraded on Day 45, the Day-30 feature snapshot must reflect the grade as it stood on Day 30.

---

## 4. Privacy, Security & Data Minimization Protocol

### 4.1. Irreversible Client-Side Pseudonymization
- **Campus Perimeter Rule:** No direct personal identifiers (student name, social security number, student ID number, birth date, physical address, email address) may ever leave the university perimeter.
- **Salting Requirement:** The partner institution must hash student IDs using SHA-256 with an institutional private salt:
  $$\text{student\_id\_hash} = \text{SHA-256}(\text{institutional\_id} \mathbin{\Vert} \text{private\_campus\_salt})$$
  The private salt remains strictly on campus servers and is never shared with the SUTRA research team.

### 4.2. Absolute Exclusion of Student Financial Data
- **Policy Invariant:** Student billing amounts, overdue balances, fee payment histories, banking details, and financial holds must **NEVER be delivered to the ML research team or included in predictive feature vectors**.
- **Ethical Rationale:** Feeding billing status into automated predictive models creates socioeconomic bias, penalizing students facing financial hardship with inflated risk scores.

### 4.3. Data Retention and Deletion
- Data will be stored on encrypted, access-controlled research storage adhering to NIST 800-171 / ISO 27001 standards.
- Data access is restricted to authorized ML investigators listed on the Data Use Agreement.
- All extracted data will be securely shredded at the conclusion of the research study or upon written request by the university.

---

## 5. Required Governance & Approval Checklist

Before data extraction begins, the following three administrative milestones must be completed:

1. [ ] **Data Use Agreement (DUA):** Bilaterally executed agreement establishing permitted educational research scope, confidentiality boundaries, publication rights, and liability limits.
2. [ ] **Institutional Review Board (IRB) Certification:** Human subjects research exemption (under 45 CFR 46.104(d)(4) for secondary research of de-identified educational records) or institutional research ethics committee approval.
3. [ ] **Information Security Review:** Campus CISO review certifying client-side hashing, secure SFTP/S3 transfer, and data minimization compliance.
