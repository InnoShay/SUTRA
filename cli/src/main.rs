mod client;
mod commands;
mod config;
mod models;
mod session;

use clap::{Args, Parser, Subcommand};
use client::SutraApiClient;
use config::CliConfig;
use uuid::Uuid;

#[derive(Parser)]
#[command(
    name = "sutra",
    author = "Team Overclocked",
    version = "1.0.0",
    about = "SUTRA: Student Success and Intervention Orchestration Engine CLI (PS6 CODEX 3.0)",
    long_about = "CLI tool for authorized staff to review student signals, coordinate cases, inspect telemetry, and query bounded AI briefs.\nPrinciple: 'No Alert Without Action.'"
)]
struct Cli {
    #[arg(
        long,
        global = true,
        help = "FastAPI backend base URL (default: http://localhost:8000/api/v1)"
    )]
    url: Option<String>,

    #[arg(
        long,
        global = true,
        help = "Active Institution Campus ID UUID (default: 00000000-0000-0000-0000-000000000001)"
    )]
    campus: Option<String>,

    #[arg(
        long,
        global = true,
        help = "Supabase JWT Bearer authentication token"
    )]
    token: Option<String>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "Manage authentication sessions (login, whoami, logout)")]
    Auth(AuthArgs),

    #[command(about = "Check backend service health and database readiness")]
    Health,

    #[command(about = "Inspect and review student risk triage signals")]
    Signals(SignalsArgs),

    #[command(about = "Manage student support cases and 10-state lifecycle")]
    Cases(CasesArgs),

    #[command(about = "List campus-controlled intervention catalogue")]
    Catalogue,

    #[command(about = "Query bounded AI orchestration assistance (advisory only)")]
    Ai(AiArgs),

    #[command(about = "Execute Day-30 early-warning ML inference from a validated feature JSON file")]
    Predict(PredictArgs),
}

#[derive(Args)]
struct PredictArgs {
    #[arg(
        long,
        short,
        help = "Path to JSON file containing canonical Day-30 student feature vector"
    )]
    file: std::path::PathBuf,
}

#[derive(Args)]
struct AuthArgs {
    #[command(subcommand)]
    command: AuthCommands,
}

#[derive(Subcommand)]
enum AuthCommands {
    #[command(about = "Securely authenticate and save a local session")]
    Login,

    #[command(about = "Display active verified identity, campus, and roles")]
    Whoami,

    #[command(about = "Clear the local authentication session")]
    Logout,
}

#[derive(Args)]
struct SignalsArgs {
    #[command(subcommand)]
    command: SignalsCommands,
}

#[derive(Subcommand)]
enum SignalsCommands {
    #[command(about = "List signals in the triage queue")]
    List {
        #[arg(long, help = "Filter by result (e.g. attention_suggested, concern)")]
        result: Option<String>,
    },

    #[command(about = "View detailed signal telemetry, evidence digest, and attributions")]
    Get {
        #[arg(help = "Signal UUID")]
        id: Uuid,
    },

    #[command(about = "Record authorized educator review decision (No Alert Without Action)")]
    Review {
        #[arg(help = "Signal UUID")]
        id: Uuid,

        #[arg(
            long,
            help = "Review decision: approve, modify, dismiss, or request_more_data"
        )]
        decision: String,

        #[arg(long, help = "Selected intervention key from catalogue (e.g. academic_tutoring_offer)")]
        intervention: Option<String>,

        #[arg(
            long,
            help = "Mandatory human reviewer rationale (min 5 characters)"
        )]
        rationale: String,
    },
}

#[derive(Args)]
struct CasesArgs {
    #[command(subcommand)]
    command: CasesCommands,
}

#[derive(Subcommand)]
enum CasesCommands {
    #[command(about = "List active student support cases")]
    List {
        #[arg(long, help = "Filter by state (e.g. ASSIGNED, IN_PROGRESS, CLOSED)")]
        state: Option<String>,
    },

    #[command(about = "View full case detail, tasks, and event timeline")]
    Get {
        #[arg(help = "Case UUID")]
        id: Uuid,
    },

    #[command(about = "Advance case state across the 10-state machine")]
    Transition {
        #[arg(help = "Case UUID")]
        id: Uuid,

        #[arg(long, help = "Target state (e.g. ACCEPTED, IN_PROGRESS, RESOLVED, CLOSED)")]
        to_state: String,

        #[arg(long, help = "Optional transition reason code")]
        reason: Option<String>,
    },

