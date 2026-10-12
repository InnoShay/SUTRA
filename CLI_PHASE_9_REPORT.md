# SUTRA CLI — Phase 9: Student Registry and Authorized Lookup Report

**Date:** 2026-10-12  
**Repository:** `InnoShay/SUTRA`  
**Branch:** `cli` / `main`  
**Phase Status:** **COMPLETE & VERIFIED**  
**Preceding Phases:** Phases 0–8 (Audit, Session Auth, ML Inference, Route Security, Commands, Packaging, Release)  
**Succeeding Phase:** Phase 10 (Student-Specific ML Scoring Pipeline — Deferred per Scope)

---

## 1. Executive Summary

Phase 9 establishes real, authorized student registry inspection and profile lookup through both the SUTRA FastAPI backend and the standalone Rust CLI (`sutra-cli`). 

Prior to Phase 9, student ML inference was strictly file-based (`sutra predict --file <PATH>`) and the CLI had no commands for looking up students. The backend student endpoints (`/api/v1/students`) only accepted internal UUIDs and lacked deterministic pagination.

In Phase 9:
1. **Dual Identifier Resolution:** The backend now transparently accepts both internal UUIDs (`99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa`) and external university student references (`SYN-1007`, `STU-A-001`).
2. **Deterministic Pagination & Filtering:** `GET /api/v1/students` supports optional `cohort` filtering, `limit`, and `offset` pagination, ordered deterministically by `external_ref`.
3. **Rust CLI Commands:** Implemented `sutra students list [--cohort <CODE>] [--limit <N>] [--offset <N>]` and `sutra students get <ID_OR_REF>`.
4. **Strict Campus Isolation:** Cross-campus queries return `HTTP 404 Not Found` (indistinguishable from non-existent students), preventing cross-tenant existence oracle attacks.
5. **Role & Privacy Guards:** Gated by caller's role (pure `leadership` receives `HTTP 403 LEADERSHIP_QUEUE_ACCESS_DENIED`), omitting sensitive fields (passwords, tokens, financial aid).

---

## 2. Changed & Created Files Inventory

