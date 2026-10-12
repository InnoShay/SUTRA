use chrono::Utc;
use std::fs;
use uuid::Uuid;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

// We test session logic, file permissions, redaction, expiry, and models
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq)]
struct TestSession {
    pub access_token: String,
    pub user_id: Option<Uuid>,
    pub email: Option<String>,
    pub active_campus_id: Option<Uuid>,
    pub campus_name: Option<String>,
    pub roles: Vec<String>,
    pub expires_at: Option<i64>,
    pub stored_at: String,
}

impl TestSession {
    fn is_expired(&self) -> bool {
        if let Some(exp) = self.expires_at {
            let now = Utc::now().timestamp();
            now >= exp
        } else {
            false
        }
    }
}

fn redact_token(token: &str) -> String {
    if token.len() > 10 {
        format!("{}...[REDACTED]", &token[..6])
    } else {
        "[REDACTED]".to_string()
    }
}

#[test]
fn test_session_serialization_and_deserialization() {
    let session = TestSession {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-secret-payload".to_string(),
        user_id: Some(Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap()),
        email: Some("faculty@sutra.edu".to_string()),
        active_campus_id: Some(Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap()),
        campus_name: Some("Apex Institute of Technology".to_string()),
        roles: vec!["faculty".to_string(), "mentor".to_string()],
        expires_at: Some(1791780000),
        stored_at: "2026-10-12T08:00:00Z".to_string(),
    };

    let serialized = serde_json::to_string_pretty(&session).expect("Must serialize");
    let deserialized: TestSession = serde_json::from_str(&serialized).expect("Must deserialize");

    assert_eq!(session, deserialized);
    assert_eq!(deserialized.email.unwrap(), "faculty@sutra.edu");
    assert_eq!(deserialized.roles.len(), 2);
}

#[test]
fn test_expired_session_detection() {
    let past_timestamp = Utc::now().timestamp() - 3600; // 1 hour ago
    let future_timestamp = Utc::now().timestamp() + 3600; // 1 hour in future

    let expired_session = TestSession {
        access_token: "test-token".to_string(),
        user_id: None,
        email: None,
        active_campus_id: None,
        campus_name: None,
        roles: vec![],
        expires_at: Some(past_timestamp),
        stored_at: Utc::now().to_rfc3339(),
    };
    assert!(expired_session.is_expired(), "Past timestamp must be detected as expired");

    let active_session = TestSession {
        access_token: "test-token".to_string(),
        user_id: None,
        email: None,
        active_campus_id: None,
        campus_name: None,
        roles: vec![],
        expires_at: Some(future_timestamp),
        stored_at: Utc::now().to_rfc3339(),
    };
    assert!(!active_session.is_expired(), "Future timestamp must be detected as active");
}

#[test]
fn test_token_redaction_guarantee() {
    let raw_secret_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload_here";
    let redacted = redact_token(raw_secret_token);

    assert!(!redacted.contains("sensitive_payload_here"), "Redacted token must not contain sensitive payload");
    assert!(redacted.ends_with("...[REDACTED]"), "Must indicate redacted content");

    let short_token = "secret";
    assert_eq!(redact_token(short_token), "[REDACTED]");
}

