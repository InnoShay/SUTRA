use crate::client::SutraApiClient;
use crate::models::{CaseAssignmentRequest, CaseTransitionRequest, FollowUpRequest, OutcomeRequest};
use colored::*;
use uuid::Uuid;

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
        let state_badge = match c.state.as_str() {
            "CLOSED" | "RESOLVED" => c.state.green(),
            "IN_PROGRESS" | "ACCEPTED" => c.state.cyan().bold(),
            "ASSIGNED" | "ACTIONABLE" => c.state.yellow().bold(),
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

    println!("\n  Tasks:   {} registered", c.tasks.len());
    println!("  Events:  {} timeline entries", c.events.len());
    Ok(())
}

pub async fn transition_case(
    client: &SutraApiClient,
    id: Uuid,
    to_state: &str,
    reason_code: Option<&str>,
) -> Result<(), String> {
    let req = CaseTransitionRequest {
        to_state: to_state.to_uppercase(),
        reason_code: reason_code.map(|s| s.to_string()),
        metadata: None,
    };

    println!("Transitioning case #{} to state {}...", id, to_state.bold());
    let updated = client.transition_case(id, req).await?;

    println!("{} State transition confirmed!", "✓".green().bold());
    println!("  New State:   {}", updated.state.green().bold());
    println!("  New Version: {}", updated.version);
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
    Ok(())
}

pub async fn record_follow_up(
    client: &SutraApiClient,
    id: Uuid,
    follow_up_type: &str,
    proof_kind: &str,
    note: Option<&str>,
) -> Result<(), String> {
    let req = FollowUpRequest {
        follow_up_type: follow_up_type.to_string(),
        proof_kind: proof_kind.to_string(),
        occurred_at: chrono::Utc::now().to_rfc3339(),
        note: note.map(|s| s.to_string()),
    };

    println!("Recording follow-up for case #{}...", id);
    client.record_follow_up(id, req).await?;
    println!("{} Follow-up action logged in audit trail!", "✓".green().bold());
    Ok(())
}

pub async fn record_outcome(
    client: &SutraApiClient,
    id: Uuid,
    outcome_status: &str,
    rationale: &str,
) -> Result<(), String> {
    if rationale.trim().len() < 5 {
        return Err("Policy Violation: Outcome rationale must be at least 5 characters.".to_string());
    }

    let req = OutcomeRequest {
        outcome_status: outcome_status.to_string(),
        rationale: rationale.trim().to_string(),
        evidence_kind: Some("staff_review".to_string()),
    };

    println!("Recording final intervention outcome for case #{}...", id);
    client.record_outcome(id, req).await?;
    println!("{} Case outcome recorded and closed!", "✓".green().bold());
    Ok(())
}
