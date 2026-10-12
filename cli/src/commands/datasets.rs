use crate::client::SutraApiClient;
use colored::*;

/// Displays the data provenance framework and isolation rules across the 3 data sources.
pub async fn run_info(client: &SutraApiClient) -> Result<(), String> {
    let overview = client.get_dataset_provenance().await?;

    println!("{}", "================================================================================".bold());
    println!("{}", "       SUTRA DATA PROVENANCE & SOURCE ISOLATION FRAMEWORK (ADR-005)              ".bold().cyan());
    println!("{}", "================================================================================".bold());
    println!("Governance: {}", overview.governance_framework.bold());
    println!("Status:     {}", overview.status.green().bold());
    println!();

    let source_keys = ["institutional", "oulad_research", "synthetic_demo"];
    for key in &source_keys {
        if let Some(src) = overview.sources.get(*key) {
            println!("{}", format!("--- [{}] {} ---", key.to_uppercase(), src.name).bold().yellow());
            println!("  Entity Type:      {}", src.entity_type.bold());
            println!("  Key Schema:       {}", src.key_schema.cyan());
            let count_str = src
                .record_count
                .map(|c| c.to_string())
                .unwrap_or_else(|| "Dynamic / Postgres Table".to_string());
            println!("  Record Count:     {}", count_str);
            println!("  Storage Location: {}", src.storage_location);
            println!("  Purpose:          {}", src.purpose);
            println!("  Licensing:        {}", src.licensing.green());
            println!("  Isolation Rule:   {}", src.isolation_rule.red().bold());
            println!();
        }
    }

    println!("{}", "================================================================================".bold());
    println!("{}", "INVARIANT: Research and synthetic keys NEVER map into live institutional students.".red().bold());
    println!("{}", "================================================================================".bold());

    Ok(())
}

/// Explicitly looks up a research (OULAD) or synthetic demonstration record.
pub async fn run_lookup(
    client: &SutraApiClient,
    source: &str,
    identifier: &str,
    module: Option<&str>,
    presentation: Option<&str>,
) -> Result<(), String> {
    let clean_source = source.trim().to_lowercase();
    if clean_source != "oulad" && clean_source != "synthetic" && clean_source != "synthetic_demo" && clean_source != "demo" {
        return Err(format!(
            "Invalid source '{}'. Must specify '--source oulad' or '--source synthetic'.\nNote: Live institutional student records must be queried via `sutra students get <ID>`.",
            source
        ));
    }

    let rec = client
        .lookup_research_record(&clean_source, identifier, module, presentation)
        .await?;

    println!("{}", "================================================================================".bold());
    println!("{}", "       SUTRA NON-INSTITUTIONAL RECORD LOOKUP (RESEARCH / DEMONSTRATION)         ".bold().yellow());
    println!("{}", "================================================================================".bold());
    println!("  Data Source:       {}", rec.source.to_uppercase().cyan().bold());
    println!("  Record Identifier: {}", rec.record_identifier.bold());
    println!("  Entity Type:       {}", rec.entity_type);
    println!("  Provenance Label:  {}", rec.provenance_label.green());
    println!("  Licensing:         {}", rec.licensing);
    println!("  Purpose:           {}", rec.purpose);
    println!();
    println!("  {} {}", "LEGAL DISCLAIMER:".red().bold(), rec.disclaimer.yellow().bold());
    println!("  {} {}", "ISOLATION STATUS:".red().bold(), "Not a live institutional student record (Institutional Flag: FALSE)".bold());
    println!();

    if let Some(ctx) = rec.enrollment_context {
        println!("{}", "--- Enrollment & Presentation Context ---".bold());
        let mut sorted_keys: Vec<_> = ctx.keys().collect();
        sorted_keys.sort();
        for k in sorted_keys {
            if let Some(v) = ctx.get(k) {
                println!("  {:<24}: {}", k, v);
            }
        }
        println!();
    }

    println!("{}", "--- Day-30 Telemetry / Engagement Features ---".bold());
    let mut feat_keys: Vec<_> = rec.features.keys().collect();
    feat_keys.sort();
    for k in feat_keys {
        if let Some(v) = rec.features.get(k) {
            println!("  {:<26}: {}", k, v);
        }
    }
    println!("{}", "================================================================================".bold());

    Ok(())
}