### Backend (Python / FastAPI / SQLAlchemy)
- [`app/schemas/student.py`](file:///Users/neemaysmac/Desktop/Sutra/app/schemas/student.py): Added optional `created_at` and `updated_at` timestamps to `StudentSummary`.
- [`app/api/v1/students.py`](file:///Users/neemaysmac/Desktop/Sutra/app/api/v1/students.py):
  - Added `_resolve_student_in_campus` helper for dual UUID / external_ref resolution strictly within active campus.
  - Added `limit` and `offset` query parameters to `GET /api/v1/students`.
  - Updated `get_student`, `get_student_support_view`, `list_student_observations`, and `get_student_finance_view` path parameters to string `student_id_or_ref`.
- [`tests/test_students_api.py`](file:///Users/neemaysmac/Desktop/Sutra/tests/test_students_api.py): Created 8 comprehensive integration tests for campus scoping, dual identifier lookup, pagination, cross-campus isolation, role gating, and unauthenticated handling.

### Frontend / Rust CLI
- [`cli/src/models.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/models.rs): Added `StudentSummaryDto`, `FreshnessMetricsDto`, and `StudentSupportViewDto`.
- [`cli/src/client.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/client.rs): Added `list_students`, `get_student`, and `get_student_support_view` client methods.
- [`cli/src/commands/mod.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/commands/mod.rs): Registered `pub mod students;`.
- [`cli/src/commands/students.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/commands/students.rs): Created CLI command handlers for `list_students` (table formatting, badges) and `get_student` (profile, academic posture, freshness metrics).
- [`cli/src/main.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/main.rs): Registered `Students(StudentsArgs)` subcommand and dispatched execution.
- [`cli/tests/student_tests.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/tests/student_tests.rs): Created 7 unit tests verifying DTO deserialization, empty ID validation, error redaction, and non-leaking error formatting.

---

## 3. Authoritative Data Model & Schema Mapping

The authoritative student entity is [`Student`](file:///Users/neemaysmac/Desktop/Sutra/app/models/student.py):

| Database Column | Python Model Attribute | Rust CLI DTO Field | Exposure Level | Privacy / Policy Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` (UUID PK) | `Student.id` | `StudentSummaryDto.id` | Authorized Staff | Pseudonymous internal identifier. |
| `institution_id` (UUID FK)| `Student.institution_id` | N/A (Tenant Scope) | Server Internal | Partition boundary. Never crosses campus. |
| `external_ref` (VARCHAR) | `Student.external_ref` | `StudentSummaryDto.external_ref` | Authorized Staff | E.g. `SYN-1007`. Unique within campus. |
| `display_name` (VARCHAR) | `Student.display_name` | `StudentSummaryDto.display_name` | Authorized Staff | Student preferred name. |
| `cohort_code` (VARCHAR) | `Student.cohort_code` | `StudentSummaryDto.cohort_code` | Authorized Staff | E.g. `CS-Y2`. `None` if unassigned. |
| `enrollment_status` (VARCHAR)| `Student.enrollment_status` | `StudentSummaryDto.enrollment_status`| Authorized Staff | E.g. `active`, `leave_of_absence`. |
| `created_at` (TIMESTAMPTZ) | `Student.created_at` | `StudentSummaryDto.created_at` | Authorized Staff | Record timestamp. |
| `updated_at` (TIMESTAMPTZ) | `Student.updated_at` | `StudentSummaryDto.updated_at` | Authorized Staff | Last update timestamp. |

**Strict Exclusion:** Financial aid details (`FinanceObservation`) are strictly segregated per ADR-003 and are never included in `StudentSummary`.

---

## 4. API Contracts

### A. List Students
`GET /api/v1/students`
* **Headers:** `Authorization: Bearer <TOKEN>`, `X-Campus-Id: <CAMPUS_UUID>`
* **Query Parameters:**
  * `cohort`: (Optional string) Filters by cohort code (e.g. `CS-Y2`).
  * `limit`: (Optional integer, 1–200) Maximum records to return.
  * `offset`: (Optional integer, >= 0) Pagination offset.
* **Response (HTTP 200 OK):**
```json
[
  {
    "id": "e0a6e300-88cb-4020-8e10-c1356f96614e",
    "external_ref": "SYN-1007",
    "display_name": "Alex Morgan",
    "cohort_code": "CS-Y2",
    "enrollment_status": "active",
    "created_at": "2026-09-01T08:00:00Z",
    "updated_at": "2026-10-12T10:00:00Z"
  }
]
```

### B. Get Student Profile
`GET /api/v1/students/{student_id_or_ref}`
* **Path Parameter:** UUID string OR external reference (e.g. `SYN-1007`).
* **Headers:** `Authorization: Bearer <TOKEN>`, `X-Campus-Id: <CAMPUS_UUID>`
* **Response (HTTP 200 OK):**
```json
{
  "id": "e0a6e300-88cb-4020-8e10-c1356f96614e",
  "external_ref": "SYN-1007",
  "display_name": "Alex Morgan",
  "cohort_code": "CS-Y2",
  "enrollment_status": "active",
  "created_at": "2026-09-01T08:00:00Z",
  "updated_at": "2026-10-12T10:00:00Z"
}
```
* **Error (HTTP 404 Not Found):** Returned if student does not exist OR exists in another campus.

---

## 5. Rust CLI Commands & Usage

### 1. List Students in Active Campus
```bash
sutra students list
sutra students list --cohort CS-Y2
sutra students list --limit 10 --offset 0
```
**Terminal Output:**
```text
=== SUTRA Authorized Student Registry ===
Campus Tenancy: 00000000-0000-0000-0000-000000000001
Cohort Filter:  CS-Y2

STUDENT ID                             EXTERNAL REF   NAME                     COHORT       STATUS
----------------------------------------------------------------------------------------------------------
e0a6e300-88cb-4020-8e10-c1356f96614e   SYN-1007       Alex Morgan              CS-Y2        [active]
f1b7e411-99dc-5131-9f21-d2467007725f   SYN-1008       Taylor Swift             CS-Y2        [active]
----------------------------------------------------------------------------------------------------------
Total Students Displayed: 2
```

### 2. Get Student Profile & Posture
```bash
sutra students get SYN-1007
# OR by UUID:
sutra students get e0a6e300-88cb-4020-8e10-c1356f96614e
```
**Terminal Output:**
```text
=== SUTRA Student Profile ===
  Student ID:        e0a6e300-88cb-4020-8e10-c1356f96614e
  External Ref:      SYN-1007
  Display Name:      Alex Morgan
  Cohort Code:       CS-Y2
  Enrollment Status: [ACTIVE]
  Registered At:     2026-09-01T08:00:00Z
  Last Updated:      2026-10-12T10:00:00Z

=== Academic Posture & Telemetry Freshness ===
  Active Signals:    1 pending educator review
  Active Cases:      1 in 10-state intervention lifecycle
  Data Freshness:    [VERIFIED FRESH]
  Total Observations:12
  Domains Observed:  attendance, academic, participation
  Last Activity:     2026-10-10T14:30:00Z

Operational Guidance:
  • Principle 'No Alert Without Action': Check signal queue for pending triage reviews.
  • Run `sutra signals list` or `sutra cases list` to inspect active workflows.
```

---

## 6. Verification and Test Results

### Backend Test Suite (Python / Pytest)
```bash
PYTHONPATH=ml/src:. pytest tests/
```
* **Result:** **104 passed** (0 failures).
* **Phase 9 Coverage:**
  * `test_authorized_student_listing_campus_scoped` (PASSED)
  * `test_student_listing_cohort_filter_and_pagination` (PASSED)
  * `test_student_lookup_by_uuid_and_external_ref` (PASSED)
  * `test_support_view_lookup_by_external_ref` (PASSED)
  * `test_cross_campus_isolation_returns_404` (PASSED)
  * `test_unknown_student_returns_404` (PASSED)
  * `test_disallowed_leadership_role_receives_403` (PASSED)
  * `test_unauthenticated_requests_receive_401` (PASSED)

### CLI Test Suite (Rust / Cargo)
```bash
cargo test --manifest-path cli/Cargo.toml
```
* **Result:** **38 passed** across 5 test suites (0 failures).
  * `cli_tests.rs`: 9 passed
  * `predict_tests.rs`: 7 passed
  * `session_tests.rs`: 9 passed
  * `student_tests.rs`: 7 passed
  * `workflow_tests.rs`: 6 passed

---

## 7. Remaining Limitations & Boundaries to Phase 10

1. **Student ML Scoring Deferred:** In accordance with Phase 9 instructions, `sutra students score <ID>` and `sutra predict --student <ID>` were **not** implemented in this phase. The ML inference path remains file-based (`sutra predict --file <PATH>`).
2. **Feature Store Ingestion Required:** Live scoring by student ID requires Phase 10 to ingest or query pre-computed Day-30 feature vectors from `ml/data/processed/day30_features.csv` or compute them from live clickstreams.
3. **Database Connection Direct Access Prohibition Maintained:** The Rust CLI strictly communicates via HTTPS REST `/api/v1`; zero direct database connections are opened from the client.
