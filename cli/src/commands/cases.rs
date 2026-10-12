use crate::client::SutraApiClient;
use crate::models::{CaseAssignmentRequest, CaseTransitionRequest, FollowUpRequest, OutcomeRequest};
use colored::*;
use uuid::Uuid;

pub fn allowed_next_states(current_state: &str) -> &'static [&'static str] {
    match current_state.to_lowercase().as_str() {
        "suggested" => &["under_review"],
        "under_review" => &["action_planned", "dismissed"],
        "action_planned" => &["assigned"],
        "assigned" => &["accepted", "assigned (reassign)"],
        "accepted" => &["contact_attempted"],
        "contact_attempted" => &["support_in_progress", "failed_contact"],
        "support_in_progress" => &["follow_up_due", "service_unavailable"],
        "follow_up_due" => &["outcome_reviewed"],
        "outcome_reviewed" => &["closed"],
        "failed_contact" => &["closed"],
        "service_unavailable" => &["closed"],
        "closed" => &["reopened"],
        "dismissed" => &[],
        "reopened" => &["assigned", "action_planned"],
        _ => &[],
    }
}

pub fn suggested_next_step(case_id: &Uuid, current_state: &str) -> Option<String> {
    match current_state.to_lowercase().as_str() {
        "action_planned" => Some(format!("sutra cases assign {} --user-id <STAFF_UUID>", case_id)),
        "assigned" => Some(format!("sutra cases transition {} --to-state accepted", case_id)),
        "accepted" => Some(format!("sutra cases follow-up {} --channel in_person --proof faculty_meeting_notes --note \"Met with student\"", case_id)),
        "contact_attempted" => Some(format!("sutra cases transition {} --to-state support_in_progress", case_id)),
        "follow_up_due" => Some(format!("sutra cases outcome {} --status helped --rationale \"Intervention completed with positive student engagement\"", case_id)),
        "outcome_reviewed" => Some(format!("sutra cases transition {} --to-state closed --reason \"INTERVENTION_COMPLETE\"", case_id)),
        "failed_contact" | "service_unavailable" => Some(format!("sutra cases transition {} --to-state closed --reason \"INTERVENTION_TERMINATED\"", case_id)),
        _ => None,
    }
}

pub async fn list_cases(client: &SutraApiClient, state_filter: Option<&str>) -> Result<(), String> {
    println!("{}", "=== SUTRA Student Support Cases ===".bold());
    let cases = client.list_cases(state_filter).await?;

    if cases.is_empty() {
        println!("{}", "No active cases found.".yellow());
        return Ok(());
    }

    println!("{:<38} {:<14} {:<24} {:<22} {:<14}", "CASE ID", "STUDENT REF", "NAME", "INTERVENTION", "STATE");
    println!("{}", "-".repeat(116));

    for c in cases {
        let state_badge = match c.state.to_lowercase().as_str() {
            "closed" | "dismissed" => c.state.green(),
            "in_progress" | "accepted" | "support_in_progress" => c.state.cyan().bold(),
            "assigned" | "action_planned" => c.state.yellow().bold(),
            _ => c.state.white(),
        };

        println!(
            "{:<38} {:<14} {:<24} {:<22} {}",
            c.id.to_string().white(),
            c.external_student_ref.cyan(),
            c.student_display_name,
            c.selected_intervention_key,
            state_badge
        );
    }
    Ok(())
}

pub async fn get_case(client: &SutraApiClient, id: Uuid) -> Result<(), String> {
    let c = client.get_case(id).await?;
    println!("{}", "=== Case Details ===".bold());
    println!("  Case ID:       {}", c.id.to_string().cyan().bold());
    println!("  Student:       {} ({})", c.student_display_name.bold(), c.external_student_ref);
    println!("  Intervention:  {}", c.selected_intervention_key.bold());
    println!("  State:         {}", c.state.green().bold());
    println!("  Version:       {}", c.version);
    if let Some(owner) = c.primary_owner_user_id {
        println!("  Owner User:    {}", owner.to_string().cyan());
    }
    if let Some(due) = c.due_at {
        println!("  Due Date:      {}", due);
    }
    if let Some(true) = c.is_escalated {
        println!("  Escalation:    {}", "YES (ESCALATED)".red().bold());
    }

    // Display canonical state machine transitions
    let next_states = allowed_next_states(&c.state);
    if !next_states.is_empty() {
        println!("\n{}", "Canonical Next States:".bold());
        for ns in next_states {
            println!("  ↳ {}", ns.cyan());
        }
    }

    // Follow-ups & outcomes summary
    if !c.follow_ups.is_empty() {
        println!("\n{} ({} recorded):", "Follow-Up Audit History".bold(), c.follow_ups.len());
        for fu in &c.follow_ups {
            let ch = fu.get("follow_up_type").and_then(|v| v.as_str()).unwrap_or("unknown");
            let pk = fu.get("proof_kind").and_then(|v| v.as_str()).unwrap_or("none");
            let dt = fu.get("occurred_at").and_then(|v| v.as_str()).unwrap_or("");
            let note = fu.get("sanitized_note").and_then(|v| v.as_str()).unwrap_or("");
            println!("  • [{}] channel: {}, proof: {} | \"{}\"", dt.dimmed(), ch.cyan(), pk, note);
        }
    }

    if let Some(ref outcome) = c.outcome {
        println!("\n{}", "Recorded Intervention Outcome:".bold());
        let st = outcome.get("outcome_status").and_then(|v| v.as_str()).unwrap_or("unknown");
        let rat = outcome.get("rationale").and_then(|v| v.as_str()).unwrap_or("");
        println!("  Status:    {}", st.green().bold());
        println!("  Rationale: {}", rat);
    }

    println!("\n  Tasks:   {} registered", c.tasks.len());
    println!("  Events:  {} timeline entries", c.events.len());

    if let Some(action) = suggested_next_step(&c.id, &c.state) {
        println!("\n{}", "Suggested Next Workflow Action:".yellow().bold());
        println!("  {}", action.bold());
    }

    Ok(())
}

