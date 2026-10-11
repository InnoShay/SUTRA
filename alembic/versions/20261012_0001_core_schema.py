"""Phase 1 Core Schema Baseline

Revision ID: 0001_core_schema
Revises: None
Create Date: 2026-10-12 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_core_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Institutions
    op.create_table(
        "institutions",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Institution Memberships
    op.create_table(
        "institution_memberships",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "user_id", "role", name="uq_membership_inst_user_role"),
    )
    op.create_index("idx_memberships_user_active", "institution_memberships", ["user_id", "is_active", "institution_id"])

    # 3. Students
    op.create_table(
        "students",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_ref", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("cohort_code", sa.String(), nullable=True),
        sa.Column("enrollment_status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "external_ref", name="uq_students_inst_ext_ref"),
        sa.UniqueConstraint("institution_id", "id", name="uq_students_inst_id"),
    )
    op.create_index("idx_students_cohort", "students", ["institution_id", "cohort_code", "enrollment_status"])

    # 4. Processing Authorizations
    op.create_table(
        "processing_authorizations",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("purpose_key", sa.String(), nullable=False),
        sa.Column("basis_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("notice_or_policy_version", sa.String(), nullable=True),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("changed_by", sa.Uuid(), nullable=True),
        sa.Column("note_code", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_authorizations_lookup", "processing_authorizations", ["institution_id", "student_id", "purpose_key", "effective_at"])

    # 5. Source Imports
    op.create_table(
        "source_imports",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_system", sa.String(), nullable=False),
        sa.Column("schema_version", sa.String(), nullable=False),
        sa.Column("file_digest", sa.String(), nullable=False),
        sa.Column("idempotency_key", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="received"),
        sa.Column("received_by", sa.Uuid(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rows_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_duplicate", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_rejected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("row_errors", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.UniqueConstraint("institution_id", "idempotency_key", name="uq_imports_inst_idemp_key"),
        sa.UniqueConstraint("institution_id", "id", name="uq_imports_inst_id"),
    )

    # 6. Student Observations (non-finance)
    op.create_table(
        "student_observations",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("metric_key", sa.String(), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source_system", sa.String(), nullable=False),
        sa.Column("source_record_ref", sa.String(), nullable=False),
        sa.Column("source_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("quality_state", sa.String(), nullable=False, server_default="valid"),
        sa.Column("supersedes_observation_id", sa.Uuid(), nullable=True),
        sa.Column("import_id", sa.Uuid(), sa.ForeignKey("source_imports.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "source_system", "source_record_ref", "source_version", name="uq_obs_inst_source_rec_ver"),
        sa.UniqueConstraint("institution_id", "id", name="uq_obs_inst_id"),
    )
    op.create_index("idx_obs_student_time", "student_observations", ["institution_id", "student_id", "available_at", "event_at"])
    op.create_index("idx_obs_domain_time", "student_observations", ["institution_id", "domain", "available_at"])

    # 7. Finance Observations (strictly segregated per ADR-003)
    op.create_table(
        "finance_observations",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("fee_support_status", sa.String(), nullable=False),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source_system", sa.String(), nullable=False),
        sa.Column("source_record_ref", sa.String(), nullable=False),
        sa.Column("source_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("quality_state", sa.String(), nullable=False, server_default="valid"),
        sa.Column("import_id", sa.Uuid(), sa.ForeignKey("source_imports.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "source_system", "source_record_ref", "source_version", name="uq_fin_obs_inst_source_rec_ver"),
        sa.UniqueConstraint("institution_id", "id", name="uq_fin_obs_inst_id"),
    )
    op.create_index("idx_finance_obs_student_time", "finance_observations", ["institution_id", "student_id", "available_at"])

    # 8. Policy Versions
    op.create_table(
        "policy_versions",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("policy_key", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("definition", sa.JSON(), nullable=False),
        sa.Column("checksum", sa.String(), nullable=False),
        sa.Column("evaluator_version", sa.String(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("institution_id", "policy_key", "version", name="uq_policy_inst_key_ver"),
        sa.UniqueConstraint("institution_id", "id", name="uq_policy_inst_id"),
    )

    # 9. Evidence Packets
    op.create_table(
        "evidence_packets",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("policy_version_id", sa.Uuid(), sa.ForeignKey("policy_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("schema_version", sa.String(), nullable=False),
        sa.Column("as_of_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("digest", sa.String(), nullable=False),
        sa.Column("retention_class", sa.String(), nullable=False, server_default="demo_short_lived"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "id", name="uq_evidence_inst_id"),
    )

    # 10. Signals
    op.create_table(
        "signals",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("policy_version_id", sa.Uuid(), sa.ForeignKey("policy_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("evidence_packet_id", sa.Uuid(), sa.ForeignKey("evidence_packets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("rule_key", sa.String(), nullable=False),
        sa.Column("result", sa.String(), nullable=False),
        sa.Column("quality_state", sa.String(), nullable=False),
        sa.Column("explanation", sa.JSON(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_decision", sa.String(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason_code", sa.String(), nullable=True),
        sa.Column("supersedes_signal_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "id", name="uq_signals_inst_id"),
    )
    op.create_index("idx_signals_queue", "signals", ["institution_id", "result", "evaluated_at"])
    op.create_index("idx_signals_student", "signals", ["institution_id", "student_id", "evaluated_at"])

    # 11. Intervention Catalog
    op.create_table(
        "intervention_catalog",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("intervention_key", sa.String(), nullable=False),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("display_label", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("recipient_role", sa.String(), nullable=False),
        sa.Column("required_purpose_key", sa.String(), nullable=False),
        sa.Column("requires_human_approval", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "intervention_key", "version", name="uq_catalog_inst_key_ver"),
    )

    # 12. Cases
    op.create_table(
        "cases",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("originating_signal_id", sa.Uuid(), sa.ForeignKey("signals.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("selected_intervention_key", sa.String(), nullable=False),
        sa.Column("state", sa.String(), nullable=False, server_default="suggested"),
        sa.Column("primary_owner_user_id", sa.Uuid(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_escalated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "id", name="uq_cases_inst_id"),
    )
    op.create_index("idx_cases_queue", "cases", ["institution_id", "state", "due_at"])
    op.create_index("idx_cases_owner", "cases", ["institution_id", "primary_owner_user_id", "state"])

    # 13. Case Tasks
    op.create_table(
        "case_tasks",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("generic_label", sa.String(), nullable=False),
        sa.Column("state", sa.String(), nullable=False, server_default="pending"),
        sa.Column("assignee_user_id", sa.Uuid(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deadline_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("idempotency_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "idempotency_key", name="uq_tasks_inst_idemp_key"),
        sa.UniqueConstraint("institution_id", "id", name="uq_tasks_inst_id"),
    )
    op.create_index("idx_tasks_due", "case_tasks", ["institution_id", "state", "due_at"])
    op.create_index("idx_tasks_assignee", "case_tasks", ["institution_id", "assignee_user_id", "state"])

    # 14. Restricted Task Details
    op.create_table(
        "restricted_task_details",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), sa.ForeignKey("case_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("restricted_domain", sa.String(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("purpose_key", sa.String(), nullable=False),
        sa.Column("retention_class", sa.String(), nullable=False, server_default="restricted_short_lived"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "task_id", name="uq_restricted_inst_task_id"),
    )

    # 15. Case Events
    op.create_table(
        "case_events",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("actor_kind", sa.String(), nullable=False, server_default="user"),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("from_state", sa.String(), nullable=True),
        sa.Column("to_state", sa.String(), nullable=True),
        sa.Column("reason_code", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("request_id", sa.String(), nullable=True),
        sa.Column("idempotency_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "idempotency_key", name="uq_case_events_inst_idemp_key"),
    )
    op.create_index("idx_case_events_history", "case_events", ["institution_id", "case_id", "created_at"])

    # 16. Follow-ups
    op.create_table(
        "follow_ups",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("follow_up_type", sa.String(), nullable=False),
        sa.Column("contact_status", sa.String(), nullable=True),
        sa.Column("proof_kind", sa.String(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recorded_by", sa.Uuid(), nullable=True),
        sa.Column("sanitized_note", sa.String(), nullable=True),
        sa.Column("proof_ref", sa.String(), nullable=True),
        sa.Column("idempotency_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("institution_id", "idempotency_key", name="uq_followups_inst_idemp_key"),
    )
    op.create_index("idx_followups_case_time", "follow_ups", ["institution_id", "case_id", "occurred_at"])

    # 17. Case Outcomes
    op.create_table(
        "case_outcomes",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("outcome_status", sa.String(), nullable=False),
        sa.Column("follow_up_window_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("follow_up_window_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rationale", sa.String(), nullable=False),
        sa.Column("evidence_kind", sa.String(), nullable=False, server_default="staff_review"),
        sa.Column("recorded_by", sa.Uuid(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_outcomes_status_time", "case_outcomes", ["institution_id", "outcome_status", "recorded_at"])

    # 18. Notification Outbox
    op.create_table(
        "notification_outbox",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=True),
        sa.Column("task_id", sa.Uuid(), sa.ForeignKey("case_tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("adapter_key", sa.String(), nullable=False, server_default="in_app_demo"),
        sa.Column("template_key", sa.String(), nullable=False),
        sa.Column("destination_ref", sa.String(), nullable=True),
        sa.Column("safe_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_error_code", sa.String(), nullable=True),
        sa.Column("idempotency_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("institution_id", "idempotency_key", name="uq_outbox_inst_idemp_key"),
    )
    op.create_index("idx_outbox_pending", "notification_outbox", ["status", "next_attempt_at"])


def downgrade() -> None:
    op.drop_table("notification_outbox")
    op.drop_table("case_outcomes")
    op.drop_table("follow_ups")
    op.drop_table("case_events")
    op.drop_table("restricted_task_details")
    op.drop_table("case_tasks")
    op.drop_table("cases")
    op.drop_table("intervention_catalog")
    op.drop_table("signals")
    op.drop_table("evidence_packets")
    op.drop_table("policy_versions")
    op.drop_table("finance_observations")
    op.drop_table("student_observations")
    op.drop_table("source_imports")
    op.drop_table("processing_authorizations")
    op.drop_table("students")
    op.drop_table("institution_memberships")
    op.drop_table("institutions")
