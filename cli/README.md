# SUTRA Command-Line Interface (`sutra-cli`)

[![Rust](https://img.shields.io/badge/Rust-1.75%2B-orange.svg)](https://www.rust-lang.org/)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passing-brightgreen.svg)]()

> **Core Principle:** *"No Alert Without Action."*  
> SUTRA CLI is a secure terminal application for authorized institutional educators, department heads, and academic mentors to inspect student risk signals, coordinate intervention cases, query bounded AI briefs, and run verified early-warning ML inference.

---

## 1. System Requirements & Prerequisites

* **Operating System:** macOS (macOS 12+ on Apple Silicon or Intel) or Linux (x86_64 or aarch64).
* **Rust Toolchain:** Rust 1.75+ and Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`).
* **SUTRA Backend:** Running FastAPI service (default: `http://localhost:8000/api/v1`).

---

## 2. Building from Source

### Quick Build & Automated Verification
From the repository root, run the automated verification script:
```bash
./scripts/build_cli.sh
```
This script executes:
1. `cargo test --manifest-path cli/Cargo.toml` (Runs complete 29-test Rust suite)
2. `cargo build --manifest-path cli/Cargo.toml` (Compiles debug binary)
3. `cargo build --release --manifest-path cli/Cargo.toml` (Compiles optimized binary with LTO)
4. Verifies `--version` and `--help` output on the compiled binary

### Manual Cargo Commands
```bash
# Run tests
cargo test --manifest-path cli/Cargo.toml

# Build debug binary (cli/target/debug/sutra)
cargo build --manifest-path cli/Cargo.toml

# Build optimized release binary (cli/target/release/sutra)
cargo build --release --manifest-path cli/Cargo.toml
```

---

## 3. Installation & Upgrade

### Standard Installation
Install the compiled release binary into `~/.local/bin` (or a custom path):
```bash
# Installs to ~/.local/bin by default (no sudo required)
./scripts/install_cli.sh

# Or install to a custom directory:
./scripts/install_cli.sh /usr/local/bin
```

### PATH Configuration
Ensure `~/.local/bin` is in your shell `PATH`:
```bash
# For zsh (default macOS):
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# For bash:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
```

### Verify Installation
```bash
sutra --version
sutra --help
```

### Upgrading
To upgrade, pull repository changes and re-run `./scripts/install_cli.sh`. The installer safely overwrites only the `sutra` binary with the freshly built release.

---

## 4. Configuration & Environment Variables

SUTRA CLI reads configuration using the following precedence hierarchy:
1. **Command-Line Global Flags** (Highest precedence)
2. **Environment Variables**
3. **Persisted Local Session** (`~/.sutra/session.json`)
4. **Compiled Defaults** (Lowest precedence)

| Setting | Global CLI Flag | Environment Variable | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| **API URL** | `--url <URL>` | `SUTRA_API_URL` | `http://localhost:8000/api/v1` | Base URL of SUTRA backend |
| **Campus Tenancy** | `--campus <UUID>` | `SUTRA_CAMPUS_ID` | `00000000-0000-0000-0000-000000000001` | Active Institution Campus ID |
| **Authentication** | `--token <JWT>` | `SUTRA_AUTH_TOKEN` | *Session storage* | Supabase JWT Bearer token |

---

## 5. Authentication & Session Management

SUTRA uses secure local sessions to eliminate the need to repeatedly pass bearer tokens in command-line arguments.

### `sutra auth login`
Securely prompts for a Supabase JWT without echoing to the terminal, verifies it against `/api/v1/auth/me`, and persists the validated session:
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
Securely removes local credentials:
```bash
sutra auth logout
# ✓ Local session cleared successfully.
```

### Session Storage & Security Invariants
* **Location:** `~/.sutra/session.json`
* **Directory Permissions:** Strictly `0700` (`rwx------`) on POSIX systems.
* **File Permissions:** Strictly `0600` (`rw-------`) on POSIX systems.
* **Token Redaction:** Bearer tokens are automatically redacted in console logs and error output (`eyJ...[REDACTED]`).
* **Expiry Check:** Sessions past their JWT expiration timestamp are rejected cleanly with instructions to re-login.

---

## 6. Command Reference & Usage Examples

### 6.1 Health & Readiness
```bash
sutra health
```
Checks public backend liveness (`GET /health`) and database/ML readiness (`GET /ready`).

---

### 6.2 Controlled Intervention Catalogue
```bash
sutra catalogue
```
Lists available institutional support interventions, responsible recipient roles, and domains (academic, mentor, finance, counselling).

---

### 6.3 Signal Triage & Educator Review
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

*Note: Decisions are `approve`, `modify`, `dismiss`, or `request_more_data`. Rationales must be at least 5 characters.*

---

### 6.4 Student Support Cases (10-State Lifecycle)
```bash
# List active cases
sutra cases list

# Filter cases by state
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

### 6.5 Bounded AI Advisory Subsystem
```bash
# Check AI provider status, model name, and safety invariants
sutra ai status

# Generate structured AI review brief for a signal (Advisory Only)
sutra ai review-brief <SIGNAL_UUID>

# Synthesize multi-domain student telemetry (ADR-003 financial privacy preserved)
sutra ai summarize <STUDENT_UUID>
```

---

### 6.6 Day-30 Early-Warning ML Inference
```bash
# Execute inference against validated 25-feature JSON vector
sutra predict --file cli/tests/fixtures/valid_sample.json
```

Output includes:
* Calibration state and decision threshold (0.46)
* Risk probability progress bar and classification
* Evidence Card top risk drivers and protective factors
* Model governance limitations and non-causal disclaimer

> [!WARNING]  
---

### 6.7 Output Formatting & Machine-Readable Output
All CLI commands format results as structured, ANSI-highlighted terminal output with clear tables, badges, and suggested next steps. 

Machine-readable JSON data exchange is supported when:
1. Providing structured input vectors to `sutra predict --file <PATH.json>`.
2. Inspecting the local session in `~/.sutra/session.json`.
3. Querying backend REST endpoints directly (`/api/v1/*`).

*Note: Global stdout formatting (`--json`) is not currently implemented; terminal output is tailored for human staff interaction.*

---

## 7. Troubleshooting & Common Errors

| Error Message | Cause | Resolution |
| :--- | :--- | :--- |
| `HTTP 401 Unauthorized` | Missing, expired, or invalid session token | Run `sutra auth login` to refresh credentials. |
| `HTTP 403 Forbidden` / `LEADERSHIP_QUEUE_ACCESS_DENIED` | Executive leadership role attempted to access individual student queue | Leadership is restricted to cohort aggregates per ADR-004. Log in with `faculty`, `mentor`, or `hod` role. |
| `HTTP 503 Service Unavailable` | Backend database or model is unready | Ensure PostgreSQL and ML model services are running on the server. |
| `StateConflictError` / `Transition ... is not allowed` | Attempted illegal state transition in case lifecycle | Run `sutra cases get <CASE_ID>` to view `Canonical Next States`. |
| `Failed to connect to backend` / `os error 61` | FastAPI server is not running on configured URL | Check `--url` parameter or verify server process status. |

---

## 8. Unsupported Operations & Known Blockers

* **`sutra student score <ID>`:** **Unsupported / Blocked.**
  - Operational PostgreSQL tables (`Student`, `StudentObservation`) store event logs and demographics, but do **not** contain the canonical 25 Day-30 OULAD features required by the production model.
  - No authorized backend feature-retrieval route exists (`POST /api/v1/students/{id}/score` does not exist).
  - In adherence to safety invariants, SUTRA CLI refuses to generate synthetic or hardcoded scores for live student IDs. Use `sutra predict --file <PATH>` with verified feature files.