pub async fn transition_case(
    client: &SutraApiClient,
    id: Uuid,
    to_state: &str,
    reason_code: Option<&str>,
) -> Result<(), String> {
    let req = CaseTransitionRequest {
        to_state: to_state.to_lowercase(),
        reason_code: reason_code.map(|s| s.to_string()),
        metadata: None,
    };

    println!("Transitioning case #{} to state {}...", id, to_state.bold());
    let updated = client.transition_case(id, req).await?;

    println!("{} State transition confirmed!", "✓".green().bold());
    println!("  New State:   {}", updated.state.green().bold());
    println!("  New Version: {}", updated.version);

    let next_states = allowed_next_states(&updated.state);
    if !next_states.is_empty() {
        println!("\n{}", "Allowed Next States:".bold());
        for ns in next_states {
            println!("  ↳ {}", ns.cyan());
        }
    }

    if let Some(action) = suggested_next_step(&updated.id, &updated.state) {
        println!("\n{}", "Suggested Next Workflow Step:".yellow().bold());
        println!("  {}", action.bold());
    }

    Ok(())
}

pub async fn assign_case(
    client: &SutraApiClient,
    id: Uuid,
    owner_user_id: Uuid,
    due_at: Option<&str>,
) -> Result<(), String> {
    let req = CaseAssignmentRequest {
        primary_owner_user_id: owner_user_id,
        due_at: due_at.map(|s| s.to_string()),
        reason_code: Some("MANUAL_CLI_ASSIGNMENT".to_string()),
    };

    println!("Assigning case #{} to user #{}...", id, owner_user_id);
    let updated = client.assign_case(id, req).await?;

    println!("{} Case assigned successfully!", "✓".green().bold());
    println!("  Owner: {}", updated.primary_owner_user_id.map(|u| u.to_string()).unwrap_or_default().cyan());
    println!("  State: {}", updated.state.green().bold());

    println!("\n{}", "Suggested Next Workflow Step:".yellow().bold());
    println!("  Assigned owner accepts case responsibility:");
    println!("  {}", format!("sutra cases transition {} --to-state accepted", id).bold());

    Ok(())
}

pub async fn record_follow_up(
    client: &SutraApiClient,
    id: Uuid,
    follow_up_type: &str,
    proof_kind: &str,
    contact_status: Option<&str>,
    note: Option<&str>,
) -> Result<(), String> {
    let req = FollowUpRequest {
        follow_up_type: follow_up_type.to_string(),
        contact_status: Some(contact_status.unwrap_or("student_reached").to_string()),
        proof_kind: proof_kind.to_string(),
        occurred_at: chrono::Utc::now().to_rfc3339(),
        note: note.map(|s| s.to_string()),
        proof_ref: None,
    };

    println!("Recording follow-up for case #{}...", id);
    client.record_follow_up(id, req).await?;
    println!("{} Follow-up action logged in audit trail!", "✓".green().bold());

    println!("\n{}", "Suggested Next Workflow Step:".yellow().bold());
    println!("  Record final student intervention outcome:");
    println!(
        "  {}",
        format!("sutra cases outcome {} --status helped --rationale \"Student attended review and completed assignments.\"", id).bold()
    );

    Ok(())
}

pub async fn record_outcome(
    client: &SutraApiClient,
    id: Uuid,
    outcome_status: &str,
    rationale: &str,
    evidence_kind: Option<&str>,
) -> Result<(), String> {
    if rationale.trim().len() < 5 {
        return Err("Policy Violation: Outcome rationale must be at least 5 characters.".to_string());
    }

    let req = OutcomeRequest {
        outcome_status: outcome_status.to_string(),
        rationale: rationale.trim().to_string(),
        evidence_kind: Some(evidence_kind.unwrap_or("staff_review").to_string()),
    };

    println!("Recording final intervention outcome for case #{}...", id);
    client.record_outcome(id, req).await?;
    println!("{} Case outcome recorded! State transitioned to 'outcome_reviewed'.", "✓".green().bold());

    println!("\n{}", "Suggested Next Workflow Step:".yellow().bold());
    println!("  Formally close the case in the canonical 10-state machine:");
    println!("  {}", format!("sutra cases transition {} --to-state closed --reason \"INTERVENTION_COMPLETE\"", id).bold());

    Ok(())
}
