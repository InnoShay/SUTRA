use crate::client::SutraApiClient;
use crate::session::{parse_jwt_claims_diagnostic, CliSession, SessionManager};
use chrono::Utc;
use colored::*;
use std::io::{self, BufRead, IsTerminal};

/// Executes the `sutra auth login` workflow.
pub async fn run_login(client: &SutraApiClient) -> Result<(), String> {
    println!("{}", "=== SUTRA CLI Secure Authentication ===".bold());
    println!("Backend URL: {}", client.config.api_url.cyan());

    // Prompt for token securely without echoing to terminal
    let token = if io::stdin().is_terminal() {
        print!("Enter SUTRA Bearer JWT Token: ");
        io::Write::flush(&mut io::stdout()).map_err(|e| e.to_string())?;
        rpassword::read_password()
            .map_err(|e| format!("Failed to read token from terminal: {}", e))?
    } else {
        // Handle piped input from stdin (for CI/CD or automation scripts)
        let mut line = String::new();
        let stdin = io::stdin();
        let mut handle = stdin.lock();
        handle
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read piped token: {}", e))?;
        line
    };

    let token = token.trim().to_string();
    if token.is_empty() {
        return Err("Authentication cancelled: Token cannot be empty.".to_string());
    }

    println!("\nValidating session with backend...");

    // Diagnostic parse of JWT claims for unverified hints
    let claims = parse_jwt_claims_diagnostic(&token);
    let (diag_user_id, diag_email, diag_exp) = claims.unwrap_or((None, None, None));

    if let Some(exp) = diag_exp {
        let now = Utc::now().timestamp();
        if now >= exp {
            return Err(format!(
                "Token rejected: JWT expiration claim indicates this token expired at timestamp {}.",
                exp
            ));
        }
    }

    // Live verification against backend
    let verification_result = client.verify_token_candidate(&token).await;

    let (user_id, email, campus_id, campus_name, roles) = match verification_result {
        Ok(Some(profile)) => {
            // Full verified profile from /auth/me
            let active_membership = profile
                .memberships
                .iter()
                .find(|m| m.is_active)
                .or_else(|| profile.memberships.first());

            let (cid, cname, croles) = match active_membership {
                Some(m) => (
                    Some(m.institution_id),
                    m.institution_name.clone(),
                    m.roles.clone(),
                ),
                None => (client.config.campus_id, None, vec![]),
            };

            (
                Some(profile.user_id),
                profile.email.or(diag_email),
                cid,
                cname,
                croles,
            )
        }
        Ok(None) => {
            // Token signature verified by backend probe, but database is offline/degraded
            println!(
                "{}",
                "Notice: Database membership lookup is degraded. Token signature verified via backend service."
                    .yellow()
            );
            (
                diag_user_id,
                diag_email,
                client.config.campus_id,
                None,
                vec!["authenticated".to_string()],
            )
        }
        Err(e) => {
            return Err(format!(
                "Login failed: Backend rejected credentials.\nReason: {}\n(No session was saved.)",
                e
            ));
        }
    };

    let session = CliSession {
        access_token: token,
        user_id,
        email: email.clone(),
        active_campus_id: campus_id,
        campus_name: campus_name.clone(),
        roles: roles.clone(),
        expires_at: diag_exp,
        stored_at: Utc::now().to_rfc3339(),
    };

    let sm = SessionManager::new();
    sm.save_session(&session)?;

    println!(
        "\n{} {}",
        "✓".green().bold(),
        "Authentication successful! Session securely stored.".green().bold()
    );
    println!("  Identity:    {}", email.as_deref().unwrap_or("Authenticated User").cyan());
    if let Some(uid) = user_id {
        println!("  User ID:     {}", uid);
    }
    if let Some(cid) = campus_id {
        println!(
            "  Campus:      {} ({})",
            campus_name.as_deref().unwrap_or("Default Campus"),
            cid
        );
    }
    if !roles.is_empty() {
        println!("  Roles:       {}", roles.join(", ").yellow());
    }
    println!("  Storage:     {:?} (mode 0600)", sm.session_file_path());
    println!("\nYou can now run SUTRA commands without passing --token.");

    Ok(())
}

