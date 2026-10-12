# SUTRA CLI — Phase 0: Existing Codebase Audit Report

**Date:** 2026-10-12  
**Auditor / Role:** Senior Rust CLI Engineer  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Crate Path:** `cli/`  
**Git Branch:** `Neemay-ml` (HEAD: `d21075a`)  
**Scope:** Read-only audit of existing CLI code, API endpoints, authentication flows, ML inference routes, schema contracts, and implementation readiness.

---

## 1. Current CLI Architecture

The SUTRA CLI is implemented as a standalone Rust binary (`sutra-cli`) in the `cli/` subdirectory.

### Technology Stack & Dependencies (`cli/Cargo.toml`):
- **Command Line Parsing:** `clap 4.5` (with `derive` and `env` features).
- **Asynchronous Runtime:** `tokio 1.38` (full multi-threaded engine).
- **HTTP Client:** `reqwest 0.12` (async JSON client, 15-second timeout).
- **Serialization / Deserialization:** `serde 1.0`, `serde_json 1.0`.
- **Identity & Time:** `uuid 1.8`, `chrono 0.4`.
- **Terminal Styling:** `colored 2.1`.

### Structural Module Layout:
```
cli/
├── Cargo.toml               # Package definition and dependencies
├── src/
│   ├── main.rs              # CLI entry point, Clap argument tree, routing
│   ├── client.rs            # SutraApiClient: HTTP client, header builder, request methods
│   ├── config.rs            # CliConfig: reads flags and env vars (SUTRA_API_URL, SUTRA_CAMPUS_ID, SUTRA_AUTH_TOKEN)
│   ├── models.rs            # Rust DTOs and serialization contracts
│   └── commands/
│       ├── mod.rs           # Module exports
│       ├── health.rs        # Health and readiness command logic
│       ├── signals.rs       # Risk triage signals commands (list, get, review)
│       ├── cases.rs         # Support case lifecycle commands (list, get, transition, assign, follow-up, outcome)
│       ├── catalogue.rs     # Intervention catalogue listing
│       └── ai.rs            # AI orchestration status, review-brief, summarize
└── tests/
    └── cli_tests.rs         # 7 unit tests for model serialization and validation
```

---

## 2. Existing Command Inventory

| Command | Subcommand | Source File | Implemented? | Description |
|---|---|---|:---:|---|
| `sutra health` | — | `cli/src/commands/health.rs` | **Yes** | Inspects backend health probe and database/ML readiness. |
| `sutra signals` | `list` | `cli/src/commands/signals.rs` | **Yes** | Lists unreviewed student risk signals in triage queue. |
| `sutra signals` | `get <id>` | `cli/src/commands/signals.rs` | **Yes** | Fetches single signal telemetry, evidence digest, and attributions. |
| `sutra signals` | `review <id>` | `cli/src/commands/signals.rs` | **Yes** | Records human review decision (*"No Alert Without Action"*). |
| `sutra cases` | `list` | `cli/src/commands/cases.rs` | **Yes** | Lists active student support cases filtered by state. |
| `sutra cases` | `get <id>` | `cli/src/commands/cases.rs` | **Yes** | Fetches case detail, assigned owner, timeline, and tasks. |
| `sutra cases` | `transition <id>` | `cli/src/commands/cases.rs` | **Yes** | Advances case state across the canonical 10-state lifecycle. |
| `sutra cases` | `assign <id>` | `cli/src/commands/cases.rs` | **Yes** | Assigns case ownership to staff member with optional due date. |
| `sutra cases` | `follow-up <id>` | `cli/src/commands/cases.rs` | **Yes** | Logs student contact verification (meeting notes, LMS proof). |
| `sutra cases` | `outcome <id>` | `cli/src/commands/cases.rs` | **Yes** | Records final intervention efficacy outcome and closes case. |
| `sutra catalogue` | — | `cli/src/commands/catalogue.rs` | **Yes** | Lists campus-approved interventions from controlled catalogue. |
| `sutra ai` | `status` | `cli/src/commands/ai.rs` | **Yes** | Checks AI orchestration readiness, model, and safety invariants. |
| `sutra ai` | `review-brief` | `cli/src/commands/ai.rs` | **Yes** | Queries bounded AI review brief for a signal (advisory only). |
| `sutra ai` | `summarize` | `cli/src/commands/ai.rs` | **Yes** | Synthesizes student multi-domain telemetry (excluding finances). |

---

## 3. Verified CLI-to-Backend Endpoint Mappings

Every CLI command was cross-referenced with backend routers in `app/api/v1/`:

