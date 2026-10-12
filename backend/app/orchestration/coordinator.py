"""
Deterministic Orchestration Coordinator for SUTRA Phase 1.

Executes the four-stage triage pipeline sequentially with hard deadline enforcement,
per-attempt timeouts, bounded single retry, and fail-closed validation gates.
"""

import time
import uuid
from typing import Callable, Optional, TypeVar
from pydantic import BaseModel

from backend.app.orchestration.contracts import (
    EvidencePacket,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    StageExecutionRecord,
    StageStatus,
    SupportPlanDraft,
    EvidenceChallengeReport,
    ValidationSummary,
)
from backend.app.orchestration.context import AgentContextFilter, FilteredAgentContext
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    ProviderFatalError,
    ProviderRecoverableError,
    ProviderTimeoutError,
)
from backend.app.orchestration.security import SecurityContext
from backend.app.orchestration.validator import DeterministicValidator

T = TypeVar("T", bound=BaseModel)


class CoordinatorExecutionBudgetExhausted(Exception):
    """Raised when the remaining overall run deadline is insufficient for execution."""
    pass


class OrchestrationCoordinator:
    """
    Deterministic coordinator governing the core four-specialist triage pipeline.

    Enforces:
    - Overall run deadline (hard cap: 18.0s).
    - Per-stage attempt timeout (default: 4.0s, capped by remaining overall time).
    - Global retry budget (maximum 1 retry for the entire run, for recoverable failures).
    - Preservation of the authoritative ML Evidence Card in all failure states.
    - Zero autonomous side effects (no DB mutations or message dispatching).
    """

    MAX_RUN_DEADLINE_SEC: float = 18.0
    DEFAULT_STAGE_TIMEOUT_SEC: float = 4.0
    MIN_RETRY_REMAINING_BUDGET_SEC: float = 1.0

    def __init__(
        self,
        provider: LLMProviderProtocol,
        max_deadline_sec: float = MAX_RUN_DEADLINE_SEC,
        stage_timeout_sec: float = DEFAULT_STAGE_TIMEOUT_SEC,
    ):
        self.provider = provider
        self.max_deadline_sec = max_deadline_sec
        self.stage_timeout_sec = stage_timeout_sec

    def _execute_stage_with_retry(
        self,
        stage_id: str,
        stage_name: str,
        execution_fn: Callable[[float], T],
        overall_start_time: float,
        retry_budget_tracker: dict[str, int],
    ) -> tuple[Optional[T], StageExecutionRecord]:
        """
        Execute an individual stage with per-attempt timeout and bounded global retry.
        """
        stage_start = time.time()
        elapsed_so_far = stage_start - overall_start_time
        remaining_run_time = self.max_deadline_sec - elapsed_so_far

        if remaining_run_time <= 0.05:
            return None, StageExecutionRecord(
                stage_id=stage_id,
                stage_name=stage_name,
                status=StageStatus.TIMED_OUT,
                attempt_count=0,
                duration_ms=0.0,
                error=f"Overall run deadline exhausted ({self.max_deadline_sec}s). Stage could not start.",
            )

        attempt = 1
        last_error: Optional[str] = None
        attempt_timeout = min(self.stage_timeout_sec, remaining_run_time)

        while True:
            try:
                result = execution_fn(attempt_timeout)
                duration_ms = (time.time() - stage_start) * 1000.0
                return result, StageExecutionRecord(
                    stage_id=stage_id,
                    stage_name=stage_name,
                    status=StageStatus.COMPLETED,
                    attempt_count=attempt,
                    duration_ms=duration_ms,
                    output=result,
                )

            except (ProviderRecoverableError, ProviderTimeoutError) as recoverable_err:
                last_error = str(recoverable_err)
                # Check if retry budget remains and enough overall time is left
                can_retry = (
                    retry_budget_tracker["retries_used"] < 1
                    and (self.max_deadline_sec - (time.time() - overall_start_time)) >= self.MIN_RETRY_REMAINING_BUDGET_SEC
                )

                if can_retry:
                    retry_budget_tracker["retries_used"] += 1
                    attempt += 1
                    remaining_run_time = self.max_deadline_sec - (time.time() - overall_start_time)
                    attempt_timeout = min(self.stage_timeout_sec, remaining_run_time)
                    continue  # Execute single retry attempt
                else:
                    duration_ms = (time.time() - stage_start) * 1000.0
                    status = StageStatus.TIMED_OUT if isinstance(recoverable_err, ProviderTimeoutError) else StageStatus.FAILED
                    return None, StageExecutionRecord(
                        stage_id=stage_id,
                        stage_name=stage_name,
                        status=status,
                        attempt_count=attempt,
                        duration_ms=duration_ms,
                        error=f"Recoverable failure (retry budget exhausted or deadline reached): {last_error}",
                    )

            except Exception as fatal_err:
                duration_ms = (time.time() - stage_start) * 1000.0
                return None, StageExecutionRecord(
                    stage_id=stage_id,
                    stage_name=stage_name,
                    status=StageStatus.FAILED,
                    attempt_count=attempt,
                    duration_ms=duration_ms,
                    error=f"Non-recoverable failure: {fatal_err}",
                )

    def run_pipeline(
        self,
        evidence_packet: EvidencePacket,
        security_context: SecurityContext,
        stage_1_executor: Optional[Callable[[FilteredAgentContext, float], SignalInterpretation]] = None,
        stage_2_executor: Optional[Callable[[FilteredAgentContext, SignalInterpretation, float], InterventionProposal]] = None,
        stage_3_executor: Optional[Callable[[FilteredAgentContext, InterventionProposal, float], SupportPlanDraft]] = None,
        stage_4_executor: Optional[Callable[[FilteredAgentContext, SupportPlanDraft, float], EvidenceChallengeReport]] = None,
        max_active_stages: int = 4,
    ) -> OrchestrationResult:
        """
        Execute the deterministic triage pipeline.

        Supports full 4-stage pipeline (default) or partial 2-stage execution (Phase 2).
        """
        run_id = f"RUN-{uuid.uuid4()}"
        start_time = time.time()
        record_id = evidence_packet.student_input.record_id or "ANON-STUDENT"

        # 1. Authorize access
        security_context.authorize_case_access(
            target_campus_id=evidence_packet.campus_id,
            student_record_id=record_id,
        )

        # 2. Filter least-privilege agent context
        filtered_context = AgentContextFilter.filter_context(evidence_packet)

        # Initialize tracking
        stages_record: dict[str, StageExecutionRecord] = {}
        retry_tracker = {"retries_used": 0}

        interpretation: Optional[SignalInterpretation] = None
        proposal: Optional[InterventionProposal] = None
        plan: Optional[SupportPlanDraft] = None
        challenge: Optional[EvidenceChallengeReport] = None

        # ---------------------------------------------------------------------
        # STAGE 1: Student Signal Interpreter
        # ---------------------------------------------------------------------
        def _exec_stage_1(timeout_sec: float) -> SignalInterpretation:
            if stage_1_executor:
                return stage_1_executor(filtered_context, timeout_sec)
            from backend.app.orchestration.agents.signal_interpreter import StudentSignalInterpreter
            return StudentSignalInterpreter.interpret(filtered_context, self.provider, timeout_sec)

        interpretation, s1_record = self._execute_stage_with_retry(
            stage_id="stage_1_interpretation",
            stage_name="Student Signal Interpreter",
            execution_fn=_exec_stage_1,
            overall_start_time=start_time,
            retry_budget_tracker=retry_tracker,
        )
        stages_record["stage_1_interpretation"] = s1_record

        # Validate Stage 1 outputs prior to allowing Stage 2 execution
        s1_val = DeterministicValidator.validate_stage_outputs(
            evidence_packet=evidence_packet,
            interpretation=interpretation,
        )
        s1_succeeded_and_valid = (s1_record.status == StageStatus.COMPLETED) and s1_val.passed

        # ---------------------------------------------------------------------
        # STAGE 2: Intervention Strategist
        # ---------------------------------------------------------------------
        if s1_succeeded_and_valid and max_active_stages >= 2:
            def _exec_stage_2(timeout_sec: float) -> InterventionProposal:
                if stage_2_executor:
                    return stage_2_executor(filtered_context, interpretation, timeout_sec)
                from backend.app.orchestration.agents.intervention_strategist import InterventionStrategist
                return InterventionStrategist.strategize(filtered_context, interpretation, self.provider, timeout_sec)

            proposal, s2_record = self._execute_stage_with_retry(
                stage_id="stage_2_intervention",
                stage_name="Intervention Strategist",
                execution_fn=_exec_stage_2,
                overall_start_time=start_time,
                retry_budget_tracker=retry_tracker,
            )
            stages_record["stage_2_intervention"] = s2_record
        else:
            abort_reason = (
                "Aborted: dependent Stage 1 interpretation failed execution or failed validation"
                if not s1_succeeded_and_valid
                else "Stage not active"
            )
            stages_record["stage_2_intervention"] = StageExecutionRecord(
                stage_id="stage_2_intervention",
                stage_name="Intervention Strategist",
                status=StageStatus.SKIPPED,
                attempt_count=0,
                duration_ms=0.0,
                error=abort_reason,
            )

        # Validate Stage 2 outputs prior to allowing Stage 3 execution
        s2_rec = stages_record.get("stage_2_intervention")
        s2_val = DeterministicValidator.validate_stage_outputs(
            evidence_packet=evidence_packet,
            interpretation=interpretation,
            proposal=proposal,
        )
        s2_succeeded_and_valid = (
            s2_rec is not None
            and s2_rec.status == StageStatus.COMPLETED
            and s2_val.passed
        )

        # ---------------------------------------------------------------------
        # STAGE 3: Support Plan Designer
        # ---------------------------------------------------------------------
        if max_active_stages < 3:
            stages_record["stage_3_plan"] = StageExecutionRecord(
                stage_id="stage_3_plan",
                stage_name="Support Plan Designer",
                status=StageStatus.PENDING,
                attempt_count=0,
                duration_ms=0.0,
                error="Downstream stage pending Phase 3 implementation (Support Plan Designer)",
            )
        elif s2_succeeded_and_valid:
            def _exec_stage_3(timeout_sec: float) -> SupportPlanDraft:
                if stage_3_executor:
                    return stage_3_executor(filtered_context, proposal, timeout_sec)
                from backend.app.orchestration.agents.support_plan_designer import SupportPlanDesigner
                return SupportPlanDesigner.design(
                    context=filtered_context,
                    proposal=proposal,
                    provider=self.provider,
                    interpretation=interpretation,
                    timeout_sec=timeout_sec,
                )

            plan, s3_record = self._execute_stage_with_retry(
                stage_id="stage_3_plan",
                stage_name="Support Plan Designer",
                execution_fn=_exec_stage_3,
                overall_start_time=start_time,
                retry_budget_tracker=retry_tracker,
            )
            stages_record["stage_3_plan"] = s3_record
        else:
            stages_record["stage_3_plan"] = StageExecutionRecord(
                stage_id="stage_3_plan",
                stage_name="Support Plan Designer",
                status=StageStatus.SKIPPED,
                attempt_count=0,
                duration_ms=0.0,
                error="Aborted: dependent Stage 2 proposal failed or timed out",
            )

        # Validate Stage 3 outputs prior to allowing Stage 4 execution
        s3_rec = stages_record.get("stage_3_plan")
        s3_val = DeterministicValidator.validate_stage_outputs(
            evidence_packet=evidence_packet,
            interpretation=interpretation,
            proposal=proposal,
            plan=plan,
        )
        s3_succeeded_and_valid = (
            s3_rec is not None
            and s3_rec.status == StageStatus.COMPLETED
            and s3_val.passed
        )

        # ---------------------------------------------------------------------
        # STAGE 4: Evidence Challenge Agent
        # ---------------------------------------------------------------------
        if max_active_stages < 4:
            stages_record["stage_4_challenge"] = StageExecutionRecord(
                stage_id="stage_4_challenge",
                stage_name="Evidence Challenge Agent",
                status=StageStatus.PENDING,
                attempt_count=0,
                duration_ms=0.0,
                error="Downstream stage pending Phase 3 implementation (Evidence Challenge Agent)",
            )
        elif s3_succeeded_and_valid:
            def _exec_stage_4(timeout_sec: float) -> EvidenceChallengeReport:
                if stage_4_executor:
                    import inspect
                    sig = inspect.signature(stage_4_executor)
                    if len(sig.parameters) >= 4:
                        return stage_4_executor(filtered_context, interpretation, proposal, plan, timeout_sec)
                    return stage_4_executor(filtered_context, plan, timeout_sec)
                from backend.app.orchestration.agents.evidence_challenge_agent import EvidenceChallengeAgent
                return EvidenceChallengeAgent.audit(
                    context=filtered_context,
                    interpretation=interpretation,
                    proposal=proposal,
                    plan=plan,
                    provider=self.provider,
                    timeout_sec=timeout_sec,
                )

            challenge, s4_record = self._execute_stage_with_retry(
                stage_id="stage_4_challenge",
                stage_name="Evidence Challenge Agent",
                execution_fn=_exec_stage_4,
                overall_start_time=start_time,
                retry_budget_tracker=retry_tracker,
            )
            stages_record["stage_4_challenge"] = s4_record
        else:
            stages_record["stage_4_challenge"] = StageExecutionRecord(
                stage_id="stage_4_challenge",
                stage_name="Evidence Challenge Agent",
                status=StageStatus.SKIPPED,
                attempt_count=0,
                duration_ms=0.0,
                error="Aborted: dependent Stage 3 plan failed or timed out",
            )

        # ---------------------------------------------------------------------
        # DETERMINISTIC VALIDATION GATE
        # ---------------------------------------------------------------------
        validation_summary = DeterministicValidator.validate_stage_outputs(
            evidence_packet=evidence_packet,
            interpretation=interpretation,
            proposal=proposal,
            plan=plan,
            challenge=challenge,
        )

        total_duration_ms = (time.time() - start_time) * 1000.0

        # Determine overall pipeline status
        if max_active_stages <= 2:
            s1_done = stages_record.get("stage_1_interpretation") and stages_record["stage_1_interpretation"].status == StageStatus.COMPLETED
            s2_done = stages_record.get("stage_2_intervention") and stages_record["stage_2_intervention"].status == StageStatus.COMPLETED

            if s1_done and s2_done and validation_summary.passed:
                status = RunStatus.PARTIAL_SUCCESS  # Stages 1 & 2 completed, downstream pending
            elif s1_done and validation_summary.passed:
                status = RunStatus.PARTIAL_SUCCESS
            else:
                status = RunStatus.FAILED
        elif max_active_stages == 3:
            s1_done = stages_record.get("stage_1_interpretation") and stages_record["stage_1_interpretation"].status == StageStatus.COMPLETED
            s2_done = stages_record.get("stage_2_intervention") and stages_record["stage_2_intervention"].status == StageStatus.COMPLETED
            s3_done = stages_record.get("stage_3_plan") and stages_record["stage_3_plan"].status == StageStatus.COMPLETED
            if s1_done and s2_done and s3_done and validation_summary.passed:
                status = RunStatus.PARTIAL_SUCCESS
            else:
                status = RunStatus.FAILED
        else:
            all_completed = all(
                r.status == StageStatus.COMPLETED for r in stages_record.values()
            )
            any_timed_out = any(
                r.status == StageStatus.TIMED_OUT for r in stages_record.values()
            )

            if all_completed and validation_summary.passed:
                status = RunStatus.SUCCESS
            elif not validation_summary.passed:
                status = RunStatus.FAILED
            elif any_timed_out or (not all_completed and interpretation is not None):
                status = RunStatus.PARTIAL_SUCCESS  # ML Card preserved, partial AI enrichment
            else:
                status = RunStatus.FAILED

        return OrchestrationResult(
            run_id=run_id,
            record_id=record_id,
            status=status,
            evidence_card=evidence_packet.evidence_card,
            stages=stages_record,
            validation_summary=validation_summary,
            total_duration_ms=total_duration_ms,
            retries_used=retry_tracker["retries_used"],
        )
