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
            url.push_str(&format!("?state={}", s));
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
        let url = format!("{}/cases/{}/assign", self.config.api_url, id);
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
}
