"""
Durable Case Repository and Support Evidence Ledger for SUTRA Phase 4.

Provides atomic transactions, optimistic concurrency, plan versioning,
tamper-evident audit append, and strict task vs outcome separation.
"""

from datetime import datetime, timezone
import json
import sqlite3
from typing import Any, Optional
from uuid import uuid4

from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.contracts import (
    ActionStep,
    EvidenceChallengeReport,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    SupportPlanDraft,
    ValidationSummary,
)
from backend.app.orchestration.persistence.audit import (
    canonical_json,
    compute_entry_hash,
    compute_evidence_fingerprint,
    compute_plan_hash,
    verify_audit_chain,
)
from backend.app.orchestration.persistence.models import (
    AdvisorDecisionKind,
    AuditEventRecord,
    AuditVerificationResult,
    CaseDecisionRecord,
    CaseDecisionRequest,
    CaseDetailResponse,
    CaseRecord,
    CaseStatus,
    CaseSummaryItem,
    FollowUpCreateRequest,
    FollowUpRecord,
    OutcomeRecordRequest,
    OutcomeStatus,
    PlanVersionRecord,
    TaskRecord,
    TaskStatus,
    TaskStatusUpdateRequest,
)
from sutra_ml.schemas.evidence_card import SutraEvidenceCard


