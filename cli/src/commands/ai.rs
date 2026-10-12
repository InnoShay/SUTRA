use crate::client::SutraApiClient;
use colored::*;
use uuid::Uuid;

pub async fn ai_status(client: &SutraApiClient) -> Result<(), String> {
    let status = client.ai_status().await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&status).map_err(|e| e.to_string())?);
        return Ok(());
    }

    println!("{}", "=== SUTRA AI Orchestraction Subsystem Status ===".bold());

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
    let brief = client.ai_review_brief(signal_id).await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&brief).map_err(|e| e.to_string())?);
        return Ok(());
    }

    println!("{}", "=== SUTRA 5-Tier Evidence Card & Review Brief ===".bold());
    println!("{}\n", "[ADVISORY ONLY • NON-BINDING • REQUIRES HUMAN CONFIRMATION]".yellow().bold());

    println!("Target Student: {}", brief.target_student_ref.cyan().bold());
    println!("Signal ID:      {}", brief.signal_id);

    // ==========================================
    // TIER 1: OBSERVED STUDENT DATA
    // ==========================================
    println!("\n{}", "================================================================================".dimmed());
    println!("{}", "TIER 1: OBSERVED STUDENT DATA (Empirical Telemetry Ledger)".bold());
    println!("{}", "================================================================================".dimmed());
    if let Some(ref t1) = brief.tier1_observed_data {
        println!(
            "  Data Quality:   {} (Total Observations: {})",
            if t1.data_freshness == "stale" { "[STALE]".yellow().bold() } else { "[FRESH / VALID]".green().bold() },
            t1.total_observations
        );
        println!("  Domains:        {}", t1.domains_represented.join(", ").cyan());

        println!("\n  Verified Observed Facts:");
        for f in &t1.observed_facts {
            println!("    {} {}", "✓".green(), f);
        }

        if !t1.contradictions_detected.is_empty() {
            println!("\n  {}", "Telemetry Contradictions Detected:".red().bold());
            for c in &t1.contradictions_detected {
                println!("    {} {}", "⚠".red(), c.red());
            }
        }

        if !t1.data_limitations.is_empty() {
            println!("\n  Data Limitations:");
            for lim in &t1.data_limitations {
                println!("    • {}", lim.dimmed());
            }
        }
    } else {
        println!("  Observed Facts:");
        for f in &brief.observed_facts {
            println!("    {} {}", "✓".green(), f);
        }
    }

    // ==========================================
    // TIER 2: RULE-BASED SIGNAL AUDIT
    // ==========================================
    println!("\n{}", "================================================================================".dimmed());
    println!("{}", "TIER 2: RULE-BASED SIGNAL AUDIT (Deterministic Policy Triggers)".bold());
    println!("{}", "================================================================================".dimmed());
    if let Some(ref t2) = brief.tier2_rule_signal {
        println!("  Trigger Rule:   {}", t2.rule_key.yellow().bold());
        println!("  Outcome:        {}", t2.result.bold());
        println!("  Quality State:  {}", t2.quality_state);
        if let Some(ref eval_at) = t2.evaluated_at {
            println!("  Evaluated At:   {}", eval_at);
        }
        println!("  Trigger Summary:{}", t2.trigger_summary.dimmed());
    } else {
        println!("  Signal ID:      {}", brief.signal_id);
    }

    // ==========================================
    // TIER 3: ML PREDICTION & MODEL ATTRIBUTIONS
    // ==========================================
    println!("\n{}", "================================================================================".dimmed());
    println!("{}", "TIER 3: ML PREDICTION & MODEL ATTRIBUTIONS (Statistical Scoring)".bold());
    println!("{}", "================================================================================".dimmed());
    if let Some(ref t3) = brief.tier3_ml_prediction {
        if t3.has_ml_prediction {
            println!(
                "  Model Serving:  {} (v{}, cutoff: {})",
                t3.model_name.as_deref().unwrap_or("baseline").yellow(),
                t3.model_version.as_deref().unwrap_or("1.0.0"),
                t3.prediction_cutoff.as_deref().unwrap_or("Day 30")
            );
            if let Some(prob) = t3.risk_probability {
                let thresh = t3.threshold.unwrap_or(0.46);
                let bar_width = 25;
                let filled = ((prob * bar_width as f64).round() as usize).min(bar_width);
                let bar = format!("[{}{}]", "=".repeat(filled).red().bold(), " ".repeat(bar_width - filled));
                println!("  Risk Score:     {} {:.1}% (Decision Threshold: {:.1}%)", bar, prob * 100.0, thresh * 100.0);
                let cls = t3.classification.as_deref().unwrap_or("Unknown");
                println!("  Classification: {}", if cls == "At_Risk" { "[AT RISK]".red().bold() } else { "[ON TRACK]".green().bold() });
            }
            if !t3.top_attributions.is_empty() {
                println!("\n  Key Attributions:");
                for attr in &t3.top_attributions {
                    if let Some(obj) = attr.as_object() {
                        let feat = obj.get("feature").and_then(|v| v.as_str()).unwrap_or("feature");
                        let dir = obj.get("direction").and_then(|v| v.as_str()).unwrap_or("neutral");
                        let weight = obj.get("attribution").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let icon = if dir == "increases_risk" { "▲".red() } else { "▼".green() };
                        println!("    {} {:<30} (weight: {:+.4}, direction: {})", icon, feat.bold(), weight, dir);
                    }
                }
            }
            if !t3.ml_limitations.is_empty() {
                println!("\n  Model Governance Constraints:");
                for lim in &t3.ml_limitations {
                    println!("    • {}", lim.dimmed());
                }
            }
        } else {
            println!("  ML Status:      No production ML prediction recorded for this signal.");
        }
    } else {
        for p in &brief.model_predictions {
            println!("  ◆ {}", p);
        }
    }

    // ==========================================
    // TIER 4: AI ADVISORY RECOMMENDATIONS
    // ==========================================
    println!("\n{}", "================================================================================".dimmed());
    println!("{}", "TIER 4: AI DECISION-SUPPORT & CANDIDATE INTERVENTIONS (Catalogue-Grounded)".bold());
    println!("{}", "================================================================================".dimmed());
    println!("  Synthesis Summary:\n    {}\n", brief.summary.cyan());

    if !brief.uncertainties.is_empty() {
        println!("  Uncertainties & Data Caveats:");
        for u in &brief.uncertainties {
            println!("    {} {}", "⚠".yellow(), u);
        }
        println!();
    }

    if !brief.review_questions.is_empty() {
        println!("  Neutral Questions for Staff Investigation:");
        for q in &brief.review_questions {
            println!("    {} {}", "?".cyan(), q);
        }
        println!();
    }

    println!("  Catalogue-Grounded Candidate Interventions:");
    for inv in &brief.candidate_interventions {
        println!(
            "    {} {} (Role: {}, Match Confidence: {:.0}%)",
            "↳".bold(),
            inv.display_label.bold(),
            inv.recipient_role.cyan(),
            inv.confidence * 100.0
        );
        println!("       Grounding: {}", inv.evidence_grounding.dimmed());
        println!("       Caveat:    {}", inv.caveats.dimmed());
    }

    // ==========================================
    // TIER 5: HUMAN DECISION & CASE HISTORY
    // ==========================================
    println!("\n{}", "================================================================================".dimmed());
    println!("{}", "TIER 5: HUMAN REVIEW HISTORY & CASE OUTCOMES (Accountability Record)".bold());
    println!("{}", "================================================================================".dimmed());
    if let Some(ref t5) = brief.tier5_human_decision {
        if t5.has_human_review {
            println!(
                "  Review Decision: {}",
                t5.reviewed_decision.as_deref().unwrap_or("Reviewed").green().bold()
            );
            if let Some(ref reviewer) = t5.reviewed_by {
                println!("  Reviewed By:     {}", reviewer);
            }
            if let Some(ref at) = t5.reviewed_at {
                println!("  Reviewed At:     {}", at);
            }
            if let Some(ref code) = t5.review_reason_code {
                println!("  Reason Code:     {}", code);
            }
            if let Some(case_id) = t5.case_id {
                println!("\n  Associated Case: {}", case_id.to_string().cyan());
                println!("  Case State:      {}", t5.case_state.as_deref().unwrap_or("unknown").bold());
                println!("  Follow-Ups Logged: {}", t5.follow_ups_count);
                if let Some(ref out_st) = t5.outcome_status {
                    println!("  Final Outcome:   {}", out_st.bold());
                    if let Some(ref out_rat) = t5.outcome_rationale {
                        println!("  Outcome Reason:  {}", out_rat.dimmed());
                    }
                }
            }
        } else {
            println!("  Review Status:   {} (Pending triage review by authorized educator)", "[UNREVIEWED]".yellow().bold());
        }
    } else {
        println!("  Review Status:   Pending triage review.");
    }

    println!("\n{}", "================================================================================".dimmed());
    println!("{}", "HUMAN OVERSIGHT & WORKFLOW NEXT STEP:".yellow().bold());
    println!("  • AI recommendations are non-binding advisory decision-support only (No Alert Without Action).");
    println!("  • To act on this insight, record a verified educator review:");
    let top_key = brief
        .candidate_interventions
        .first()
        .map(|c| c.intervention_key.as_str())
        .unwrap_or("academic_tutoring_offer");
    println!(
        "    {}",
        format!(
            "sutra signals review {} --decision approve --intervention {} --rationale \"Educator confirmed advisory brief.\"",
            signal_id, top_key
        )
        .bold()
    );
    println!("{}", "================================================================================".dimmed());

    Ok(())
}

