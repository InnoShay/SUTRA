use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

/// Structure representing a locally stored, verified CLI authentication session.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CliSession {
    /// Supabase JWT access token
    pub access_token: String,
    /// Verified user UUID (from token or backend)
    pub user_id: Option<Uuid>,
    /// User email address
    pub email: Option<String>,
    /// Active campus ID
    pub active_campus_id: Option<Uuid>,
    /// Active campus display name
    pub campus_name: Option<String>,
    /// Roles verified for active campus
    #[serde(default)]
    pub roles: Vec<String>,
    /// Unix timestamp when the token expires (if decoded from JWT exp claim)
    pub expires_at: Option<i64>,
    /// ISO-8601 timestamp when this session was stored locally
    pub stored_at: String,
}

impl CliSession {
    /// Checks whether the token has expired according to its `exp` claim.
    pub fn is_expired(&self) -> bool {
        if let Some(exp) = self.expires_at {
            let now = Utc::now().timestamp();
            now >= exp
        } else {
            false
        }
    }

    /// Redacts the sensitive access token for safe logging or display.
    #[allow(dead_code)]
    pub fn redacted_token_preview(&self) -> String {
        redact_token(&self.access_token)
    }
}

/// Helper function to safely redact tokens so they are never printed in diagnostic output.
#[allow(dead_code)]
pub fn redact_token(token: &str) -> String {
    if token.len() > 10 {
        format!("{}...[REDACTED]", &token[..6])
    } else {
        "[REDACTED]".to_string()
    }
}

/// Safely extracts unverified claims (`sub`, `email`, `exp`) from a JWT payload for client-side diagnostics.
/// Note: These claims are treated as diagnostic hints until verified against the backend.
pub fn parse_jwt_claims_diagnostic(token: &str) -> Option<(Option<Uuid>, Option<String>, Option<i64>)> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }

    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;

    // Handle base64url padding if missing
    let mut payload_b64 = parts[1].to_string();
    while payload_b64.len() % 4 != 0 {
        payload_b64.push('=');
    }

    let decoded_bytes = URL_SAFE_NO_PAD
        .decode(parts[1])
        .or_else(|_| base64::engine::general_purpose::STANDARD.decode(&payload_b64))
        .ok()?;

    let json_val: serde_json::Value = serde_json::from_slice(&decoded_bytes).ok()?;

    let user_id = json_val
        .get("sub")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let email = json_val
        .get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let expires_at = json_val.get("exp").and_then(|v| v.as_i64());

    Some((user_id, email, expires_at))
}

/// Session manager responsible for secure POSIX filesystem storage.
pub struct SessionManager {
    config_dir: PathBuf,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SessionManager {
    /// Creates a new SessionManager pointing to `~/.sutra` (or overrides via SUTRA_HOME).
    pub fn new() -> Self {
        let base_dir = std::env::var("SUTRA_CONFIG_DIR")
            .ok()
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var("HOME")
                    .ok()
                    .map(|h| PathBuf::from(h).join(".sutra"))
            })
            .unwrap_or_else(|| PathBuf::from(".sutra"));

