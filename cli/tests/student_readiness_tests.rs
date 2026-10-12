use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct ObservationDto {
    pub id: Uuid,
    pub domain: String,
    pub metric_key: String,
    pub value: serde_json::Value,
    #[serde(default)]
    pub unit: Option<String>,
    pub quality_state: String,
    pub event_at: String,
    #[serde(default)]
    pub available_at: Option<String>,
    pub ingested_at: String,
    pub source_system: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct FeatureReadinessItemDto {
    pub feature_name: String,
    pub category: String,
    pub status: String,
    #[serde(default)]
    pub observed_value: Option<serde_json::Value>,
    #[serde(default)]
    pub source_domain: Option<String>,
    pub derivation_note: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct ObservationTelemetryAuditDto {
    pub total_observations: i64,
    pub domains_present: Vec<String>,
    pub quality_state_counts: HashMap<String, i64>,
    #[serde(default)]
    pub last_event_at: Option<String>,
    #[serde(default)]
    pub last_available_at: Option<String>,
    #[serde(default)]
    pub is_stale: bool,
    pub unsupported_sources: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct StudentSummaryDto {
    pub id: Uuid,
    pub external_ref: String,
    pub display_name: String,
    #[serde(default)]
    pub cohort_code: Option<String>,
    pub enrollment_status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct StudentReadinessDto {
    pub student: StudentSummaryDto,
    pub model_name: String,
    pub model_version: String,
    pub target_cutoff: String,
    pub is_ready_for_inference: bool,
    pub applicability_status: String,
    pub applicability_rationale: String,
    pub features_total_required: i64,
    pub features_available_count: i64,
    pub features_missing_count: i64,
    pub features_underivable_count: i64,
    pub features_stale_count: i64,
    pub features: Vec<FeatureReadinessItemDto>,
    pub telemetry_audit: ObservationTelemetryAuditDto,
    pub governance_disclaimer: String,
}

#[test]
fn test_observation_dto_deserialization() {
    let obs_id = Uuid::new_v4();
    let raw = json!({
        "id": obs_id.to_string(),
        "domain": "attendance",
        "metric_key": "attendance_rate",
        "value": 0.88,
        "unit": "ratio",
        "quality_state": "valid",
        "event_at": "2026-10-10T09:00:00Z",
        "available_at": "2026-10-10T09:05:00Z",
        "ingested_at": "2026-10-10T09:06:00Z",
        "source_system": "biometric_turnstile"
    });

    let dto: ObservationDto = serde_json::from_value(raw).expect("Must deserialize observation DTO");
    assert_eq!(dto.id, obs_id);
    assert_eq!(dto.domain, "attendance");
    assert_eq!(dto.metric_key, "attendance_rate");
    assert_eq!(dto.unit.as_deref(), Some("ratio"));
    assert_eq!(dto.quality_state, "valid");
    assert_eq!(dto.source_system, "biometric_turnstile");
}

#[test]
fn test_student_readiness_inapplicable_model_contract() {
    let student_id = Uuid::new_v4();
    let raw = json!({
        "student": {
            "id": student_id.to_string(),
            "external_ref": "SYN-1007",
            "display_name": "Alex Morgan",
            "cohort_code": "CS-Y2",
            "enrollment_status": "active"
        },
        "model_name": "Logistic Regression Baseline",
        "model_version": "1.0.0",
        "target_cutoff": "Day 30",
        "is_ready_for_inference": false,
        "applicability_status": "MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM",
        "applicability_rationale": "The active ML model requires 25 canonical OULAD Day-30 features, including 12 fine-grained VLE clickstream interactions that cannot be derived from institutional attendance.",
        "features_total_required": 25,
        "features_available_count": 0,
        "features_missing_count": 13,
        "features_underivable_count": 12,
        "features_stale_count": 0,
        "features": [
            {
                "feature_name": "vle_total_clicks_d30",
                "category": "vle_engagement",
                "status": "underivable_from_source",
                "observed_value": null,
                "source_domain": null,
                "derivation_note": "Institutional telemetry tracks high-level LMS activity, not OULAD fine-grained clickstream"
            },
            {
                "feature_name": "num_of_prev_attempts",
                "category": "demographic",
                "status": "missing",
                "observed_value": null,
                "source_domain": null,
                "derivation_note": "Demographic attribute not recorded in pseudonymous student profile"
            }
        ],
        "telemetry_audit": {
            "total_observations": 5,
            "domains_present": ["attendance", "academic"],
            "quality_state_counts": { "valid": 5 },
            "last_event_at": "2026-10-11T12:00:00Z",
            "last_available_at": "2026-10-11T12:05:00Z",
            "is_stale": false,
            "unsupported_sources": [
                "student_feedback (not implemented in SUTRA data architecture)",
                "raw_vle_clickstream (campus LMS does not capture per-URL interaction logs)"
            ]
        },
        "governance_disclaimer": "Feature readiness checks audit input data completeness. It does NOT generate an early-warning score, compute risk, or predict student performance. Missing or underivable data must NEVER be treated as an indicator that the student is at risk."
    });

    let dto: StudentReadinessDto = serde_json::from_value(raw).expect("Must deserialize readiness response");
    assert_eq!(dto.student.external_ref, "SYN-1007");
    assert_eq!(dto.is_ready_for_inference, false);
    assert_eq!(dto.applicability_status, "MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM");
    assert_eq!(dto.features_total_required, 25);
    assert_eq!(dto.features_underivable_count, 12);
    assert_eq!(dto.features_missing_count, 13);
    assert_eq!(dto.telemetry_audit.total_observations, 5);
    assert!(dto.governance_disclaimer.contains("does NOT generate an early-warning score"));
    assert!(dto.governance_disclaimer.contains("NEVER be treated as an indicator that the student is at risk"));
}

#[test]
fn test_ready_and_stale_status_invariants() {
    let student_id = Uuid::new_v4();
    let raw_ready = json!({
        "student": {
            "id": student_id.to_string(),
            "external_ref": "STU-CANONICAL",
            "display_name": "Canonical Student",
            "enrollment_status": "active"
        },
        "model_name": "Logistic Regression Baseline",
        "model_version": "1.0.0",
        "target_cutoff": "Day 30",
        "is_ready_for_inference": true,
        "applicability_status": "READY",
        "applicability_rationale": "All 25 canonical Day-30 features are present, valid, and within temporal evaluation boundaries.",
        "features_total_required": 25,
        "features_available_count": 25,
        "features_missing_count": 0,
        "features_underivable_count": 0,
        "features_stale_count": 0,
        "features": [],
        "telemetry_audit": {
            "total_observations": 25,
            "domains_present": ["academic", "participation"],
            "quality_state_counts": { "valid": 25 },
            "is_stale": false,
            "unsupported_sources": []
        },
        "governance_disclaimer": "Safety audit disclaimer."
    });

    let ready_dto: StudentReadinessDto = serde_json::from_value(raw_ready).expect("Must deserialize ready DTO");
    assert!(ready_dto.is_ready_for_inference);
    assert_eq!(ready_dto.applicability_status, "READY");
    assert_eq!(ready_dto.features_available_count, 25);
}