pub async fn ai_summarize_evidence(client: &SutraApiClient, id_or_ref: &str) -> Result<(), String> {
    let summary = client.ai_summarize_evidence(id_or_ref).await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&summary).map_err(|e| e.to_string())?);
        return Ok(());
    }

    println!("{}", "=== SUTRA AI Telemetry Synthesis & Evidence Card ===".bold());
    println!("{}\n", "[ADVISORY ONLY • FINANCIAL RECORDS EXCLUDED PER ADR-003]".yellow().bold());

    println!("Target Student: {}", summary.target_student_ref.cyan().bold());
    println!("\nSummary:\n  {}", summary.summary.cyan());

    if let Some(ref t1) = summary.tier1_observed_data {
        println!("\nObserved Telemetry:");
        println!("  Freshness: {} | Domains: {}", t1.data_freshness.bold(), t1.domains_represented.join(", "));
        for f in &t1.observed_facts {
            println!("  ✓ {}", f);
        }
        if !t1.contradictions_detected.is_empty() {
            println!("\n{}", "Contradictions Detected:".red().bold());
            for c in &t1.contradictions_detected {
                println!("  ⚠ {}", c.red());
            }
        }
    } else {
        println!("\nObserved Facts:");
        for f in &summary.observed_facts {
            println!("  ✓ {}", f);
        }
    }

    if !summary.uncertainties.is_empty() {
        println!("\nUncertainties & Telemetry Gaps:");
        for u in &summary.uncertainties {
            println!("  ⚠ {}", u.yellow());
        }
    }

    if let Some(ref t4) = summary.tier4_ai_recommendation {
        if !t4.candidate_interventions.is_empty() {
            println!("\nCandidate Interventions (Campus Catalog):");
            for inv in &t4.candidate_interventions {
                println!("  ↳ {} ({}, match: {:.0}%)", inv.display_label.bold(), inv.recipient_role, inv.confidence * 100.0);
                println!("     Grounding: {}", inv.evidence_grounding.dimmed());
            }
        }
    }

    println!("\n{}", "Human Oversight & Policy Boundaries:".yellow().bold());
    println!("  • Student financial records are strictly segregated per ADR-003 and never included.");
    println!("  • Telemetry synthesis is non-diagnostic; educator confirmation is mandatory.");
    Ok(())
}

