# SUTRA CLI — Phase 18: Final Acceptance, Discrepancy Fixes, and Terminal Verification Report

**Date:** 2026-10-12  
**Branch:** `cli`  
**Phase:** 18 (Final Acceptance & Terminal Verification)  
**Binary Package:** `sutra-cli` v1.0.0 (`sutra`)  
**Installed Binary Location:** `${HOME}/.local/bin/sutra` and `${HOME}/.cargo/bin/sutra`  
**Final Readiness Verdict:** **`READY FOR DEMONSTRATION`**

---

## 1. Executive Summary & Readiness Verdict

Following the phased development across Phases 0–17, **Phase 18** conducted a comprehensive, ground-truth audit of the complete SUTRA Command-Line Interface (`sutra-cli`), its underlying backend integration points, data provenance boundaries, security models, ML serving contracts, build pipelines, and documentation.

### Final Acceptance Verdict
> ### **VERDICT: `READY FOR DEMONSTRATION`**
> All core CLI capabilities, security boundaries, session lifecycles, and machine-learning contracts are implemented, tested, and verified against the live application runtime.
> 
> * **Cargo Integration:** 55/55 Cargo tests passing across 8 suites.
> * **Backend Integration:** 131/131 Pytest tests passing in root suite, 155/155 passing in backend suite.
> * **End-to-End Acceptance:** All 11 end-to-end integration checks passed with 0 failures in live execution.
> * **Zero Administrator Privileges:** Installs cleanly in user-space (`~/.cargo/bin` or `~/.local/bin`).
> * **Strict Provenance & Anti-Leakage:** Institutional data, historical OULAD research data, and synthetic demonstration fixtures are isolated by architectural design.

---

## 2. Complete Command Inventory

Every command in the `sutra` hierarchy was inspected, executed, and verified against both human-readable terminal output and `--json` machine-readable output:

| Command | Subcommand / Flags | Status | Verified Behavior | Test Method |
| :--- | :--- | :---: | :--- | :---: |
| `sutra health` | *none* / `--json` | **COMPLETE** | Inspects FastAPI process liveness (`/health`) and database/ML readiness (`/ready`) | **Live Integration** |
| `sutra auth` | `login` | **COMPLETE** | Securely prompts for JWT without terminal echo, verifies against `/auth/me`, writes `0600` session file | **Live Integration** |
| `sutra auth` | `whoami` | **COMPLETE** | Displays active user UUID, email, campus tenancy, and institutional roles | **Live Integration** |
| `sutra auth` | `logout` | **COMPLETE** | Safely deletes `~/.sutra/session.json` and clears memory credentials | **Live Integration** |
| `sutra catalogue`| *none* | **COMPLETE** | Displays institutional intervention catalogue, domains, and recipient roles | **Live Integration** |
| `sutra students` | `list` | **COMPLETE** | Lists enrolled students in active campus tenancy with optional cohort filter | **Live Integration** |
| `sutra students` | `get <ID_OR_REF>` | **COMPLETE** | Fetches 360° academic profile and support posture by UUID or reference ID | **Live Integration** |
| `sutra students` | `observations <ID_OR_REF>` | **COMPLETE** | Lists chronological telemetry ledger observations with domain/quality filters | **Live Integration** |
| `sutra students` | `readiness <ID_OR_REF>` | **COMPLETE** | Audits Day-30 feature completeness; identifies exact shortfalls without scoring | **Live Integration** |
| `sutra predict` | `--file <PATH>` | **COMPLETE** | Validates 25-feature JSON against anti-leakage guards; runs calibrated model | **Live Integration** |
| `sutra predict` | `--student <ID_OR_REF>` | **COMPLETE** | Server-side scores student if 25 Day-30 observations exist; returns HTTP 422 with readiness guidance if incomplete | **Live Integration** |
| `sutra signals` | `list` | **COMPLETE** | Lists risk signals in campus triage queue; supports filtering by result | **Live Integration** |
| `sutra signals` | `get <UUID>` | **COMPLETE** | Displays signal telemetry, attribution weights, and trigger context | **Live Integration** |
| `sutra signals` | `review <UUID>` | **COMPLETE** | Records human review (`approve`/`modify`/`dismiss`/`request_more_data`) with mandatory rationale; creates support case on approval | **Live Integration** |
| `sutra cases` | `list` | **COMPLETE** | Lists active student support cases with optional lifecycle state filter | **Live Integration** |
| `sutra cases` | `get <UUID>` | **COMPLETE** | Displays case detail, primary owner, due date, canonical next states, and audit timeline | **Live Integration** |
| `sutra cases` | `assign <UUID>` | **COMPLETE** | Assigns case accountability to primary owner user UUID (authorized by HOD) | **Live Integration** |
| `sutra cases` | `transition <UUID>` | **COMPLETE** | Advances case state across 10-state machine; rejects invalid transitions | **Live Integration** |
| `sutra cases` | `follow-up <UUID>` | **COMPLETE** | Records verified student contact (channel, proof kind, note) into audit trail | **Live Integration** |
| `sutra cases` | `outcome <UUID>` | **COMPLETE** | Records final intervention outcome (`helped`/`not_helped`/`mixed`) and transitions case to `outcome_reviewed` | **Live Integration** |
| `sutra ai` | `status` | **COMPLETE** | Inspects AI orchestration subsystem, active model, and governance boundaries | **Live Integration** |
| `sutra ai` | `review-brief <SIGNAL_UUID>` | **COMPLETE** | Generates bounded 5-tier review brief and evidence card for risk signal | **Live Integration** |
| `sutra ai` | `summarize <STUDENT_ID>` | **COMPLETE** | Synthesizes multi-domain student telemetry (financial records strictly excluded) | **Live Integration** |
| `sutra ai` | `evidence <STUDENT_ID>` | **COMPLETE** | Retrieves 5-tier evidence summary card for student | **Live Integration** |
| `sutra datasets` | `info` (alias: `overview`) | **COMPLETE** | Displays ADR-005 data provenance framework, storage, schemas, and isolation rules | **Live Integration** |
| `sutra datasets` | `lookup` | **COMPLETE** | Queries historical OULAD research or synthetic demo records with mandatory disclaimer | **Live Integration** |
| *Global* | `--json` | **COMPLETE** | Emits raw machine-readable JSON across all subcommands | **Live Integration** |

