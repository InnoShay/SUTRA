# SUTRA CLI — Phase 16: Full Security and Integration Verification Report

**Date:** October 12, 2026  
**Status:** Completed & 100% Verified  
**Audit Scope:** Full audit across CLI Phases 9–15, backend REST gateways, ML serving layer, AI governance boundary, session lifecycle, and error-handling pipelines.  
**Verification Results:** 55 Cargo Unit/Integration Tests Passed, 131 Pytest Tests Passed, 12/12 Live E2E Matrix Items Passed on compiled release binary (`cli/target/release/sutra`).  

---

## 1. Executive Summary

Phase 16 conducted an exhaustive, rigorous security audit and regression verification of the SUTRA CLI and its backend integration boundaries. Rather than expanding product features, this phase systematically audited credential isolation, tenancy enforcement, anti-leakage invariants, AI safety bounds, error sanitization, and POSIX exit code mappings. 

Three confirmed defects were identified, remediated, and verified with dedicated regression tests:
1. **[Medium Severity] Cleartext Token Exposure via Struct Debug Formatting:** `CliSession` and `CliConfig` derived standard `Debug`, causing unredacted JWT strings to print if structs were formatted via `{:?}`.
2. **[Medium Severity] Incomplete ADR-003 Domain Exclusion for Financial Data:** The filter tuple in `app/ai/prompt.py`, `app/ai/service.py`, and `app/ai/providers.py` omitted `"financial"`, allowing records with `domain="financial"` to bypass data minimization.
3. **[Low Severity] Overbroad Keyword Collision in Exit Code 3 Classification:** The string `"Forbidden"` in the exit-code heuristic matched English validation messages (e.g., `"Anti-leakage Violation: ... strictly forbidden"`), causing input validation errors to exit with code `3` instead of `2`.

---

## 2. Severity-Ranked Findings & Remediation Details

### Finding SEC-001 (Medium Severity): Cleartext JWT Token Exposure via Rust `Debug` Formatting
- **Affected Components:** `cli/src/session.rs`, `cli/src/config.rs`, `cli/src/client.rs`.
- **Root Cause:** `CliSession` and `CliConfig` derived `#[derive(Debug)]`. Any debug format string (`{:?}`) or logger printing these structs would serialize the sensitive Supabase Bearer JWT token in plaintext to logs or stdout.
- **Remediation:**
  - Removed `#[derive(Debug)]` from `CliSession` and `CliConfig`.
  - Implemented custom `std::fmt::Debug` that automatically routes tokens through `redact_token()` (e.g. `eyJhbG...[REDACTED]`).
  - Added `scrub_error_secrets()` to `cli/src/client.rs` so any upstream server error containing raw JWT signatures is sanitized into `[REDACTED_JWT]`.
- **Regression Test:** Added `test_debug_formatting_redacts_tokens` and `test_scrub_error_secrets_jwt_redaction` in `cli/tests/session_tests.rs`.

---

### Finding SEC-002 (Medium Severity): Incomplete ADR-003 Domain Exclusion for Financial Telemetry
- **Affected Components:** `app/ai/prompt.py`, `app/ai/service.py`, `app/ai/providers.py`.
- **Root Cause:** The observation filter tuple checked `o.domain.lower() not in ("finance", "fee", "billing", "financial_aid", "scholarship")`. Database records stored under the standard canonical domain `"financial"` (e.g. bursar tuition balances) bypassed this check and entered AI evidence prompts.
- **Remediation:**
  - Standardized the exclusion predicate across all AI service layers to:
    ```python
    if o.domain.lower() not in ("financial", "finance", "fee", "fees", "billing", "financial_aid", "scholarship") \
       and not o.domain.lower().startswith("financ")
    ```
- **Regression Test:** Verified in Matrix Test 10 with live bursar observations (`tuition_balance = $3,500`), confirming zero financial mentions in AI evidence output.

---

