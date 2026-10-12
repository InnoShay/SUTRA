# SUTRA Command-Line Interface (`sutra-cli`)

[![Rust](https://img.shields.io/badge/Rust-1.75%2B-orange.svg)](https://www.rust-lang.org/)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-55%2F55%20Passing-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-lightgrey.svg)]()

> **Core Principle:** *"No Alert Without Action."*  
> SUTRA CLI is a secure terminal application for authorized institutional educators, department heads, and academic mentors to inspect student risk signals, coordinate intervention cases, query bounded AI briefs, inspect Day-30 observation readiness, and execute verified early-warning ML inference.

---

## 1. System Requirements & Prerequisites

* **Operating System:**
  * **macOS:** macOS 12 Monterey or newer (Apple Silicon `aarch64` or Intel `x86_64`).
  * **Linux:** Standard POSIX Linux distribution with glibc 2.28+ (x86_64 or aarch64).
* **Rust Toolchain:** Rust 1.75+ and Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`).
* **SUTRA Backend:** Running FastAPI service (default: `http://localhost:8000/api/v1`).
* **Privileges:** Zero administrator (`sudo`/root) privileges required. All builds and installations operate completely within user space (`~/.cargo/bin` or `~/.local/bin`).

---

## 2. Building from Source

### Quick Build & Automated Verification
From the repository root, run the automated verification script:
```bash
./scripts/build_cli.sh
```
This script executes:
1. `cargo test --manifest-path cli/Cargo.toml` (Runs complete 55-test Rust suite)
2. `cargo build --manifest-path cli/Cargo.toml` (Compiles debug binary)
3. `cargo build --release --manifest-path cli/Cargo.toml` (Compiles optimized binary with LTO)
4. Verifies `--version` and `--help` output on the compiled release binary

### Manual Cargo Commands
```bash
# Run the complete test suite
cargo test --manifest-path cli/Cargo.toml

# Build debug binary (target: cli/target/debug/sutra)
cargo build --manifest-path cli/Cargo.toml

# Build optimized release binary (target: cli/target/release/sutra)
cargo build --release --manifest-path cli/Cargo.toml
```

---

## 3. Installation & Upgrade

You can install the SUTRA CLI using either standard Cargo packaging or the standalone shell installer. Both install into user space without requiring root privileges.

### Method A: Cargo Install (Standard)
Install directly from the local repository checkout into your Cargo binary directory:
```bash
cargo install --path cli
```
* **Installed binary:** `~/.cargo/bin/sutra`
* **PATH configuration:** Ensure `~/.cargo/bin` is in your shell PATH (standard Rustup setup).

### Method B: Standalone User-Space Installer Script
Alternatively, use the provided installer script to copy the release binary into `~/.local/bin`:
```bash
# Installs to ~/.local/bin by default
./scripts/install_cli.sh

# Or install to a custom directory:
./scripts/install_cli.sh ~/.local/bin
```
* **Installed binary:** `~/.local/bin/sutra` (permissions set to `0755`)

### PATH Configuration
To ensure `sutra` can be run from any terminal session, configure your shell profile:

#### For zsh (Default macOS and modern Linux)
```bash
# If using Cargo install:
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# If using script installer:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

#### For bash (Default Linux)
```bash
# If using Cargo install:
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# If using script installer:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
```

### Verify Installation
```bash
sutra --version
# Output: sutra 1.0.0

sutra --help
```

### Upgrading
To upgrade to the latest version:
1. Pull the latest commits from the repository (`git pull`).
2. Re-run `cargo install --path cli` or `./scripts/install_cli.sh`.
3. The existing `sutra` binary is overwritten cleanly without affecting your saved session at `~/.sutra/session.json`.

---

## 4. Configuration & Environment Variables

SUTRA CLI resolves runtime configuration using a strict precedence hierarchy:
1. **Command-Line Global Flags** (Highest precedence)
2. **Environment Variables**
3. **Persisted Local Session** (`~/.sutra/session.json`)
4. **Compiled Defaults** (Lowest precedence)

| Setting | Global CLI Flag | Environment Variable | Session / Fallback Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| **API URL** | `--url <URL>` | `SUTRA_API_URL` | `http://localhost:8000/api/v1` | Base URL of SUTRA backend |
| **Campus Tenancy** | `--campus <UUID>` | `SUTRA_CAMPUS_ID` | Session campus / Default UUID | Active Institution Campus ID |
| **Authentication** | `--token <JWT>` | `SUTRA_AUTH_TOKEN` | Token stored in `~/.sutra/session.json` | Supabase JWT Bearer token |
| **Output Format** | `--json` | `SUTRA_JSON=1` | Formatted terminal text (default) | Output raw JSON machine-readable responses |

---

## 5. Authentication & Session Management

SUTRA uses secure local sessions to eliminate the need to pass bearer tokens repeatedly in command-line arguments.

### `sutra auth login`
Prompts for a Supabase JWT without echoing to the terminal, verifies it against the backend (`GET /api/v1/auth/me`), and persists the validated session:
```bash
sutra auth login
# Prompt: Enter SUTRA Bearer JWT Token: [hidden]
# Validates session with backend...
# ✓ Authentication successful!
#   User:   faculty@sutra.edu (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
#   Campus: Apex Institute of Technology (11111111-1111-1111-1111-111111111111)
#   Roles:  faculty, mentor
```

### `sutra auth whoami`
Displays the currently active verified identity, campus tenancy, and roles:
```bash
sutra auth whoami
```

### `sutra auth logout`
Securely removes local session credentials:
```bash
sutra auth logout
# ✓ Local session cleared successfully.
```

### Session Security Invariants
* **Location:** `~/.sutra/session.json`
* **Directory Permissions:** Strictly `0700` (`rwx------`) on POSIX systems.
* **File Permissions:** Strictly `0600` (`rw-------`) on POSIX systems.
* **Symlink Protection:** Session file creation fails if `~/.sutra/session.json` is a symlink.
* **Token Redaction:** Bearer tokens are automatically scrubbed and redacted in console output, debug representations, and error logs (`eyJh...[REDACTED]`).
* **Expiry Check:** Sessions past their JWT expiration timestamp are rejected cleanly with instructions to re-authenticate.

---

## 6. Command Reference & Usage Examples

### 6.1 Health & Readiness
```bash
# Check public backend liveness and database/ML readiness
sutra health
```

---

### 6.2 Controlled Intervention Catalogue
```bash
# List institutional support interventions, recipient roles, and policy domains
sutra catalogue
```

---

### 6.3 Student Records & Observation Readiness
```bash
# List students enrolled in the active campus tenancy
sutra students list

# Look up student profile by UUID or institutional reference ID
sutra students get STU-2026-0001

# Inspect Day-30 early-warning observation readiness and feature completeness
sutra students readiness STU-2026-0001
```

*Note: The readiness command verifies whether the student has the full 25 Day-30 observations needed for ML scoring, or details the exact shortfalls.*

---

### 6.4 Signal Triage & Educator Review
```bash
# List unreviewed risk signals in current campus queue
sutra signals list

# Filter queue by result
sutra signals list --result attention_suggested

# View full signal telemetry, rule key, and evidence card
sutra signals get <SIGNAL_UUID>

# Record authorized human review (No Alert Without Action)
sutra signals review <SIGNAL_UUID> \
  --decision approve \
  --intervention academic_tutoring_offer \
  --rationale "Consecutive low lab attendance; tutoring assigned per policy."
```

*Decisions must be one of: `approve`, `modify`, `dismiss`, or `request_more_data`. Rationales must be at least 5 characters.*

---

### 6.5 Student Support Cases (10-State Lifecycle)
```bash
# List active cases
sutra cases list

# Filter cases by lifecycle state
sutra cases list --state assigned

# Inspect case details, timeline events, follow-ups, and canonical next states
sutra cases get <CASE_UUID>

# Assign case accountability to primary owner
sutra cases assign <CASE_UUID> --user-id <STAFF_UUID> --due 2026-10-25T17:00:00Z

# Advance case state in canonical lifecycle
sutra cases transition <CASE_UUID> --to-state accepted

# Record verified follow-up contact and evidence
sutra cases follow-up <CASE_UUID> \
  --channel in_person \
  --proof faculty_meeting_notes \
  --note "Met student in tutorial lab; provided catch-up materials."

# Record final observed outcome and close case
sutra cases outcome <CASE_UUID> \
  --status helped \
  --rationale "Student attended tutoring and completed outstanding lab assignments."
```

---

### 6.6 Bounded AI Advisory Subsystem
```bash
# Check AI provider status, model name, and safety invariants
sutra ai status

# Generate structured AI review brief for a signal (Advisory Only)
sutra ai review-brief <SIGNAL_UUID>

# Synthesize multi-domain student telemetry (financial records strictly excluded per ADR-003)
sutra ai summarize <STUDENT_UUID>

# Generate structured evidence card for a student
sutra ai evidence <STUDENT_UUID>
```

---

### 6.7 Day-30 Early-Warning ML Inference
```bash
# 1. Run inference from a validated 25-feature JSON file:
sutra predict --file cli/tests/fixtures/valid_sample.json

# 2. Run inference for an enrolled student (requires Day-30 observation readiness):
sutra predict --student STU-2026-0001
```

Output includes:
* Calibration state and decision threshold (`0.46`)
* Risk probability progress bar and classification (`HIGH_RISK` / `STANDARD`)
* Evidence Card top risk drivers and protective factors
* Model governance limitations and non-causal disclaimer

---

### 6.8 Dataset Provenance & Benchmarks
```bash
# View dataset provenance overview, split rules, and safety disclaimers
sutra datasets overview

# Inspect sample OULAD research benchmark record
sutra datasets sample --type oulad

# Inspect sample synthetic benchmark record
sutra datasets sample --type synthetic
```

*Strict Governance Rule: Synthetic and research benchmark records are explicitly labeled and cannot be written into institutional operational tables.*

---

### 6.9 Global Machine-Readable JSON Output (`--json`)
Append `--json` to any command for programmatic CI/CD integration and automated pipeline scripts:
```bash
sutra health --json
sutra auth whoami --json
sutra students list --json
sutra predict --file cli/tests/fixtures/valid_sample.json --json
```

---

## 7. Troubleshooting & Common Errors

| Error / Symptom | Exit Code | Cause | Resolution |
| :--- | :---: | :--- | :--- |
| `HTTP 401 Unauthorized` | `2` | Missing, expired, or invalid session token | Run `sutra auth login` to refresh credentials. |
| `HTTP 403 Forbidden` / `LEADERSHIP_QUEUE_ACCESS_DENIED` | `2` | Executive leadership role attempted to access individual student queue | Leadership is restricted to cohort aggregates per ADR-004. Log in with `faculty`, `mentor`, or `hod` role. |
| `HTTP 404 Not Found` | `2` | Target student, signal, or case does not exist in active campus | Verify ID using `sutra students list`, `sutra signals list`, or `sutra cases list`. |
| `HTTP 409 Conflict` / `Transition ... is not allowed` | `2` | Attempted illegal state transition in case lifecycle | Run `sutra cases get <CASE_ID>` to view `Canonical Next States`. |
| `HTTP 422 Unprocessable Entity` / `Incomplete Day-30 observations` | `2` | Student lacks 25 canonical observations for ML scoring | Run `sutra students readiness <ID>` to inspect missing features. Live student scoring requires 25 canonical observations. |
| `Failed to connect to backend` / `os error 61` | `1` | FastAPI server is not running on configured URL | Check `--url` parameter or verify server process status. |
| `Invalid UUID` or argument validation error | `1` | Malformed CLI parameter or payload | Check argument syntax using `sutra <subcommand> --help`. |

### Standard Exit Codes
* `0`: Success.
* `1`: Operational or network failure (e.g. backend offline, I/O error).
* `2`: Domain, authorization, or validation error (e.g. 401, 403, 404, 409, 422).
* `3`: Safety invariant or anti-leakage rejection (e.g. attempt to inject forbidden features).

---

## 8. Student-Specific Scoring Prerequisites & Safety Boundaries

### Live Student Scoring Contract
When executing `sutra predict --student <ID_OR_REF>`:
1. The backend verifies that the caller has institutional staff authorization for the student's campus tenancy.
2. The backend queries the student's operational `StudentObservation` records up to the canonical Day-30 cutoff.
3. If all 25 canonical Day-30 features are present, the validated feature vector is scored by the calibrated production model.
4. **If observations are incomplete or missing:** The backend returns `HTTP 422 Unprocessable Entity` detailing the specific missing features and readiness shortfall. SUTRA strictly refuses to substitute synthetic values or impute arbitrary defaults into institutional records. Use `sutra students readiness <ID_OR_REF>` to inspect observational completeness.

### Research and Synthetic Data Safety
* Synthetic fixtures and OULAD research datasets are accessible solely via `sutra datasets *` for benchmarking and audit.
* They carry explicit non-operational disclaimers and can never be merged with live campus ledgers.
