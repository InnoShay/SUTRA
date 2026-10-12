use crate::session::{CliSession, SessionManager};
use std::env;
use uuid::Uuid;

#[derive(Clone)]
pub struct CliConfig {
    pub api_url: String,
    pub campus_id: Option<Uuid>,
    pub token: Option<String>,
    pub json: bool,
    #[allow(dead_code)]
    pub session: Option<CliSession>,
}

impl std::fmt::Debug for CliConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CliConfig")
            .field("api_url", &self.api_url)
            .field("campus_id", &self.campus_id)
            .field("token", &self.token.as_ref().map(|t| crate::session::redact_token(t)))
            .field("json", &self.json)
            .field("session", &self.session)
            .finish()
    }
}

impl CliConfig {
    pub fn from_env_and_flags(
        flag_url: Option<String>,
        flag_campus: Option<String>,
        flag_token: Option<String>,
        flag_json: bool,
    ) -> Result<Self, String> {
        let session = SessionManager::new().load_session().unwrap_or(None);

        let api_url = flag_url
            .or_else(|| env::var("SUTRA_API_URL").ok())
            .unwrap_or_else(|| "http://localhost:8000/api/v1".to_string());

        // Token resolution precedence:
        // 1. Explicit CLI flag `--token`
        // 2. Environment variable `SUTRA_TOKEN` or `SUTRA_AUTH_TOKEN`
        // 3. Securely stored local session (`~/.sutra/session.json`)
        let token = flag_token
            .or_else(|| env::var("SUTRA_TOKEN").ok())
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
                    return Err(format!(
                        "Invalid --campus UUID '{}'. Must be a valid 36-character UUID.",
                        raw_campus
                    ));
                }
            }
        } else if let Ok(env_campus) = env::var("SUTRA_CAMPUS_ID") {
            match Uuid::parse_str(&env_campus) {
                Ok(u) => Some(u),
                Err(_) => {
                    return Err(format!(
                        "Invalid SUTRA_CAMPUS_ID environment variable '{}'. Must be a valid 36-character UUID.",
                        env_campus
                    ));
                }
            }
        } else {
            session
                .as_ref()
                .and_then(|s| s.active_campus_id)
                .or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").ok())
        };

        Ok(Self {
            api_url: api_url.trim_end_matches('/').to_string(),
            campus_id,
            token,
            json: flag_json,
            session,
        })
    }
}