### Finding SEC-003 (Low Severity): Keyword Collision in Exit Code Classification
- **Affected Components:** `cli/src/main.rs`, `cli/tests/config_and_consistency_tests.rs`.
- **Root Cause:** `e.contains("Forbidden")` was used to classify HTTP 403 Forbidden responses into exit code `3`. When the CLI rejected leaked features with `"Anti-leakage Violation: Input features contain strictly forbidden post-cutoff or target outcome feature"`, the case-insensitive substring matched `"forbidden"` and produced exit code `3` (Auth Failure) instead of `2` (Validation Error).
- **Remediation:**
  - Refined exit code 3 matching to strictly require `"401"`, `"403"`, `"Unauthorized"`, or `"Permission Denied"`.
  - Added semantic HTTP status codes (`"400"`, `"404"`, `"409"`, `"422"`) and `"Anti-leakage"` to exit code 2.
- **Regression Test:** Added test cases in `cli/tests/config_and_consistency_tests.rs`.

---

## 3. End-to-End Verification Test Matrix (12/12 Passed)

All 12 matrix items were executed live against the compiled release binary (`cli/target/release/sutra`) communicating with an active FastAPI backend daemon:

| # | Matrix Verification Item | Test Type | Exact Command Executed | Expected Behavior | Result |
|---|---|---|---|---|---|
| **1** | Valid authentication & identity lookup | Live CLI | `sutra auth whoami` | Returns active verified status and campus tenancy | **PASSED (Exit 0)** |
| **2** | Student listing & profile lookup | Live CLI | `sutra students list`<br>`sutra students get SYN-1016` | Returns authorized student ledger and profile | **PASSED (Exit 0)** |
| **3** | Cross-campus & disallowed-role rejection | Live CLI | `sutra --campus <B> students list`<br>`sutra signals list` (as leadership) | HTTP 403 Forbidden; cross-campus & leadership access blocked | **PASSED (Exit 3)** |
| **4** | Observations & feature-readiness audit | Live CLI | `sutra students observations SYN-1016`<br>`sutra students readiness SYN-1016` | Chronological observation list and Day-30 audit | **PASSED (Exit 0)** |
| **5** | Student-specific prediction | Live CLI | `sutra predict --student SYN-1016` (incomplete)<br>`sutra predict --student SYN-1016-READY` (complete) | Incomplete student returns HTTP 422; complete student executes ML inference | **PASSED (Exit 2 & Exit 0)** |
| **6** | Anti-leakage & temporal cutoff rejection | Live CLI | `sutra predict --file <leaked.json>` | Rejects file containing forbidden target feature (`final_result`) | **PASSED (Exit 2)** |
| **7** | Research & demo source separation | Live CLI | `sutra datasets info`<br>`sutra datasets lookup --source oulad 11391` | Enforces ADR-005 isolation; prints legal disclaimer | **PASSED (Exit 0)** |
| **8** | Human signal review | Live CLI | `sutra signals review <ID> --decision approve --intervention academic_tutoring_offer --rationale "..."` | Records decision, provisions case, and enforces minimum rationale | **PASSED (Exit 0)** |
| **9** | Authorized case mutation chain & read-back | Live CLI | `sutra cases assign <ID>` (HOD)<br>`sutra cases transition <ID> --to-state ACCEPTED` (Mentor)<br>`sutra cases follow-up <ID>`<br>`sutra cases outcome <ID>`<br>`sutra cases get <ID>` | Advances case across lifecycle, records evidence proof, and reads back changes | **PASSED (Exit 0)** |
| **10** | AI service governance & financial exclusion | Live CLI | `sutra ai status`<br>`sutra ai evidence SYN-1016` | Returns 5-tier card with 0% financial data inclusion (ADR-003) | **PASSED (Exit 0)** |
| **11** | Logout & protected request rejection | Live CLI | `sutra auth logout`<br>`sutra students list` (unauthenticated) | Clears `~/.sutra/session.json`; unauthenticated request rejected with HTTP 401 | **PASSED (Exit 0 & Exit 3)** |
| **12** | Release binary smoke checks | Live CLI | `sutra --version`<br>`sutra --help`<br>`sutra <subcommand> --help` | All subcommands print formatted usage and options | **PASSED (Exit 0)** |

