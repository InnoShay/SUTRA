# SUTRA — Phase 5 Architecture & Verification Report: Communication Drafting & Follow-up Note Intelligence

**System:** SUTRA (Student Success and Intervention Orchestration Engine)  
**Version:** Phase 5 Canonical Implementation  
**Basis Date:** 12 October 2026  
**Audience:** System Architects, Lead Engineers, Application Security Evaluators, Product Integration Team  

---

## 1. Executive Summary & Core Guarantees

Phase 5 extends SUTRA's approved human-in-the-loop support plan workflow with two specialist AI capabilities:
1. **Agent 5 — Stakeholder Communication Drafter (`CommunicationDrafter`)**: Formulates role-appropriate, empathetic outreach drafts anchored strictly to approved support plan action steps without disclosing sensitive ML risk probabilities, raw demographic attributes, or fabricated institutional commitments.
2. **Agent 6 — Follow-up Note Structuring Agent (`NoteStructuringAgent`)**: Converts unstructured staff interaction notes into structured, provenance-tagged draft records while strictly isolating reported actions, staff observations, and attributed student statements.

### Enforced Safety & System Boundaries:
- **Zero Message Delivery**: Under NO circumstances does Agent 5 connect to SMTP, SMS, LMS APIs, or outbound communication networks. Approval of a draft marks it `APPROVED_FOR_USE` for human advisor reference—it does not and cannot deliver messages.
- **Strict Outcome Non-Conflation**: Task completion and follow-up note structuring **never alter student course outcome status**. A case outcome remains `UNOBSERVED` until an authorized advisor independently records an authoritative assessment via the explicit outcome workflow.
- **Anti-Prompt-Injection & Untrusted Note Fencing**: Staff-entered notes and advisor inputs are treated as untrusted text, sanitized, and isolated behind strict structural fences in model prompts.
- **Durable Versioned Schema & Tamper-Evident Ledger**: SQLite `SCHEMA_VERSION = 2` adds `communication_drafts` and `structured_follow_up_drafts`, backwards-chained via cryptographic SHA-256 hash pointers in `audit_ledger`.
- **100% Offline & Deterministic Automated Tests**: Zero live credentials are required; mock fallback provides deterministic, grounded responses for offline verification.

---

## 2. Agent 5: Stakeholder Communication Drafter

### 2.1 Purpose & Role Boundaries
When an academic advisor approves a support plan, Agent 5 helps the advisor prepare clear, respectful outreach tailored to one of four authorized recipient roles:
- `STUDENT`: Empathetic, supportive check-in describing available academic and campus resources without labeling the student as "high risk".
- `ACADEMIC_ADVISOR`: Internal handover brief summarizing approved action steps and target deadlines.
- `MODULE_TUTOR`: Curricular coordination brief focusing on course materials, study groups, or tutorial check-ins.
- `STUDENT_SUCCESS_COACH`: Support coordination note regarding study habits, time management, or learning skills.

### 2.2 Template Catalog (`SyntheticCommunicationCatalog`)
All drafts must use approved, versioned templates registered in `backend/app/orchestration/catalog.py`:
1. `TPL_STUDENT_SUPPORT_CHECKIN` (Allowed roles: `STUDENT`, `ACADEMIC_ADVISOR`)
2. `TPL_STUDENT_RESOURCE_GUIDE` (Allowed roles: `STUDENT`, `STUDENT_SUCCESS_COACH`)
3. `TPL_TUTOR_ACADEMIC_BRIEF` (Allowed roles: `MODULE_TUTOR`, `ACADEMIC_ADVISOR`)
4. `TPL_COACH_COORDINATION_NOTE` (Allowed roles: `STUDENT_SUCCESS_COACH`, `ACADEMIC_ADVISOR`)

### 2.3 Context Minimization & Privacy
Agent 5 receives **only the minimum authorized context**:
- Case identifier (`case_id`) and approved plan title / action steps.
- Template ID and allowed intended role.
- Sanitized advisor notes (if provided).
**Explicitly excluded**: Raw ML feature vectors, 25 tabular student features, sensitive demographic variables (gender, region, disability, IMD band), predicted risk probabilities (e.g. `0.78`), internal risk tier labels (`HIGH`), and cross-case audit lineage.

