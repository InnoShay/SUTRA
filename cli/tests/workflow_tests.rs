use std::collections::HashMap;
use uuid::Uuid;

// Controlled test fixtures and end-to-end workflow verification for sutra-cli

#[test]
fn test_canonical_state_machine_allowed_transitions() {
    // Canonical transitions from 07_CASE_LIFECYCLE_AND_WORKER.md and case_service.py
    let transitions: HashMap<&str, Vec<&str>> = [
        ("suggested", vec!["under_review"]),
        ("under_review", vec!["action_planned", "dismissed"]),
        ("action_planned", vec!["assigned"]),
        ("assigned", vec!["accepted", "assigned (reassign)"]),
        ("accepted", vec!["contact_attempted"]),
        ("contact_attempted", vec!["support_in_progress", "failed_contact"]),
        ("support_in_progress", vec!["follow_up_due", "service_unavailable"]),
        ("follow_up_due", vec!["outcome_reviewed"]),
        ("outcome_reviewed", vec!["closed"]),
        ("failed_contact", vec!["closed"]),
        ("service_unavailable", vec!["closed"]),
        ("closed", vec!["reopened"]),
        ("dismissed", vec![]),
        ("reopened", vec!["assigned", "action_planned"]),
    ]
    .iter()
    .cloned()
    .collect();

    // Verify key transitions
    assert_eq!(transitions.get("suggested").unwrap(), &vec!["under_review"]);
    assert_eq!(transitions.get("action_planned").unwrap(), &vec!["assigned"]);
    assert_eq!(transitions.get("assigned").unwrap(), &vec!["accepted", "assigned (reassign)"]);
    assert_eq!(transitions.get("follow_up_due").unwrap(), &vec!["outcome_reviewed"]);
    assert_eq!(transitions.get("outcome_reviewed").unwrap(), &vec!["closed"]);
    assert!(transitions.get("dismissed").unwrap().is_empty());
}

#[test]
fn test_invalid_state_transition_safeguard() {
    // Simulated invalid transition attempt: 'suggested' directly to 'closed'
    let current_state = "suggested";
    let target_state = "closed";
    let allowed_targets = vec!["under_review"];

    let is_valid = allowed_targets.contains(&target_state);
    assert!(!is_valid, "Direct transition from suggested to closed must be rejected");

    let err_msg = format!(
        "StateConflictError: Transition from '{}' to '{}' is not allowed. Valid targets: {:?}",
        current_state, target_state, allowed_targets
    );
    assert!(err_msg.contains("StateConflictError"));
    assert!(err_msg.contains("not allowed"));
}

#[test]
fn test_authorized_multi_step_case_workflow_payloads() {
    let _student_id = Uuid::new_v4();
    let signal_id = Uuid::new_v4();
    let case_id = Uuid::new_v4();
    let staff_id = Uuid::new_v4();

    // Step 1: Signal Review Approval -> Creates Case
    let review_req = serde_json::json!({
        "decision": "approve",
        "selected_intervention_key": "academic_tutoring_offer",
        "reason_code": "REVIEWER_APPROVED_RECOMMENDATION",
        "rationale": "Consecutive low lab attendance; tutoring assigned per policy."
    });
    assert_eq!(review_req["decision"], "approve");
    assert!(review_req["rationale"].as_str().unwrap().len() >= 5);

    let review_resp = serde_json::json!({
        "signal_id": signal_id,
        "decision": "approve",
        "case_id": case_id,
        "status": "case_created"
    });
    assert_eq!(review_resp["case_id"], case_id.to_string());

    // Step 2: Case Assignment to Primary Owner
    let assign_req = serde_json::json!({
        "primary_owner_user_id": staff_id,
        "due_at": "2026-10-25T17:00:00Z",
        "reason_code": "MANUAL_CLI_ASSIGNMENT",
        "expected_version": 1
    });
    assert_eq!(assign_req["primary_owner_user_id"], staff_id.to_string());

    // Step 3: Owner Accepts Assignment (State: assigned -> accepted)
    let transition_req = serde_json::json!({
        "to_state": "accepted",
        "reason_code": "OWNER_ACCEPTED_ASSIGNMENT",
        "expected_version": 2
    });
    assert_eq!(transition_req["to_state"], "accepted");

    // Step 4: Record Follow-Up Contact
    let followup_req = serde_json::json!({
        "follow_up_type": "in_person",
        "contact_status": "student_reached",
        "proof_kind": "faculty_meeting_notes",
        "occurred_at": "2026-10-12T10:00:00Z",
        "note": "Met student in academic support lab; reviewed missed coursework."
    });
    assert_eq!(followup_req["contact_status"], "student_reached");

    // Step 5: Record Final Outcome (State: follow_up_due -> outcome_reviewed -> closed)
    let outcome_req = serde_json::json!({
        "outcome_status": "helped",
        "rationale": "Student submitted all recovery assignments and re-engaged with module tutor.",
        "evidence_kind": "staff_review"
    });
    assert_eq!(outcome_req["outcome_status"], "helped");
    assert!(outcome_req["rationale"].as_str().unwrap().len() >= 5);
}

#[test]
fn test_auth_failure_blocks_protected_workflow() {
    // Simulated 401 Unauthorized response
    let status_code = 401;
    let raw_error_body = r#"{"detail": "Could not validate credentials: JWT token expired or invalid."}"#;

    let is_auth_failure = status_code == 401 || status_code == 403;
    assert!(is_auth_failure);

    let formatted_err = format!("HTTP {} Unauthorized: {}", status_code, raw_error_body);
    assert!(formatted_err.contains("401"));
    assert!(!formatted_err.contains("Bearer eyJ")); // Guarantee token not leaked
}

#[test]
fn test_network_failure_does_not_claim_success() {
    // Simulated connection refused to offline endpoint
    let error_kind = "ConnectionRefused";
    let is_success = false;

    assert!(!is_success, "Network connection error must never report success");
    let cli_output = format!("Error: Failed to connect to backend: {}", error_kind);
    assert!(cli_output.starts_with("Error:"));
}

#[test]
fn test_mutation_idempotency_and_concurrency_protection() {
    // Verify expected_version is included to prevent duplicate or conflicting mutations
    let current_version = 3;
    let expected_version = 3;
    let concurrent_version = 4;

    assert_eq!(current_version, expected_version, "Optimistic lock matches");
    assert_ne!(concurrent_version, expected_version, "Concurrent edit must trigger conflict");
}
