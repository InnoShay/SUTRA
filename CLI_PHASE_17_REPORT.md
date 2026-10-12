# SUTRA CLI — Phase 17: Cargo Release, Installation, and Onboarding Report

**Date:** 2026-10-12  
**Branch:** `cli`  
**Phase:** 17 (Cargo Release, Installation, and Onboarding)  
**Status:** COMPLETE (Zero Failures, 55/55 Cargo Tests Passing)  
**Binary Package:** `sutra-cli` v1.0.0 (`sutra`)

---

## 1. Executive Summary & Objective

The objective of **Phase 17** was to deliver a repeatable, verified, and thoroughly documented way to build, test, install, configure, update, and use the complete SUTRA Command-Line Interface (`sutra-cli`).

Building upon the security and integration parity established across Phases 9–16, Phase 17 verified:
1. Release compilation via `cargo build --release --manifest-path cli/Cargo.toml`.
2. Execution of the complete 55-test Rust test suite (`cargo test --manifest-path cli/Cargo.toml`).
3. Local Cargo installation via `cargo install --path cli` into user space (`~/.cargo/bin/sutra`).
4. Standalone shell installation via `./scripts/install_cli.sh` into user space (`~/.local/bin/sutra`).
5. Strict user-space execution avoiding any need for `sudo` or administrator privileges.
6. Non-destructive installation ensuring no unrelated files or credentials are overwritten.
7. Verification of `--version`, `--help`, and all representative subcommands.
8. Comprehensive onboarding, PATH configuration, and troubleshooting documentation in `cli/README.md`.
9. Explicit operational clarification of student-specific scoring prerequisites and research fixture isolation.

---

## 2. Build and Test Verification

### 2.1 Release Build (`cargo build --release`)
* **Command:** `cargo build --release --manifest-path cli/Cargo.toml`
* **Configuration:**
  * Profile: `release` (LTO enabled, `opt-level = 3`, `codegen-units = 1`, `panic = "abort"`, `strip = true`)
  * Target Binary: `cli/target/release/sutra`
* **Result:** Exit code `0` (Compiled in 22.57s; clean build with 0 compiler warnings or errors).

### 2.2 Test Suite Execution (`cargo test`)
* **Command:** `cargo test --manifest-path cli/Cargo.toml`
* **Test Summary:** 55 tests passed; 0 failed; 0 ignored; finished in 0.00s.
* **Test Breakdown:**
  * `tests/cli_tests.rs`: 10 passed (serialization, request contracts, AI brief deserialization)
  * `tests/config_and_consistency_tests.rs`: 5 passed (precedence hierarchy, UUID validation, exit codes)
  * `tests/dataset_tests.rs`: 5 passed (provenance safety, compound key isolation, identifier rules)
  * `tests/predict_tests.rs`: 8 passed (feature schema, anti-leakage rejection, cutoff day validation)
  * `tests/session_tests.rs`: 11 passed (token redaction, permissions, expiry, debug formatting)
  * `tests/student_readiness_tests.rs`: 3 passed (observation DTO, Day-30 readiness invariants)
  * `tests/student_tests.rs`: 7 passed (cross-campus isolation, role redaction, student views)
  * `tests/workflow_tests.rs`: 6 passed (canonical state machine, idempotency, auth failure)

---

## 3. Installation Verification

Two distinct user-space installation methods were verified:

### 3.1 Method A: Cargo Local Package Install
* **Package Configuration:** In `cli/Cargo.toml`, package name is `sutra-cli` with binary `[[bin]] name = "sutra"`.
* **Tested Command:**
  ```bash
  cargo install --path cli --root /tmp/sutra_cargo_install_test
  ```
* **Installed Artifact:** `/tmp/sutra_cargo_install_test/bin/sutra`
* **Standard Target Location:** `${HOME}/.cargo/bin/sutra`
* **Verification:**
  * Installed binary version: `sutra 1.0.0`
  * Execution of `sutra --help`: Exit code 0.
  * Cleanup: Temporary test root was cleaned up completely after test verification.

### 3.2 Method B: User-Space Installer Script (`./scripts/install_cli.sh`)
* **Installer Implementation:** `scripts/install_cli.sh`
* **Script Characteristics:**
  * Strict execution: `set -euo pipefail`.
  * Platform verification: Explicitly verifies `Darwin` (macOS) and `Linux`.
  * User-space default: Installs to `${HOME}/.local/bin/sutra` without `sudo`.
  * Custom destination support: `./scripts/install_cli.sh <CUSTOM_DIR>`.
  * Permission checks: Fails early and informatively if the target directory is not writable by the current user.
  * File isolation: Safely copies only the `sutra` binary and sets `chmod 755`.
  * PATH advisory: Detects whether target directory is missing from `$PATH` and prints shell configuration instructions.
* **Tested Command:**
  ```bash
  ./scripts/install_cli.sh /tmp/sutra_script_install_test
  ```
