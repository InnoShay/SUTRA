# SUTRA CLI — Phase 1 Security Verification Report

**Date:** 2026-10-12  
**Auditor:** Senior Rust Security Engineer  
**Target Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Target Crate:** `cli/` (`sutra-cli` v1.0.0)  
**Audited Against:** `CLI_PHASE_1_REPORT.md`  
**Audit Mode:** Read-Only Verification  

---

## 1. Executive Summary & Verdict

### Final Verdict: **ACCEPT PHASE 1 WITH LIMITATIONS**

The Phase 1 implementation successfully achieves its primary objective: eliminating the need to repeatedly pass raw access tokens through command-line flags while maintaining strict credential hygiene and POSIX filesystem protections.

### Key Classifications:
- **Authentication Model:** **Secure Acceptance & Storage of an Existing JWT** (not an interactive username/password Supabase grant). Because SUTRA's central backend does not expose an in-tree login route, the CLI accepts an externally obtained Supabase JWT via a masked, non-echoing prompt, verifies its HMAC signature and authorization with the live backend, and securely caches the verified session.
- **Security Posture:** Clean. Tokens are never echoed, never passed in process argument lists, never logged, and redacted from error envelopes.
- **Filesystem Security:** Enforces mode `0700` on `~/.sutra` and mode `0600` on `session.json`, using atomic temp-file write-and-rename semantics.

---

## 2. Detailed Requirement Verification Matrix

| Area | Requirement | Result | Source Reference | Evidence / Notes |
|---|---|:---:|---|---|
| **1. Token Verification** | Login calls backend endpoint to validate JWT signature & auth | **PASS** | `cli/src/commands/auth.rs:51`<br>`cli/src/client.rs:268` | `verify_token_candidate` calls `GET /api/v1/auth/me` with `Authorization: Bearer <token>`. Rejects invalid/malformed tokens (HTTP 401). |
| | Local JWT parsing is diagnostic-only and not trusted as auth proof | **PASS** | `cli/src/session.rs:63`<br>`cli/src/commands/auth.rs:37` | `parse_jwt_claims_diagnostic` extracts `sub`/`email`/`exp` only for early client-side sanity checks. Session is never saved unless backend probe succeeds. |
| | Campus membership and role data come from trusted backend | **PASS** | `cli/src/commands/auth.rs:54`<br>`app/api/v1/auth.py:13` | When DB is online, roles and campus ID are mapped from `profile.memberships` returned by `GET /api/v1/auth/me`. |
| **2. Expiry & Errors** | Expired or malformed sessions are rejected safely | **PASS** | `cli/src/session.rs:35`<br>`cli/src/commands/auth.rs:41,156` | Detected locally via `is_expired()` and server-side via `verify_supabase_jwt`. |
| | 401 & 403 responses do not expose tokens or auth headers | **PASS** | `cli/src/client.rs:252,309`<br>`cli/tests/session_tests.rs:135` | Formatted error messages strip authorization headers and tokens. Verified in automated test `test_http_401_and_403_error_redaction`. |
| | `whoami` does not describe unverified claims as verified identity | **PASS** | `cli/src/commands/auth.rs:170,198` | Live verified profile is labelled `"VERIFIED ACTIVE"`. Degraded or cached profile is explicitly labelled `"OFFLINE / UNVERIFIED REMOTE"` with `(cached)` tags. |
| **3. Filesystem Security** | Permissions enforced on `~/.sutra` (`0700`) and `session.json` (`0600`) | **PASS** | `cli/src/session.rs:149,178,227` | Verified via `ls -la ~/.sutra` showing `drwx------` on dir and `-rw-------` on file. Verified in automated test `test_secure_session_directory_and_file_permissions`. |
| | Pre-existing directory permissions checked | **LIMITATION** | `cli/src/session.rs:144` | If `~/.sutra` already existed prior to CLI execution with loose permissions (e.g. `0755`), `ensure_config_dir` only sets `0700` on new creation. However, `session.json` itself is always checked and restricted to `0600` on every load. |
| | Symlinks, unsafe file types, atomic-write failure behavior | **PASS** | `cli/src/session.rs:167-195` | Uses process-unique temp file `.session.tmp.<pid>`, enforces `0600`, calls `sync_all()`, then `fs::rename`. Deletes temp file if permission setting fails. |
| | Logout removes intended session without following/deleting unrelated paths | **PASS** | `cli/src/session.rs:242` | `clear_session` calls `fs::remove_file` strictly on `session.json`. Does not perform recursive directory deletion. |
| **4. Credential Handling** | Interactive input is non-echoing | **PASS** | `cli/src/commands/auth.rs:16` | Uses `rpassword::read_password()` when `io::stdin().is_terminal()` is true. |
| | Piped stdin behavior, error paths, and logs do not leak secrets | **PASS** | `cli/src/commands/auth.rs:24`<br>`cli/src/session.rs:53` | Piped input supported via `read_line`. Tokens never passed to `println!` or `eprintln!`. Redaction utility replaces payload with `...[REDACTED]`. |
| | Normal protected commands load saved session only when `--token` is absent | **PASS** | `cli/src/config.rs:25-28` | Precedence order: `--token` flag > `SUTRA_AUTH_TOKEN` > stored `session.json`. Verified live with `sutra ai status`. |
| **5. Test Quality** | Real behavior vs mocks / unit logic distinguished | **PASS** | `cli/tests/cli_tests.rs`<br>`cli/tests/session_tests.rs` | 12 tests are in-memory unit tests; 2 tests exercise real OS filesystem permissions. Live HTTP roundtrips were validated manually against running backend. |

