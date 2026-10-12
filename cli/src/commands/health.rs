use crate::client::SutraApiClient;
use colored::*;

pub async fn run_health(client: &SutraApiClient) -> Result<(), String> {
    println!("{}", "Checking SUTRA Backend Health & Readiness...".bold());
    println!("API URL: {}", client.config.api_url.cyan());

    match client.health().await {
        Ok(h) => {
            println!(
                "  {} Health: {} (version: {})",
                "✓".green().bold(),
                h.status.green(),
                h.version
            );
        }
        Err(e) => {
            println!("  {} Health check failed: {}", "✗".red().bold(), e);
            return Err(e);
        }
    }

    match client.ready().await {
        Ok(r) => {
            println!(
                "  {} Readiness: {} (database: {}, ml_model: {})",
                "✓".green().bold(),
                r.status.green(),
                r.checks.database.cyan(),
                r.checks.ml_model.cyan()
            );
        }
        Err(e) => {
            println!("  {} Readiness check failed: {}", "✗".red().bold(), e);
            return Err(e);
        }
    }

    println!("{}", "Backend is healthy and accepting traffic.".green().bold());
    Ok(())
}
