use uuid::Uuid;

fn resolve_config_values(
    flag_url: Option<String>,
    env_url: Option<String>,
    flag_campus: Option<String>,
    env_campus: Option<String>,
    session_campus: Option<Uuid>,
    flag_token: Option<String>,
    env_token: Option<String>,
    session_token: Option<String>,
) -> Result<(String, Option<Uuid>, Option<String>), String> {
    let url = flag_url
        .or(env_url)
        .unwrap_or_else(|| "http://localhost:8000/api/v1".to_string());

    let campus = if let Some(raw) = flag_campus {
        Some(Uuid::parse_str(&raw).map_err(|_| format!("Invalid --campus UUID '{}'.", raw))?)
    } else if let Some(raw) = env_campus {
        Some(Uuid::parse_str(&raw).map_err(|_| format!("Invalid SUTRA_CAMPUS_ID environment variable '{}'.", raw))?)
    } else {
        session_campus.or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").ok())
    };

    let token = flag_token.or(env_token).or(session_token);

    Ok((url, campus, token))
}

#[test]
fn test_config_precedence_flag_over_env_and_session() {
    let res = resolve_config_values(
        Some("http://flag-url:9000/api/v1".to_string()),
        Some("http://env-url:8000/api/v1".to_string()),
        Some("22222222-2222-2222-2222-222222222222".to_string()),
        Some("11111111-1111-1111-1111-111111111111".to_string()),
        Some(Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()),
        Some("flag-token-abc".to_string()),
        Some("env-token-xyz".to_string()),
        Some("session-token-123".to_string()),
    ).expect("Resolution should succeed");

    assert_eq!(res.0, "http://flag-url:9000/api/v1");
    assert_eq!(res.1, Some(Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap()));
    assert_eq!(res.2, Some("flag-token-abc".to_string()));
}

#[test]
fn test_config_env_fallback_when_flags_absent() {
    let res = resolve_config_values(
        None,
        Some("http://env-url:8000/api/v1".to_string()),
        None,
        Some("33333333-3333-3333-3333-333333333333".to_string()),
        Some(Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()),
        None,
        Some("env-token-999".to_string()),
        Some("session-token-123".to_string()),
    ).expect("Resolution should succeed");

    assert_eq!(res.0, "http://env-url:8000/api/v1");
    assert_eq!(res.1, Some(Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap()));
    assert_eq!(res.2, Some("env-token-999".to_string()));
}

#[test]
fn test_config_session_fallback_when_flags_and_env_absent() {
    let res = resolve_config_values(
        None,
        None,
        None,
        None,
        Some(Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap()),
        None,
        None,
        Some("session-token-123".to_string()),
    ).expect("Resolution should succeed");

    assert_eq!(res.0, "http://localhost:8000/api/v1");
    assert_eq!(res.1, Some(Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap()));
    assert_eq!(res.2, Some("session-token-123".to_string()));
}

#[test]
fn test_invalid_uuid_rejection() {
    let res = resolve_config_values(
        None,
        None,
        Some("not-a-valid-uuid".to_string()),
        None,
        None,
        None,
        None,
        None,
    );
    assert!(res.is_err());
    assert!(res.unwrap_err().contains("Invalid --campus UUID 'not-a-valid-uuid'."));
}

#[test]
fn test_exit_code_heuristics() {
    fn classify_exit_code(err: &str) -> i32 {
        if err.contains("401") || err.contains("403") || err.contains("Unauthorized") || err.contains("Forbidden") {
            3
        } else if err.contains("Invalid") || err.contains("Validation") || err.contains("Policy Violation") || err.contains("Usage") {
            2
        } else {
            1
        }
    }

    assert_eq!(classify_exit_code("HTTP 401 Unauthorized: token expired"), 3);
    assert_eq!(classify_exit_code("HTTP 403 Forbidden: campus tenant mismatch"), 3);
    assert_eq!(classify_exit_code("Validation Error: Student identifier cannot be empty."), 2);
    assert_eq!(classify_exit_code("Invalid --campus UUID 'abc'."), 2);
    assert_eq!(classify_exit_code("Policy Violation: Cannot transition from RESOLVED to OPEN"), 2);
    assert_eq!(classify_exit_code("Connection refused by backend daemon at port 8000"), 1);
    assert_eq!(classify_exit_code("Unexpected internal error"), 1);
}