---

## 3. Security and Authorization Results

1. **Authentication & Session Security:**
   * JWT tokens are validated for signature, algorithm, and expiry (`exp`). Expired sessions are rejected with clear re-login instructions.
   * Session storage at `~/.sutra/session.json` enforces POSIX permissions `0700` on the directory and `0600` on the session file.
   * Symlink session hijacking attempts are detected and aborted before opening.
   * Bearer tokens are scrubbed from console output, debug string representations (`SutraApiClient`, `CliSession`, `CliConfig`), and error details using `[REDACTED_JWT]`.
2. **Campus Multi-Tenancy Isolation:**
   * Every request includes `X-Campus-Id`.
   * Access to records belonging to other campus tenancies is blocked with `HTTP 403 Forbidden` (`CAMPUS_MEMBERSHIP_NOT_FOUND`), exiting with standard code `3`.
3. **Role-Based Access Control (ADR-004):**
   * Operational individual-student queues (`signals list`, `students list`) are restricted to `faculty`, `mentor`, and `hod`.
   * Executive leadership roles are blocked from student-level queues (`HTTP 403 LEADERSHIP_QUEUE_ACCESS_DENIED`) and directed to cohort-level aggregates.
   * Case assignments require `hod` authorization.
   * Lifecycle transitions, follow-up contact, and outcome recording require the assigned case owner (`mentor`).
4. **Zero Direct Database Access:**
   * The SUTRA CLI contains zero PostgreSQL credentials, database drivers, or connection strings. All operations communicate exclusively with the authorized FastAPI REST service over HTTP/HTTPS.
5. **AI Privacy & Sensitive Data Exclusion (ADR-003):**
   * Multi-domain telemetry synthesis strictly excludes financial records (`"domain": "financial"`).
   * Verified in Phase 18 acceptance test: Tuition balance `$3500.00` present in student observations was completely omitted from AI synthesis and evidence cards.

---

## 4. Student Data Source & Provenance Findings (ADR-005)

The repository strictly isolates three distinct classes of data:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUTRA DATA PROVENANCE                           │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│ 1. INSTITUTIONAL    │ 2. OULAD RESEARCH        │ 3. SYNTHETIC DEMO     │
│ (Operational Ledger)│ (Historical Benchmark)   │ (Test Scenarios)      │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ • Keys: UUIDv4 /    │ • Keys: Compound Natural │ • Keys: SYN-*,        │
│   STU-YYYY-XXXX     │   (module, pres, id)     │   SYNTH-BATCH-*       │
│ • Live Postgres     │ • Parquet Holdouts       │ • JSON Fixtures       │
│ • Mutated by staff  │ • Read-only benchmark    │ • Demo & Unit tests   │
│ • Strictly Private  │ • CC-BY 4.0 License      │ • Synthetic disclaimer│
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

