use std::env;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CliConfig {
    pub api_url: String,
    pub campus_id: Option<Uuid>,
    pub token: Option<String>,
}

impl CliConfig {
    pub fn from_env_and_flags(
        flag_url: Option<String>,
        flag_campus: Option<String>,
        flag_token: Option<String>,
    ) -> Self {
        let api_url = flag_url
            .or_else(|| env::var("SUTRA_API_URL").ok())
            .unwrap_or_else(|| "http://localhost:8000/api/v1".to_string());

        let campus_id = flag_campus
            .or_else(|| env::var("SUTRA_CAMPUS_ID").ok())
            .and_then(|s| Uuid::parse_str(&s).ok())
            .or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").ok());

        let token = flag_token.or_else(|| env::var("SUTRA_AUTH_TOKEN").ok());

        Self {
            api_url: api_url.trim_end_matches('/').to_string(),
            campus_id,
            token,
        }
    }
}