/// Executes the `sutra auth whoami` command.
pub async fn run_whoami(client: &SutraApiClient) -> Result<(), String> {
    println!("{}", "=== SUTRA Authenticated Identity ===".bold());

    let sm = SessionManager::new();
    let stored_session = sm.load_session()?;

    if stored_session.is_none() && client.config.token.is_none() {
        println!("{}", "Status: NOT AUTHENTICATED".red().bold());
        println!("No active session found in {:?}", sm.session_file_path());
        println!("\nRun {} to authenticate.", "sutra auth login".cyan().bold());
        return Ok(());
    }

    if let Some(ref session) = stored_session {
        if session.is_expired() {
            println!("{}", "Status: SESSION EXPIRED".red().bold());
            println!(
                "Stored session expired at timestamp {}. Please run {}.",
                session.expires_at.unwrap_or(0),
                "sutra auth login".cyan().bold()
            );
            return Ok(());
        }
    }

    // Verify live session with backend
    match client.auth_me().await {
        Ok(profile) => {
            println!("  Status:      {}", "VERIFIED ACTIVE".green().bold());
            println!("  User ID:     {}", profile.user_id);
            if let Some(ref email) = profile.email {
                println!("  Email:       {}", email.cyan());
            }

            if profile.memberships.is_empty() {
                println!("  Campuses:    {}", "No active campus memberships registered".yellow());
            } else {
                println!("\n{}", "Verified Campus Memberships:".bold());
                for m in profile.memberships {
                    let active_tag = if m.is_active {
                        "ACTIVE".green()
                    } else {
                        "INACTIVE".red()
                    };
                    println!(
                        "  • {} ({}) [{}]",
                        m.institution_name.as_deref().unwrap_or("Campus"),
                        m.institution_id,
                        active_tag
                    );
                    println!("    Roles: {}", m.roles.join(", ").yellow());
                }
            }
        }
        Err(e) => {
            if let Some(ref s) = stored_session {
                println!("  Status:      {}", "OFFLINE / UNVERIFIED REMOTE".yellow().bold());
                if let Some(ref email) = s.email {
                    println!("  Email:       {} (cached)", email.cyan());
                }
                if let Some(uid) = s.user_id {
                    println!("  User ID:     {} (cached)", uid);
                }
                if let Some(cid) = s.active_campus_id {
                    println!("  Campus ID:   {} (cached)", cid);
                }
                if !s.roles.is_empty() {
                    println!("  Roles:       {} (cached)", s.roles.join(", ").yellow());
                }
                println!("  Backend:     {}", e.dimmed());
            } else {
                println!("  Status:      {}", "VERIFICATION FAILED".red().bold());
                println!("  Error:       {}", e);
            }
        }
    }

    println!("\nSession Source: {:?}", sm.session_file_path());
    Ok(())
}

/// Executes the `sutra auth logout` command.
pub fn run_logout() -> Result<(), String> {
    println!("{}", "=== SUTRA CLI Logout ===".bold());
    let sm = SessionManager::new();

    match sm.clear_session() {
        Ok(true) => {
            println!(
                "{} {}",
                "✓".green().bold(),
                "Local session cleared successfully.".green().bold()
            );
            println!("Deleted: {:?}", sm.session_file_path());
            println!(
                "\n{}",
                "Note: Clearing local session removes credentials from this machine."
                    .dimmed()
            );
            println!(
                "{}",
                "Server-side Supabase tokens remain active until their natural expiry unless revoked remotely."
                    .dimmed()
            );
            Ok(())
        }
        Ok(false) => {
            println!("{}", "No active session file was found to remove.".yellow());
            Ok(())
        }
        Err(e) => Err(format!("Failed to remove session: {}", e)),
    }
}
