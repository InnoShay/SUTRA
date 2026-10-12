# SUTRA CLI — Phase 11 Report: Student Observations and Feature Readiness

**Phase**: Phase 11: Student Observations and Feature Readiness  
**Date**: October 12, 2026  
**Status**: Completed & Verified  
**Governance Framework**: SUTRA ADR-005 (Strict Three-Source Data Provenance Isolation) & ADR-003 (Sensitive Domain Segregation)  

---

## 1. Executive Summary

Phase 11 implements the capability for authorized educators and advisors to inspect chronological student observations and audit whether the current machine learning early-warning model has enough valid, fresh, and canonical data to run.

A foundational architectural distinction is established between **institutional campus observations** (stored in PostgreSQL `student_observations`) and the **25 Day-30 OULAD features** expected by the production ML model (`Logistic Regression Baseline v1.0.0`). The system strictly avoids guessing, approximating, or fabricating clickstream metrics from generic attendance numbers. If a student's record contains only attendance or grade logs, the feature readiness audit transparently reports that the model is **inapplicable due to source mismatch**, rather than fabricating missing inputs or falsely flagging the student as "at risk".

---

## 2. Audit of Existing Observation Sources

An exhaustive inspection of database models (`app/models/observation.py`), schemas (`app/schemas/ingestion.py`, `app/schemas/student.py`), services (`app/services/ingestion.py`, `app/services/policy_engine.py`), and ML feature code (`ml/src/sutra_ml/features/build_features.py`) revealed the following reality across educational data sources:

| Observation Domain / Source | Model & Storage | Implementation Status | Mapping to OULAD Day-30 Features |
| :--- | :--- | :--- | :--- |
| **Attendance** | `StudentObservation` (`domain == 'attendance'`) | **Genuinely Implemented**: Biometric turnstiles, SIS attendance imports (`attendance_rate`, `unexcused_absences_count`). | **Cannot Be Derived / Incompatible**: OULAD is an online distance learning university with zero physical attendance records. |
| **Assignment Deadlines & Submissions** | `StudentObservation` (`domain == 'academic'`) | **Implemented as Observations**: Event logs (`missing_assignments_count`, `late_submissions_count`). No dedicated relational assignments table. | **Partially Mapped**: OULAD specifically measures Tutor-Marked Assessment submission timing (`assessments_submitted_d30`). |
| **Assessment Observations** | `StudentObservation` (`domain == 'academic'`) | **Implemented as Observations**: `assessment_score`, `quiz_score`, `gpa`. | **Deliberately Excluded (Anti-Leakage)**: Early assessment scores are strictly forbidden from entering Day-30 inference to prevent grading latency leakage. |
| **Teacher Feedback** | `StudentObservation` (`domain == 'faculty_feedback'`) | **Implemented as Observations**: `early_warning_referral`, `faculty_concern_flag`. | **Cannot Be Derived**: OULAD contains no teacher feedback logs. |
| **Student Feedback** | *None* | **NOT IMPLEMENTED / UNAVAILABLE**: No database model, schema, or ingestion endpoint exists in SUTRA. | **Unavailable**. |
| **Learning Activity** | `StudentObservation` (`domain == 'participation'`) | **Implemented as High-Level Telemetry**: `lms_login_frequency`, `discussion_posts_count`. | **Cannot Be Derived / Incompatible**: OULAD requires fine-grained click logs across 7 VLE sub-types (`oucontent`, `forumng`, `quiz`, `homepage`, `other`, `precourse`, `last_7d`). High-level LMS logins cannot be converted into raw click counts without fabrication. |
| **Financial Aid & Fees** | `FinanceObservation` (`fee_support_status`) | **Strictly Segregated (ADR-003)**: Stored in a separate table, gated to finance/admin roles, and forbidden from educational triage. | **Forbidden**: Explicitly prohibited from entering ML feature pipelines. |

---

## 3. Feature-Readiness Contract & Rules

The feature readiness contract evaluates whether the 25 canonical Day-30 features required by `Logistic Regression Baseline v1.0.0` can be legitimately derived from the student's records:

### 3.1 Feature Classification & Status Rules
1. **Available (`available`)**:
   - The exact canonical feature is present in the student's observation ledger with `quality_state == 'valid'` and within the Day-30 temporal window.
2. **Stale (`stale`)**:
   - The feature exists in the ledger, but its observation is tagged with `quality_state == 'stale'` or `quality_state == 'missing'`.
3. **Underivable From Source (`underivable_from_source`)**:
   - All 12 VLE engagement features (`vle_total_clicks_d30`, `vle_active_days_d30`, `vle_clicks_precourse`, etc.) when evaluated against campus institutional telemetry.
   - Institutional attendance, turnstile scans, and LMS login counters are **never** converted into OULAD clickstream counts.
