use crate::config::CliConfig;
use crate::models::*;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use std::time::Duration;
use uuid::Uuid;

#[derive(Clone)]
pub struct SutraApiClient {
    client: Client,
    pub config: CliConfig,
}

impl SutraApiClient {
    pub fn new(config: CliConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .expect("Failed to build HTTP client");
        Self { client, config }
    }

    fn headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        if let Some(ref token) = self.config.token {
            if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", token)) {
                headers.insert(AUTHORIZATION, val);
            }
        }

        if let Some(campus_id) = self.config.campus_id {
            if let Ok(val) = HeaderValue::from_str(&campus_id.to_string()) {
                headers.insert("X-Campus-Id", val);
            }
        }

        headers
    }

    pub async fn health(&self) -> Result<HealthResponse, String> {
        let root = self.config.api_url.replace("/api/v1", "");
        let url = format!("{}/health", root);
        let resp = self.client.get(&url).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("Server returned HTTP {}", resp.status()));
        }
        resp.json::<HealthResponse>().await.map_err(|e| e.to_string())
    }

    pub async fn ready(&self) -> Result<ReadinessResponse, String> {
        let root = self.config.api_url.replace("/api/v1", "");
        let url = format!("{}/ready", root);
        let resp = self.client.get(&url).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("Server returned HTTP {}", resp.status()));
        }
        resp.json::<ReadinessResponse>().await.map_err(|e| e.to_string())
    }

    pub async fn list_signals(&self, result: Option<&str>) -> Result<Vec<SignalDto>, String> {
        let mut url = format!("{}/signals", self.config.api_url);
        if let Some(r) = result {
            url.push_str(&format!("?result={}", r));
        }
        let resp = self.client.get(&url).headers(self.headers()).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed: {}", body));
        }
        resp.json::<Vec<SignalDto>>().await.map_err(|e| e.to_string())
    }

    pub async fn get_signal(&self, id: Uuid) -> Result<SignalDto, String> {
        let url = format!("{}/signals/{}", self.config.api_url, id);
        let resp = self.client.get(&url).headers(self.headers()).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed: {}", body));
        }
        resp.json::<SignalDto>().await.map_err(|e| e.to_string())
    }

    pub async fn review_signal(&self, id: Uuid, req: SignalReviewRequest) -> Result<SignalReviewResponse, String> {
        let url = format!("{}/signals/{}/review", self.config.api_url, id);
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Signal review rejected: {}", body));
        }
        resp.json::<SignalReviewResponse>().await.map_err(|e| e.to_string())
    }

    pub async fn list_cases(&self, state: Option<&str>) -> Result<Vec<CaseDto>, String> {
        let mut url = format!("{}/cases", self.config.api_url);
        if let Some(s) = state {
            url.push_str(&format!("?state={}", s.to_lowercase()));
        }
        let resp = self.client.get(&url).headers(self.headers()).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed: {}", body));
        }
        resp.json::<Vec<CaseDto>>().await.map_err(|e| e.to_string())
    }

    pub async fn get_case(&self, id: Uuid) -> Result<CaseDto, String> {
        let url = format!("{}/cases/{}", self.config.api_url, id);
        let resp = self.client.get(&url).headers(self.headers()).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed: {}", body));
        }
        resp.json::<CaseDto>().await.map_err(|e| e.to_string())
    }

    pub async fn transition_case(&self, id: Uuid, req: CaseTransitionRequest) -> Result<CaseDto, String> {
        let url = format!("{}/cases/{}/transition", self.config.api_url, id);
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Case transition rejected: {}", body));
        }
        resp.json::<CaseDto>().await.map_err(|e| e.to_string())
    }

    pub async fn assign_case(&self, id: Uuid, req: CaseAssignmentRequest) -> Result<CaseDto, String> {
        let url = format!("{}/cases/{}/assignment", self.config.api_url, id);
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Case assignment rejected: {}", body));
        }
        resp.json::<CaseDto>().await.map_err(|e| e.to_string())
    }

    pub async fn record_follow_up(&self, id: Uuid, req: FollowUpRequest) -> Result<serde_json::Value, String> {
        let url = format!("{}/cases/{}/follow-ups", self.config.api_url, id);
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Follow-up recording rejected: {}", body));
        }
        resp.json::<serde_json::Value>().await.map_err(|e| e.to_string())
    }

    pub async fn record_outcome(&self, id: Uuid, req: OutcomeRequest) -> Result<serde_json::Value, String> {
        let url = format!("{}/cases/{}/outcome", self.config.api_url, id);
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&req)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Outcome recording rejected: {}", body));
        }
        resp.json::<serde_json::Value>().await.map_err(|e| e.to_string())
    }

    pub async fn list_catalogue(&self) -> Result<Vec<InterventionItem>, String> {
        let url = format!("{}/interventions", self.config.api_url);
        let resp = self.client.get(&url).headers(self.headers()).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed: {}", body));
        }
        resp.json::<Vec<InterventionItem>>().await.map_err(|e| e.to_string())
    }

    pub async fn ai_status(&self) -> Result<AiStatusResponse, String> {
        let url = format!("{}/ai/status", self.config.api_url);
        let resp = self.client.get(&url).headers(self.headers()).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed: {}", body));
        }
        resp.json::<AiStatusResponse>().await.map_err(|e| e.to_string())
    }

    pub async fn ai_review_brief(&self, signal_id: Uuid) -> Result<AiReviewBriefResponse, String> {
        let url = format!("{}/ai/review-brief", self.config.api_url);
        let payload = serde_json::json!({ "signal_id": signal_id });
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("AI review brief request failed: {}", body));
        }
        resp.json::<AiReviewBriefResponse>().await.map_err(|e| e.to_string())
    }

    pub async fn ai_summarize_evidence(&self, student_id: Uuid) -> Result<AiSummarizeEvidenceResponse, String> {
        let url = format!("{}/ai/summarize-evidence", self.config.api_url);
        let payload = serde_json::json!({ "student_id": student_id });
        let resp = self.client.post(&url)
            .headers(self.headers())
            .json(&payload)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("AI summarize request failed: {}", body));
        }
        resp.json::<AiSummarizeEvidenceResponse>().await.map_err(|e| e.to_string())
    }

    /// Fetches the authenticated user profile and campus memberships from `/auth/me`.
    pub async fn auth_me(&self) -> Result<AuthMeResponse, String> {
        let url = format!("{}/auth/me", self.config.api_url);
        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err("HTTP 401 Unauthorized: Session token is missing, expired, or invalid. Run `sutra auth login` to authenticate.".to_string());
            } else if status == reqwest::StatusCode::FORBIDDEN {
                return Err(format!("HTTP 403 Forbidden: Permission denied for current identity.\n{}", body));
            }
            return Err(format!("HTTP {}: {}", status, body));
        }

        resp.json::<AuthMeResponse>().await.map_err(|e| e.to_string())
    }

    /// Validates an arbitrary candidate token against backend probes before storing it.
    pub async fn verify_token_candidate(&self, token: &str) -> Result<Option<AuthMeResponse>, String> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", token))
                .map_err(|e| format!("Invalid characters in token: {}", e))?,
        );
        if let Some(campus_id) = self.config.campus_id {
            if let Ok(val) = HeaderValue::from_str(&campus_id.to_string()) {
                headers.insert("X-Campus-Id", val);
            }
        }

        let me_url = format!("{}/auth/me", self.config.api_url);
        let resp = self
            .client
            .get(&me_url)
            .headers(headers.clone())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            let profile = resp.json::<AuthMeResponse>().await.map_err(|e| e.to_string())?;
            return Ok(Some(profile));
        }

        // If /auth/me returns 503 / 500 (e.g. database connection degraded in local dev), probe /ai/status
        // to verify that the server-side Supabase JWT signature check passes.
        if resp.status() == reqwest::StatusCode::SERVICE_UNAVAILABLE
            || resp.status() == reqwest::StatusCode::INTERNAL_SERVER_ERROR
        {
            let ai_url = format!("{}/ai/status", self.config.api_url);
            if let Ok(ai_resp) = self.client.get(&ai_url).headers(headers).send().await {
                if ai_resp.status().is_success() {
                    return Ok(None);
                }
            }
        }

        if resp.status() == reqwest::StatusCode::UNAUTHORIZED {
            return Err("HTTP 401 Unauthorized: Backend rejected token signature (invalid, malformed, or expired).".to_string());
        }

        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("Backend error (HTTP {}): {}", status, body))
    }

    /// Submits a validated Day-30 feature record to the ML early warning prediction endpoint.
    pub async fn predict(&self, req: &MLPredictRequestDto) -> Result<MLPredictResponseDto, String> {
        let primary_url = format!("{}/ml/predict", self.config.api_url);
        let resp = self
            .client
            .post(&primary_url)
            .headers(self.headers())
            .json(req)
            .send()
            .await
            .map_err(|e| format!("Failed to send prediction request: {}", e))?;

        if resp.status().is_success() {
            return resp
                .json::<MLPredictResponseDto>()
                .await
                .map_err(|e| format!("Failed to parse prediction response: {}", e));
        }

        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();

        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err("HTTP 401 Unauthorized: Valid session or Bearer token required to run predictions. Please run `sutra auth login`.".to_string());
        } else if status == reqwest::StatusCode::FORBIDDEN {
            return Err(format!("HTTP 403 Forbidden: Prediction requires authorized faculty or advisor role.\nDetails: {}", body));
        } else if status == reqwest::StatusCode::UNPROCESSABLE_ENTITY {
            return Err(format!("HTTP 422 Validation Error: Payload rejected by backend schema.\nDetails: {}", body));
        }

        // If primary endpoint failed with 500 / 503 (e.g. database connection degraded),
        // fallback to root compatibility alias `/predict` on the same backend host
        if status == reqwest::StatusCode::INTERNAL_SERVER_ERROR || status == reqwest::StatusCode::SERVICE_UNAVAILABLE {
            let root = self.config.api_url.replace("/api/v1", "");
            let fallback_url = format!("{}/predict", root);
            if let Ok(fb_resp) = self
                .client
                .post(&fallback_url)
                .headers(self.headers())
                .json(req)
                .send()
                .await
            {
                if fb_resp.status().is_success() {
                    return fb_resp
                        .json::<MLPredictResponseDto>()
                        .await
                        .map_err(|e| format!("Failed to parse prediction response: {}", e));
                }
            }
        }

        Err(format!("Prediction request failed (HTTP {}): {}", status, body))
    }
}