| CLI Command | HTTP Method & Target URL | Backend Route File & Handler | Endpoint Exists? | Schema Match Status | Verification Note |
|---|---|---|:---:|:---:|---|
| `health` (liveness) | `GET /health` | `app/api/v1/health.py:get_health` | **Yes** | **Match** | Verified live (`status: "ok"`). |
| `health` (readiness) | `GET /ready` | `app/api/v1/health.py:get_readiness` | **Yes** | **Match** | Verified live (returns 503 if DB offline). |
| `signals list` | `GET /api/v1/signals` | `app/api/v1/signals.py:list_signals_queue` | **Yes** | **Minor Divergence** | CLI sends `?result=...`; backend query param is `reviewed: bool`. Response `SignalDTO` matches `SignalDto`. |
| `signals get` | `GET /api/v1/signals/{id}` | `app/api/v1/signals.py:get_signal_detail` | **Yes** | **Match** | Response `SignalDTO` matches `SignalDto`. |
| `signals review` | `POST /api/v1/signals/{id}/review` | `app/api/v1/signals.py:review_signal` | **Yes** | **Match** | `SignalReviewRequest` payload & validation match. |
| `cases list` | `GET /api/v1/cases` | `app/api/v1/cases.py:list_cases` | **Yes** | **Match** | Query params (`state`) and `CaseDetailDTO` match. |
| `cases get` | `GET /api/v1/cases/{id}` | `app/api/v1/cases.py:get_case_detail` | **Yes** | **Match** | Response `CaseDetailDTO` matches `CaseDto`. |
| `cases transition` | `POST /api/v1/cases/{id}/transition` | `app/api/v1/cases.py:transition_case_state` | **Yes** | **Match** | State machine validation matches. |
| `cases assign` | `POST /api/v1/cases/{id}/assign` | `app/api/v1/cases.py:assign_case_owner` | **Yes** | **Match** | `CaseAssignmentRequest` matches. |
| `cases follow-up` | `POST /api/v1/cases/{id}/follow-ups` | `app/api/v1/cases.py:record_follow_up` | **Yes** | **Match** | `FollowUpRequest` matches. |
| `cases outcome` | `POST /api/v1/cases/{id}/outcome` | `app/api/v1/cases.py:record_case_outcome` | **Yes** | **Match** | `OutcomeRequest` matches. |
| `catalogue` | `GET /api/v1/interventions` | `app/api/v1/interventions.py:list_interventions` | **Yes** | **Match** | `InterventionItem` matches. |
| `ai status` | `GET /api/v1/ai/status` | `app/api/v1/ai.py:get_ai_status` | **Yes** | **Match** | **Verified live with valid JWT token.** |
| `ai review-brief` | `POST /api/v1/ai/review-brief` | `app/api/v1/ai.py:generate_review_brief` | **Yes** | **Match** | Payload `{ signal_id }` and response match. |
| `ai summarize` | `POST /api/v1/ai/summarize-evidence` | `app/api/v1/ai.py:summarize_evidence` | **Yes** | **Match** | Payload `{ student_id }` and response match. |

---

## 4. Authentication Findings

### How SUTRA Authenticates Requests (Verified Facts):
1. **Server-Side Token Verification:**
   - In `app/core/security.py`, `verify_supabase_jwt(token)` verifies Supabase JWT signatures using HMAC SHA-256 (`settings.SUPABASE_JWT_SECRET`).
   - Expected token claims include `sub` (User UUID), `email`, `aud: "authenticated"`, and standard JWT expiry (`exp`).
2. **Campus Context & Role-Based Access Control (RBAC):**
   - Endpoints depend on `get_campus_membership` and require the HTTP header `X-Campus-Id: <UUID>`.
   - The backend looks up the user's active membership in `InstitutionMembership` in PostgreSQL.
   - Evaluates roles (`faculty`, `hod`, `advisor`, `institution_admin`).
   - Specifically enforces **ADR-004**: Executive/leadership roles are barred from inspecting individual student queues or raw records.
3. **Absence of Backend Login Route:**
   - The backend does **not** expose a `/api/v1/auth/login` route. SUTRA delegates user credential exchange to **Supabase Auth** (`settings.SUPABASE_URL/auth/v1/token`).

### Current CLI Limitations:
- The CLI currently requires the user to pass a raw Bearer token via the `--token` flag or the `SUTRA_AUTH_TOKEN` environment variable.
- There is no interactive login command (`sutra auth login`), no token refresh logic, and no local token caching.