class CaseRepository:
    """Repository managing cases, plan versions, decisions, tasks, and audit ledger."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _append_audit_event(
        self,
        case_id: str,
        event_type: str,
        actor_id: str,
        actor_role: str,
        payload: Any,
        timestamp: Optional[str] = None,
    ) -> AuditEventRecord:
        """Append an event to the tamper-evident audit ledger within the current transaction."""
        ts = timestamp or self._now()
        payload_canonical = canonical_json(payload)

        # Retrieve the latest entry hash from the ledger
        cursor = self.conn.execute(
            "SELECT entry_hash FROM audit_ledger ORDER BY seq_id DESC LIMIT 1"
        )
        row = cursor.fetchone()
        prev_entry_hash = row["entry_hash"] if row else "GENESIS"

        entry_hash = compute_entry_hash(
            prev_entry_hash=prev_entry_hash,
            event_type=event_type,
            case_id=case_id,
            actor_id=actor_id,
            timestamp=ts,
            payload_canonical_json=payload_canonical,
        )

        event_id = f"EVT-{uuid4().hex[:12]}"
        self.conn.execute(
            """
            INSERT INTO audit_ledger (
                event_id, case_id, event_type, actor_id, actor_role,
                payload_canonical_json, prev_entry_hash, entry_hash, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                case_id,
                event_type,
                actor_id,
                actor_role,
                payload_canonical,
                prev_entry_hash,
                entry_hash,
                ts,
            ),
        )

        # Fetch the newly assigned seq_id
        cursor = self.conn.execute("SELECT seq_id FROM audit_ledger WHERE event_id = ?", (event_id,))
        seq_id = cursor.fetchone()["seq_id"]

        return AuditEventRecord(
            seq_id=seq_id,
            event_id=event_id,
            case_id=case_id,
            event_type=event_type,
            actor_id=actor_id,
            actor_role=actor_role,
            payload_canonical_json=payload_canonical,
            prev_entry_hash=prev_entry_hash,
            entry_hash=entry_hash,
            timestamp=ts,
        )

    def create_case_from_run(
        self,
        result: OrchestrationResult,
        campus_id: str,
        student_input_features: dict[str, Any],
        actor_id: str = "SYSTEM_ORCHESTRATOR",
        actor_role: str = "SYSTEM",
    ) -> CaseRecord:
        """
        Durable ingest of a completed 4-agent run into a case awaiting human review.
        All records (case, run snapshot, plan v1, audit chain) are committed atomically.
        """
        case_id = f"CASE-{result.record_id}"
        ts = self._now()
        fingerprint = compute_evidence_fingerprint(student_input_features)

        # Extract draft plan from stage 3
        stage_3 = result.stages.get("stage_3_plan")
        if not stage_3 or not stage_3.output:
            raise ValueError(f"OrchestrationResult {result.run_id} missing stage_3_plan output.")

        plan_draft = (
            SupportPlanDraft.model_validate(stage_3.output)
            if isinstance(stage_3.output, dict)
            else stage_3.output
        )

        plan_hash = compute_plan_hash(
            plan_title=plan_draft.plan_title,
            target_window_days=plan_draft.target_window_days,
            action_steps=plan_draft.action_steps,
        )

        # Extract components for run snapshot
        stage_1 = result.stages.get("stage_1_interpretation")
        stage_2 = result.stages.get("stage_2_intervention") or result.stages.get("stage_2_proposal")
        stage_4 = result.stages.get("stage_4_challenge")

        tier_val = (
            result.evidence_card.risk_tier.value
            if hasattr(result.evidence_card.risk_tier, "value")
            else str(result.evidence_card.risk_tier)
        )
        is_review_rec = bool(
            getattr(
                result.evidence_card,
                "alert_triggered",
                result.evidence_card.risk_probability >= result.evidence_card.operational_threshold,
            )
        )

        with self.conn:
            # Check if case exists already
            existing = self.conn.execute("SELECT case_id FROM cases WHERE case_id = ?", (case_id,)).fetchone()
            if existing:
                # Update existing case with new run
                self.conn.execute(
                    """
                    UPDATE cases SET
                        run_id = ?,
                        evidence_fingerprint = ?,
                        risk_probability = ?,
                        risk_tier = ?,
                        operational_threshold = ?,
                        review_recommended = ?,
                        updated_at = ?
                    WHERE case_id = ?
                    """,
                    (
                        result.run_id,
                        fingerprint,
                        result.evidence_card.risk_probability,
                        tier_val,
                        result.evidence_card.operational_threshold,
                        1 if is_review_rec else 0,
                        ts,
                        case_id,
                    ),
                )
            else:
                # Insert new case header
                self.conn.execute(
                    """
                    INSERT INTO cases (
                        case_id, record_id, campus_id, status, current_plan_version,
                        evidence_fingerprint, run_id, risk_probability, risk_tier,
                        operational_threshold, review_recommended, outcome_status,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        case_id,
                        result.record_id,
                        campus_id,
                        CaseStatus.DRAFT_AWAITING_REVIEW.value,
                        1,
                        fingerprint,
                        result.run_id,
                        result.evidence_card.risk_probability,
                        tier_val,
                        result.evidence_card.operational_threshold,
                        1 if is_review_rec else 0,
                        OutcomeStatus.UNOBSERVED.value,
                        ts,
                        ts,
                    ),
                )

            # Insert pipeline run snapshot
            self.conn.execute(
                """
                INSERT OR REPLACE INTO pipeline_runs (
                    run_id, case_id, record_id, status,
                    evidence_card_json, signal_interpretation_json,
                    intervention_proposal_json, support_plan_json,
                    evidence_challenge_json, validation_summary_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    result.run_id,
                    case_id,
                    result.record_id,
                    result.status.value,
                    result.evidence_card.model_dump_json(),
                    stage_1.output.model_dump_json() if stage_1 and stage_1.output else None,
                    stage_2.output.model_dump_json() if stage_2 and stage_2.output else None,
                    plan_draft.model_dump_json(),
                    stage_4.output.model_dump_json() if stage_4 and stage_4.output else None,
                    result.validation_summary.model_dump_json(),
                    ts,
                ),
            )

            # Insert initial Plan Version 1 (AI draft)
            plan_id = f"PLAN-{case_id}-v1"
            self.conn.execute(
                """
                INSERT OR REPLACE INTO plan_versions (
                    plan_id, case_id, version_number, plan_hash, is_advisor_modified,
                    plan_title, target_window_days, rationale, action_steps_json,
                    evidence_requirements_json, limitations_json, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    plan_id,
                    case_id,
                    1,
                    plan_hash,
                    0,
                    plan_draft.plan_title,
                    plan_draft.target_window_days,
                    plan_draft.rationale or "",
                    canonical_json([s.model_dump() for s in plan_draft.action_steps]),
                    canonical_json(plan_draft.evidence_requirements),
                    canonical_json(plan_draft.limitations_and_questions),
                    "AGENT_3_SUPPORT_PLANNER",
                    ts,
                ),
            )

            # Audit ledger events
            self._append_audit_event(
                case_id=case_id,
                event_type="EVIDENCE_SNAPSHOT_INGESTED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={"fingerprint": fingerprint, "record_id": result.record_id, "campus_id": campus_id},
                timestamp=ts,
            )

            self._append_audit_event(
                case_id=case_id,
                event_type="ML_EVIDENCE_CARD_RECORDED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={
                    "run_id": result.run_id,
                    "risk_probability": result.evidence_card.risk_probability,
                    "risk_tier": tier_val,
                },
                timestamp=ts,
            )

            self._append_audit_event(
                case_id=case_id,
                event_type="PIPELINE_RUN_COMPLETED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={
                    "run_id": result.run_id,
                    "status": result.status.value,
                    "validation_passed": result.validation_summary.passed,
                },
                timestamp=ts,
            )

            self._append_audit_event(
                case_id=case_id,
                event_type="DRAFT_PLAN_REGISTERED",
                actor_id="AGENT_3_SUPPORT_PLANNER",
                actor_role="AGENT",
                payload={"version_number": 1, "plan_hash": plan_hash, "title": plan_draft.plan_title},
                timestamp=ts,
            )

        return self.get_case(case_id)  # type: ignore

    def get_case(self, case_id: str) -> Optional[CaseRecord]:
        """Fetch single case header record."""
        cursor = self.conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return CaseRecord(
            case_id=row["case_id"],
            record_id=row["record_id"],
            campus_id=row["campus_id"],
            status=CaseStatus(row["status"]),
            current_plan_version=row["current_plan_version"],
            evidence_fingerprint=row["evidence_fingerprint"],
            run_id=row["run_id"],
            risk_probability=row["risk_probability"],
            risk_tier=row["risk_tier"],
            operational_threshold=row["operational_threshold"],
            review_recommended=bool(row["review_recommended"]),
            outcome_status=OutcomeStatus(row["outcome_status"]),
            outcome_summary=row["outcome_summary"],
            outcome_recorded_at=row["outcome_recorded_at"],
            outcome_recorded_by=row["outcome_recorded_by"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def list_cases(
        self,
        campus_id: Optional[str] = None,
        status: Optional[CaseStatus] = None,
    ) -> list[CaseSummaryItem]:
        """Query summary items for Screen A Review Queue with campus scoping."""
        query = "SELECT * FROM cases WHERE 1=1"
        params: list[Any] = []
        if campus_id:
            query += " AND campus_id = ?"
            params.append(campus_id)
        if status:
            query += " AND status = ?"
            params.append(status.value)
        query += " ORDER BY risk_probability DESC, updated_at DESC"

        cursor = self.conn.execute(query, params)
        rows = cursor.fetchall()
        summaries: list[CaseSummaryItem] = []

        for row in rows:
            # Check pipeline run validation & flags count
            run_cursor = self.conn.execute(
                "SELECT validation_summary_json, evidence_challenge_json, signal_interpretation_json FROM pipeline_runs WHERE run_id = ?",
                (row["run_id"],),
            )
            run_row = run_cursor.fetchone()
            val_passed = True
            flags_count = 0
            has_info_requests = False
            if run_row:
                try:
                    val_data = json.loads(run_row["validation_summary_json"])
                    val_passed = bool(val_data.get("passed", True))
                except Exception:
                    pass
                if run_row["evidence_challenge_json"]:
                    try:
                        chal_data = json.loads(run_row["evidence_challenge_json"])
                        flags_count = int(chal_data.get("flags_count", 0))
                    except Exception:
                        pass
                if run_row["signal_interpretation_json"]:
                    try:
                        sig_data = json.loads(run_row["signal_interpretation_json"])
                        has_info_requests = bool(sig_data.get("information_requests"))
                    except Exception:
                        pass

            summaries.append(
                CaseSummaryItem(
                    case_id=row["case_id"],
                    record_id=row["record_id"],
                    campus_id=row["campus_id"],
                    status=CaseStatus(row["status"]),
                    current_plan_version=row["current_plan_version"],
                    risk_probability=row["risk_probability"],
                    risk_tier=row["risk_tier"],
                    validation_passed=val_passed,
                    challenge_flags_count=flags_count,
                    has_information_requests=has_info_requests,
                    outcome_status=OutcomeStatus(row["outcome_status"]),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
            )
        return summaries

    def get_case_detail(self, case_id: str) -> Optional[CaseDetailResponse]:
        """Retrieve full case detail view with all versions, decisions, tasks, and audit lineage."""
        case = self.get_case(case_id)
        if not case:
            return None

        # Load pipeline run
        run_cursor = self.conn.execute(
            "SELECT * FROM pipeline_runs WHERE run_id = ?", (case.run_id,)
        )
        run_row = run_cursor.fetchone()
        if not run_row:
            raise RuntimeError(f"Missing pipeline run {case.run_id} for case {case_id}")

        evidence_card = SutraEvidenceCard.model_validate_json(run_row["evidence_card_json"])
        signal_interpretation = (
            SignalInterpretation.model_validate_json(run_row["signal_interpretation_json"])
            if run_row["signal_interpretation_json"]
            else None
        )
        intervention_proposal = (
            InterventionProposal.model_validate_json(run_row["intervention_proposal_json"])
            if run_row["intervention_proposal_json"]
            else None
        )
        evidence_challenge = (
            EvidenceChallengeReport.model_validate_json(run_row["evidence_challenge_json"])
            if run_row["evidence_challenge_json"]
            else None
        )
        validation_summary = ValidationSummary.model_validate_json(
            run_row["validation_summary_json"]
        )

        # Load plan versions
        plan_cursor = self.conn.execute(
            "SELECT * FROM plan_versions WHERE case_id = ? ORDER BY version_number ASC",
            (case_id,),
        )
        plan_versions: list[PlanVersionRecord] = []
        for p in plan_cursor.fetchall():
            steps_data = json.loads(p["action_steps_json"])
            plan_versions.append(
                PlanVersionRecord(
                    plan_id=p["plan_id"],
                    case_id=p["case_id"],
                    version_number=p["version_number"],
                    plan_hash=p["plan_hash"],
                    is_advisor_modified=bool(p["is_advisor_modified"]),
                    plan_title=p["plan_title"],
                    target_window_days=p["target_window_days"],
                    rationale=p["rationale"] or "",
                    action_steps=[ActionStep.model_validate(s) for s in steps_data],
                    evidence_requirements=json.loads(p["evidence_requirements_json"]),
                    limitations_and_questions=json.loads(p["limitations_json"]),
                    created_by=p["created_by"],
                    created_at=p["created_at"],
                )
            )

        current_plan = next(
            (pv for pv in plan_versions if pv.version_number == case.current_plan_version),
            plan_versions[-1],
        )

        # Load decisions
        dec_cursor = self.conn.execute(
            "SELECT * FROM case_decisions WHERE case_id = ? ORDER BY created_at ASC",
            (case_id,),
        )
        decisions: list[CaseDecisionRecord] = [
            CaseDecisionRecord(
                decision_id=d["decision_id"],
                case_id=d["case_id"],
                decision_kind=AdvisorDecisionKind(d["decision_kind"]),
                actor_id=d["actor_id"],
                actor_role=d["actor_role"],
                reviewed_plan_version=d["reviewed_plan_version"],
                approved_plan_version=d["approved_plan_version"],
                notes=d["notes"],
                idempotency_key=d["idempotency_key"],
                created_at=d["created_at"],
            )
            for d in dec_cursor.fetchall()
        ]

        # Load tasks
        task_cursor = self.conn.execute(
            "SELECT * FROM tasks WHERE case_id = ? ORDER BY step_number ASC",
            (case_id,),
        )
        tasks: list[TaskRecord] = [
            TaskRecord(
                task_id=t["task_id"],
                case_id=t["case_id"],
                plan_version=t["plan_version"],
                step_number=t["step_number"],
                step_id=t["step_id"],
                action_description=t["action_description"],
                assigned_role=t["assigned_role"],
                target_days=t["target_days"],
                due_date=t["due_date"],
                status=TaskStatus(t["status"]),
                evidence_reference=t["evidence_reference"],
                follow_up_evidence_required=t["follow_up_evidence_required"],
                completion_note=t["completion_note"],
                completed_at=t["completed_at"],
                completed_by=t["completed_by"],
                created_at=t["created_at"],
            )
            for t in task_cursor.fetchall()
        ]

        # Load follow-ups
        fu_cursor = self.conn.execute(
            "SELECT * FROM follow_up_records WHERE case_id = ? ORDER BY created_at ASC",
            (case_id,),
        )
        follow_ups: list[FollowUpRecord] = [
            FollowUpRecord(
                follow_up_id=fu["follow_up_id"],
                case_id=fu["case_id"],
                task_id=fu["task_id"],
                actor_id=fu["actor_id"],
                actor_role=fu["actor_role"],
                observation_note=fu["observation_note"],
                evidence_reference=fu["evidence_reference"],
                created_at=fu["created_at"],
            )
            for fu in fu_cursor.fetchall()
        ]

        # Load audit events
        audit_cursor = self.conn.execute(
            "SELECT * FROM audit_ledger WHERE case_id = ? ORDER BY seq_id ASC",
            (case_id,),
        )
        audit_events: list[AuditEventRecord] = [
            AuditEventRecord(
                seq_id=a["seq_id"],
                event_id=a["event_id"],
                case_id=a["case_id"],
                event_type=a["event_type"],
                actor_id=a["actor_id"],
                actor_role=a["actor_role"],
                payload_canonical_json=a["payload_canonical_json"],
                prev_entry_hash=a["prev_entry_hash"],
                entry_hash=a["entry_hash"],
                timestamp=a["timestamp"],
            )
            for a in audit_cursor.fetchall()
        ]

        return CaseDetailResponse(
            case=case,
            evidence_card=evidence_card,
            signal_interpretation=signal_interpretation,
            intervention_proposal=intervention_proposal,
            current_plan=current_plan,
            plan_versions=plan_versions,
            evidence_challenge=evidence_challenge,
            validation_summary=validation_summary,
            decisions=decisions,
            tasks=tasks,
            follow_ups=follow_ups,
            audit_events=audit_events,
        )

    def submit_advisor_decision(
        self,
        case_id: str,
        request: CaseDecisionRequest,
        actor_id: str,
        actor_role: str,
        campus_id: str,
    ) -> CaseDetailResponse:
        """
        Execute an advisor decision (APPROVE, MODIFY, REJECT, REQUEST_INFO) atomically.
        Enforces optimistic concurrency, idempotency, deterministic validation gates,
        and role constraints from the catalog.
        """
        ts = self._now()

        with self.conn:
            # 1. Check idempotency if key provided
            if request.idempotency_key:
                cursor = self.conn.execute(
                    """
                    SELECT * FROM case_decisions
                    WHERE case_id = ? AND actor_id = ? AND idempotency_key = ?
                    """,
                    (case_id, actor_id, request.idempotency_key),
                )
                existing_decision = cursor.fetchone()
                if existing_decision:
                    # Compare decision kind and reviewed plan version
                    if (
                        existing_decision["decision_kind"] == request.decision_kind.value
                        and existing_decision["reviewed_plan_version"] == request.reviewed_plan_version
                    ):
                        # Exactly-once replay: return current detail
                        return self.get_case_detail(case_id)  # type: ignore
                    raise ValueError(
                        f"Idempotency conflict: Key '{request.idempotency_key}' previously submitted with different decision payload."
                    )

            # 2. Load case and check existence & campus scoping
            case = self.get_case(case_id)
            if not case:
                raise ValueError(f"Case {case_id} not found.")
            if case.campus_id != campus_id:
                raise PermissionError(
                    f"Forbidden: Actor campus '{campus_id}' cannot mutate case from campus '{case.campus_id}'."
                )

            # 3. Optimistic concurrency check: reviewed_plan_version MUST match current_plan_version
            if request.reviewed_plan_version != case.current_plan_version:
                raise ValueError(
                    f"Concurrency conflict: Submitted decision reviewed v{request.reviewed_plan_version}, "
                    f"but current case version is v{case.current_plan_version}."
                )

            # 4. Check state transitions
            if case.status in [CaseStatus.CLOSED, CaseStatus.REJECTED]:
                raise ValueError(f"Invalid state transition: Case is currently {case.status.value}.")

            # 5. Load validation summary: Hard gate blocks approval if deterministic validation failed
            run_cursor = self.conn.execute(
                "SELECT validation_summary_json FROM pipeline_runs WHERE run_id = ?",
                (case.run_id,),
            )
            run_row = run_cursor.fetchone()
            if not run_row:
                raise RuntimeError(f"Corrupted pipeline run record for case {case_id}.")
            val_summary = ValidationSummary.model_validate_json(run_row["validation_summary_json"])

            if request.decision_kind in [AdvisorDecisionKind.APPROVE, AdvisorDecisionKind.MODIFY]:
                if not val_summary.passed:
                    raise ValueError(
                        f"Deterministic validation failed ({val_summary.error_count} errors). "
                        "Hard validation failures strictly block plan approval."
                    )

            # 6. Process decision branches
            decision_id = f"DEC-{uuid4().hex[:10]}"
            new_status: CaseStatus = case.status
            approved_version: Optional[int] = None
            plan_for_tasks: Optional[list[ActionStep]] = None
            plan_version_for_tasks: int = case.current_plan_version
            new_current_plan_version = case.current_plan_version

            if request.decision_kind == AdvisorDecisionKind.APPROVE:
                new_status = CaseStatus.APPROVED
                approved_version = case.current_plan_version

                # Fetch action steps from current plan version
                plan_cursor = self.conn.execute(
                    "SELECT action_steps_json FROM plan_versions WHERE case_id = ? AND version_number = ?",
                    (case_id, case.current_plan_version),
                )
                plan_row = plan_cursor.fetchone()
                if not plan_row:
                    raise RuntimeError(f"Missing plan version {case.current_plan_version} for case {case_id}")
                steps_data = json.loads(plan_row["action_steps_json"])
                plan_for_tasks = [ActionStep.model_validate(s) for s in steps_data]

            elif request.decision_kind == AdvisorDecisionKind.MODIFY:
                if not request.modified_plan:
                    raise ValueError("Modified plan payload is required when decision is MODIFY.")

                mod = request.modified_plan
                # Validate modified plan bounds and roles
                if not (1 <= len(mod.action_steps) <= 5):
                    raise ValueError(f"Plan must contain between 1 and 5 action steps, got {len(mod.action_steps)}.")
                if not (1 <= mod.target_window_days <= 60):
                    raise ValueError(f"Target window days must be between 1 and 60, got {mod.target_window_days}.")

                for step in mod.action_steps:
                    if step.suggested_role not in SyntheticDemoCatalog.STANDARD_ROLES:
                        raise ValueError(
                            f"Role '{step.suggested_role}' is not in approved demo catalog standard roles: "
                            f"{sorted(SyntheticDemoCatalog.STANDARD_ROLES)}"
                        )

                new_version_number = case.current_plan_version + 1
                new_current_plan_version = new_version_number
                new_status = CaseStatus.APPROVED
                approved_version = new_version_number

                mod_hash = compute_plan_hash(
                    plan_title=mod.plan_title,
                    target_window_days=mod.target_window_days,
                    action_steps=mod.action_steps,
                )

                # Insert new PlanVersionRecord
                plan_id = f"PLAN-{case_id}-v{new_version_number}"
                self.conn.execute(
                    """
                    INSERT INTO plan_versions (
                        plan_id, case_id, version_number, plan_hash, is_advisor_modified,
                        plan_title, target_window_days, rationale, action_steps_json,
                        evidence_requirements_json, limitations_json, created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        plan_id,
                        case_id,
                        new_version_number,
                        mod_hash,
                        1,
                        mod.plan_title,
                        mod.target_window_days,
                        request.notes,
                        canonical_json([s.model_dump() for s in mod.action_steps]),
                        canonical_json(mod.evidence_requirements),
                        canonical_json(mod.limitations_and_questions),
                        actor_id,
                        ts,
                    ),
                )

                self._append_audit_event(
                    case_id=case_id,
                    event_type="PLAN_MODIFIED_BY_ADVISOR",
                    actor_id=actor_id,
                    actor_role=actor_role,
                    payload={
                        "prior_version": case.current_plan_version,
                        "new_version": new_version_number,
                        "new_plan_hash": mod_hash,
                        "notes": request.notes,
                    },
                    timestamp=ts,
                )

                plan_for_tasks = mod.action_steps
                plan_version_for_tasks = new_version_number

            elif request.decision_kind == AdvisorDecisionKind.REJECT:
                if not request.notes.strip():
                    raise ValueError("Rejection decision requires documented notes/reason.")
                new_status = CaseStatus.REJECTED

            elif request.decision_kind == AdvisorDecisionKind.REQUEST_INFO:
                if not request.notes.strip():
                    raise ValueError("Information request decision requires documented questions.")
                new_status = CaseStatus.INFORMATION_REQUESTED

            # 7. Record decision
            self.conn.execute(
                """
                INSERT INTO case_decisions (
                    decision_id, case_id, decision_kind, actor_id, actor_role,
                    reviewed_plan_version, approved_plan_version, notes,
                    idempotency_key, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_id,
                    case_id,
                    request.decision_kind.value,
                    actor_id,
                    actor_role,
                    request.reviewed_plan_version,
                    approved_version,
                    request.notes,
                    request.idempotency_key,
                    ts,
                ),
            )

            # 8. Create tasks if approved or modified
            created_tasks_count = 0
            if plan_for_tasks and approved_version is not None:
                # Ensure no duplicate tasks exist for this plan version
                existing_tasks = self.conn.execute(
                    "SELECT COUNT(*) as cnt FROM tasks WHERE case_id = ? AND plan_version = ?",
                    (case_id, plan_version_for_tasks),
                ).fetchone()["cnt"]

                if existing_tasks == 0:
                    for step in plan_for_tasks:
                        task_id = f"TASK-{uuid4().hex[:8]}"
                        self.conn.execute(
                            """
                            INSERT INTO tasks (
                                task_id, case_id, plan_version, step_number, step_id,
                                action_description, assigned_role, target_days,
                                status, evidence_reference, follow_up_evidence_required,
                                created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                task_id,
                                case_id,
                                plan_version_for_tasks,
                                step.step_number,
                                step.step_id or f"STEP-{step.step_number}",
                                step.action_description,
                                step.suggested_role,
                                step.target_days,
                                TaskStatus.PENDING.value,
                                step.evidence_reference,
                                step.follow_up_evidence,
                                ts,
                            ),
                        )
                        created_tasks_count += 1

            # 9. Update case record
            self.conn.execute(
                """
                UPDATE cases SET
                    status = ?,
                    current_plan_version = ?,
                    updated_at = ?
                WHERE case_id = ?
                """,
                (new_status.value, new_current_plan_version, ts, case_id),
            )

            # 10. Append decision and task audit events
            self._append_audit_event(
                case_id=case_id,
                event_type="ADVISOR_DECISION_SUBMITTED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={
                    "decision_id": decision_id,
                    "decision_kind": request.decision_kind.value,
                    "reviewed_plan_version": request.reviewed_plan_version,
                    "approved_plan_version": approved_version,
                    "tasks_created": created_tasks_count,
                    "notes": request.notes,
                },
                timestamp=ts,
            )

        return self.get_case_detail(case_id)  # type: ignore

    def update_task_status(
        self,
        task_id: str,
        request: TaskStatusUpdateRequest,
        actor_id: str,
        actor_role: str,
        campus_id: str,
    ) -> TaskRecord:
        """
        Update execution status of an authorized support task.
        CRITICAL: Completing a task does NOT alter or infer student outcome status.
        """
        ts = self._now()

        with self.conn:
            cursor = self.conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,))
            task_row = cursor.fetchone()
            if not task_row:
                raise ValueError(f"Task {task_id} not found.")

            case_id = task_row["case_id"]
            case = self.get_case(case_id)
            if not case:
                raise RuntimeError(f"Case {case_id} not found for task {task_id}")
            if case.campus_id != campus_id:
                raise PermissionError(f"Forbidden: Access denied to task on campus {case.campus_id}.")

            completed_at = ts if request.status == TaskStatus.COMPLETED else task_row["completed_at"]
            completed_by = actor_id if request.status == TaskStatus.COMPLETED else task_row["completed_by"]
            comp_note = request.completion_note or task_row["completion_note"]

            self.conn.execute(
                """
                UPDATE tasks SET
                    status = ?,
                    completion_note = ?,
                    completed_at = ?,
                    completed_by = ?
                WHERE task_id = ?
                """,
                (request.status.value, comp_note, completed_at, completed_by, task_id),
            )

            # Audit event
            self._append_audit_event(
                case_id=case_id,
                event_type="TASK_STATUS_UPDATED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={
                    "task_id": task_id,
                    "prior_status": task_row["status"],
                    "new_status": request.status.value,
                    "completion_note": request.completion_note,
                },
                timestamp=ts,
            )

            # Check if all tasks are completed
            all_tasks = self.conn.execute(
                "SELECT status FROM tasks WHERE case_id = ?", (case_id,)
            ).fetchall()
            if all_tasks and all(t["status"] == TaskStatus.COMPLETED.value for t in all_tasks):
                self.conn.execute(
                    "UPDATE cases SET status = ?, updated_at = ? WHERE case_id = ?",
                    (CaseStatus.TASKS_COMPLETED.value, ts, case_id),
                )
            elif case.status == CaseStatus.APPROVED:
                self.conn.execute(
                    "UPDATE cases SET status = ?, updated_at = ? WHERE case_id = ?",
                    (CaseStatus.IN_PROGRESS.value, ts, case_id),
                )

        updated_cursor = self.conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,))
        r = updated_cursor.fetchone()
        return TaskRecord(
            task_id=r["task_id"],
            case_id=r["case_id"],
            plan_version=r["plan_version"],
            step_number=r["step_number"],
            step_id=r["step_id"],
            action_description=r["action_description"],
            assigned_role=r["assigned_role"],
            target_days=r["target_days"],
            due_date=r["due_date"],
            status=TaskStatus(r["status"]),
            evidence_reference=r["evidence_reference"],
            follow_up_evidence_required=r["follow_up_evidence_required"],
            completion_note=r["completion_note"],
            completed_at=r["completed_at"],
            completed_by=r["completed_by"],
            created_at=r["created_at"],
        )

    def create_follow_up(
        self,
        case_id: str,
        request: FollowUpCreateRequest,
        actor_id: str,
        actor_role: str,
        campus_id: str,
    ) -> FollowUpRecord:
        """Record manual observation note or advisor follow-up contact."""
        ts = self._now()
        follow_up_id = f"FU-{uuid4().hex[:10]}"

        with self.conn:
            case = self.get_case(case_id)
            if not case:
                raise ValueError(f"Case {case_id} not found.")
            if case.campus_id != campus_id:
                raise PermissionError(f"Forbidden: Campus mismatch.")

            self.conn.execute(
                """
                INSERT INTO follow_up_records (
                    follow_up_id, case_id, task_id, actor_id, actor_role,
                    observation_note, evidence_reference, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    follow_up_id,
                    case_id,
                    request.task_id,
                    actor_id,
                    actor_role,
                    request.observation_note,
                    request.evidence_reference,
                    ts,
                ),
            )

            self._append_audit_event(
                case_id=case_id,
                event_type="FOLLOW_UP_RECORDED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={
                    "follow_up_id": follow_up_id,
                    "task_id": request.task_id,
                    "observation_note": request.observation_note,
                    "evidence_reference": request.evidence_reference,
                },
                timestamp=ts,
            )

        return FollowUpRecord(
            follow_up_id=follow_up_id,
            case_id=case_id,
            task_id=request.task_id,
            actor_id=actor_id,
            actor_role=actor_role,
            observation_note=request.observation_note,
            evidence_reference=request.evidence_reference,
            created_at=ts,
        )

    def record_outcome(
        self,
        case_id: str,
        request: OutcomeRecordRequest,
        actor_id: str,
        actor_role: str,
        campus_id: str,
    ) -> CaseRecord:
        """
        Record distinct student outcome observation.
        Maintains strict boundary: task completion != outcome success.
        """
        ts = self._now()

        with self.conn:
            case = self.get_case(case_id)
            if not case:
                raise ValueError(f"Case {case_id} not found.")
            if case.campus_id != campus_id:
                raise PermissionError(f"Forbidden: Campus mismatch.")

            self.conn.execute(
                """
                UPDATE cases SET
                    outcome_status = ?,
                    outcome_summary = ?,
                    outcome_recorded_at = ?,
                    outcome_recorded_by = ?,
                    updated_at = ?
                WHERE case_id = ?
                """,
                (
                    request.outcome_status.value,
                    request.outcome_summary,
                    ts,
                    actor_id,
                    ts,
                    case_id,
                ),
            )

            self._append_audit_event(
                case_id=case_id,
                event_type="STUDENT_OUTCOME_RECORDED",
                actor_id=actor_id,
                actor_role=actor_role,
                payload={
                    "outcome_status": request.outcome_status.value,
                    "outcome_summary": request.outcome_summary,
                },
                timestamp=ts,
            )

        return self.get_case(case_id)  # type: ignore

    def verify_audit_ledger(self, case_id: Optional[str] = None) -> AuditVerificationResult:
        """Verify the tamper-evident audit ledger hash chain across all events or for a specific case."""
        query = "SELECT * FROM audit_ledger"
        params: list[Any] = []
        if case_id:
            query += " WHERE case_id = ?"
            params.append(case_id)
        query += " ORDER BY seq_id ASC"

        cursor = self.conn.execute(query, params)
        events = [
            AuditEventRecord(
                seq_id=r["seq_id"],
                event_id=r["event_id"],
                case_id=r["case_id"],
                event_type=r["event_type"],
                actor_id=r["actor_id"],
                actor_role=r["actor_role"],
                payload_canonical_json=r["payload_canonical_json"],
                prev_entry_hash=r["prev_entry_hash"],
                entry_hash=r["entry_hash"],
                timestamp=r["timestamp"],
            )
            for r in cursor.fetchall()
        ]
        return verify_audit_chain(events)
