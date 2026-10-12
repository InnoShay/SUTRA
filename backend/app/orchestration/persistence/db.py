"""
Database initialization, connection lifecycle, and schema migration for SQLite WAL persistence.
"""

import os
import sqlite3
from pathlib import Path
from typing import Optional

SCHEMA_VERSION = 1

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
    case_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    campus_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_plan_version INTEGER NOT NULL DEFAULT 1,
    evidence_fingerprint TEXT NOT NULL,
    run_id TEXT NOT NULL,
    risk_probability REAL NOT NULL,
    risk_tier TEXT NOT NULL,
    operational_threshold REAL NOT NULL DEFAULT 0.46,
    review_recommended INTEGER NOT NULL DEFAULT 1,
    outcome_status TEXT NOT NULL DEFAULT 'UNOBSERVED',
    outcome_summary TEXT,
    outcome_recorded_at TEXT,
    outcome_recorded_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    run_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    record_id TEXT NOT NULL,
    status TEXT NOT NULL,
    evidence_card_json TEXT NOT NULL,
    signal_interpretation_json TEXT,
    intervention_proposal_json TEXT,
    support_plan_json TEXT,
    evidence_challenge_json TEXT,
    validation_summary_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_versions (
    plan_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    version_number INTEGER NOT NULL,
    plan_hash TEXT NOT NULL,
    is_advisor_modified INTEGER NOT NULL DEFAULT 0,
    plan_title TEXT NOT NULL,
    target_window_days INTEGER NOT NULL,
    rationale TEXT,
    action_steps_json TEXT NOT NULL,
    evidence_requirements_json TEXT NOT NULL,
    limitations_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(case_id, version_number)
);

CREATE TABLE IF NOT EXISTS case_decisions (
    decision_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    decision_kind TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    reviewed_plan_version INTEGER NOT NULL,
    approved_plan_version INTEGER,
    notes TEXT NOT NULL,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(case_id, actor_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    plan_version INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    step_id TEXT,
    action_description TEXT NOT NULL,
    assigned_role TEXT NOT NULL,
    target_days INTEGER NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    evidence_reference TEXT,
    follow_up_evidence_required TEXT,
    completion_note TEXT,
    completed_at TEXT,
    completed_by TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS follow_up_records (
    follow_up_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    task_id TEXT REFERENCES tasks(task_id),
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    observation_note TEXT NOT NULL,
    evidence_reference TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_ledger (
    seq_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    case_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    payload_canonical_json TEXT NOT NULL,
    prev_entry_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_campus ON cases(campus_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_tasks_case_id ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_case_id ON audit_ledger(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_seq_id ON audit_ledger(seq_id);

-- Anti-tamper database-level triggers
CREATE TRIGGER IF NOT EXISTS prevent_audit_ledger_update
BEFORE UPDATE ON audit_ledger
BEGIN
    SELECT RAISE(ABORT, 'Audit ledger events are append-only and cannot be modified.');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_ledger_delete
BEFORE DELETE ON audit_ledger
BEGIN
    SELECT RAISE(ABORT, 'Audit ledger events cannot be deleted.');
END;
"""


def get_db_path(custom_path: Optional[str] = None) -> str:
    """Resolve database path from environment or default local directory."""
    if custom_path:
        return custom_path
    env_path = os.getenv("SUTRA_DB_PATH")
    if env_path:
        return env_path
    default_dir = Path("data")
    default_dir.mkdir(parents=True, exist_ok=True)
    return str(default_dir / "sutra_ledger.db")


def create_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """
    Open SQLite connection configured with WAL mode, foreign keys, and busy timeout.
    """
    resolved_path = get_db_path(db_path)
    if resolved_path != ":memory:":
        Path(resolved_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(resolved_path, timeout=5.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    # WAL mode is not permitted/needed for in-memory databases
    if resolved_path != ":memory:":
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")

    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Initialize database tables, indexes, triggers and record schema migration."""
    with conn:
        conn.executescript(CREATE_TABLES_SQL)
        cursor = conn.execute("SELECT version FROM schema_migrations WHERE version = ?", (SCHEMA_VERSION,))
        if not cursor.fetchone():
            from datetime import datetime, timezone
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (SCHEMA_VERSION, datetime.now(timezone.utc).isoformat())
            )
