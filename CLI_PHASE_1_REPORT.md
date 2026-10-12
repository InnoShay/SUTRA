# SUTRA CLI — Phase 1: Secure Authentication and Session Management Report

**Date:** 2026-10-12  
**Engineer:** Senior Rust Security Engineer  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Crate:** `cli/` (`sutra-cli` v1.0.0)  
**Status:** **Completed & Verified**

---

## 1. Files Changed & Added

### Newly Created Files:
1. [`cli/src/session.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/session.rs)
   - `CliSession`: Data contract containing `access_token`, `user_id`, `email`, `active_campus_id`, `campus_name`, `roles`, `expires_at`, and `stored_at`.
   - `SessionManager`: POSIX file-based secure session storage engine enforcing mode `0700` directory permissions and mode `0600` file permissions with atomic temp-file write-and-rename semantics.
   - Diagnostic claim parsing: Extracts `sub`, `email`, and `exp` client-side for early expiration validation without verifying signature locally (server verifies signature).
   - `redact_token`: Redaction utility ensuring tokens never appear in terminal output or error logs.
2. [`cli/src/commands/auth.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/commands/auth.rs)
   - `sutra auth login`: Masked terminal prompt (via `rpassword`), stdin fallback for CI/CD piping, diagnostic expiration checks, live backend probe verification, and secure session writing.
   - `sutra auth whoami`: Displays verified user identity, campus memberships, and active roles, or informative unauthenticated/expired status.
   - `sutra auth logout`: Removes `~/.sutra/session.json` and prints clear educational guidance regarding local vs. remote token revocation.
3. [`cli/tests/session_tests.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/tests/session_tests.rs)
   - 7 new unit tests for session serialization, expiration detection, token redaction, POSIX 0600/0700 permissions, logout deletion, `AuthMeResponse` deserialization, and HTTP 401/403 error redaction.

### Modified Files:
4. [`cli/Cargo.toml`](file:///Users/neemaysmac/Desktop/Sutra/cli/Cargo.toml) & [`cli/Cargo.lock`](file:///Users/neemaysmac/Desktop/Sutra/cli/Cargo.lock)
   - Added `rpassword = "7.5"` (masked input) and `base64 = "0.23"` (diagnostic claim parsing).
5. [`cli/src/models.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/models.rs)
   - Added `CampusMembershipItem` and `AuthMeResponse` matching `app/schemas/campus.py`.
6. [`cli/src/config.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/config.rs)
   - Updated `CliConfig::from_env_and_flags` to implement credential precedence: explicit CLI flags → environment variables → stored `~/.sutra/session.json` → defaults.
7. [`cli/src/client.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/client.rs)
   - Added `auth_me` (`GET /api/v1/auth/me`).
   - Added `verify_token_candidate` (pre-flight validation before saving sessions).
   - Added structured 401/403 error reporting and token redaction.
8. [`cli/src/main.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/main.rs)
   - Registered `mod session;` and added Clap command tree `sutra auth [login|whoami|logout]`.
9. [`cli/src/commands/mod.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/commands/mod.rs)
   - Exported `pub mod auth;`.

---

## 2. Authentication Flow Actually Implemented

Because SUTRA delegates user credentials to Supabase Auth and HMAC SHA-256 JWT validation, the CLI implements an interactive, non-echoing session workflow:

```
[User runs: sutra auth login]
      │
      ▼
[Masked Non-Echoing Terminal Prompt via rpassword / stdin]
      │
      ▼ (Token never passed as CLI argument, never logged to shell history)
[Client-side Pre-Flight Diagnostic]
  • Verifies non-empty string
  • Inspects JWT claims (sub, email, exp)
  • Rejects already-expired tokens immediately
      │
      ▼ (Live Verification Probe over HTTP)
[SUTRA FastAPI Backend (GET /api/v1/auth/me or /api/v1/ai/status)]
  • Validates JWT signature with settings.SUPABASE_JWT_SECRET
  • Resolves User UUID, Email, and Campus Memberships from DB (when online)
      │
      ├─► Rejected (HTTP 401): Aborts login; NO session file is created.
      │
      └─► Accepted:
            ▼
      [Atomic Write to ~/.sutra/session.json (Mode 0600, Dir Mode 0700)]
            ▼
      [Success Confirmation displaying verified Email & Campus (Token Redacted)]
```

---

## 3. Session-Storage Approach and Security Protections

### Storage Path & Permissions:
- **Base Directory:** `~/.sutra/` (or overridden via `SUTRA_CONFIG_DIR`).
- **Directory Permissions:** Posix mode `0700` (`rwx------`, owner-only access).
- **Session File:** `~/.sutra/session.json`.
- **File Permissions:** Posix mode `0600` (`rw-------`, owner-only access).

### Security Guarantees:
1. **Atomic Update Strategy:**
   - The session is serialized and written to a process-unique temporary file (`.session.tmp.<pid>`).
   - Permissions `0600` are applied to the temp file.
   - The file is synced to disk via `sync_all()`, closed, and atomically renamed to `session.json`.
   - Prevents partial or corrupted writes in case of process interruption.
2. **Permission Guard on Load:**
   - When loading, `SessionManager::load_session` inspects Unix permissions. If the file is overly permissive (e.g. group/world readable), it logs a warning and automatically restricts it to `0600`.
3. **Token Redaction Guarantee:**
   - Raw tokens are never printed to `stdout` or `stderr`.
   - Error messages for 401/403 responses strip any `Bearer` credentials.
