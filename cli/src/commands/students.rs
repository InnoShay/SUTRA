use crate::client::SutraApiClient;
use colored::*;

/// Lists authorized pseudonymous students in the caller's active campus tenancy.
pub async fn list_students(
    client: &SutraApiClient,
    cohort: Option<&str>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<(), String> {
    println!("{}", "=== SUTRA Authorized Student Registry ===".bold());
    if let Some(campus_id) = client.config.campus_id {
        println!("Campus Tenancy: {}", campus_id.to_string().cyan());
    }
    if let Some(c) = cohort {
        println!("Cohort Filter:  {}", c.yellow());
    }
    if limit.is_some() || offset.is_some() {
        println!(
            "Pagination:     Limit: {}, Offset: {}",
            limit.map(|l| l.to_string()).unwrap_or_else(|| "default".to_string()),
            offset.map(|o| o.to_string()).unwrap_or_else(|| "0".to_string())
        );
    }

    let students = client.list_students(cohort, limit, offset).await?;

    if students.is_empty() {
        println!("{}", "\nNo authorized students found matching criteria in active campus.".yellow());
        return Ok(());
    }

    println!("\n{:<38} {:<14} {:<24} {:<14} {:<12}", "STUDENT ID", "EXTERNAL REF", "NAME", "COHORT", "STATUS");
    println!("{}", "-".repeat(106));

    for s in &students {
        let status_badge = match s.enrollment_status.to_lowercase().as_str() {
            "active" => "[active]".green().bold(),
            "leave" | "leave_of_absence" => "[on_leave]".yellow().bold(),
            "withdrawn" | "inactive" => "[withdrawn]".red().bold(),
            _ => format!("[{}]", s.enrollment_status).white(),
        };

        let cohort_str = s.cohort_code.as_deref().unwrap_or("-");

        println!(
            "{:<38} {:<14} {:<24} {:<14} {}",
            s.id.to_string().white(),
            s.external_ref.cyan().bold(),
            s.display_name,
            cohort_str,
            status_badge
        );
    }

    println!("{}", "-".repeat(106));
    println!("Total Students Displayed: {}", students.len().to_string().bold());

    Ok(())
}

/// Retrieves authorized student profile details and academic posture by UUID or external reference.
pub async fn get_student(client: &SutraApiClient, id_or_ref: &str) -> Result<(), String> {
    let clean_id = id_or_ref.trim();
    if clean_id.is_empty() {
        return Err("Validation Error: Student identifier or reference cannot be empty.".to_string());
    }

    let student = client.get_student(clean_id).await?;

    println!("{}", "=== SUTRA Student Profile ===".bold());
    println!("  Student ID:        {}", student.id.to_string().white());
    println!("  External Ref:      {}", student.external_ref.cyan().bold());
    println!("  Display Name:      {}", student.display_name.bold());

    let cohort_display = match student.cohort_code.as_deref() {
        Some(c) if !c.trim().is_empty() => c.to_string(),
        _ => "[Not Assigned / Unavailable]".dimmed().to_string(),
    };
    println!("  Cohort Code:       {}", cohort_display);

    let status_badge = match student.enrollment_status.to_lowercase().as_str() {
        "active" => "[ACTIVE]".green().bold(),
        "leave" | "leave_of_absence" => "[ON LEAVE]".yellow().bold(),
        "withdrawn" | "inactive" => "[WITHDRAWN]".red().bold(),
        other => format!("[{}]", other.to_uppercase()).white(),
    };
    println!("  Enrollment Status: {}", status_badge);

    let created_display = student.created_at.as_deref().unwrap_or("[Unavailable]");
    let updated_display = student.updated_at.as_deref().unwrap_or("[Unavailable]");
    println!("  Registered At:     {}", created_display.dimmed());
    println!("  Last Updated:      {}", updated_display.dimmed());

    // Attempt to enrich with support view (active signals, active cases, observation freshness)
    if let Ok(Some(support)) = client.get_student_support_view(clean_id).await {
        println!("\n{}", "=== Academic Posture & Telemetry Freshness ===".bold());
        let sig_color = if support.active_signals_count > 0 {
            support.active_signals_count.to_string().yellow().bold()
        } else {
            support.active_signals_count.to_string().green()
        };
        println!("  Active Signals:    {} pending educator review", sig_color);

        let case_color = if support.active_cases_count > 0 {
            support.active_cases_count.to_string().cyan().bold()
        } else {
            support.active_cases_count.to_string().green()
        };
        println!("  Active Cases:      {} in 10-state intervention lifecycle", case_color);

        let freshness = &support.freshness_metrics;
        let freshness_badge = if freshness.is_stale {
            "[STALE DATA • REFRESH RECOMMENDED]".yellow().bold()
        } else {
            "[VERIFIED FRESH]".green().bold()
        };
        println!("  Data Freshness:    {}", freshness_badge);
        println!("  Total Observations:{}", freshness.total_observations);

        if !freshness.domains_represented.is_empty() {
            println!("  Domains Observed:  {}", freshness.domains_represented.join(", ").dimmed());
        }
        if let Some(ref last_event) = freshness.last_observation_event_at {
            println!("  Last Activity:     {}", last_event.dimmed());
        }
    }

    println!("\n{}", "Operational Guidance:".dimmed());
    println!("{}", "  • Principle 'No Alert Without Action': Check signal queue for pending triage reviews.".dimmed());
    println!("{}", "  • Run `sutra signals list` or `sutra cases list` to inspect active workflows.".dimmed());

    Ok(())
}

/// Lists chronological multi-domain student observations with optional domain/quality filters.
pub async fn list_observations(
    client: &SutraApiClient,
    id_or_ref: &str,
    domain: Option<&str>,
    quality: Option<&str>,
    limit: Option<u32>,
) -> Result<(), String> {
    let clean_id = id_or_ref.trim();
    if clean_id.is_empty() {
        return Err("Validation Error: Student identifier cannot be empty.".to_string());
    }

    println!("{}", "=== SUTRA Student Observations Ledger ===".bold());
    println!("  Student:        {}", clean_id.cyan().bold());
    if let Some(d) = domain {
        println!("  Domain Filter:  {}", d.yellow());
    }
    if let Some(q) = quality {
        println!("  Quality Filter: {}", q.yellow());
    }
    if let Some(l) = limit {
        println!("  Limit:          {}", l);
    }

    let observations = client
        .get_student_observations(clean_id, domain, quality, limit)
        .await?;

    if observations.is_empty() {
        println!("{}", "\nNo observations found matching criteria for this student.".yellow());
        return Ok(());
    }

    println!("\n{:<22} {:<16} {:<28} {:<18} {:<12} {}", "TIMESTAMP", "DOMAIN", "METRIC KEY", "VALUE", "QUALITY", "SOURCE SYSTEM");
    println!("{}", "-".repeat(110));

    for o in &observations {
        let domain_badge = match o.domain.to_lowercase().as_str() {
            "attendance" => "[attendance]".cyan().bold(),
            "academic" => "[academic]".yellow().bold(),
            "participation" => "[participation]".blue().bold(),
            "skills" => "[skills]".magenta().bold(),
            "faculty_feedback" => "[faculty]".green().bold(),
            other => format!("[{}]", other).white(),
        };

        let quality_badge = match o.quality_state.to_lowercase().as_str() {
            "valid" => "[valid]".green(),
            "stale" => "[stale]".yellow().bold(),
            "missing" => "[missing]".red().bold(),
            "conflicting" => "[conflict]".red().bold(),
            other => format!("[{}]", other).white(),
        };

        let val_str = match &o.value {
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Bool(b) => b.to_string(),
            other => other.to_string(),
        };
        let val_display = if val_str.len() > 16 {
            format!("{}...", &val_str[..13])
        } else {
            val_str
        };

        let ts_display = if o.event_at.len() >= 19 {
            &o.event_at[..19]
        } else {
            &o.event_at
        };

        println!(
            "{:<22} {:<16} {:<28} {:<18} {:<12} {}",
            ts_display.dimmed(),
            domain_badge,
            o.metric_key.bold(),
            val_display,
            quality_badge,
            o.source_system.dimmed()
        );
    }

    println!("{}", "-".repeat(110));
    println!("Total Observations Displayed: {}", observations.len().to_string().bold());
    println!("{}", "Note: Financial aid observations are strictly segregated per ADR-003 and excluded from this view.".dimmed());

    Ok(())
}

/// Evaluates feature completeness and applicability against the 25 canonical Day-30 ML features.
pub async fn check_readiness(client: &SutraApiClient, id_or_ref: &str) -> Result<(), String> {
    let clean_id = id_or_ref.trim();
    if clean_id.is_empty() {
        return Err("Validation Error: Student identifier cannot be empty.".to_string());
    }

    let r = client.get_student_readiness(clean_id).await?;

    println!("{}", "================================================================================".bold());
    println!("{}", "       SUTRA ML FEATURE READINESS AUDIT (DAY-30 EARLY-WARNING)                  ".bold().cyan());
    println!("{}", "================================================================================".bold());
    println!("  Student ID:      {}", r.student.id.to_string().white());
    println!("  External Ref:    {}", r.student.external_ref.cyan().bold());
    println!("  Display Name:    {}", r.student.display_name.bold());
    println!("  Cohort Code:     {}", r.student.cohort_code.as_deref().unwrap_or("[Unassigned]"));
    println!("  Target Model:    {} v{} (Cutoff: {})", r.model_name.bold(), r.model_version, r.target_cutoff);
    println!();

    let status_badge = match r.applicability_status.as_str() {
        "READY" => "[MODEL READY FOR INFERENCE]".green().bold(),
        "STALE_DATA" => "[STALE TELEMETRY DETECTED]".yellow().bold(),
        "MODEL_NOT_APPLICABLE_TO_CAMPUS_CURRICULUM" => "[MODEL INAPPLICABLE: SOURCE MISMATCH]".yellow().bold(),
        "INSUFFICIENT_DATA" => "[INSUFFICIENT CANONICAL FEATURES]".red().bold(),
        other => format!("[{}]", other).white().bold(),
    };

    println!("  READINESS STATUS: {}", status_badge);
    println!("  IS READY:         {}", if r.is_ready_for_inference { "TRUE".green().bold() } else { "FALSE".red().bold() });
    println!("  RATIONALE:        {}", r.applicability_rationale.yellow());
    println!();

    println!("{}", "--- Feature Breakdown (25 Canonical Day-30 Features) ---".bold());
    println!("  Total Required:           {}", r.features_total_required.to_string().bold());
    println!("  Available & Valid:        {}", r.features_available_count.to_string().green().bold());
    println!("  Missing / Unrecorded:     {}", r.features_missing_count.to_string().red().bold());
    println!("  Underivable From Source:  {}", r.features_underivable_count.to_string().yellow().bold());
    println!("  Stale Observations:       {}", r.features_stale_count.to_string().yellow());
    println!();

    println!("{}", "--- Telemetry Ledger Audit ---".bold());
    println!("  Total Observations Found: {}", r.telemetry_audit.total_observations);
    println!("  Domains Observed:         {}", if r.telemetry_audit.domains_present.is_empty() { "[None]".dimmed().to_string() } else { r.telemetry_audit.domains_present.join(", ") });
    if let Some(ref last_event) = r.telemetry_audit.last_event_at {
        println!("  Last Activity Event:      {}", last_event.dimmed());
    }
    println!("  Unsupported Sources:      {}", r.telemetry_audit.unsupported_sources.join(" | ").dimmed());
    println!();

    println!("{:<32} {:<18} {:<18} {:<14} {}", "FEATURE NAME", "CATEGORY", "STATUS", "VALUE", "DERIVATION NOTE");
    println!("{}", "-".repeat(110));

    for f in &r.features {
        let status_badge = match f.status.as_str() {
            "available" => "[available]".green(),
            "underivable_from_source" => "[underivable]".yellow(),
            "missing" => "[missing]".red(),
            "stale" => "[stale]".yellow().bold(),
            other => format!("[{}]", other).white(),
        };

        let val_display = f.observed_value
            .as_ref()
            .map(|v| match v {
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Bool(b) => b.to_string(),
                other => other.to_string(),
            })
            .unwrap_or_else(|| "-".to_string());

        println!(
            "{:<32} {:<18} {:<18} {:<14} {}",
            f.feature_name.bold(),
            f.category.dimmed(),
            status_badge,
            val_display,
            f.derivation_note.dimmed()
        );
    }

    println!("{}", "================================================================================".bold());
    println!("{} {}", "GOVERNANCE NOTICE:".red().bold(), r.governance_disclaimer.yellow().bold());
    println!("{}", "================================================================================".bold());

    Ok(())
}