* **Anti-Guessing / Cross-Mapping Safeguard:** CLI prevents OULAD natural keys or synthetic identifiers from being queried in live institutional student endpoints (`sutra students get`).
* **Feature Readiness vs. Prediction:** `sutra students readiness` performs purely an observational completeness audit of the 25 required Day-30 features. It never generates an early-warning risk score, avoiding false alarm bias.
* **Student-Specific Scoring Prerequisites:** Server-side student scoring (`sutra predict --student <ID>`) executes only when all 25 canonical observations exist in the active campus ledger. If observations are incomplete, the backend returns `HTTP 422 Unprocessable Entity` detailing the shortfall, and the CLI refuses to fabricate or impute default values into live records.

---

## 5. ML Prediction and Evaluation Verification

1. **Production Model Serving Contract:**
   * **Model Architecture:** `LogisticRegression (L2 regularized, class_weight='balanced')`.
   * **Decision Threshold:** `0.46` (calibrated on temporal holdout `2014J` to balance recall and precision for early warning).
   * **Prediction Cutoff:** Day 30 post-course start.
   * **Feature Count:** Exactly 25 features (19 numerical, 6 categorical).
2. **Anti-Leakage Enforcement:**
   * Post-cutoff features (`score`, `assessment_score`, `date_unregistration`) and ground-truth target outcomes (`final_result`, `is_at_risk`) are rejected with `Anti-leakage Violation` (exit code `2`).
3. **Evaluation Holdout & Artifact Parity:**
   * **Holdout Set:** Open University `2014J` presentation (strictly temporal future cohort, disjoint students).
   * **Evaluation Metrics:**
     * **ROC-AUC:** `0.732`
     * **Recall @ 0.46:** `0.741`
     * **Precision @ 0.46:** `0.612`
     * **Brier Score:** `0.187`
   * Metrics verified against [model_evaluation_report.md](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/model_evaluation_report.md).

---

## 6. Build, Cargo Installation, and Test Results

### 6.1 Test Suites Summary
* **Cargo Tests (`cargo test --manifest-path cli/Cargo.toml`):**
  * `cli_tests.rs`: 10 passed
  * `config_and_consistency_tests.rs`: 5 passed
  * `dataset_tests.rs`: 5 passed
  * `predict_tests.rs`: 8 passed
  * `session_tests.rs`: 11 passed
  * `student_readiness_tests.rs`: 3 passed
  * `student_tests.rs`: 7 passed
  * `workflow_tests.rs`: 6 passed
  * **Total Cargo:** **55 passed; 0 failed; 0 ignored**
* **Root Pytest Suite (`pytest -q`):**
  * **131 passed, 4 warnings in 3.89s**
* **Backend Pytest Suite (`pytest backend/tests -q`):**
  * **155 passed, 1 skipped in 1.14s**

### 6.2 Binary Release & Installation
* **Optimized Release Build:**
  * Command: `cargo build --release --manifest-path cli/Cargo.toml`
  * Artifact: `cli/target/release/sutra` (LTO, opt-level 3, stripped)
* **Installation Method A (Cargo Install):**
  * Command: `cargo install --path cli`
  * Installed: `${HOME}/.cargo/bin/sutra` (Version: `sutra 1.0.0`)
* **Installation Method B (User-Space Script):**
  * Command: `./scripts/install_cli.sh`
  * Installed: `${HOME}/.local/bin/sutra` (Version: `sutra 1.0.0`, permissions `0755`)
* **Supported Platforms:**
  * macOS 12+ (Apple Silicon `aarch64` and Intel `x86_64`)
  * Linux glibc 2.28+ (`x86_64` and `aarch64`)

---

## 7. Confirmed Discrepancies and Fixes Applied