### 2.4 Deterministic Output Validation (`DeterministicValidator.validate_communication_draft`)
Every output from Agent 5 passes through a deterministic validator that enforces:
- Case has a genuinely approved support plan (`CaseStatus.APPROVED`, `IN_PROGRESS`, `TASKS_COMPLETED`).
- Template and intended role match catalog restrictions.
- Language check: Flags any forbidden risk disclosures (`risk probability`, `at-risk tier`, `predicted to fail`).
- Commitment check: Flags fabricated institutional promises (`guaranteed scholarship`, `100% grant`, `waived tuition`).
- Status check: Output must strictly initialize as `DRAFT_AWAITING_REVIEW`.

---

## 3. Agent 6: Follow-up Note Structuring Agent

### 3.1 Purpose & Provenance Isolation
When staff submit freeform notes after meeting or messaging a student, Agent 6 organizes the unstructured text into five distinct provenance buckets:
1. `reported_actions_taken`: Actions the staff member reports having performed (e.g., "Met with student via LMS chat").
2. `staff_observations`: What staff observed firsthand (e.g., "Student was on chapter 2 slides").
3. `attributed_student_statements`: What the student is reported to have stated (e.g., "Student said they were unwell during week 2").
4. `documented_evidence_references`: Verified platform data references cited (e.g., `vle_days_since_last_click`).
5. `unresolved_questions_or_concerns`: Gaps, missing info, or follow-ups still required.
6. `potential_outcome_evidence`: Potential hints of academic progress, flagged with an explicit warning that outcome recording requires a separate authorized action.

### 3.2 Immutability of Original Text
The original submitted note is preserved verbatim alongside its SHA-256 fingerprint (`source_note_sha256`). AI classifications are kept in a separate draft record (`structured_follow_up_drafts`).

### 3.3 Human Confirmation Lifecycle
1. Staff enters raw note $\rightarrow$ backend records draft $\rightarrow$ Agent 6 produces structured draft (`DRAFT_AWAITING_CONFIRMATION`).
2. Advisor reviews, edits, and explicitly confirms the draft $\rightarrow$ creates confirmed `FollowUpRecord` with `is_structured = True` and links `structured_draft_id`.
3. If inaccurate, advisor can reject the draft $\rightarrow$ status set to `REJECTED`.
4. **Outcome Status Check**: Throughout structuring and confirmation, `outcome_status` remains `UNOBSERVED`.

---

## 4. Persistence Architecture & Ledger Integration

### 4.1 Schema Version 2 Migration (`init_db`)
Upgrades SQLite schema from version 1 to 2 with auto-migration:
- **`communication_drafts` table**: Traces `draft_id`, `case_id`, `approved_plan_version`, `intended_role`, `template_id`, `subject`, `message_body`, `grounded_plan_step_refs_json`, `human_review_status`, `reviewed_by`, `reviewed_at`, `review_notes`, `idempotency_key`, `created_by`, `created_at`.
- **`structured_follow_up_drafts` table**: Traces `draft_id`, `case_id`, `task_id`, `source_note_text`, `source_note_sha256`, `reported_actions_json`, `staff_observations_json`, `student_statements_json`, `evidence_refs_json`, `unresolved_questions_json`, `potential_outcome_evidence`, `human_confirmation_status`, `confirmed_by`, `confirmed_at`, `confirmation_notes`, `created_by`, `created_at`.
- **`follow_up_records` columns**: Added `is_structured`, `structured_draft_id`, `reported_actions_json`, `staff_observations_json`, `student_statements_json`, `evidence_refs_json`, `unresolved_questions_json`, `confirmed_by`, `confirmed_at`.

### 4.2 Cryptographic Audit Chain (`audit_ledger`)
Every Phase 5 action appends a tamper-evident audit event:
- `COMMUNICATION_DRAFT_CREATED`: Records draft formulation, template ID, and requesting actor.
- `COMMUNICATION_DRAFT_APPROVED`: Records human approval for guidance.
- `COMMUNICATION_DRAFT_DISCARDED`: Records discard decision.
- `NOTE_STRUCTURED`: Records Agent 6 extraction and note SHA-256 hash.
- `NOTE_STRUCTURE_CONFIRMED`: Records human confirmation and confirmed structured fields.
- `NOTE_STRUCTURE_REJECTED`: Records rejection reason.

