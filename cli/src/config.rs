use crate::session::{CliSession, SessionManager};
use std::env;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CliConfig {
    pub api_url: String,
    pub campus_id: Option<Uuid>,
    pub token: Option<String>,
    #[allow(dead_code)]
    pub session: Option<CliSession>,
}

impl CliConfig {
    pub fn from_env_and_flags(
        flag_url: Option<String>,
        flag_campus: Option<String>,
        flag_token: Option<String>,
    ) -> Self {
        let session = SessionManager::new().load_session().unwrap_or(None);

        let api_url = flag_url
            .or_else(|| env::var("SUTRA_API_URL").ok())
            .unwrap_or_else(|| "http://localhost:8000/api/v1".to_string());

        // Token resolution precedence:
        // 1. Explicit CLI flag `--token`
        // 2. Environment variable `SUTRA_AUTH_TOKEN`
        // 3. Securely stored local session (`~/.sutra/session.json`)
        let token = flag_token
            .or_else(|| env::var("SUTRA_AUTH_TOKEN").ok())
            .or_else(|| session.as_ref().map(|s| s.access_token.clone()));

        // Campus resolution precedence:
        // 1. Explicit CLI flag `--campus`
        // 2. Environment variable `SUTRA_CAMPUS_ID`
        // 3. Verified active campus in stored session
        // 4. Default standard fallback
        let campus_id = if let Some(ref raw_campus) = flag_campus {
            match Uuid::parse_str(raw_campus) {
                Ok(u) => Some(u),
                Err(_) => {
                    eprintln!("Warning: Invalid --campus UUID '{}'. Falling back to session/default tenancy.", raw_campus);
                    session
                        .as_ref()
                        .and_then(|s| s.active_campus_id)
                        .or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").ok())
                }
            }
        } else if let Ok(env_campus) = env::var("SUTRA_CAMPUS_ID") {
            Uuid::parse_str(&env_campus)
                .ok()
                .or_else(|| session.as_ref().and_then(|s| s.active_campus_id))
                .or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").ok())
        } else {
            session
                .as_ref()
                .and_then(|s| s.active_campus_id)
                .or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").ok())
        };

        Self {
            api_url: api_url.trim_end_matches('/').to_string(),
            campus_id,
            token,
            session,
        }
    }
}