| Discrepancy Identified | Severity | Root Cause | Resolution Applied |
| :--- | :---: | :--- | :--- |
| **Missing `CLI_PHASE_5_REPORT.md`** | P2 | Early Phase 0-8 roadmap skipped Phase 5; JSON export was completed later | Reconciled in Phase 18; documented that `--json` was completed globally across all commands in Phase 16. |
| **Stale Test Counts in Docs** | P2 | Early reports documented 29–31 tests; newer test suites expanded coverage | Updated badges and text in [cli/README.md](file:///Users/neemaysmac/Desktop/Sutra/cli/README.md) to **55/55 Cargo Passing**. |
| **Dataset Subcommand Syntax** | P2 | Code defined `sutra datasets info`/`lookup`, but early docs used `overview`/`sample` | Added `alias = "overview"` on `Info` in [cli/src/main.rs](file:///Users/neemaysmac/Desktop/Sutra/cli/src/main.rs); updated [cli/README.md](file:///Users/neemaysmac/Desktop/Sutra/cli/README.md) with canonical `info` and `lookup` syntax. |
| **Exit Code Classification Mapping** | P2 | Docs listed 401/403 as exit code 2; code and tests classify auth/perms as exit code 3 | Corrected exit code matrix in [cli/README.md](file:///Users/neemaysmac/Desktop/Sutra/cli/README.md): Code 3 = Auth/Permission denied; Code 2 = Validation/Domain/Leakage; Code 1 = Network/System; Code 0 = Success. |
| **Cross-Campus Exit Code Assertion** | P2 | Test script checked for 404, but cross-campus lookup correctly returns 403 Forbidden | Updated test assertion in Phase 18 acceptance harness to verify exit code 3 on 403 Forbidden. |

---

## 8. Known Limitations and Operational Guidance

1. **Live Student Scoring Telemetry Requirement:**
   * Live student scoring (`sutra predict --student <ID>`) requires all 25 canonical Day-30 observations to exist in the campus ledger.
   * If any observation is missing, the backend returns `HTTP 422 Unprocessable Entity` with an explicit shortfall audit.
   * Institutional staff must use `sutra students readiness <ID>` to identify missing telemetry. SUTRA strictly refuses to guess, impute, or inject synthetic values into live student records.
2. **Excluded Data Sources (By Policy):**
   * Raw LMS clickstream URLs are not ingested into the institutional feature store to protect student browsing privacy.
   * Assessment score values prior to Day 30 are excluded to prevent target outcome leakage; only submission timeliness and count are tracked.
3. **ADR-003 Financial Aid Protection:**
   * Financial aid, bursar, and tuition records are excluded from AI prompts and evidence cards.

---

## 9. Copy-Pasteable Terminal Verification Checklist

Developers and operators can verify the installed CLI using the following minimal sequence of commands:

```bash
# 1. Verify installed binary version and root help
sutra --version
sutra --help

# 2. Verify backend connectivity and model readiness
sutra health
sutra health --json

# 3. Authenticate with institutional JWT (or verify active session)
sutra auth login
sutra auth whoami

# 4. View institutional intervention catalogue
sutra catalogue

# 5. Inspect student records and Day-30 observation readiness
sutra students list
sutra students get SYN-1007
sutra students readiness SYN-1007

# 6. Execute early-warning prediction against validated feature vector
sutra predict --file cli/tests/fixtures/valid_sample.json

# 7. Triage risk signals and review intervention
sutra signals list
sutra signals get <SIGNAL_UUID>

# 8. Manage support cases and 10-state lifecycle
sutra cases list
sutra cases get <CASE_UUID>

# 9. Query bounded AI advisory assistance
sutra ai status
sutra ai summarize SYN-1007

# 10. Inspect data provenance and research benchmarks
sutra datasets info
sutra datasets lookup --source oulad 11391 --module AAA --presentation 2013J

# 11. Clear local session
sutra auth logout
```

---

## 10. Exact Next Actions for Operators & Institutional Deployment

1. **Production Deployment:**
   * Deploy the release binary using `./scripts/install_cli.sh /usr/local/bin` (or user-space `~/.local/bin`).
   * Configure institutional reverse-proxy base URL via `export SUTRA_API_URL="https://sutra.institution.edu/api/v1"`.
2. **Onboarding Staff:**
   * Provide staff members with institutional credentials for Supabase JWT login.
   * Assign appropriate institutional roles (`faculty`, `mentor`, `hod`) in `InstitutionMembership`.
3. **Telemetry Ingestion:**
   * Ensure campus SIS and LMS data pipelines populate canonical `StudentObservation` records up to Day 30 to enable live student early-warning scoring.
