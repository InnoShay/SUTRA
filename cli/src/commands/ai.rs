use crate::client::SutraApiClient;
use colored::*;
use uuid::Uuid;

pub async fn ai_status(client: &SutraApiClient) -> Result<(), String> {
    println!("{}", "=== SUTRA AI Orchestration Subsystem Status ===".bold());
    let status = client.ai_status().await?;

    println!("  Enabled:        {}", if status.enabled { "YES".green().bold() } else { "NO".red() });
    println!("  Provider:       {}", status.provider.cyan());
    println!("  Model:          {}", status.model_name.cyan());
    println!("  Timeout:        {}s", status.timeout_seconds);

    println!("\n{}", "Governance & Safety Invariants:".bold());
    for inv in status.governance_invariants {
        println!("  {} {}", "•".yellow(), inv);
    }
    Ok(())
}

pub async fn ai_review_brief(client: &SutraApiClient, signal_id: Uuid) -> Result<(), String> {
    println!("{}", "=== SUTRA AI-Assisted Review Brief ===".bold());
    println!("{}\n", "[ADVISORY ONLY • NON-BINDING • REQUIRES HUMAN CONFIRMATION]".yellow().bold());

    let brief = client.ai_review_brief(signal_id).await?;

    println!("Target Student: {}", brief.target_student_ref.cyan().bold());
    println!("Signal ID:      {}", brief.signal_id);

    println!("\n{}", "1. Evidence Summary:".bold());
    println!("  {}", brief.summary);

    println!("\n{}", "2. Verified Observed Facts:".bold());
    for f in &brief.observed_facts {
        println!("  {} {}", "✓".green(), f);
    }

    println!("\n{}", "3. Model Predictions (Isolated):".bold());
    for p in &brief.model_predictions {
        println!("  {} {}", "◆".purple(), p);
    }

    println!("\n{}", "4. Uncertainties & Data Gaps:".bold());
    for u in &brief.uncertainties {
        println!("  {} {}", "⚠".yellow(), u);
    }

    println!("\n{}", "5. Neutral Questions for Staff Investigation:".bold());
    for q in &brief.review_questions {
        println!("  {} {}", "?".cyan(), q);
    }

    println!("\n{}", "6. Candidate Interventions (Catalog Verified):".bold());
    for inv in &brief.candidate_interventions {
        println!(
            "  {} {} (role: {}, match: {}%)",
            "↳".bold(),
            inv.display_label.bold(),
            inv.recipient_role,
            (inv.confidence * 100.0).round()
        );
        println!("     Grounding: {}", inv.evidence_grounding.dimmed());
        println!("     Caveat:    {}", inv.caveats.dimmed());
    }

    println!("\n{}", "Execution Metadata:".bold());
    println!(
        "  Model: {} | Latency: {:.2}ms | Provider: {} | Mock: {}",
        brief.metadata.model_name.dimmed(),
        brief.metadata.latency_ms,
        brief.metadata.provider.dimmed(),
        brief.metadata.is_mock
    );
    Ok(())
}

pub async fn ai_summarize_evidence(client: &SutraApiClient, student_id: Uuid) -> Result<(), String> {
    println!("{}", "=== SUTRA AI Telemetry Synthesis ===".bold());
    println!("{}\n", "[ADVISORY ONLY • FINANCIAL RECORDS EXCLUDED PER ADR-003]".yellow().bold());

    let summary = client.ai_summarize_evidence(student_id).await?;

    println!("Student Ref: {}", summary.target_student_ref.cyan().bold());
    println!("\nSummary:\n  {}", summary.summary);

    println!("\nObserved Facts:");
    for f in summary.observed_facts {
        println!("  ✓ {}", f);
    }

    println!("\nUncertainties & Caveats:");
    for u in summary.uncertainties {
        println!("  ⚠ {}", u);
    }
    Ok(())
}
