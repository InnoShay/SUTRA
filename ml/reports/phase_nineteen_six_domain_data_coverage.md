# SUTRA Phase Nineteen — Six-Domain Data Coverage & Synthetic Policy Audit

**Milestone:** CODEX 3.0 PS6 Applied ML Roadmap & Longitudinal Feasibility Audit  
**Author:** Senior Applied ML Scientist and Longitudinal Student Analytics Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Audit & Formulation Complete  

---

## 1. Executive Summary

A core premise of the CODEX 3.0 PS6 challenge is a 360-degree view of student success encompassing:
1. **Attendance**
2. **Academic Performance**
3. **LMS Participation**
4. **Fee Status & Financial Support**
5. **Skills & Placement Readiness**
6. **Faculty Observations & Feedback**

This report audits the empirical feasibility of training machine learning models on these six domains. It establishes a factual coverage matrix, audits potential external dataset sources, and defines a strict institutional policy governing the role of synthetic data.

### Definitive Feasibility Finding
**No public, open-source dataset currently contains all six domains linked to accredited student academic outcomes.**
- The real OULAD dataset covers only **LMS clicks** and **coursework assessment grades**, with static demographics.
- The remaining four domains (Attendance, Fee Status, Skills, Faculty Observations) in SUTRA are currently **100% synthetic**.
- **Crucial Ethical Conclusion:** Fee status and faculty qualitative text should **NOT** be fed directly into automated predictive risk models. They must remain operational human-review workflows to prevent socioeconomic penalization and bias amplification.

---

## 2. Workstream C — Six-Domain Data Coverage Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                SIX-DOMAIN REPOSITORY COVERAGE MATRIX                                   │
│                                                                                                        │
│   Domain               Real OULAD Content       Synthetic SUTRA Content       ML Feasibility           │
│   ───────────────────  ───────────────────────  ────────────────────────────  ───────────────────────  │
│   1. Attendance        NONE (0%)                100% (Scans, trends, dates)  HIGH (If institutional)  │
│   2. Academics         REAL (Assessments, wt)   100% (GPA, overdue, quizzes)  IMMEDIATE (Primary core) │
│   3. LMS Engagement    REAL (10.6M clickstream) 100% (Logins, velocity)       IMMEDIATE (Primary core) │
│   4. Fee Status        NONE (0%)                100% (Holds, bursary flag)    EXCLUDE FROM ML (Ethical)│
│   5. Skills/Placement  NONE (0%)                100% (Resume, mock interview) DEFER (Sparse / MNAR)    │
│   6. Faculty Feedback  NONE (0%)                100% (Structured notes, sent) DEFER (Subjective text)  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Domain Breakdown

| Domain | Existing Repository Coverage | Real Historical Data Requirements | Timestamp & Target Linkage | Privacy, Access & Ethical Conditions |
|---|---|---|---|---|
| **1. Classroom & Lab Attendance** | **Synthetic Only** (`AttendanceMetrics`). Real OULAD contains zero physical presence logs. | Campus badge reader scans, Wi-Fi association logs, classroom RFID taps, lab attendance logs, or LMS live lecture session logs. | Session-level timestamp (`YYYY-MM-DD HH:MM:SS`), course ID, student ID. Forward target: 30-day attendance slope or course completion. | **High Sensitivity:** Involves physical location tracking. Must adhere to student privacy charters; aggregated to daily course percentages without storing exact room coordinates. |
| **2. Academic Performance** | **Real in OULAD** (`studentAssessment.csv`: 173K graded rows) + Synthetic GPA & overdue metrics. | Student Information System (SIS) registrar tables: cumulative GPA, weighted coursework averages, overdue flags, formative quizzes. | Submission date (`date_submitted`), grading date, assessment due date. Forward target: final grade and credit attainment. | **Standard Educational Record:** FERPA / GDPR protected. Standard access for academic advisors and instructors. High predictive validity. |
| **3. LMS & Digital Engagement** | **Real in OULAD** (`studentVle.csv`: 10.6M interaction logs) + Synthetic velocity metrics. | LMS event log tables (Moodle `mdl_logstore_standard_log`, Canvas `requests` / Data Access Platform, Blackboard Learn logs). | Precise event timestamp (`date` relative to course start or ISO UTC), resource category (`forum`, `content`, `quiz`). | **Standard Educational Log:** High volume clickstream. Requires aggregation to avoid memory bloat; IP addresses and raw user-agent strings must be scrubbed. |
| **4. Fee Status & Financial Support** | **Synthetic Only** (`FeeStatusMetrics`). OULAD contains zero financial or bursary records. | Institutional Bursar and Financial Aid database tables: billing deadline, payment date, balance hold flag, emergency bursary status. | Administrative milestone dates. Forward target: None (financial status must not dictate academic risk score). | **CRITICAL PRIVACY BOUNDARY (GLBA / FERPA):** Financial records are strictly confidential. **MANDATORY POLICY: Exclude fee status from predictive ML feature sets.** Using unpaid fees as an ML predictor penalizes low-income students with inflated "dropout" probabilities. Keep exclusively in confidential advisor workflows. |
| **5. Skills & Placement Readiness** | **Synthetic Only** (`SkillsAndPlacementMetrics`). OULAD contains zero placement records. | Career Services platform databases (Handshake, Symplicity, departmental coding benchmark scores, mock interview rubric forms). | Milestone certification date, assessment date. Forward target: employment or graduation. | **Voluntary / Extracurricular:** High Missing-Not-At-Random (MNAR) bias. Often sought disproportionately by high-performing upperclassmen; low coverage for struggling freshmen. |
| **6. Faculty Observations & Feedback** | **Synthetic Only** (`FacultyObservationEntry`). OULAD contains zero qualitative notes. | Institutional Early Alert CRM notes (Starfish, Navigate, Salesforce Education Cloud, advising logs). | Note creation timestamp, instructor ID, course code, structured category. Forward target: subsequent student progress. | **High Subjectivity & Bias Risk:** Unstructured text reflects instructor sentiment and implicit bias. Using raw text in ML risks severe demographic disparities. Must be restricted to structured operational flags with mandatory human review. |

