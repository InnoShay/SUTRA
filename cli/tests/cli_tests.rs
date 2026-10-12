use uuid::Uuid;

// Models and serialization test suite for sutra-cli
#[test]
fn test_signal_review_request_serialization() {
    let req = serde_json::json!({
        "decision": "approve",
        "selected_intervention_key": "academic_tutoring_offer",
        "reason_code": "REVIEWER_APPROVED_RECOMMENDATION",
        "rationale": "Consecutive low lab attendance; tutoring assigned per policy."
    });

    assert_eq!(req["decision"], "approve");
    assert_eq!(req["selected_intervention_key"], "academic_tutoring_offer");
    assert!(req["rationale"].as_str().unwrap().len() >= 5);
}

#[test]
fn test_case_transition_request_serialization() {
    let req = serde_json::json!({
        "to_state": "IN_PROGRESS",
        "reason_code": "STAFF_ACCEPTED_AND_STARTED"
    });

    assert_eq!(req["to_state"], "IN_PROGRESS");
    assert_eq!(req["reason_code"], "STAFF_ACCEPTED_AND_STARTED");
}

#[test]
fn test_follow_up_request_serialization() {
    let req = serde_json::json!({
        "follow_up_type": "in_person",
        "proof_kind": "faculty_meeting_notes",
        "occurred_at": "2026-10-12T05:00:00Z",
        "note": "Student attended 1-on-1 review session."
    });

    assert_eq!(req["follow_up_type"], "in_person");
    assert_eq!(req["proof_kind"], "faculty_meeting_notes");
}

#[test]
fn test_outcome_request_serialization() {
    let req = serde_json::json!({
        "outcome_status": "helped",
        "rationale": "Student completed all recovery assignments; attendance recovered to 78%.",
        "evidence_kind": "staff_review"
    });

    assert_eq!(req["outcome_status"], "helped");
    assert!(req["rationale"].as_str().unwrap().len() >= 5);
}

#[test]
fn test_ai_status_deserialization() {
    let raw = r#"{
        "enabled": true,
        "provider": "mock",
        "model_name": "sutra-mock-v1",
        "timeout_seconds": 10.0,
        "governance_invariants": [
            "AI is strictly advisory",
            "No Alert Without Action"
        ]
    }"#;

    let v: serde_json::Value = serde_json::from_str(raw).expect("Must parse valid JSON");
    assert_eq!(v["enabled"], true);
    assert_eq!(v["provider"], "mock");
    assert_eq!(v["governance_invariants"].as_array().unwrap().len(), 2);
}

#[test]
fn test_ai_review_brief_deserialization() {
    let raw = r#"{
        "target_student_ref": "STU-001",
        "signal_id": "88888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "summary": "Low attendance detected across 3 core modules.",
        "observed_facts": ["Attendance at 58%"],
        "model_predictions": ["Day-30 risk score: 0.82"],
        "uncertainties": ["Missing LMS activity for Week 4"],
        "review_questions": ["Has student reported transport difficulties?"],
        "candidate_interventions": [
            {
                "intervention_key": "academic_tutoring_offer",
                "display_label": "Subject Tutoring Referral",
                "domain": "academic",
                "recipient_role": "faculty",
                "confidence": 0.85,
                "evidence_grounding": "Low core module score",
                "caveats": "Requires educator review"
            }
        ],
        "limitations": ["Financial data excluded per ADR-003"],
        "metadata": {
            "model_name": "sutra-mock-v1",
            "provider": "deterministic_mock",
            "latency_ms": 14.2,
            "is_mock": true,
            "timestamp": "2026-10-12T05:00:00Z"
        }
    }"#;

    let v: serde_json::Value = serde_json::from_str(raw).expect("Must parse AI review brief JSON");
    assert_eq!(v["target_student_ref"], "STU-001");
    assert_eq!(v["candidate_interventions"][0]["intervention_key"], "academic_tutoring_offer");
    assert_eq!(v["metadata"]["is_mock"], true);
}

#[test]
fn test_uuid_validation() {
    let valid_uuid = "00000000-0000-0000-0000-000000000001";
    assert!(Uuid::parse_str(valid_uuid).is_ok());

    let invalid_uuid = "not-a-valid-uuid";
    assert!(Uuid::parse_str(invalid_uuid).is_err());
}

#[test]
fn test_case_assignment_request_serialization() {
    let owner_id = Uuid::parse_str("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa").unwrap();
    let req = serde_json::json!({
        "primary_owner_user_id": owner_id,
        "due_at": "2026-10-20T12:00:00Z",
        "reason_code": "MANUAL_CLI_ASSIGNMENT"
    });

    assert_eq!(req["primary_owner_user_id"], "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    assert_eq!(req["reason_code"], "MANUAL_CLI_ASSIGNMENT");
}

#[test]
fn test_case_dto_deserialization_with_followups_and_outcome() {
    let raw = r#"{
        "id": "11111111-2222-3333-4444-555555555555",
        "institution_id": "00000000-0000-0000-0000-000000000001",
        "student_id": "99999999-8888-7777-6666-555555555555",
        "external_student_ref": "STU-1001",
        "student_display_name": "Alice Smith",
        "originating_signal_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "selected_intervention_key": "academic_tutoring_offer",
        "state": "assigned",
        "primary_owner_user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "due_at": "2026-10-20T12:00:00Z",
        "accepted_at": null,
        "is_escalated": false,
        "version": 2,
        "tasks": [],
        "events": [],
        "follow_ups": [
            {
                "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
                "follow_up_type": "in_person",
                "contact_status": "student_reached",
                "proof_kind": "faculty_meeting_notes",
                "occurred_at": "2026-10-12T05:00:00Z",
                "sanitized_note": "Met in lab."
            }
        ],
        "outcome": {
            "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "outcome_status": "helped",
            "rationale": "Completed tutoring modules",
            "evidence_kind": "staff_review",
            "recorded_at": "2026-10-12T06:00:00Z"
        }
    }"#;

    let v: serde_json::Value = serde_json::from_str(raw).expect("Must parse CaseDto JSON");
    assert_eq!(v["state"], "assigned");
    assert_eq!(v["external_student_ref"], "STU-1001");
    assert_eq!(v["follow_ups"].as_array().unwrap().len(), 1);
    assert_eq!(v["outcome"]["outcome_status"], "helped");
}