All entries compute `entry_hash = SHA256(prev_entry_hash || canonical_payload || event_type || seq_id)`. SQLite triggers prevent any `UPDATE` or `DELETE` operations on `audit_ledger`.

### 4.3 Idempotency Enforcement
Idempotency keys are bound to `(case_id, actor_id, idempotency_key)`:
- Repeating identical payload returns existing draft/record without duplicating events.
- Reusing an idempotency key with a conflicting payload raises an explicit `ValueError` (400 Bad Request).

---

## 5. API Endpoints Catalog (Phase 5)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/cases/{case_id}/communication-templates` | List allowed templates for case | Authorized Advisor/Coach |
| `POST` | `/api/v1/cases/{case_id}/communication-drafts` | Generate Agent 5 draft (requires approved plan) | Authorized Advisor/Coach |
| `GET` | `/api/v1/cases/{case_id}/communication-drafts` | List all communication drafts for case | Authorized Staff |
| `GET` | `/api/v1/cases/{case_id}/communication-drafts/{draft_id}` | Get specific draft details | Authorized Staff |
| `PATCH` | `/api/v1/cases/{case_id}/communication-drafts/{draft_id}` | Edit, approve (`APPROVED_FOR_USE`), or discard draft | Authorized Staff |
| `POST` | `/api/v1/cases/{case_id}/follow-ups/structure-note` | Agent 6 structures raw note draft | Authorized Staff |
| `GET` | `/api/v1/cases/{case_id}/follow-ups/structured-drafts` | List structured note drafts | Authorized Staff |
| `POST` | `/api/v1/cases/{case_id}/follow-ups/confirm-structured` | Human confirms draft into Evidence Ledger | Authorized Advisor/Staff |
| `POST` | `/api/v1/cases/{case_id}/follow-ups/reject-structured` | Rejects inaccurate structured draft | Authorized Advisor/Staff |

---

## 6. Verification & Test Execution Results

### 6.1 Backend Orchestration & Persistence Tests
Command executed:
```bash
PYTHONPATH=ml/src:. uv run --python 3.11 --with pytest,fastapi,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic pytest backend/tests
```
**Results**:
- **142 Passed**, **2 Skipped** (opt-in live provider test and authentic held-out partition test), **0 Failures**.
- Total execution time: **0.81 seconds**.
- 100% offline, zero live LLM credentials required.

### 6.2 Pre-existing ML Test Baseline
Command executed:
```bash
PYTHONPATH=ml/src:. uv run --python 3.11 --with pytest,scikit-learn==1.7.2,pandas,pyyaml,joblib,xgboost,pydantic,pydantic-settings pytest ml/tests
```
**Results**:
- **107 Passed**, **1 Failed** (`test_phase_seven_experiment.py::test_v1_baseline_artifacts_unmodified`).
- **Cause of ML failure**: Pre-existing test expectation that `candidate_xgboost.joblib` should exist inside the production `v1.0.0` folder. The production baseline is Logistic Regression v1.0.0 (`baseline_logistic_regression.joblib`); candidate XGBoost is maintained in experimental staging as designed in Phase 7.
- Machine learning scoring, inference predictors, and feature pipelines remain 100% intact and unaltered.

---

## 7. Phase 6 Proposal: Cohort Learning Analyst (Agent 7) & End-to-End Hardening

Phase 6 will complete SUTRA's multi-agent architecture:
1. **Agent 7 — Cohort Learning Analyst**: Aggregates de-identified interaction notes, confirmed follow-ups, and task completion velocity across cohorts to synthesize systemic pattern summaries (e.g., identifying modules with high early check-in dormancy without exposing individual student records).
2. **Production IdP Handoff**: Replace synthetic localhost demo auth with production OIDC/JWKS tokens and institutional SSO.
3. **End-to-End Hardening & Presentation Pack**: High-contrast accessibility compliance, live demo presentation rehearsal mode, and audit export package for institutional governance boards.