---

## 3. Audit of Potential External Datasets

Following Phase Eleven's audit of KDD Cup 2015, we audited other candidate datasets for multi-domain longitudinal evaluation:

### 3.1. KDD Cup 2015 (XuetangX MOOC) — *Audited in Phase Eleven*
- **Origin:** Tsinghua University / XuetangX MOOC Platform.
- **Coverage:** LMS clicks only (`video`, `problem`, `forum`). **Zero demographics, zero formal assessments, zero attendance, zero fees.**
- **Target:** Inactivity in final 10 days of a free online course ($79.3\%$ dropout).
- **Verdict:** **REJECTED**. Category error: open MOOC abandonment is not university degree failure.

### 3.2. Canvas Network Open Dataset (HarvardX / MITx / Canvas Network)
- **Origin:** Publicly released de-identified Canvas LMS course dumps.
- **Coverage:** LMS clickstream events, forum posts, discussion counts across multiple online courses.
- **Limitations:** Completely de-identified; students cannot be tracked across courses. Zero attendance, zero fee records, zero faculty text. Outcome is platform badge earning rather than accredited university degree credit.
- **Verdict:** **INCOMPATIBLE FOR MULTISOURCE BENCHMARKING**.

### 3.3. Institutional Student Information Systems (SIS) & LMS Institutional Data
- **Origin:** Partner university administrative databases (e.g. Moodle + Banner / PeopleSoft).
- **Coverage:** Capable of providing all six domains through linked relational tables.
- **Prerequisites:** Requires formal Data Use Agreement (DUA), Institutional Review Board (IRB) human-subjects research approval, and de-identification hashing protocols.
- **Verdict:** **THE ONLY DEFENSIBLE PATH TO MULTISOURCE PREDICTIVE ML**. Real student success prediction across six domains cannot be achieved through public toy benchmarks; it requires accredited institutional data governance.

---

## 4. Workstream D — Synthetic-Data Governance Policy

To preserve scientific integrity and prevent false claims, SUTRA establishes an explicit, binding **Synthetic-Data Policy**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SUTRA SYNTHETIC-DATA GOVERNANCE POLICY                               │
│                                                                                                        │
│   PERMISSIBLE USES (Software & Integration Verification)                                               │
│   ✓ Schema and Pydantic v2 serialization contract validation.                                          │
│   ✓ API endpoint routing, payload validation, and HTTP error handling.                                 │
│   ✓ State machine transition testing (RECOMMENDED -> APPROVED -> ASSIGNED -> CLOSED).                  │
│   ✓ Testing edge cases (e.g., conflicting indicators: high GPA with 0% attendance).                    │
│   ✓ Interactive demonstration of the Advisor Review UI and Support Evidence Ledger.                    │
│                                                                                                        │
│   STRICTLY IMPERMISSIBLE USES (Scientific & Clinical Safeguards)                                       │
│   ✗ NEVER use synthetic data as training data for machine learning models.                            │
│   ✗ NEVER report synthetic test metrics (e.g., accuracy, ROC-AUC) as evidence of predictive power.    │
│   ✗ NEVER retrain the production OULAD baseline to make it appear to understand fees or attendance.     │
│   ✗ NEVER use synthetic risk scores to trigger real-world alerts, emails, or student outreach.         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Policy on Synthetic Demonstration Models
If an experimental heuristic or composite scoring algorithm (such as `PrototypeCompositeRiskScore` in `integration_boundary.py`) is demonstrated:
1. **Mandatory Labeling:** The model or score must be explicitly tagged:
   ```json
   {
     "score_type": "HEURISTIC_TRIAGE_INDEX_DEMO_ONLY",
     "is_trained_ml_model": false,
     "disclaimer": "Operational weighted heuristic for UI demonstration only. NOT a trained or validated statistical probability."
   }
   ```
2. **Quarantine from Production:** The score must never be presented as an updated or retrained replacement for the production Day-30 ML baseline.
3. **No Promotion Pathway:** Synthetic demonstration models are ineligible for model promotion reviews. Promotion reviews require real historical student datasets with documented provenance.
