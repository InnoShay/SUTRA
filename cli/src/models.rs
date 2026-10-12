use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub environment: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadinessResponse {
    pub status: String,
    pub database: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalDto {
    pub id: Uuid,
    pub institution_id: Uuid,
    pub student_id: Uuid,
    pub external_student_ref: String,
    pub student_display_name: String,
    pub rule_key: String,
    pub result: String,
    pub quality_state: String,
    pub evaluated_at: String,
    #[serde(default)]
    pub reviewed_decision: Option<String>,
    #[serde(default)]
    pub reviewed_at: Option<String>,
    #[serde(default)]
    pub evidence_digest: Option<String>,
    #[serde(default)]
    pub explanation: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalReviewRequest {
    pub decision: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_intervention_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason_code: Option<String>,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalReviewResponse {
    pub signal_id: Uuid,
    #[serde(alias = "decision", alias = "review_status")]
    pub decision: String,
    #[serde(default)]
    pub case_id: Option<Uuid>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseDto {
    pub id: Uuid,
    pub institution_id: Uuid,
    pub student_id: Uuid,
    pub external_student_ref: String,
    pub student_display_name: String,
    pub originating_signal_id: Uuid,
    pub selected_intervention_key: String,
    pub state: String,
    #[serde(default)]
    pub primary_owner_user_id: Option<Uuid>,
    #[serde(default)]
    pub due_at: Option<String>,
    #[serde(default)]
    pub is_escalated: Option<bool>,
    pub version: i32,
    #[serde(default)]
    pub tasks: Vec<serde_json::Value>,
    #[serde(default)]
    pub events: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseTransitionRequest {
    pub to_state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseAssignmentRequest {
    pub primary_owner_user_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FollowUpRequest {
    pub follow_up_type: String,
    pub proof_kind: String,
    pub occurred_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutcomeRequest {
    pub outcome_status: String,
    pub rationale: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence_kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionItem {
    pub intervention_key: String,
    pub display_label: String,
    pub domain: String,
    pub recipient_role: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub requires_human_approval: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiStatusResponse {
    pub enabled: bool,
    pub provider: String,
    pub model_name: String,
    pub timeout_seconds: f64,
    pub governance_invariants: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiCandidateIntervention {
    pub intervention_key: String,
    pub display_label: String,
    pub domain: String,
    pub recipient_role: String,
    pub confidence: f64,
    pub evidence_grounding: String,
    pub caveats: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMetadata {
    pub model_name: String,
    pub provider: String,
    pub latency_ms: f64,
    pub is_mock: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiReviewBriefResponse {
    pub target_student_ref: String,
    pub signal_id: Uuid,
    pub summary: String,
    pub observed_facts: Vec<String>,
    pub model_predictions: Vec<String>,
    pub uncertainties: Vec<String>,
    pub review_questions: Vec<String>,
    pub candidate_interventions: Vec<AiCandidateIntervention>,
    pub limitations: Vec<String>,
    pub metadata: AiMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSummarizeEvidenceResponse {
    pub target_student_ref: String,
    pub summary: String,
    pub observed_facts: Vec<String>,
    pub uncertainties: Vec<String>,
    pub limitations: Vec<String>,
    pub metadata: AiMetadata,
}