4. **Shell History Protection:**
   - Interactive prompt uses terminal raw mode (no echo), ensuring tokens are never recorded in `~/.zsh_history` or `~/.bash_history`.
   - Supports piped input (`echo "$TOKEN" | sutra auth login`) for scripted environments.

### Known Storage Limitations:
- The session is stored in an encrypted/restricted plaintext JSON file protected by OS filesystem ACLs (`0600`). It is not stored in the macOS Keychain in Phase 1 (Keychain integration deferred to minimize external C-binding dependencies).

---

## 4. Commands and Configuration Examples

### A. Logging In
Interactive masked prompt:
```bash
sutra --url http://127.0.0.1:8005/api/v1 auth login
# Prompts: Enter SUTRA Bearer JWT Token: [hidden]
```
Piped script / automation:
```bash
echo "$JWT_TOKEN" | sutra --url http://127.0.0.1:8005/api/v1 auth login
```

**Observed Terminal Output:**
```text
=== SUTRA CLI Secure Authentication ===
Backend URL: http://127.0.0.1:8005/api/v1

Validating session with backend...

✓ Authentication successful! Session securely stored.
  Identity:    test@sutra.edu
  User ID:     aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
  Campus:      Default Campus (11111111-1111-1111-1111-111111111111)
  Roles:       authenticated
  Storage:     "/Users/neemaysmac/.sutra/session.json" (mode 0600)

You can now run SUTRA commands without passing --token.
```

### B. Checking Identity (`whoami`)
```bash
sutra --url http://127.0.0.1:8005/api/v1 auth whoami
```

**Observed Terminal Output:**
```text
=== SUTRA Authenticated Identity ===
  Status:      VERIFIED ACTIVE
  Email:       test@sutra.edu
  User ID:     aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
  Campus ID:   11111111-1111-1111-1111-111111111111

Session Source: "/Users/neemaysmac/.sutra/session.json"
```

### C. Logging Out
```bash
sutra auth logout
```

**Observed Terminal Output:**
```text
=== SUTRA CLI Logout ===
✓ Local session cleared successfully.
Deleted: "/Users/neemaysmac/.sutra/session.json"

Note: Clearing local session removes credentials from this machine.
Server-side Supabase tokens remain active until their natural expiry unless revoked remotely.
```

---

## 5. How the Shared HTTP Client Obtains Credentials

In `cli/src/config.rs` and `cli/src/client.rs`, the API client automatically resolves credentials using strict precedence:

```
Token Precedence:
  1. CLI Flag: `--token <TOKEN>` (Explicit override)
  2. Environment Variable: `SUTRA_AUTH_TOKEN`
  3. Stored Session: `~/.sutra/session.json` (`access_token`)
  4. None (Unauthenticated)

Campus ID Precedence:
  1. CLI Flag: `--campus <UUID>`
  2. Environment Variable: `SUTRA_CAMPUS_ID`
  3. Stored Session: `~/.sutra/session.json` (`active_campus_id`)
  4. Default Fallback: `00000000-0000-0000-0000-000000000001`
```

### Live Proof: Protected Commands Run Without `--token`:
With an active session stored, running:
```bash
sutra --url http://127.0.0.1:8005/api/v1 ai status
```
Succeeds with **Exit Code 0** without specifying `--token` or `--campus`.

---

## 6. Test Results and Verification Evidence

### Automated Test Suite:
Command executed:
```bash
cargo test --manifest-path cli/Cargo.toml
```

**Observed Output:**
```text
running 7 tests (cli_tests.rs)
test test_uuid_validation ... ok
test test_case_transition_request_serialization ... ok
test test_signal_review_request_serialization ... ok
test test_outcome_request_serialization ... ok
test test_follow_up_request_serialization ... ok
test test_ai_status_deserialization ... ok
test test_ai_review_brief_deserialization ... ok
test result: ok. 7 passed; 0 failed; 0 ignored; finished in 0.00s

running 7 tests (session_tests.rs)
test test_http_401_and_403_error_redaction ... ok
test test_token_redaction_guarantee ... ok
test test_expired_session_detection ... ok
test test_auth_me_response_deserialization ... ok
test test_session_serialization_and_deserialization ... ok
test test_secure_session_directory_and_file_permissions ... ok
test test_logout_session_deletion ... ok
test result: ok. 7 passed; 0 failed; 0 ignored; finished in 0.00s
```
**Total:** **14 / 14 tests passing (100% pass rate)**.

### Release Binary Compilation:
Command executed:
```bash
cargo build --release --manifest-path cli/Cargo.toml
```
**Result:** Clean build with 0 compiler warnings, generating optimized binary [`cli/target/release/sutra`](file:///Users/neemaysmac/Desktop/Sutra/cli/target/release/sutra).

### Real Live Verification Summary:
- **Real Backend Verification:** Executed live against running SUTRA FastAPI backend on port 8005.
- Valid tokens are accepted; invalid tokens are rejected with HTTP 401; stored sessions allow seamless access to protected commands (`ai status`).
- Directory permissions `0700` and file permissions `0600` were verified directly using `ls -la /Users/neemaysmac/.sutra`.

---

## 7. Backend & Configuration Gaps for Future Phases

1. **Supabase Direct Grant:** The backend does not expose a `/api/v1/auth/login` endpoint; token generation remains handled by Supabase Auth or test token generator. The interactive masked prompt bridges this securely for Phase 1.
2. **Local Port Collision:** `opspilot-api` occupies port 8000 locally. Users must set `export SUTRA_API_URL=http://127.0.0.1:8005/api/v1` or use `--url`.