    #[command(about = "Assign case ownership to a staff member")]
    Assign {
        #[arg(help = "Case UUID")]
        id: Uuid,

        #[arg(long, help = "Primary owner user UUID")]
        user_id: Uuid,

        #[arg(long, help = "Optional ISO 8601 due date")]
        due: Option<String>,
    },

    #[command(about = "Record verified follow-up contact and evidence")]
    FollowUp {
        #[arg(help = "Case UUID")]
        id: Uuid,

        #[arg(long, help = "Follow-up channel: in_person, phone, email, or lms")]
        channel: String,

        #[arg(long, help = "Proof kind: student_signed_form, faculty_log, etc.")]
        proof: String,

        #[arg(long, help = "Optional follow-up notes")]
        note: Option<String>,
    },

    #[command(about = "Record final intervention outcome and close case")]
    Outcome {
        #[arg(help = "Case UUID")]
        id: Uuid,

        #[arg(long, help = "Outcome status: helped, not_helped, mixed, or unknown")]
        status: String,

        #[arg(long, help = "Mandatory outcome rationale (min 5 characters)")]
        rationale: String,
    },
}

#[derive(Args)]
struct AiArgs {
    #[command(subcommand)]
    command: AiCommands,
}

#[derive(Subcommand)]
enum AiCommands {
    #[command(about = "Check AI service readiness and governance boundaries")]
    Status,

    #[command(about = "Generate structured AI review brief for a signal (Advisory Only)")]
    ReviewBrief {
        #[arg(help = "Signal UUID")]
        signal_id: Uuid,
    },

    #[command(about = "Synthesize student multi-domain telemetry (ADR-003 financial exclusion)")]
    Summarize {
        #[arg(help = "Student UUID")]
        student_id: Uuid,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let config = CliConfig::from_env_and_flags(cli.url, cli.campus, cli.token);
    let client = SutraApiClient::new(config);

    let result = match cli.command {
        Commands::Auth(args) => match args.command {
            AuthCommands::Login => commands::auth::run_login(&client).await,
            AuthCommands::Whoami => commands::auth::run_whoami(&client).await,
            AuthCommands::Logout => commands::auth::run_logout(),
        },
        Commands::Health => commands::health::run_health(&client).await,
        Commands::Predict(args) => commands::predict::run_predict(&client, &args.file).await,
        Commands::Catalogue => commands::catalogue::list_catalogue(&client).await,
        Commands::Signals(args) => match args.command {
            SignalsCommands::List { result } => {
                commands::signals::list_signals(&client, result.as_deref()).await
            }
            SignalsCommands::Get { id } => commands::signals::get_signal(&client, id).await,
            SignalsCommands::Review {
                id,
                decision,
                intervention,
                rationale,
            } => {
                commands::signals::review_signal(
                    &client,
                    id,
                    &decision,
                    intervention.as_deref(),
                    &rationale,
                )
                .await
            }
        },
        Commands::Cases(args) => match args.command {
            CasesCommands::List { state } => {
                commands::cases::list_cases(&client, state.as_deref()).await
            }
            CasesCommands::Get { id } => commands::cases::get_case(&client, id).await,
            CasesCommands::Transition {
                id,
                to_state,
                reason,
            } => {
                commands::cases::transition_case(&client, id, &to_state, reason.as_deref()).await
            }
            CasesCommands::Assign {
                id,
                user_id,
                due,
            } => commands::cases::assign_case(&client, id, user_id, due.as_deref()).await,
            CasesCommands::FollowUp {
                id,
                channel,
                proof,
                note,
            } => {
                commands::cases::record_follow_up(
                    &client,
                    id,
                    &channel,
                    &proof,
                    note.as_deref(),
                )
                .await
            }
            CasesCommands::Outcome {
                id,
                status,
                rationale,
            } => commands::cases::record_outcome(&client, id, &status, &rationale).await,
        },
        Commands::Ai(args) => match args.command {
            AiCommands::Status => commands::ai::ai_status(&client).await,
            AiCommands::ReviewBrief { signal_id } => {
                commands::ai::ai_review_brief(&client, signal_id).await
            }
            AiCommands::Summarize { student_id } => {
                commands::ai::ai_summarize_evidence(&client, student_id).await
            }
        },
    };

    if let Err(e) = result {
        eprintln!("\nError: {}", e);
        std::process::exit(1);
    }
}