4. **Missing (`missing`)**:
   - Demographic features (`gender`, `region`, `highest_education`, `imd_band`, `age_band`, `disability`) or assessment submission timing features not recorded in the pseudonymous profile.

### 3.2 Model Applicability Statuses
- **`READY`**: All 25 canonical Day-30 features are present, valid, and within temporal boundaries. The ML model is permitted to execute.
- **`STALE_DATA`**: All 25 features exist, but one or more observations exceed data freshness thresholds. Inference is blocked pending data refresh.
- **`MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM`**: The student possesses institutional attendance and LMS records, but lacks OULAD clickstream features. The system clearly explains that the model requires OULAD modular clickstreams that cannot be derived from institutional event logs.
- **`INSUFFICIENT_DATA`**: Less than 25 features exist and no derivation mismatch is flagged.

### 3.3 Core Safety & Governance Rule
> **NON-PREDICTION GUARANTEE**: A feature readiness check is strictly an audit of input data completeness. It does **NOT** generate a prediction, compute a risk score, or evaluate student academic capability. A student with incomplete or missing telemetry must **NEVER** be categorized or presented as "at risk" simply because their data is missing.

---

## 4. Implementation Changes

### 4.1 Backend Schemas (`app/schemas/student.py` & `app/schemas/__init__.py`)
- `FeatureReadinessItem`: Detailed feature audit item (`feature_name`, `category`, `status`, `observed_value`, `source_domain`, `derivation_note`).
- `ObservationTelemetryAudit`: Telemetry ledger summary (`total_observations`, `domains_present`, `quality_state_counts`, `last_event_at`, `is_stale`, `unsupported_sources`).
- `StudentReadinessResponse`: Comprehensive readiness audit contract with model metadata, applicability status, counts, feature breakdowns, and legal disclaimers.

### 4.2 Backend API Routes (`app/api/v1/students.py`)
- **Enhanced `GET /api/v1/students/{student_id}/observations`**:
  - Added query parameters: `domain` (filter by `attendance`, `academic`, etc.), `quality_state` (filter by `valid`, `stale`, etc.), and `limit` (pagination).
  - Enforced campus tenancy scoping and leadership role restrictions.
- **Added `GET /api/v1/students/{student_id}/readiness`**:
  - Dynamically evaluates the student's observations against the 25 Day-30 canonical features.
  - Generates the `StudentReadinessResponse` without fabricating data.

### 4.3 Rust CLI Client & Models (`cli/src/models.rs`, `cli/src/client.rs`)
- Added DTOs: `ObservationDto`, `FeatureReadinessItemDto`, `ObservationTelemetryAuditDto`, `StudentReadinessDto`.
- Added client methods:
  - `client.get_student_observations(id_or_ref, domain, quality_state, limit)`
  - `client.get_student_readiness(id_or_ref)`

### 4.4 Rust CLI Subcommands (`cli/src/commands/students.rs`, `cli/src/main.rs`)
- **`sutra students observations <ID_OR_REF> [--domain <DOMAIN>] [--quality <QUALITY>] [--limit <N>]`**:
  - Displays chronological multi-domain observations with colored badges for domains (`[attendance]`, `[academic]`, `[participation]`, `[faculty]`) and quality states (`[valid]`, `[stale]`).
- **`sutra students readiness <ID_OR_REF>`**:
  - Displays the full feature readiness audit banner, applicability status badge, feature counts, telemetry ledger summary, 25-feature detailed breakdown table, and prominent governance notice.

---

## 5. Security & Privacy Safeguards

1. **Anti-Enumeration Protection**:
   - `sutra students observations` and `sutra students readiness` use `_resolve_student_in_campus(id_or_ref, campus_id, db)`.
   - Any query for a student outside the caller's active campus tenancy returns `HTTP 404 Not Found`. Callers cannot determine whether a student ID exists at another campus.
2. **Role Authorization Checks**:
   - Disallowed roles (such as pure `leadership` role without individual triage duties) receive `HTTP 403 Forbidden`.
   - Unauthenticated callers receive `HTTP 401 Unauthorized`.
3. **Financial Data Segregation (ADR-003)**:
   - Financial fee support records (`FinanceObservation`) are strictly excluded from observations and readiness endpoints.

---

## 6. Verification & Test Results

### 6.1 Backend Pytest Suite (`tests/test_students_readiness.py`)
5 dedicated integration tests:
1. `test_list_observations_filtering`: Verifies domain filtering (`attendance`) and quality filtering (`stale`).
2. `test_readiness_on_institutional_only_attendance_student`: Verifies that an institutional student with attendance records receives `MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM`, with 12 VLE features marked `underivable_from_source` and zero silent fabrication.
3. `test_readiness_on_fully_populated_canonical_features`: Verifies that a student with all 25 features returns `READY` with `is_ready_for_inference: true`.
4. `test_readiness_on_stale_features`: Verifies that stale observations block readiness with `STALE_DATA`.
5. `test_readiness_tenancy_isolation_and_security`: Verifies cross-campus 404 isolation, leadership role 403, and unauthenticated 401.