### Recommended macOS Session Storage Approach:
- **Primary Recommendation:** Store active session metadata in `~/.sutra/session.json` with strict POSIX permissions `0600` (read/write only by owner).
- **Keychain Alternative:** For enterprise deployments, use the macOS Keychain Services API via the Rust `keyring` crate to store the refresh token, keeping access tokens in memory or temporary session cache.

---

## 5. ML Inference Integration Findings

### Existing Prediction Endpoints:
1. **Central Application (`app/api/v1/ml.py`):**
   - Route: `POST /api/v1/ml/predict`
   - Input Schema: `MLPredictRequest`
     - Requires: `external_student_ref` (string), `cutoff_days: 30` (int), and `features` (dictionary).
     - Strict validation: Requires all 25 canonical Day-30 OULAD features; explicitly forbids leakage features (`final_result`, `date_unregistration`, post-cutoff scores).
   - Response: `MLPredictResponse`
     - Returns: `risk_probability`, `threshold: 0.46`, `classification` ("At_Risk" or "On_Track"), `top_attributions`, and `limitations`.
   - Audit: Commits inference log to `ml_inference_logs` table in PostgreSQL.
2. **Dedicated ML Service (`backend/app/main.py`):**
   - Route: `POST /predict`
   - Input Schema: Flat JSON dictionary containing the 25 Day-30 canonical features.
   - Response: Returns `risk_probability`, `operational_threshold: 0.46`, `risk_tier`, and a complete `EvidenceCard` with directional log-odds feature contributions.

### Analysis for Future Commands:

#### Command A: `sutra predict --file <PATH.json>`
- **Feasibility:** **Immediately feasible.**
- The existing `POST /api/v1/ml/predict` endpoint already accepts this exact canonical 25-feature schema.
- The CLI can parse the local JSON file, validate the 25 keys, post it to the backend, and render the resulting risk probability and evidence card.

#### Command B: `sutra student score <STUDENT_ID_OR_REF>`
- **Investigation of Existing Backend Capabilities:**
  - The backend currently has `GET /api/v1/students/{student_id}/support-view` which returns student summary, freshness metrics, active signal counts, and raw observations.
  - The policy engine (`PolicyEngineService.evaluate_student`) evaluates ML *only if* all 25 canonical features already exist in the student's ingested observations.
  - **Missing Backend Capability:** There is currently **no single endpoint** that takes a `student_id` and returns the pre-assembled 25-feature vector or directly triggers isolated ML inference on an existing student record without going through full rule evaluation.
  - **Requirement for Phase 2:** A dedicated endpoint `GET /api/v1/students/{student_id}/ml-features` or an internal transformer that extracts the 25 OULAD features from student observations is needed before `sutra student score <id>` can operate autonomously against the database.

---

## 6. Missing Endpoints or Incompatible Schemas

| Identified Issue | Severity | Affected Components | Root Cause & Description |
|---|:---:|---|---|
| **No CLI Auth Command** | Medium | `cli/` | No `sutra auth login` command exists. Users must supply raw tokens via flags or env vars. |
| **No Student Feature Fetch Endpoint** | Medium | `app/api/v1/students.py` | Central backend lacks an endpoint to export a student's canonical 25 Day-30 feature vector for direct ML re-scoring. |
| **Minor Query Param Divergence in Signals** | Low | `cli/src/commands/signals.rs`, `app/api/v1/signals.py` | CLI sends `?result=<status>`, but backend router defines `reviewed: Optional[bool]`. Non-matching query params are currently ignored by FastAPI. |
| **Database Dependency on `/ready`** | Low | `app/api/v1/health.py` | When PostgreSQL is offline, `GET /ready` returns HTTP 503 (`degraded`). The CLI reports this as an error rather than rendering a structured degraded status. |

---

## 7. Actual Build and Test Results

