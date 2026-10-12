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

    pub async fn ai_summarize_evidence(&self, id_or_ref: &str) -> Result<AiSummarizeEvidenceResponse, String> {
        let clean_id = id_or_ref.trim();
        let payload = if let Ok(u) = Uuid::parse_str(clean_id) {
            serde_json::json!({ "student_id": u })
        } else {
            serde_json::json!({ "student_ref": clean_id })
        };

        let url = format!("{}/ai/summarize-evidence", self.config.api_url);
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

    pub async fn get_student_evidence_summary(&self, id_or_ref: &str) -> Result<AiSummarizeEvidenceResponse, String> {
        let clean_id = id_or_ref.trim();
        let url = format!("{}/students/{}/evidence-summary", self.config.api_url, clean_id);
        let resp = self.client.get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Student evidence summary request failed: {}", body));
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

    /// Lists authorized pseudonymous students in the active campus.
    pub async fn list_students(
        &self,
        cohort: Option<&str>,
        limit: Option<u32>,
        offset: Option<u32>,
    ) -> Result<Vec<StudentSummaryDto>, String> {
        let url = format!("{}/students", self.config.api_url);
        let mut req_builder = self.client.get(&url).headers(self.headers());

        if let Some(c) = cohort {
            req_builder = req_builder.query(&[("cohort", c)]);
        }
        if let Some(l) = limit {
            req_builder = req_builder.query(&[("limit", l.to_string())]);
        }
        if let Some(o) = offset {
            req_builder = req_builder.query(&[("offset", o.to_string())]);
        }

        let resp = req_builder
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err("HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`.".to_string());
            } else if status == reqwest::StatusCode::FORBIDDEN {
                return Err(format!("HTTP 403 Forbidden: Caller role is not authorized to access individual student records.\nDetails: {}", body));
            }
            return Err(format!("Request failed (HTTP {}): {}", status, body));
        }

        resp.json::<Vec<StudentSummaryDto>>()
            .await
            .map_err(|e| format!("Failed to parse students list response: {}", e))
    }

    /// Fetches authorized student profile by UUID or external reference.
    pub async fn get_student(&self, id_or_ref: &str) -> Result<StudentSummaryDto, String> {
        let clean_id = id_or_ref.trim();
        if clean_id.is_empty() {
            return Err("Student identifier or reference cannot be empty.".to_string());
        }

        let url = format!("{}/students/{}", self.config.api_url, clean_id);
        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::NOT_FOUND {
                return Err(format!(
                    "HTTP 404 Not Found: Student '{}' not found in active campus.",
                    clean_id
                ));
            } else if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err("HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`.".to_string());
            } else if status == reqwest::StatusCode::FORBIDDEN {
                return Err(format!("HTTP 403 Forbidden: Caller role is not authorized to access individual student records.\nDetails: {}", body));
            }
            return Err(format!("Request failed (HTTP {}): {}", status, body));
        }

        resp.json::<StudentSummaryDto>()
            .await
            .map_err(|e| format!("Failed to parse student profile response: {}", e))
    }

    /// Attempts to fetch support view (active signals & cases count, freshness metrics) for a student.
    pub async fn get_student_support_view(&self, id_or_ref: &str) -> Result<Option<StudentSupportViewDto>, String> {
        let clean_id = id_or_ref.trim();
        if clean_id.is_empty() {
            return Ok(None);
        }

        let url = format!("{}/students/{}/support-view", self.config.api_url, clean_id);
        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if resp.status().is_success() {
            let view = resp.json::<StudentSupportViewDto>().await.ok();
            return Ok(view);
        }
        Ok(None)
    }

    /// Fetches the three-source data provenance overview and isolation boundaries.
    pub async fn get_dataset_provenance(&self) -> Result<ProvenanceOverviewDto, String> {
        let url = format!("{}/datasets/provenance", self.config.api_url);
        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Request failed (HTTP {}): {}", status, body));
        }

        resp.json::<ProvenanceOverviewDto>()
            .await
            .map_err(|e| format!("Failed to parse provenance response: {}", e))
    }

    /// Explicitly looks up a research (OULAD) or synthetic demonstration record.
    /// Strictly isolated from live institutional student queries.
    pub async fn lookup_research_record(
        &self,
        source: &str,
        identifier: &str,
        module: Option<&str>,
        presentation: Option<&str>,
    ) -> Result<ResearchRecordDto, String> {
        let clean_id = identifier.trim();
        if clean_id.is_empty() {
            return Err("Identifier cannot be empty".to_string());
        }

        let clean_source = source.to_lowercase();
        let url = match clean_source.as_str() {
            "oulad" => {
                let mut u = format!("{}/datasets/research/oulad/{}", self.config.api_url, clean_id);
                let mut query_params = Vec::new();
                if let Some(m) = module {
                    query_params.push(format!("module={}", m));
                }
                if let Some(p) = presentation {
                    query_params.push(format!("presentation={}", p));
                }
                if !query_params.is_empty() {
                    u.push('?');
                    u.push_str(&query_params.join("&"));
                }
                u
            }
            "synthetic" | "synthetic_demo" | "demo" => {
                format!("{}/datasets/research/synthetic/{}", self.config.api_url, clean_id)
            }
            other => {
                return Err(format!(
                    "Invalid dataset source '{}'. Allowed sources: 'oulad', 'synthetic'. (Institutional records must be queried via `sutra students get`)",
                    other
                ));
            }
        };

        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::NOT_FOUND {
                return Err(format!(
                    "HTTP 404 Not Found: Record '{}' not found in dataset source '{}'.",
                    clean_id, source
                ));
            } else if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err("HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`.".to_string());
            } else if status == reqwest::StatusCode::FORBIDDEN {
                return Err(format!("HTTP 403 Forbidden: Caller is not authorized.\nDetails: {}", body));
            }
            return Err(format!("Request failed (HTTP {}): {}", status, body));
        }

        resp.json::<ResearchRecordDto>()
            .await
            .map_err(|e| format!("Failed to parse research record response: {}", e))
    }

    /// Lists chronological multi-domain student observations with optional domain/quality filters.
    pub async fn get_student_observations(
        &self,
        id_or_ref: &str,
        domain: Option<&str>,
        quality_state: Option<&str>,
        limit: Option<u32>,
    ) -> Result<Vec<ObservationDto>, String> {
        let clean_id = id_or_ref.trim();
        if clean_id.is_empty() {
            return Err("Student identifier cannot be empty".to_string());
        }

        let mut url = format!("{}/students/{}/observations", self.config.api_url, clean_id);
        let mut query_params = Vec::new();
        if let Some(d) = domain {
            query_params.push(format!("domain={}", d));
        }
        if let Some(q) = quality_state {
            query_params.push(format!("quality_state={}", q));
        }
        if let Some(l) = limit {
            query_params.push(format!("limit={}", l));
        }
        if !query_params.join("&").is_empty() {
            url.push('?');
            url.push_str(&query_params.join("&"));
        }

        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::NOT_FOUND {
                return Err(format!(
                    "HTTP 404 Not Found: Student '{}' not found in active campus.",
                    clean_id
                ));
            } else if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err("HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`.".to_string());
            } else if status == reqwest::StatusCode::FORBIDDEN {
                return Err(format!("HTTP 403 Forbidden: Caller is not authorized.\nDetails: {}", body));
            }
            return Err(format!("Request failed (HTTP {}): {}", status, body));
        }

        resp.json::<Vec<ObservationDto>>()
            .await
            .map_err(|e| format!("Failed to parse student observations response: {}", e))
    }

    /// Evaluates feature completeness against the 25 canonical Day-30 ML features.
    pub async fn get_student_readiness(&self, id_or_ref: &str) -> Result<StudentReadinessDto, String> {
        let clean_id = id_or_ref.trim();
        if clean_id.is_empty() {
            return Err("Student identifier cannot be empty".to_string());
        }

        let url = format!("{}/students/{}/readiness", self.config.api_url, clean_id);
        let resp = self
            .client
            .get(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Network error connecting to SUTRA backend: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::NOT_FOUND {
                return Err(format!(
                    "HTTP 404 Not Found: Student '{}' not found in active campus.",
                    clean_id
                ));
            } else if status == reqwest::StatusCode::UNAUTHORIZED {
                return Err("HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`.".to_string());
            } else if status == reqwest::StatusCode::FORBIDDEN {
                return Err(format!("HTTP 403 Forbidden: Caller is not authorized.\nDetails: {}", body));
            }
            return Err(format!("Request failed (HTTP {}): {}", status, body));
        }

        resp.json::<StudentReadinessDto>()
            .await
            .map_err(|e| format!("Failed to parse feature readiness response: {}", e))
    }

    /// Executes authorized server-side ML prediction for a specific student in the active campus.
    pub async fn predict_student(&self, id_or_ref: &str) -> Result<MLPredictResponseDto, String> {
        let clean_id = id_or_ref.trim();
        if clean_id.is_empty() {
            return Err("Student identifier cannot be empty".to_string());
        }

        let url = format!("{}/students/{}/predict", self.config.api_url, clean_id);
        let resp = self
            .client
            .post(&url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Failed to send student prediction request: {}", e))?;

        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();

        if status.is_success() {
            return serde_json::from_str::<MLPredictResponseDto>(&body)
                .map_err(|e| format!("Failed to parse prediction response: {}", e));
        }

        if status == reqwest::StatusCode::NOT_FOUND {
            Err(format!(
                "HTTP 404 Not Found: Student '{}' not found in active campus.",
                clean_id
            ))
        } else if status == reqwest::StatusCode::UNAUTHORIZED {
            Err("HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`.".to_string())
        } else if status == reqwest::StatusCode::FORBIDDEN {
            Err(format!(
                "HTTP 403 Forbidden: Caller role is not authorized to execute student-specific ML inference.\nDetails: {}",
                body
            ))
        } else if status == reqwest::StatusCode::UNPROCESSABLE_ENTITY {
            Err(format!(
                "HTTP 422 Incompatible / Insufficient Data: Student record cannot be evaluated by ML model.\nDetails: {}",
                body
            ))
        } else {
            Err(format!("Request failed (HTTP {}): {}", status, body))
        }
    }
}