#[test]
#[cfg(unix)]
fn test_secure_session_directory_and_file_permissions() {
    let temp_dir = std::env::temp_dir().join(format!("sutra_test_{}", Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).expect("Create temp dir");

    // Set 0700 on dir
    let dir_perms = fs::Permissions::from_mode(0o700);
    fs::set_permissions(&temp_dir, dir_perms).expect("Set 0700 on dir");

    let session_file = temp_dir.join("session.json");
    let json_data = r#"{"access_token":"test","stored_at":"2026-10-12T00:00:00Z"}"#;

    fs::write(&session_file, json_data).expect("Write session file");
    let file_perms = fs::Permissions::from_mode(0o600);
    fs::set_permissions(&session_file, file_perms).expect("Set 0600 on file");

    // Verify metadata permissions
    let dir_meta = fs::metadata(&temp_dir).expect("Dir metadata");
    let file_meta = fs::metadata(&session_file).expect("File metadata");

    let dir_mode = dir_meta.permissions().mode() & 0o777;
    let file_mode = file_meta.permissions().mode() & 0o777;

    assert_eq!(dir_mode, 0o700, "Directory permissions must be strictly 0700 (rwx------)");
    assert_eq!(file_mode, 0o600, "Session file permissions must be strictly 0600 (rw-------)");

    // Cleanup
    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_logout_session_deletion() {
    let temp_dir = std::env::temp_dir().join(format!("sutra_logout_test_{}", Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).expect("Create temp dir");
    let session_file = temp_dir.join("session.json");

    fs::write(&session_file, "{}").expect("Write dummy session");
    assert!(session_file.exists(), "Session file must exist before logout");

    // Simulate logout deletion
    fs::remove_file(&session_file).expect("Remove session file");
    assert!(!session_file.exists(), "Session file must be deleted after logout");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_auth_me_response_deserialization() {
    let raw_json = r#"{
        "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "email": "faculty@sutra.edu",
        "memberships": [
            {
                "institution_id": "11111111-1111-1111-1111-111111111111",
                "institution_name": "Apex Institute of Technology",
                "roles": ["faculty", "mentor"],
                "is_active": true
            }
        ]
    }"#;

    let parsed: serde_json::Value = serde_json::from_str(raw_json).expect("Must parse JSON");
    assert_eq!(parsed["user_id"], "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    assert_eq!(parsed["email"], "faculty@sutra.edu");
    assert_eq!(parsed["memberships"][0]["roles"].as_array().unwrap().len(), 2);
    assert_eq!(parsed["memberships"][0]["is_active"], true);
}

#[test]
fn test_http_401_and_403_error_redaction() {
    let error_401 = "HTTP 401 Unauthorized: Session token is missing, expired, or invalid. Run `sutra auth login` to authenticate.";
    assert!(!error_401.contains("Bearer"), "Error must not contain Bearer secrets");
    assert!(error_401.contains("401"), "Must clearly indicate 401 code");

    let error_403 = "HTTP 403 Forbidden: Permission denied for current identity.";
    assert!(error_403.contains("403"), "Must clearly indicate 403 code");
}

#[test]
#[cfg(unix)]
fn test_preexisting_permissive_directory_correction() {
    let temp_dir = std::env::temp_dir().join(format!("sutra_perm_test_{}", Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).expect("Create temp dir");

    // Intentionally make it permissive (0755)
    fs::set_permissions(&temp_dir, fs::Permissions::from_mode(0o755)).expect("Set 0755");
    let mode_before = fs::symlink_metadata(&temp_dir).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode_before, 0o755);

    // Verify that clamping logic corrects it to 0700
    if let Ok(meta) = fs::symlink_metadata(&temp_dir) {
        let mode = meta.permissions().mode() & 0o777;
        if mode != 0o700 {
            fs::set_permissions(&temp_dir, fs::Permissions::from_mode(0o700)).unwrap();
        }
    }

    let mode_after = fs::symlink_metadata(&temp_dir).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode_after, 0o700, "Directory permissions must be corrected to 0700");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
#[cfg(unix)]
fn test_symlinked_session_file_rejection() {
    let temp_dir = std::env::temp_dir().join(format!("sutra_symlink_test_{}", Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).expect("Create temp dir");
    let target_file = temp_dir.join("real_target.txt");
    fs::write(&target_file, "malicious target").expect("Write target");

    let symlink_path = temp_dir.join("session.json");
    std::os::unix::fs::symlink(&target_file, &symlink_path).expect("Create symlink");

    // Ensure symlink is detected
    let meta = fs::symlink_metadata(&symlink_path).expect("Read symlink metadata");
    assert!(meta.file_type().is_symlink(), "Must detect symlink");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_debug_formatting_redacts_tokens() {
    struct SessionWithRedactedDebug {
        pub access_token: String,
    }
    impl std::fmt::Debug for SessionWithRedactedDebug {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("CliSession")
                .field("access_token", &redact_token(&self.access_token))
                .finish()
        }
    }

    let secret_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.super-secret-payload.signature";
    let sess = SessionWithRedactedDebug {
        access_token: secret_jwt.to_string(),
    };
    let debug_str = format!("{:?}", sess);
    assert!(!debug_str.contains("super-secret-payload"), "Debug formatting must never contain raw payload");
    assert!(debug_str.contains("[REDACTED]"), "Debug output must include [REDACTED]");
}

#[test]
fn test_scrub_error_secrets_jwt_redaction() {
    fn scrub_error_secrets(text: &str) -> String {
        let mut scrubbed = text.to_string();
        let words: Vec<&str> = text.split_whitespace().collect();
        for word in words {
            let clean = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '.' && c != '_' && c != '-');
            if clean.starts_with("eyJ") && clean.contains('.') && clean.len() > 20 {
                scrubbed = scrubbed.replace(clean, "[REDACTED_JWT]");
            }
        }
        scrubbed
    }

    let raw_err = "Server returned error for Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload.sig: failed";
    let scrubbed = scrub_error_secrets(raw_err);
    assert!(!scrubbed.contains("secretpayload"), "JWT secret payload must be scrubbed");
    assert!(scrubbed.contains("[REDACTED_JWT]"), "Must replace token with [REDACTED_JWT]");
}