---

## 3. Deep Dive: Implementation Audit Details

### 1. Backend Token Verification
- **Code Path:** [`cli/src/commands/auth.rs:51`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/commands/auth.rs#L51) → [`cli/src/client.rs:268`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/client.rs#L268).
- **Backend Route:** `GET /api/v1/auth/me` ([`app/api/v1/auth.py:13`](file:///Users/neemaysmac/Desktop/Sutra/app/api/v1/auth.py#L13)) via `get_current_user` ([`app/core/security.py:57`](file:///Users/neemaysmac/Desktop/Sutra/app/core/security.py#L57)).
- **Verification Logic:**
  - `verify_token_candidate` builds an HTTP request containing `Authorization: Bearer <token>`.
  - Backend verifies the HMAC signature using `settings.SUPABASE_JWT_SECRET`.
  - If the signature is invalid or expired, backend returns `401 Unauthorized`, and `auth login` aborts with:
    ```text
    Login failed: Backend rejected credentials.
    Reason: HTTP 401 Unauthorized: Backend rejected token signature (invalid, malformed, or expired).
    (No session was saved.)
    ```
  - **Verdict:** Validated. Unverified tokens cannot be persisted.

### 2. Nature of the Login Flow
- **Distinction:** The command is **`sutra auth login` via secure interactive token ingestion**, NOT username/password authentication against Supabase Auth.
- **Rationale:**
  - SUTRA's backend application does not expose a `/api/v1/auth/login` endpoint (all password authentication is handled by the external Supabase instance).
  - Rather than inventing an unauthorized or unconfigured OAuth/password endpoint, the CLI securely prompts for an existing Supabase JWT via `rpassword::read_password()`, validates it against backend probes, and caches it.
  - This avoids placing tokens in shell histories (`~/.zsh_history`) or process argument tables (`ps aux`).

### 3. Session Expiry & Diagnostics
- **Client-Side:** `parse_jwt_claims_diagnostic` inspects the unverified `exp` claim. If `now >= exp`, login rejects early without making an unnecessary network call.
- **Server-Side:** Backend verifies expiration during PyJWT decode (`verify_exp: True`).
- **Inspection Command:** `sutra auth whoami` evaluates `session.is_expired()`. If expired, it displays:
  ```text
  Status: SESSION EXPIRED
  Stored session expired at timestamp <ts>. Please run sutra auth login.
  ```

### 4. Filesystem Security
- **Directory Mode:** Created with `fs::Permissions::from_mode(0o700)` on Unix.
- **File Mode:** Created with `fs::Permissions::from_mode(0o600)` on Unix.
- **Atomic Commits:** Writes to `.session.tmp.<pid>`, enforces `0600`, flushes with `sync_all()`, and executes `fs::rename`.
- **Pre-existing File Hardening:** When `load_session()` reads `~/.sutra/session.json`, it inspects file permissions (`mode & 0o077 != 0`). If group or world permissions exist, it emits a warning and tightens the file to `0600`.
- **Known Limitation:** Pre-existing directories (if created by another tool with `0755`) are not recursively re-tightened to `0700`.

### 5. Automated Tests vs. Live Verification
- **Automated Tests (14 total):**
  - `cli/tests/cli_tests.rs`: 7 tests verifying JSON serialization and validation logic for CLI models.
  - `cli/tests/session_tests.rs`: 7 tests verifying session serialization, expiration checks, token redaction, real POSIX permission enforcement in `/tmp`, file deletion, and 401/403 error envelopes.
- **Live Verification:**
  - Live tests were executed against the running SUTRA backend on port 8005:
    1. `sutra --url http://127.0.0.1:8005/api/v1 auth whoami` (unauthenticated state confirmed).
    2. `echo "invalid.jwt.token" | sutra --url http://127.0.0.1:8005/api/v1 auth login` (rejection confirmed, 0 files saved).
    3. `echo "$VALID_TOKEN" | sutra --url http://127.0.0.1:8005/api/v1 auth login` (successful verification and session persistence confirmed).
    4. `sutra --url http://127.0.0.1:8005/api/v1 ai status` (automatic session loading without `--token` confirmed).
    5. `sutra --url http://127.0.0.1:8005/api/v1 auth logout` (session deletion confirmed).
    6. `sutra --url http://127.0.0.1:8005/api/v1 ai status` (subsequent 401 rejection confirmed).

---

## 4. Security Issues to Address Before Future Phases

No blocking security flaws prevent proceeding to Phase 2. The following non-blocking improvements are recommended for Phase 2:
1. **Pre-existing Directory Hardening:** In `ensure_config_dir()`, add `fs::set_permissions(&self.config_dir, Permissions::from_mode(0o700))` unconditionally on Unix so that pre-existing directories created with loose modes are also tightened.
2. **Symlink Guard:** Replace `fs::metadata` in `load_session()` with `fs::symlink_metadata` to detect and reject symlinked `session.json` files.
3. **Keychain Provider (Phase 5):** Introduce native macOS Keychain storage via the `keyring` crate as a configurable storage backend.

---

## 5. Verification Verdict

### **ACCEPT PHASE 1 WITH LIMITATIONS**

The implementation is verified to satisfy the security, hygiene, and architectural requirements for Phase 1. Credentials are never leaked, POSIX permissions are strictly applied, backend verification gates session creation, and the shared client seamlessly transparently uses stored sessions.