**Backend Suite Result**: **115/115 passed** (`pytest`).

### 6.2 Rust CLI Unit Suite (`cli/tests/student_readiness_tests.rs`)
3 dedicated CLI integration tests:
1. `test_observation_dto_deserialization`: Verifies observation JSON parsing across types.
2. `test_student_readiness_inapplicable_model_contract`: Verifies deserialization of inapplicable status and governance disclaimer assertions.
3. `test_ready_and_stale_status_invariants`: Verifies ready status assertions.

**CLI Suite Result**: **46/46 passed** across all 7 test suites (`cargo test`).

### 6.3 Live Terminal Verification Samples

#### `sutra students observations SYN-1007`
```text
=== SUTRA Student Observations Ledger ===
  Student:        SYN-1007

TIMESTAMP              DOMAIN           METRIC KEY                   VALUE              QUALITY      SOURCE SYSTEM
--------------------------------------------------------------------------------------------------------------
2026-10-12T11:26:57    [attendance]     attendance_rate              0.76               [valid]      biometric_turnstile
2026-10-12T11:26:57    [academic]       missing_assignments_count    3                  [valid]      canvas_lms
2026-10-12T11:26:57    [faculty]        early_warning_referral       Advising refe...   [valid]      educator_portal
--------------------------------------------------------------------------------------------------------------
Total Observations Displayed: 3
Note: Financial aid observations are strictly segregated per ADR-003 and excluded from this view.
```

#### `sutra students readiness SYN-1007`
```text
================================================================================
       SUTRA ML FEATURE READINESS AUDIT (DAY-30 EARLY-WARNING)                  
================================================================================
  Student ID:      11111111-1111-1111-1111-111111111111
  External Ref:    SYN-1007
  Display Name:    Alex Morgan
  Cohort Code:     CS-Y2
  Target Model:    Logistic Regression Baseline v1.0.0 (Cutoff: Day 30)

  READINESS STATUS: [MODEL INAPPLICABLE: SOURCE MISMATCH]
  IS READY:         FALSE
  RATIONALE:        The active ML model (Logistic Regression Baseline v1.0.0) requires 25 canonical OULAD Day-30 features, including 12 fine-grained VLE clickstream interactions that cannot be derived from institutional attendance or LMS event logs. Running inference on this record would require fabricating missing inputs, which is strictly prohibited.

--- Feature Breakdown (25 Canonical Day-30 Features) ---
  Total Required:           25
  Available & Valid:        0
  Missing / Unrecorded:     13
  Underivable From Source:  12
  Stale Observations:       0

--- Telemetry Ledger Audit ---
  Total Observations Found: 3
  Domains Observed:         academic, attendance, faculty_feedback
  Unsupported Sources:      student_feedback (not implemented in SUTRA data architecture) | raw_vle_clickstream (campus LMS does not capture per-URL interaction logs) | grading_latency_scores (assessment score values excluded to prevent label leakage)

FEATURE NAME                     CATEGORY           STATUS             VALUE          DERIVATION NOTE
--------------------------------------------------------------------------------------------------------------
num_of_prev_attempts             demographic        [missing]          -              Demographic attribute not recorded in pseudonymous student profile
vle_total_clicks_d30             vle_engagement     [underivable]      -              Institutional telemetry tracks high-level LMS activity, not OULAD fine-grained clickstream
vle_active_days_d30              vle_engagement     [underivable]      -              Institutional telemetry tracks high-level LMS activity, not OULAD fine-grained clickstream
... (all 25 features detailed)
================================================================================
GOVERNANCE NOTICE: Feature readiness checks audit input data completeness. It does NOT generate an early-warning score, compute risk, or predict student performance. Missing or underivable data must NEVER be treated as an indicator that the student is at risk.
================================================================================
```

#### Anti-Enumeration Isolation (`sutra students readiness NON_EXISTENT_REF`)
```text
$ sutra students readiness NON_EXISTENT_REF
Error: HTTP 404 Not Found: Student 'NON_EXISTENT_REF' not found in active campus.
```

---

## 7. Limitations & Governance Safeguards

1. **Read-Only Audit**: Feature readiness auditing is strictly read-only and generates no signals, cases, or mutations.
2. **No Model Scoring**: This phase does not execute ML inference or assign risk labels to students.
3. **No Metric Fabrication**: Generic attendance and GPA cannot substitute for OULAD clickstream counts.
4. **Phase 12 Boundary**: Phase 12 (student-specific scoring) has not been started.

---

## 8. Conclusion

Phase 11 is complete. Authorized users can now inspect all general observations for students in their campus tenancy and verify whether the ML model can legitimately evaluate them, with strict protections against metric fabrication and cross-campus enumeration.
