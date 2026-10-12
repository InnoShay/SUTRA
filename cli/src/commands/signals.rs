use crate::client::SutraApiClient;
use crate::models::SignalReviewRequest;
use colored::*;
use uuid::Uuid;

pub async fn list_signals(client: &SutraApiClient, result_filter: Option<&str>) -> Result<(), String> {
    println!("{}", "=== SUTRA Signal Triage Queue ===".bold());
    if let Some(campus_id) = client.config.campus_id {
        println!("Campus Tenancy: {}", campus_id.to_string().cyan());
    }

    let signals = client.list_signals(result_filter).await?;
    if signals.is_empty() {
        println!("{}", "No signals found in current queue.".yellow());
        return Ok(());
    }

    println!("{:<38} {:<14} {:<24} {:<18} {:<12}", "SIGNAL ID", "STUDENT REF", "NAME", "RULE KEY", "STATUS");
    println!("{}", "-".repeat(110));

    for s in signals {
        let status_color = if s.reviewed_decision.is_some() {
            format!("[{}]", s.reviewed_decision.as_deref().unwrap_or("reviewed")).green()
        } else {
            "[pending]".yellow().bold()
        };

        println!(
            "{:<38} {:<14} {:<24} {:<18} {}",
            s.id.to_string().white(),
            s.external_student_ref.cyan(),
            s.student_display_name,
            s.rule_key,
            status_color
        );
    }

    Ok(())
}

pub async fn get_signal(client: &SutraApiClient, id: Uuid) -> Result<(), String> {
    let s = client.get_signal(id).await?;
    println!("{}", "=== Signal Details ===".bold());
    println!("  ID:               {}", s.id.to_string().cyan());
    println!("  Student:          {} ({})", s.student_display_name.bold(), s.external_student_ref);
    println!("  Rule Key:         {}", s.rule_key);
    println!("  Result:           {}", s.result.yellow().bold());
    println!("  Quality State:    {}", s.quality_state);
    println!("  Evaluated At:     {}", s.evaluated_at);
    println!(
        "  Review Status:    {}",
        s.reviewed_decision.as_deref().unwrap_or("unreviewed").bold()
    );
    if let Some(ref digest) = s.evidence_digest {
        println!("  Evidence Digest:  {}", digest.dimmed());
    }
    if let Some(ref explanation) = s.explanation {
        println!("\n{}", "Evidence Card Explanation:".bold());
        println!("{}", serde_json::to_string_pretty(explanation).unwrap_or_default());
    }
    Ok(())
}

pub async fn review_signal(
    client: &SutraApiClient,
    id: Uuid,
    decision: &str,
    intervention_key: Option<&str>,
    rationale: &str,
) -> Result<(), String> {
    if rationale.trim().len() < 5 {
        return Err("Policy Violation: Review rationale must be at least 5 characters (Principle: No Alert Without Action).".to_string());
    }

    let valid_decisions = ["approve", "modify", "dismiss", "request_more_data"];
    if !valid_decisions.contains(&decision) {
        return Err(format!(
            "Invalid decision '{}'. Must be one of: {:?}",
            decision, valid_decisions
        ));
    }

    let req = SignalReviewRequest {
        decision: decision.to_string(),
        selected_intervention_key: intervention_key.map(|s| s.to_string()),
        reason_code: Some(match decision {
            "approve" => "REVIEWER_APPROVED_RECOMMENDATION",
            "dismiss" => "REVIEWER_DISMISSED_FALSE_POSITIVE",
            _ => "REVIEWER_SELECTED_ALTERNATIVE",
        }.to_string()),
        rationale: rationale.trim().to_string(),
    };

    println!("{}", "Submitting human signal review...".bold());
    let resp = client.review_signal(id, req).await?;

    println!("{} Signal review recorded successfully!", "✓".green().bold());
    println!("  Signal ID:  {}", resp.signal_id);
    println!("  Decision:   {}", resp.decision.green().bold());
    if let Some(case_id) = resp.case_id {
        println!("  Case Created: #{}", case_id.to_string().cyan().bold());
    }
    Ok(())
}
