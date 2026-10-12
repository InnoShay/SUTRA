# SUTRA CLI — Phase 15 Verification & Consistency Report

**Date:** October 12, 2026  
**Status:** Completed & Fully Validated  
**Binary Artifact:** `cli/target/release/sutra` (Release Profile, size ~11MB)  
**Test Suite:** 53 Cargo Tests Passed, 130 Pytest Tests Passed, 100% Phase 15 Live Verification Invariants Met  

---

## 1. Executive Summary

Phase 15 delivers comprehensive terminal usability, predictable configuration precedence, robust input validation, secure credential isolation, deterministic exit codes, and universal structured JSON output across the entire SUTRA CLI command hierarchy without mutating existing domain semantics or business logic.

---

## 2. Configuration Precedence & Tenant Selection

Configuration resolution follows a strict three-tier hierarchy across all CLI invocations:

| Precedence Level | Backend API URL | Campus Tenancy UUID | Authentication Token | Output Format |
|---|---|---|---|---|
| **Tier 1 (CLI Flag)** | `--url <URL>` | `--campus <UUID>` | `--token <JWT>` | `--json` |
| **Tier 2 (Environment)** | `SUTRA_API_URL` | `SUTRA_CAMPUS_ID` | `SUTRA_TOKEN` / `SUTRA_AUTH_TOKEN` | — |
| **Tier 3 (Stored Session)** | Default fallback (`http://localhost:8000/api/v1`) | `active_campus_id` in `~/.sutra/session.json` | `access_token` in `~/.sutra/session.json` | Human-Readable (default) |

### Validation & Malformed Tenancy Safeguards
- Malformed `--campus` or `SUTRA_CAMPUS_ID` UUIDs are intercepted before issuing any network requests.
- Returns actionable stderr: `"Error: Invalid --campus UUID '<VAL>'. Must be a valid 36-character UUID."`
- Process immediately exits with code `2` (Invalid Input / Usage).

---

## 3. Deterministic Exit Codes

To support reliable CI/CD pipelines, shell automation, and scripting, SUTRA CLI adheres to standardized POSIX exit code mappings:

| Exit Code | Classification | Trigger Conditions |
|---|---|---|
| **`0`** | **Success** | Command completed successfully (human-readable or JSON). |
| **`1`** | **Network / Backend Failure** | Connection refused, timeout, server 500 error, or unhandled system error. |
| **`2`** | **Validation / Usage Error** | Missing CLI arguments, malformed UUID, invalid date format, or policy violation (e.g. invalid state machine transition). |
| **`3`** | **Auth / Access Denial** | HTTP 401 Unauthorized (expired/missing token), HTTP 403 Forbidden (cross-campus tenant mismatch, role denial). |

---

## 4. Universal `--json` Output Support

The global `--json` flag is supported across all subcommands and produces valid, parseable JSON on stdout:

- `sutra health --json`: Combined JSON containing liveness (`health`) and database/ML model readiness (`ready`).
- `sutra auth whoami --json`: Verified user identity, email, active session status, and campus memberships.
- `sutra catalogue --json`: Complete array of campus-controlled intervention catalogue items.
- `sutra students list --json`: Array of student summary profiles in the active campus tenancy.
- `sutra students get <ID> --json`: Student profile and multi-domain posture overview.
- `sutra students observations <ID> --json`: Structured observation records with telemetry timestamps and quality flags.
- `sutra students readiness <ID> --json`: 25-feature Day-30 readiness audit with completeness ratio and gaps.
- `sutra signals list --json`: Active triage signals in the queue.
- `sutra signals get <ID> --json`: Signal telemetry, evidence packet, and ML attributions.
- `sutra signals review <ID> --json`: Human review decision confirmation and resulting case linkage.
- `sutra cases list --json`: Filtered cases in active lifecycle states.
- `sutra cases get <ID> --json`: Full case lifecycle record, owner assignments, follow-up log, and outcome.
- `sutra cases transition <ID> --json`: State transition audit record.
- `sutra cases assign <ID> --json`: Ownership assignment audit record.
- `sutra cases follow-up <ID> --json`: Follow-up delivery event record with proof kinds.
- `sutra cases outcome <ID> --json`: Final case outcome review and terminal transition.
- `sutra ai status --json`: AI service readiness and governance parameters.
- `sutra ai review-brief <ID> --json`: Advisory 5-tier review brief.
- `sutra ai evidence <ID> --json`: 5-tier evidence card with strict ADR-003 financial data segregation.
- `sutra predict --json`: Prediction probability, risk band, and top feature attributions.
- `sutra datasets info --json`: Provenance metadata across institutional, OULAD research, and synthetic records.
- `sutra datasets lookup --json`: Provenance-bounded dataset records with research disclaimers.

---

## 5. Security & Sensitive Information Isolation

- **Token Redaction:** Bearer tokens passed via CLI flags or environment variables are never echoed in stdout, error traces, or audit logs.
- **Session File Security:** Stored session file `~/.sutra/session.json` is enforced with strict `0600` POSIX file permissions. Permissive file modes and symlinks are rejected.
- **Financial Exclusion:** Financial observations and aid indicators are excluded from all AI evidence cards and prompts per ADR-003.

---

## 6. Verification Summary

1. **Rust Test Suite:** 53 unit and integration tests passing (`cargo test --manifest-path cli/Cargo.toml`).
2. **Python Backend Test Suite:** 130 Pytest tests passing across auth, signals, cases, policies, AI, ML, and datasets.
3. **Live Verification Script:** `scratch/run_phase15_live_verification.py` verified against live FastAPI daemon:
   - Subcommand `--help` audit: 10/10 passed.
   - Global `--json` serialization: 100% compliant.
   - Precedence and malformed UUID tests: verified exit code `2`.
   - 401 & 403 authorization checks: verified exit code `3`.
   - Offline backend network failure: verified exit code `1`.
   - Token leakage probe: verified 0% secret leakage.
