# SUTRA CLI — Phase 14 Implementation Report: End-to-End Student Support Workflow

**Timestamp**: 2026-10-12  
**Status**: Completed  
**Branch**: `cli`  
**Phase Objective**: Support one coherent, authorized, and human-governed end-to-end student support workflow through the SUTRA CLI, spanning from initial student lookup and telemetry inspection to signal review, accountable case assignment, state machine transition, follow-up logging, outcome evaluation, and immutable audit verification—strictly enforcing the *No Alert Without Action* and *Human-in-the-Loop* invariants.

---

## 1. Executive Summary & Core Governance Principles

Phase 14 ties together the operational building blocks created across Phases 9–13 into a seamless, verifiable terminal experience. Every state change in a student's support journey requires explicit human authority, documenting who took action, why, and on what factual evidence.

1. **Human-in-the-Loop Governance (Principle: No Alert Without Action)**:
   - ML scores and generative AI recommendations are strictly advisory and never create cases, assign staff, mutate case states, or close cases autonomously.
   - Every case originates exclusively from an authorized educator reviewing and approving an active triage signal (`sutra signals review`).
2. **Canonical 10-State Machine Enforcement**:
   - The case lifecycle strictly adheres to the state transitions defined in `07_CASE_LIFECYCLE_AND_WORKER.md` and `app/services/case_service.py`:
     `draft` -> `suggested` -> `action_planned` -> `assigned` -> `accepted` -> `contact_attempted` -> `support_in_progress` -> `follow_up_due` -> `outcome_reviewed` -> `closed`.
   - Illegal state jumps (e.g. `action_planned` directly to `closed`) are rejected by the backend with `HTTP 409 [CASE_TRANSITION_NOT_ALLOWED]`, and actionable guidance is displayed.
3. **Multi-Tenant & Role Isolation**:
   - Querying and mutating cases is scoped strictly to the active campus tenancy (`X-Campus-Id`).
   - The leadership role (`leadership`) is prohibited from accessing individual case queues (`HTTP 403 [LEADERSHIP_QUEUE_ACCESS_DENIED]`), reserving operational case coordination for educators (`faculty`, `mentor`, `hod`, `institution_admin`, `counsellor`).
4. **Idempotency & Optimistic Locking**:
   - Case assignments and transitions support optimistic version locking (`version`) and idempotency headers to prevent conflicting double mutations in distributed environments.

---

## 2. The 9-Step End-to-End Workflow Sequence

The CLI provides a guided, cohesive operator journey where each step's output explicitly presents the next recommended command:

```
[1. sutra auth whoami]
         │
         ▼
[2. sutra students get & observations]
         │
         ▼
[3. sutra signals list & get & ai review-brief]
         │
         ▼
[4. sutra signals review --decision approve]  ───► Provisions Case in state 'action_planned'
         │
         ▼
[5. sutra cases list & get]
         │
         ▼
[6. sutra cases assign --user-id <STAFF_UUID>]  ───► Case transitions to 'assigned'
         │
         ▼
[7. sutra cases transition --to-state accepted] ───► Primary owner accepts responsibility
         │
         ▼
[8. sutra cases follow-up & outcome & transition --to-state closed]
         │
         ▼
[9. sutra cases get]  ───► Verifies full audit trail and recorded outcome
```

### Step-by-Step Breakdown:

### Step 1: Authenticate and Confirm Active Tenancy
- **Command**: `sutra auth whoami`
- **Action**: Verifies caller credentials against `/api/v1/auth/me`. Confirms active verified identity, campus name, tenancy UUID (`X-Campus-Id`), and granted roles.

### Step 2: Retrieve Student Profile & Empirical Observations
- **Commands**:
  - `sutra students get <ID_OR_REF>`: Fetches official student profile, enrollment status, cohort code, and campus relationship.
  - `sutra students observations <ID_OR_REF>`: Inspects multi-domain telemetry records (attendance percentages, missing coursework, LMS engagement) with source systems and quality flags.

### Step 3: Inspect Active Signals and Advisory Evidence Brief
- **Commands**:
  - `sutra signals list`: Inspects the campus triage queue for pending rule-based alerts (`attention_suggested`, `concern`).
  - `sutra signals get <SIGNAL_ID>`: Views rule key, evidence packet digest, and trigger explanations.
  - `sutra ai review-brief <SIGNAL_ID>`: Queries the non-binding 5-tier Evidence Card detailing observed data, policy triggers, Day-30 Platt-calibrated ML predictions, uncertainties, and catalogue-grounded suggestions.

### Step 4: Record Authorized Educator Signal Review
- **Command**:
  ```bash
  sutra signals review <SIGNAL_ID> \
    --decision approve \
    --intervention academic_tutoring_offer \
    --rationale "Consecutive low attendance and missing coursework confirmed per faculty guidelines."
  ```
- **Backend Behavior**: Marks signal as reviewed with actor UUID, timestamp, and mandatory rationale (min 5 characters). Automatically provisions a new `Case` in state `action_planned` with `selected_intervention_key` matching the campus catalogue. Returns the provisioned Case UUID.

### Step 5: Inspect Provisioned Case
- **Command**: `sutra cases get <CASE_ID>`
- **Output**: Displays student name, selected intervention, current state (`action_planned`), version `1`, and displays allowed next states (`assigned`).

### Step 6: Assign Accountable Staff Member
- **Command**:
  ```bash
  sutra cases assign <CASE_ID> \
    --user-id <MENTOR_UUID> \
    --due 2026-10-30T17:00:00Z
  ```
