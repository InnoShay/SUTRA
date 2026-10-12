use crate::client::SutraApiClient;
use colored::*;

pub async fn list_catalogue(client: &SutraApiClient) -> Result<(), String> {
    let items = client.list_catalogue().await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&items).map_err(|e| e.to_string())?);
        return Ok(());
    }

    println!("{}", "=== SUTRA Controlled Intervention Catalogue ===".bold());

    if items.is_empty() {
        println!("{}", "No active catalogue items found for this campus.".yellow());
        return Ok(());
    }

    println!("{:<28} {:<32} {:<14} {:<12}", "CATALOGUE KEY", "DISPLAY LABEL", "DOMAIN", "ROLE");
    println!("{}", "-".repeat(90));

    for item in items {
        println!(
            "{:<28} {:<32} {:<14} {:<12}",
            item.intervention_key.cyan().bold(),
            item.display_label,
            item.domain.yellow(),
            item.recipient_role.white()
        );
        if let Some(ref desc) = item.description {
            println!("   ↳ {}", desc.dimmed());
        }
    }
    Ok(())
}
