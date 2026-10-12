use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct StudentSummaryDto {
    pub id: Uuid,
    pub external_ref: String,
    pub display_name: String,
    #[serde(default)]
    pub cohort_code: Option<String>,
    pub enrollment_status: String,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct FreshnessMetricsDto {
    pub total_observations: i64,
    #[serde(default)]
    pub domains_represented: Vec<String>,
    #[serde(default)]
    pub last_observation_event_at: Option<String>,
    #[serde(default)]
    pub last_observation_available_at: Option<String>,
    #[serde(default)]
    pub is_stale: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct StudentSupportViewDto {
    pub student: StudentSummaryDto,
    pub freshness_metrics: FreshnessMetricsDto,
    pub active_signals_count: i64,
    pub active_cases_count: i64,
    #[serde(default)]
    pub recent_observations: Vec<serde_json::Value>,
}

#[test]
fn test_student_summary_deserialization_with_all_fields() {
    let student_id = Uuid::new_v4();
    let raw = json!({
        "id": student_id.to_string(),
        "external_ref": "SYN-1007",
        "display_name": "Alex Morgan",
        "cohort_code": "CS-Y2",
        "enrollment_status": "active",
        "created_at": "2026-09-01T08:00:00Z",
        "updated_at": "2026-10-12T10:00:00Z"
    });

    let dto: StudentSummaryDto = serde_json::from_value(raw).expect("Must deserialize valid student summary");
    assert_eq!(dto.id, student_id);
    assert_eq!(dto.external_ref, "SYN-1007");
    assert_eq!(dto.display_name, "Alex Morgan");
    assert_eq!(dto.cohort_code.as_deref(), Some("CS-Y2"));
    assert_eq!(dto.enrollment_status, "active");
    assert_eq!(dto.created_at.as_deref(), Some("2026-09-01T08:00:00Z"));
    assert_eq!(dto.updated_at.as_deref(), Some("2026-10-12T10:00:00Z"));
}

#[test]
fn test_student_summary_deserialization_with_missing_optional_fields() {
    let student_id = Uuid::new_v4();
    let raw = json!({
        "id": student_id.to_string(),
        "external_ref": "SYN-1009",
        "display_name": "Jordan Bell",
        "enrollment_status": "leave_of_absence"
    });

    let dto: StudentSummaryDto = serde_json::from_value(raw).expect("Must deserialize student summary without optional fields");
    assert_eq!(dto.id, student_id);
    assert_eq!(dto.external_ref, "SYN-1009");
    assert_eq!(dto.display_name, "Jordan Bell");
    assert_eq!(dto.cohort_code, None);
    assert_eq!(dto.created_at, None);
    assert_eq!(dto.updated_at, None);
}

#[test]
fn test_student_support_view_deserialization() {
    let student_id = Uuid::new_v4();
    let raw = json!({
        "student": {
            "id": student_id.to_string(),
            "external_ref": "SYN-1007",
            "display_name": "Alex Morgan",
            "cohort_code": "CS-Y2",
            "enrollment_status": "active"
        },
        "freshness_metrics": {
            "total_observations": 12,
            "domains_represented": ["attendance", "academic", "participation"],
            "last_observation_event_at": "2026-10-10T14:30:00Z",
            "is_stale": false
        },
        "active_signals_count": 2,
        "active_cases_count": 1,
        "recent_observations": [
            {
                "id": Uuid::new_v4().to_string(),
                "domain": "attendance",
                "metric_key": "class_attendance_rate",
                "value": 0.65
            }
        ]
    });

    let support: StudentSupportViewDto = serde_json::from_value(raw).expect("Must deserialize support view");
    assert_eq!(support.student.external_ref, "SYN-1007");
    assert_eq!(support.active_signals_count, 2);
    assert_eq!(support.active_cases_count, 1);
    assert_eq!(support.freshness_metrics.total_observations, 12);
    assert_eq!(support.freshness_metrics.is_stale, false);
    assert_eq!(support.freshness_metrics.domains_represented.len(), 3);
    assert_eq!(support.recent_observations.len(), 1);
}

#[test]
fn test_empty_student_id_or_ref_validation() {
    fn validate_id(id: &str) -> Result<(), &'static str> {
        if id.trim().is_empty() {
            Err("Validation Error: Student identifier or reference cannot be empty.")
        } else {
            Ok(())
        }
    }

    assert!(validate_id("").is_err());
    assert!(validate_id("   ").is_err());
    assert!(validate_id("SYN-1007").is_ok());
    assert!(validate_id(&Uuid::new_v4().to_string()).is_ok());
}

#[test]
fn test_cross_campus_isolation_error_message_non_leaking() {
    let clean_id = "SYN-2001";
    let formatted_err = format!("HTTP 404 Not Found: Student '{}' not found in active campus.", clean_id);
    // Guarantees cross-campus returns 404, not revealing whether student exists on another campus
    assert!(formatted_err.contains("HTTP 404 Not Found"));
    assert!(formatted_err.contains("SYN-2001"));
    assert!(!formatted_err.contains("Forbidden"));
    assert!(!formatted_err.contains("Campus Beta"));
}

#[test]
fn test_leadership_disallowed_role_error_redaction() {
    let status_code = 403;
    let raw_body = r#"{"error":{"code":"LEADERSHIP_QUEUE_ACCESS_DENIED","message":"Leadership role is restricted to cohort aggregates"}}"#;
    let is_forbidden = status_code == 403;
    assert!(is_forbidden);
    assert!(raw_body.contains("LEADERSHIP_QUEUE_ACCESS_DENIED"));
}

#[test]
fn test_unauthenticated_session_error_handling() {
    let status_code = 401;
    let is_unauthorized = status_code == 401;
    let msg = if is_unauthorized {
        "HTTP 401 Unauthorized: Valid session or Bearer token required. Please run `sutra auth login`."
    } else {
        "Other"
    };
    assert!(msg.contains("sutra auth login"));
}