pub async fn ai_student_evidence(client: &SutraApiClient, id_or_ref: &str) -> Result<(), String> {
    let summary = client.get_student_evidence_summary(id_or_ref).await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&summary).map_err(|e| e.to_string())?);
        return Ok(());
    }

    println!("{}", "=== SUTRA Student 5-Tier Evidence Card ===".bold());
    println!("{}\n", "[ADVISORY ONLY • FINANCIAL RECORDS EXCLUDED PER ADR-003]".yellow().bold());

    println!("Target Student: {}", summary.target_student_ref.cyan().bold());
    println!("\nSynthesis Summary:\n  {}", summary.summary.cyan());

    if let Some(ref t1) = summary.tier1_observed_data {
        println!("\n[Tier 1] Observed Telemetry:");
        println!("  Freshness: {} | Total Observations: {}", t1.data_freshness.bold(), t1.total_observations);
        for f in &t1.observed_facts {
            println!("  ✓ {}", f);
        }
        if !t1.contradictions_detected.is_empty() {
            println!("\n  {}", "Contradictions Detected:".red().bold());
            for c in &t1.contradictions_detected {
                println!("    ⚠ {}", c.red());
            }
        }
    }

    if !summary.tier2_rule_signals.is_empty() {
        println!("\n[Tier 2] Active Rule Signals:");
        for s in &summary.tier2_rule_signals {
            println!("  ◆ Rule: {:<30} Outcome: {}", s.rule_key.yellow().bold(), s.result);
        }
    }

    if let Some(ref t3) = summary.tier3_ml_prediction {
        if t3.has_ml_prediction {
            println!("\n[Tier 3] ML Predictive Inference:");
            if let Some(prob) = t3.risk_probability {
                println!("  Risk Probability: {:.1}% | Threshold: {:.1}%", prob * 100.0, t3.threshold.unwrap_or(0.46) * 100.0);
            }
        }
    }

    if let Some(ref t4) = summary.tier4_ai_recommendation {
        println!("\n[Tier 4] Catalogue-Grounded Candidate Interventions:");
        for inv in &t4.candidate_interventions {
            println!("  ↳ {} ({}, confidence: {:.0}%)", inv.display_label.bold(), inv.recipient_role.cyan(), inv.confidence * 100.0);
            println!("     Grounding: {}", inv.evidence_grounding.dimmed());
        }
    }

    if let Some(ref t5) = summary.tier5_human_decision {
        println!("\n[Tier 5] Human Review & Case Progression:");
        if t5.has_human_review {
            println!("  Case State: {}", t5.case_state.as_deref().unwrap_or("active").green().bold());
        } else {
            println!("  No active human support case recorded.");
        }
    }

    println!("\n{}", "Advisory Notice:".yellow().bold());
    println!("  • Predictions and recommendations are decision-support only (No Alert Without Action).");
    println!("  • Never automatically mutate case state or penalize a student based on advisory evidence.");
    Ok(())
}

