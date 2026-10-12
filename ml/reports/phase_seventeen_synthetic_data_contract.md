# SUTRA Phase Seventeen — Multisource Synthetic Data Contract

**Status:** Formally Defined & Validated  
**Module:** `ml/src/sutra_ml/schemas/multisource.py`  
**Target Architecture:** CODEX 3.0 PS6 Student Success & Intervention Orchestration Engine  
**Provenance:** Synthetic Demonstration Schema (No Real Student PII)

---

## 1. Architectural Purpose & Scope

Phase Seventeen provides the unified data foundation for a **consent-aware 360-degree student success view**. Rather than limiting early warnings to an isolated LMS dropout model or attendance scanner, the system models six critical dimensions of student retention and flourishing:
1. **Classroom & Laboratory Attendance** (Overall rates, 14-day velocity, consecutive absences).
2. **Academic Progress & Milestones** (Coursework averages, failed tasks, overdue assignments, midterm grades).
3. **Digital Participation & LMS Velocity** (Active learning days, dormancy, forum activity, study velocity).
4. **Institutional Fee Status** (Administrative payment status, financial holds, emergency bursary eligibility).
5. **Career & Placement Readiness** (Technical benchmarks, soft skills, mock interview readiness, placement tiers).
6. **Structured Faculty Feedback** (Timestamped instructor observations, sentiment tags, behavioral categories).

---

## 2. Universal Schema Design & Constraints

The data contract is implemented via **Pydantic v2** (`StudentSuccess360Profile`), enforcing strict typing, boundary validation, and immutable extra-field rejection (`extra="forbid"`).

### 2.1 Core Metadata & Synthetic Provenance
| Attribute | Type | Allowed Values / Format | Description |
| :--- | :--- | :--- | :--- |
| `student_key` | `str` | Must match regex `^SYNTH-` | De-identified non-PII synthetic student key (e.g. `SYNTH-360-001`). |
| `academic_term` | `str` | e.g. `"2026-FALL"` | Operational semester cohort. |
| `department` | `str` | e.g. `"Computer Science"`, `"Electrical Engineering"` | Academic department. |
| `program_year` | `int` | $1 \le y \le 5$ | Year of undergraduate study. |
| `snapshot_timestamp` | `str` | ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) | Point-in-time observation cutoff timestamp. |
| `is_synthetic` | `bool` | Strictly `True` | Mandatory synthetic identity flag. |
| `synthetic_seed` | `Optional[int]` | Configurable integer | RNG seed used to generate profile. |
| `scenario_name` | `Optional[str]` | String | Name of demonstration archetype. |

---

## 3. Detailed Observation Domain Schemas

### 3.1 Attendance Metrics (`AttendanceMetrics`)
- **`overall_attendance_pct`** (`float`, $[0.0, 100.0]$): Cumulative semester attendance rate across all enrolled lectures and labs.
- **`recent_attendance_pct`** (`float`, $[0.0, 100.0]$): Attendance rate across the most recent 14 calendar days.
- **`consecutive_absences`** (`int`, $\ge 0$): Count of unbroken missed instructional sessions.
- **`lecture_attendance_pct`** (`float`, $[0.0, 100.0]$): Attendance rate specifically in lecture halls.
- **`lab_attendance_pct`** (`float`, $[0.0, 100.0]$): Attendance rate in laboratory and practical sessions.
- **`attendance_trend`** (`AttendanceTrend` enum): Categorical trend: `STABLE`, `IMPROVING`, `DECLINING`, or `CRITICAL_DROP`.
- **`last_attendance_date`** (`Optional[str]`): ISO date of most recent logged presence.
- **`source_freshness_days`** (`int`, $\ge 0$): Latency in days since attendance roster synchronization.

### 3.2 Academic Performance Metrics (`AcademicPerformanceMetrics`)
- **`cumulative_gpa`** (`float`, $[0.0, 4.0]$): Historical cumulative GPA.
- **`current_term_average_pct`** (`float`, $[0.0, 100.0]$): Weighted average of graded coursework to date in the current term.
- **`assessments_completed`** (`int`, $\ge 0$): Count of submitted and graded academic tasks.
- **`assessments_due`** (`int`, $\ge 0$): Total number of scheduled assessments to date.
- **`assessments_overdue`** (`int`, $\ge 0$): Count of scheduled assignments that missed deadline without extension.
- **`failed_assessments_count`** (`int`, $\ge 0$): Count of submitted tasks scoring $< 40.0\%$.
- **`recent_quiz_average_pct`** (`Optional[float]`, $[0.0, 100.0]$): Formative assessment average.
- **`midterm_grade`** (`Optional[str]`): Letter grade or `"PENDING"`.
- **`academic_standing`** (`AcademicStanding` enum): `GOOD_STANDING`, `ACADEMIC_WARNING`, `PROBATION`, or `HONORS`.