### Build Execution (`cli/`):
- Command: `cargo build --release`
- Compilation Status: **Exited with code 0 (clean build, 0 errors, 0 warnings)**.
- Binary artifact generated: [`cli/target/release/sutra`](file:///Users/neemaysmac/Desktop/Sutra/cli/target/release/sutra) (2.5 MB).

### Unit Test Execution (`cli/tests/cli_tests.rs`):
- Command: `cargo test`
- Results: **7 passed, 0 failed, 0 ignored** in 0.00s:
  - `test_uuid_validation`: PASSED
  - `test_outcome_request_serialization`: PASSED
  - `test_case_transition_request_serialization`: PASSED
  - `test_follow_up_request_serialization`: PASSED
  - `test_signal_review_request_serialization`: PASSED
  - `test_ai_status_deserialization`: PASSED
  - `test_ai_review_brief_deserialization`: PASSED

### Live Runtime Execution:
- `sutra health`: Successfully connects to backend, reports status `ok`, and surfaces database readiness.
- `sutra ai status`: Successfully authenticates with valid JWT, retrieves orchestration provider status, and displays all 5 safety governance invariants.

---

## 8. Security Issues and Limitations

1. **Port 8000 Conflict:**
   - In the local development environment, port 8000 is occupied by an external process (`opspilot-api`).
   - If SUTRA is started on another port (e.g. 8005), the CLI defaults to port 8000 unless overridden by `--url` or `SUTRA_API_URL`.
2. **Token Passing in Shell History:**
   - Passing `--token "<JWT>"` on the command line leaks credentials into `~/.zsh_history` and `ps` process tables. Token caching via local session file or keychain is essential for security.
3. **Student Privacy Protection (ADR-004):**
   - The CLI correctly forwards `X-Campus-Id` and Bearer JWTs, allowing backend middleware to enforce role-based student confidentiality. However, the CLI must ensure that raw student PII is never logged to stdout when piped or redirected.

---

## 9. Prioritized Roadmap for Phases 1–5

```
Phase 1: Authentication & Local Session Management
  └── Implement `sutra auth login/whoami/logout` with secure token storage.

Phase 2: Direct ML Inference & Local Prediction
  └── Implement `sutra predict --file <PATH>` using canonical 25-feature Day-30 schema.
  └── Wire backend feature extraction for `sutra student score <ID>`.

Phase 3: Student Telemetry, Activity & Feedback Patterns
  └── Implement `sutra student telemetry <ID>` and `sutra student feedback <ID>`.

Phase 4: Case Workflow & Review Enhancements
  └── Fix query param divergence in `sutra signals list`.
  └── Add interactive terminal prompts for `sutra signals review`.

Phase 5: Output Formatting, Scripting & Export
  └── Add `--json` flag to all subcommands for terminal piping (`jq`).
  └── Add formatted ASCII tables (`comfy-table`) and progress bars.
```

---

## 10. Acceptance Criteria for Each Phase

### Phase 1: Authentication & Session Management
- [ ] Running `sutra auth login` prompts for credentials (or Supabase Auth token) and securely writes to `~/.sutra/session.json` (POSIX mode `0600`).
- [ ] Running `sutra auth whoami` displays authenticated user ID, email, active campus UUID, and assigned roles.
- [ ] Subsequent CLI commands automatically load cached credentials without requiring `--token`.
- [ ] `sutra auth logout` safely purges the local session file.

### Phase 2: Direct ML Prediction & Student Scoring
- [ ] `sutra predict --file <PATH>` validates 25 canonical features and renders risk probability, operational threshold (0.46), risk tier, and top directional attributions.
- [ ] Backend provides an authorized feature-export endpoint (`GET /api/v1/students/{id}/ml-features`).
- [ ] `sutra student score <ID>` fetches student features, submits inference, and renders the Evidence Card with governance disclaimers.

### Phase 3: Telemetry & Activity Patterns
- [ ] `sutra student telemetry <ID>` renders recent VLE click velocity, active learning days, and submission counts.
- [ ] `sutra student feedback <ID>` displays recorded advisor check-in notes and historical faculty feedback without exposing restricted financial data (ADR-003).

### Phase 4: Case Workflow & Review Enhancements
- [ ] `sutra signals list --result <FILTER>` matches backend filter semantics.
- [ ] `sutra signals review` enforces minimum 5-character reviewer rationale.
- [ ] Human review actions generate immutable audit log events.

### Phase 5: Formatting, Scripting & Developer Experience
- [ ] Every CLI command supports `--json` for automation and script integration.
- [ ] Tabular data is displayed using aligned borders and color-coded risk badges.
- [ ] The CLI returns non-zero Unix exit codes on validation, auth, or server errors.

---

## 11. Summary of Verification Status

| Category | Finding / Classification |
|---|---|
| **Verified Facts** | CLI code compiles cleanly into a release binary (`cli/target/release/sutra`). All 7 unit tests pass. Central backend has matching endpoints for signals, cases, interventions, health, and AI. `ai status` and `health` verified live against running backend. Production ML model expects 25 canonical Day-30 OULAD features at threshold 0.46. |
| **Suspected Issues** | Port 8000 collision on local machine with `opspilot-api` causes default CLI connections to fail unless `SUTRA_API_URL` or `--url` is set. Passing tokens via `--token` flag exposes secrets in shell history. `sutra signals list --result` query parameter does not match backend `reviewed: bool` query parameter. |
| **Untested Behavior** | End-to-end case creation and state mutation via CLI against live PostgreSQL (blocked by offline local PostgreSQL on port 5432). |