        Self { config_dir: base_dir }
    }

    /// Custom constructor for isolated testing.
    #[allow(dead_code)]
    pub fn with_dir(dir: PathBuf) -> Self {
        Self { config_dir: dir }
    }

    #[allow(dead_code)]
    pub fn config_dir(&self) -> &Path {
        &self.config_dir
    }

    pub fn session_file_path(&self) -> PathBuf {
        self.config_dir.join("session.json")
    }

    /// Ensures the configuration directory exists with restricted permissions (0700 on Unix).
    pub fn ensure_config_dir(&self) -> Result<(), String> {
        if self.config_dir.exists() {
            #[cfg(unix)]
            {
                if let Ok(meta) = fs::symlink_metadata(&self.config_dir) {
                    if meta.file_type().is_symlink() {
                        return Err(format!(
                            "Security failure: SUTRA config directory {:?} is a symlink. Please use a standard directory.",
                            self.config_dir
                        ));
                    }
                    let mode = meta.permissions().mode() & 0o777;
                    if mode != 0o700 {
                        eprintln!(
                            "Warning: SUTRA config directory {:?} had overly permissive mode {:o}. Enforcing mode 0700...",
                            self.config_dir, mode
                        );
                        let _ = fs::set_permissions(&self.config_dir, fs::Permissions::from_mode(0o700));
                    }
                }
            }
        } else {
            fs::create_dir_all(&self.config_dir)
                .map_err(|e| format!("Failed to create SUTRA config dir {:?}: {}", self.config_dir, e))?;

            #[cfg(unix)]
            {
                let perms = fs::Permissions::from_mode(0o700);
                if let Err(e) = fs::set_permissions(&self.config_dir, perms) {
                    eprintln!("Warning: could not set mode 0700 on config dir: {}", e);
                }
            }
        }
        Ok(())
    }

    /// Stores a verified session using an atomic write strategy with 0600 permissions.
    pub fn save_session(&self, session: &CliSession) -> Result<(), String> {
        self.ensure_config_dir()?;

        let json_data = serde_json::to_string_pretty(session)
            .map_err(|e| format!("Failed to serialize session: {}", e))?;

        let target_path = self.session_file_path();
        if target_path.exists() {
            if let Ok(meta) = fs::symlink_metadata(&target_path) {
                if meta.file_type().is_symlink() {
                    return Err(format!(
                        "Security failure: Target session file {:?} is a symlink. Remove it before storing session.",
                        target_path
                    ));
                }
            }
        }

        let temp_path = self.config_dir.join(format!(".session.tmp.{}", std::process::id()));

        // Write to temporary file with 0600 mode
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&temp_path)
            .map_err(|e| format!("Failed to create temporary session file: {}", e))?;

        #[cfg(unix)]
        {
            let perms = fs::Permissions::from_mode(0o600);
            if let Err(e) = file.set_permissions(perms) {
                let _ = fs::remove_file(&temp_path);
                return Err(format!("Security failure: unable to enforce mode 0600 permissions: {}", e));
            }
        }

        file.write_all(json_data.as_bytes())
            .map_err(|e| format!("Failed to write session data: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Failed to sync session file to disk: {}", e))?;
        drop(file);

        // Atomic replace
        fs::rename(&temp_path, &target_path)
            .map_err(|e| format!("Failed to atomically commit session file: {}", e))?;

        #[cfg(unix)]
        {
            // Verify final permissions
            if let Ok(meta) = fs::symlink_metadata(&target_path) {
                let mode = meta.permissions().mode() & 0o777;
                if mode != 0o600 {
                    let _ = fs::set_permissions(&target_path, fs::Permissions::from_mode(0o600));
                }
            }
        }

        Ok(())
    }

    /// Loads the stored session, checking Unix permissions for security hygiene.
    pub fn load_session(&self) -> Result<Option<CliSession>, String> {
        let path = self.session_file_path();
        if !path.exists() {
            return Ok(None);
        }

        #[cfg(unix)]
        {
            // Verify and enforce directory permissions if config_dir exists
            if let Ok(d_meta) = fs::symlink_metadata(&self.config_dir) {
                if d_meta.file_type().is_symlink() {
                    return Err(format!(
                        "Security failure: SUTRA config dir {:?} is a symlink.",
                        self.config_dir
                    ));
                }
                let d_mode = d_meta.permissions().mode() & 0o777;
                if d_mode != 0o700 {
                    eprintln!(
                        "Warning: SUTRA config directory {:?} had mode {:o}. Enforcing mode 0700...",
                        self.config_dir, d_mode
                    );
                    let _ = fs::set_permissions(&self.config_dir, fs::Permissions::from_mode(0o700));
                }
            }

            if let Ok(meta) = fs::symlink_metadata(&path) {
                if meta.file_type().is_symlink() {
                    return Err(format!(
                        "Security failure: Session file {:?} is a symlink. Run `sutra auth logout` or remove the symlink.",
                        path
                    ));
                }
                let mode = meta.permissions().mode() & 0o777;
                // Check if world or group readable
                if mode & 0o077 != 0 {
                    eprintln!(
                        "Warning: Session file {:?} has overly permissive mode {:o}. Enforcing mode 0600...",
                        path, mode
                    );
                    let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
                }
            }
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read session file {:?}: {}", path, e))?;

        let session: CliSession = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse session file {:?}: {}", path, e))?;

        Ok(Some(session))
    }

    /// Clears the locally stored session file.
    pub fn clear_session(&self) -> Result<bool, String> {
        let path = self.session_file_path();
        if path.exists() {
            #[cfg(unix)]
            {
                if let Ok(meta) = fs::symlink_metadata(&path) {
                    if meta.file_type().is_symlink() {
                        eprintln!("Warning: Removing symlinked session pointer {:?}", path);
                    }
                }
            }
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to remove session file {:?}: {}", path, e))?;
            Ok(true)
        } else {
            Ok(false)
        }
    }
}