---

## 4. Live vs. Mock Test Coverage Summary

| Test Category | Suite / Harness | Total Tests | Mock vs. Live Details |
|---|---|---|---|
| **CLI Unit & Serialization** | `cargo test --test cli_tests` | 10 | Mock DTO payloads and JSON serialization |
| **Session & Secret Redaction** | `cargo test --test session_tests` | 11 | Filesystem permissions (`0700`/`0600`), symlink detection, token scrubbing |
| **Config Precedence & Exit Codes** | `cargo test --test config_and_consistency_tests` | 5 | Flag vs Env vs Session precedence, UUID validation, exit code mapping |
| **Datasets & Provenance** | `cargo test --test dataset_tests` | 5 | ADR-005 schema isolation and compound key rules |
| **Predict Schema & Anti-leakage** | `cargo test --test predict_tests` | 8 | 25-feature validation, cutoff day constraints, forbidden target checks |
| **Student Readiness Contracts** | `cargo test --test student_readiness_tests` | 3 | Observation DTOs and readiness invariants |
| **Student Domain Authorization** | `cargo test --test student_tests` | 7 | Cross-campus error sanitization and missing-field handling |
| **Workflow State Transitions** | `cargo test --test workflow_tests` | 6 | 10-state machine permitted transition graph and concurrency locks |
| **Backend REST & DB Suite** | `pytest tests/` | 131 | Database transactions, FastAPI endpoints, ML inference, Supabase readiness |
| **End-to-End Live Verification** | `scratch/run_phase16_...py` | 12 | Live compiled binary (`cli/target/release/sutra`) against running FastAPI server |

**Overall Verification Total:** **198 automated tests across Rust and Python, 100% passing.**

---

## 5. Security & Architectural Invariant Checklist

- [x] **No Direct Database Access:** Verified `cli/Cargo.toml` contains zero SQL drivers or PostgreSQL client libraries. All queries strictly traverse the authenticated FastAPI REST API.
- [x] **JWT Validation & POSIX Permissions:** Verified `~/.sutra/session.json` is clamped to mode `0600`, directory is clamped to `0700`, and symlinked pointers are rejected.
- [x] **Campus Isolation:** Verified cross-campus queries return HTTP 403 without leaking student existence or records across institutional boundaries.
- [x] **Role Authorization Parity:** Verified that leadership role is restricted to aggregate dashboards and strictly forbidden from individual student queues, signals, and observations.
- [x] **No Unconfirmed Mutations:** All CLI mutation commands verify HTTP 200/201 response payloads before reporting success to the terminal.
- [x] **Anti-Leakage & Temporal Isolation:** Both file-based and student-specific inference verify Day-30 cutoff semantics and reject outcome targets (`final_result`, `is_at_risk`).
- [x] **ADR-003 Data Minimization:** Financial balances and fee structures are strictly stripped prior to prompt compilation and evidence synthesis.
- [x] **Deterministic Exit Codes:** Verified `0` (Success), `1` (Backend/Network Error), `2` (Invalid Input / Validation / Policy Error), and `3` (Auth / 401 / 403 Error).

---

## 6. Unresolved Risks & Operational Recommendations

1. **Local Clock Skew:** JWT expiration checking via `parse_jwt_claims_diagnostic()` relies on the local system time (`Utc::now().timestamp()`). In environments with significant clock skew (>60s), expired tokens may be rejected locally before the backend evaluates them.  
   *Recommendation:* Rely on backend authoritative validation when in doubt.
2. **Supabase Revocation Latency:** Local CLI sessions store valid JWTs up to their natural token expiration. If an institution revokes user credentials centrally in Supabase Auth before the token expires, the local CLI session will still attempt requests until the backend rejects them.  
   *Recommendation:* Always run `sutra auth logout` when completing shifts on shared workstations.

---

*Phase 16 verification is complete. Phase 17 was not started.*