### 3.3 LMS Participation Metrics (`LmsParticipationMetrics`)
- **`total_platform_logins_d30`** (`int`, $\ge 0$): Total digital sessions initiated up to Day 30 cutoff.
- **`active_learning_days_d30`** (`int`, $0 \le d \le 30$): Distinct calendar days with recorded clicks/downloads.
- **`days_since_last_lms_login`** (`int`, $\ge 0$): Platform access dormancy.
- **`discussion_forum_posts`** (`int`, $\ge 0$): Peer forum interactions.
- **`content_resource_views`** (`int`, $\ge 0$): Digital textbook and module reading downloads.
- **`weekly_study_velocity_hours`** (`float`, $\ge 0.0$): Average self-directed study hours per week.
- **`assignment_submission_rate_pct`** (`float`, $[0.0, 100.0]$): Completed assessments divided by due assessments.

### 3.4 Fee Status Metrics (`FeeStatusMetrics` — Sensitive Privacy Boundary)
> **LEAST-PRIVILEGE SAFEGUARD:**
> Financial details are restricted exclusively to authorized financial aid staff (`access_restriction_level = "RESTRICTED_FINANCIAL_AID_ONLY"`).
> No personal bank balances, debt figures, or payment card numbers are modeled.
> Information is strictly framed for supportive bursary aid, not punitive de-registration.

- **`status`** (`FeePaymentStatus` enum): `PAID`, `GRACE_PERIOD`, `OVERDUE`, `SCHOLARSHIP_PENDING`, `PAYMENT_PLAN_ACTIVE`, or `WAIVER_APPROVED`.
- **`days_past_due`** (`int`, $\ge 0$): Days elapsed past payment deadline.
- **`has_financial_hold`** (`bool`): System flag indicating administrative registration hold.
- **`financial_aid_status`** (`FinancialAidStatus` enum): `NONE`, `SUBMITTED`, `UNDER_REVIEW`, `DISBURSED`, or `DENIED`.
- **`bursary_eligibility_flag`** (`bool`): Pre-screened eligibility for emergency university relief funds.

### 3.5 Skills and Placement Readiness Metrics (`SkillsAndPlacementMetrics`)
- **`technical_skills_score`** (`float`, $[0.0, 100.0]$): Standardized technical/coding benchmark score.
- **`soft_skills_rating`** (`float`, $[1.0, 5.0]$): Communication and professional rubric score.
- **`resume_reviewed`** (`bool`): Certification status from university career development center.
- **`mock_interview_completed`** (`bool`): Practice behavioral/technical interview completion.
- **`mock_interview_score`** (`Optional[float]`, $[0.0, 100.0]$): Score received on mock interview.
- **`internship_status`** (`InternshipStatus` enum): `NOT_APPLIED`, `APPLYING`, `OFFERED`, `COMPLETED`, or `EXEMPT`.
- **`placement_readiness_tier`** (`PlacementTier` enum): `READY`, `DEVELOPING`, `NEEDS_SUPPORT`, or `NOT_STARTED`.
- **`certifications_earned`** (`int`, $\ge 0$): Industry credentials logged.

### 3.6 Faculty Observations (`FacultyObservationEntry`)
- **`observation_id`** (`str`): Unique event key (e.g. `OBS-001-A`).
- **`timestamp`** (`str`): ISO 8601 logging timestamp.
- **`faculty_role`** (`str`): `COURSE_INSTRUCTOR`, `LAB_INSTRUCTOR`, `TUTOR`, or `ACADEMIC_ADVISOR`.
- **`course_code`** (`str`): e.g. `CS201`.
- **`sentiment`** (`FacultySentiment` enum): `POSITIVE`, `NEUTRAL`, `CONCERN`, or `URGENT_CONCERN`.
- **`evidence_category`** (`FacultyEvidenceCategory` enum): `ATTENDANCE`, `CONCEPTUAL_DIFFICULTY`, `ENGAGEMENT`, `DEADLINE_STRUGGLE`, `OUTSTANDING_EFFORT`, or `WELLBEING`.
- **`summary_notes`** (`str`): Objective, behavioral description of observed difficulty or excellence.
- **`action_recommended_by_faculty`** (`Optional[str]`): Suggested next steps from teaching staff.

---

## 4. Temporal Semantics & Cutoff Enforcement

1. **Cutoff Invariance:** All observations in a record reflect state observable at or before `snapshot_timestamp`. Future semester grades, final degree outcomes, and post-cutoff interactions are strictly barred.
2. **Data Freshness Audit:** Each feeder domain logs `source_freshness_days`. If any source exceeds 14 days without an update, `DataQualityStatus.is_stale` is automatically asserted.