* **Installed Artifact:** `/tmp/sutra_script_install_test/sutra`
* **Verification:**
  * Installed binary version: `sutra 1.0.0`
  * Execution of `sutra --help`: Exit code 0.
  * Cleanup: Temporary test root was cleaned up completely after test verification.

---

## 4. Command Hierarchy & Version Verification

All root commands and representative subcommands were systematically verified for syntax, flags, and help output:

| Command | Exit Code | Verified Scope / Capability |
| :--- | :---: | :--- |
| `sutra --version` | `0` | Displays version string: `sutra 1.0.0` |
| `sutra --help` | `0` | Displays global flags (`--url`, `--campus`, `--token`, `--json`) and subcommands |
| `sutra auth --help` | `0` | Exposes `login`, `whoami`, `logout` subcommands |
| `sutra students --help` | `0` | Exposes `list`, `get`, `readiness` subcommands |
| `sutra signals --help` | `0` | Exposes `list`, `get`, `review` subcommands |
| `sutra cases --help` | `0` | Exposes `list`, `get`, `assign`, `transition`, `follow-up`, `outcome` |
| `sutra ai --help` | `0` | Exposes `status`, `review-brief`, `summarize`, `evidence` subcommands |
| `sutra predict --help` | `0` | Exposes `--file <PATH>` and `--student <ID_OR_REF>` options |
| `sutra datasets --help` | `0` | Exposes `overview` and `sample` subcommands |

---

## 5. Security and Environment Protections

1. **Zero Administrator Privileges:**
   * Both `cargo install --path cli` and `./scripts/install_cli.sh` operate purely in user directories (`~/.cargo/bin` or `~/.local/bin`).
   * No `sudo`, root ownership, or system daemon registration is ever required.
2. **File Isolation & Clean Packaging:**
   * The installer touches only the destination binary path (`sutra`).
   * No system-wide library paths or unrelated binaries are modified.
3. **Session & Credential Safety:**
   * Session storage directory (`~/.sutra`) is enforced at POSIX mode `0700`.
   * Session file (`~/.sutra/session.json`) is enforced at POSIX mode `0600`.
   * Symlink session hijacking attempts are rejected.
   * Debug representations and HTTP error messages scrub Bearer tokens (`eyJh...[REDACTED]`).
4. **Research and Synthetic Fixture Boundary:**
   * Synthetic and OULAD research records cannot be written to operational tables.
   * Benchmark samples carry mandatory provenance headers and non-institutional disclaimers.

---

## 6. Student-Specific Scoring Prerequisites & Operational Guidance

### 6.1 Prerequisites for `sutra predict --student <ID>`
* SUTRA CLI adheres strictly to the rule: **No Alert Without Action, No Score Without Verified Telemetry**.
* For live student inference:
  1. The student must exist in the active campus tenancy.
  2. The student must have all **25 canonical Day-30 observations** recorded in the institutional ledger.
  3. If observations are incomplete, the backend returns `HTTP 422 Unprocessable Entity` containing an explicit Day-30 readiness shortfall breakdown.
  4. SUTRA CLI refuses to synthesize missing institutional features or inject default values into live student records.
  5. Educators and mentors can run `sutra students readiness <ID>` at any time to inspect observational completeness and determine missing telemetry.

### 6.2 Precedence Hierarchy
Runtime configuration is determined strictly in order:
1. Command-line flags (`--url`, `--campus`, `--token`, `--json`)
2. Environment variables (`SUTRA_API_URL`, `SUTRA_CAMPUS_ID`, `SUTRA_AUTH_TOKEN`, `SUTRA_JSON`)
3. Persisted local session (`~/.sutra/session.json`)
4. Compiled defaults (`http://localhost:8000/api/v1`)

---

## 7. Artifacts and Documentation Updated

* **`cli/README.md`:** Comprehensively updated to reflect all capabilities through Phase 17:
  * Updated test badge to **55/55 Passing**.
  * Detailed installation instructions for both `cargo install --path cli` and `./scripts/install_cli.sh`.
  * Shell PATH configuration for both `zsh` and `bash`.
  * Complete command references for `auth`, `health`, `catalogue`, `students`, `signals`, `cases`, `ai`, `predict`, and `datasets`.
  * Machine-readable `--json` global flag documentation.
  * Standard exit codes (0, 1, 2, 3) and troubleshooting matrix.
  * Explicit student-specific scoring prerequisites and research fixture boundaries.
* **`scripts/build_cli.sh`:** Automated build, test, and release verification script.
* **`scripts/install_cli.sh`:** Standalone POSIX user-space installer with error checking and PATH guidance.

---

## 8. Conclusion and Next Steps

Phase 17 successfully verified that the SUTRA CLI is fully packageable, installable, configurable, and thoroughly documented for multi-platform user-space deployment.

**Phase 18 has NOT been started**, in accordance with instructions.