- **Action**: Authorized coordinator (e.g. HOD or Admin) assigns the primary accountable staff member and deadline. Case state advances from `action_planned` to `assigned`. Emits an audit event `OWNER_ASSIGNED`.

### Step 7: Transition Case (Assignment Acceptance)
- **Command**:
  ```bash
  sutra cases transition <CASE_ID> --to-state accepted
  ```
- **Action**: Primary accountable owner explicitly accepts responsibility for the case. State advances from `assigned` to `accepted`. Non-owners or unauthorized callers attempting this transition are rejected (`HTTP 403 [OWNER_ONLY_ACTION]`).

### Step 8: Log Follow-Up Contact, Record Outcome, and Close Case
- **8a. Follow-Up Outreach**:
  ```bash
  sutra cases follow-up <CASE_ID> \
    --channel in_person \
    --proof faculty_meeting_notes \
    --note "Met with student in tutoring center; established bi-weekly check-in schedule."
  ```
  Appends factual outreach record to case audit history and advances state to `support_in_progress` (or `follow_up_due`).
- **8b. Record Outcome**:
  ```bash
  sutra cases outcome <CASE_ID> \
    --status helped \
    --rationale "Student attended tutoring sessions and completed all remedial assignments."
  ```
  Records post-intervention evaluation (`helped`, `not_helped`, `mixed`, `unknown`) and advances state to `outcome_reviewed`.
- **8c. Formally Close Case**:
  ```bash
  sutra cases transition <CASE_ID> \
    --to-state closed \
    --reason "INTERVENTION_COMPLETE"
  ```
  Formally marks case as `closed` in the 10-state machine.

### Step 9: Read Back Closed Case for Complete Audit Verification
- **Command**: `sutra cases get <CASE_ID>`
- **Verification**: Verifies that the case reflects state `closed`, records 6 immutable timeline events, details the follow-up history with timestamp and sanitized notes, displays the final recorded outcome status (`helped`) with rationale, and lists valid reopening transitions (`reopened`).

---

## 3. CLI Command Enhancements & Ergonomics

1. **Flexible Follow-Up & Outcome Options**:
   - `sutra cases follow-up` now accepts optional `--contact-status` (default: `student_reached`) and aliases `-c`/`--type`, `-p`/`--proof`, `-n`/`--note`.
   - `sutra cases outcome` accepts optional `--evidence-kind` (default: `staff_review`) and short flags `-s`/`--status`, `-r`/`--rationale`.
2. **Context-Sensitive Next Action Hints**:
   - Every CLI mutation output dynamically prints the next recommended workflow step based on the case's new state (e.g., from `action_planned` recommending `sutra cases assign`, from `assigned` recommending `sutra cases transition --to-state accepted`, from `outcome_reviewed` recommending `sutra cases transition --to-state closed`).
3. **Structured API Error Formatting**:
   - Added `format_api_error` in `cli/src/client.rs`. Instead of dumping raw JSON blobs, backend errors are parsed and formatted into clear, actionable messages:
     ```
     Error: HTTP 409 [CASE_TRANSITION_NOT_ALLOWED]: Transition from 'closed' to 'contact_attempted' is not allowed. Valid targets: ['reopened']
     Error: HTTP 403 [LEADERSHIP_QUEUE_ACCESS_DENIED]: Leadership role is restricted to cohort aggregates and cannot access individual student case records
     ```

---

## 4. Verification & Test Evidence

### 4.1 Pytest Automated Suite (`tests/test_phase14_workflow.py`)
- `test_phase14_end_to_end_student_support_workflow`: Verified the complete 9-step happy path from student lookup to closed case with audit verification.
- `test_phase14_invalid_transition_rejection`: Verified illegal transitions (e.g. `action_planned` directly to `closed`) are blocked with HTTP 409 `CASE_TRANSITION_NOT_ALLOWED`.
- `test_phase14_leadership_queue_segregation`: Verified leadership roles are blocked with HTTP 403 `LEADERSHIP_QUEUE_ACCESS_DENIED` from viewing individual cases or signals.
- **Result**: 130/130 Pytest tests passing.

### 4.2 Cargo Unit & Integration Suite (`cli/tests/`)
- Verified all CLI models, command parsers, workflow payloads, and state machine transitions.
- **Result**: 48/48 Cargo tests passing.

### 4.3 Live End-to-End CLI Script (`scratch/run_phase14_live_verification.py`)
- Spawned background FastAPI daemon on port 8014.
- Executed real binary `./cli/target/debug/sutra` across all 9 workflow steps with verified exit code `0`.
- Verified illegal transition and leadership access safeguards with exit code `1` and clean error messages.

---

## 5. Artifacts and Commits
- [`tests/test_phase14_workflow.py`](file:///Users/neemaysmac/Desktop/Sutra/tests/test_phase14_workflow.py): Full Python end-to-end integration test suite.
- [`scratch/run_phase14_live_verification.py`](file:///Users/neemaysmac/.gemini/antigravity-ide/brain/8dd55a51-a0cd-43bf-8676-0832b04639f8/scratch/run_phase14_live_verification.py): Live subprocess verification script.
- [`cli/src/client.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/client.rs): Standardized error formatting (`format_api_error`).
- [`cli/src/commands/cases.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/commands/cases.rs): Canonical state transitions and next-step action hints.
- [`cli/src/main.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/main.rs): Enhanced follow-up and outcome flags.
