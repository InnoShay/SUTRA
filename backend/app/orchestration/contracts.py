"""
Pydantic v2 contracts for SUTRA Orchestration Foundation.

Defines versioned schemas for EvidencePacket, Agent outputs (1-4),
claim-level evidence references, stage records, and run results.
"""

from enum import Enum
from typing import Any, Optional, Union
from pydantic import BaseModel, Field, ConfigDict

from backend.app.schemas.features import StudentFeatureInput
from sutra_ml.schemas.evidence_card import SutraEvidenceCard


class ClaimKind(str, Enum):
    """Classification of claim type without scientific confidence inflation."""
    VERIFIED_OBSERVATION = "VERIFIED_OBSERVATION"  # Directly present in verified telemetry
    INFERRED_HYPOTHESIS = "INFERRED_HYPOTHESIS"    # Qualitative interpretation derived by agent


class StageStatus(str, Enum):
    """Execution status for an individual logical stage."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    SKIPPED = "SKIPPED"


class RunStatus(str, Enum):
    """Overall pipeline execution status."""
    SUCCESS = "SUCCESS"
    PARTIAL_SUCCESS = "PARTIAL_SUCCESS"  # Degraded: ML Card intact, some AI stages timed out
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"


class ValidationSeverity(str, Enum):
    """Severity level of validation findings."""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class EvidenceReference(BaseModel):
    """
    Structured evidence reference preserving native value semantics.

    Preserves exact typed representation (int, float, str) for deterministic
    comparison against the canonical EvidencePacket.
    """
    model_config = ConfigDict(extra="forbid")

    feature_name: str = Field(
        ...,
        description="Exact feature name from 25-feature contract, e.g. 'vle_days_since_last_click'"
    )
    cited_value: Union[int, float, str] = Field(
        ...,
        description="Value cited by the agent, preserving int/float/str semantic type"
    )
    claim_kind: ClaimKind = Field(
        default=ClaimKind.VERIFIED_OBSERVATION,
        description="Classification of claim groundedness"
    )
    rationale: str = Field(
        default="",
        description="Contextual explanation for why this evidence is material"
    )


class EvidencePacket(BaseModel):
    """
    Authoritative, verified evidence packet supplied to the orchestration coordinator.

    Contains the validated 25-feature input, the ML-computed EvidenceCard,
    and a normalized feature dictionary with exact types.
    """
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="v1.0.0", description="Contract schema version")
    student_input: StudentFeatureInput = Field(
        ...,
        description="Validated 25-feature Day-30 student record"
    )
    evidence_card: SutraEvidenceCard = Field(
        ...,
        description="Authoritative model risk prediction and feature attribution card"
    )
    campus_id: str = Field(
        default="CAMPUS_DEFAULT",
        description="Authorized institutional campus identifier"
    )
    snapshot_day: int = Field(
        default=30,
        ge=1,
        le=30,
        description="Cutoff day relative to course start"
    )

    def get_canonical_features(self) -> dict[str, Union[int, float, str]]:
        """Return the dictionary of 25 canonical feature values."""
        return self.student_input.to_feature_dict()


class SignalInterpretation(BaseModel):
    """Agent 1 Output: Qualitative interpretation of verified telemetry."""
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="v1.0.0", description="Contract version")
    summary: str = Field(..., description="Synthesis of verified engagement patterns")
    velocity_assessment: str = Field(..., description="Assessment of recent activity velocity (last 7d vs pre-course)")
    evidence_references: list[EvidenceReference] = Field(
        default_factory=list,
        description="Claim-level references to verified telemetry features"
    )
    missing_or_stale_indicators: list[str] = Field(
        default_factory=list,
        description="Explicit enumeration of missing, banked, or stale data points"
    )
    requires_human_review: bool = Field(
        default=True,
        description="Explicit determination whether verified telemetry patterns merit human advisor review"
    )
    information_requests: list[str] = Field(
        default_factory=list,
        description="Explicit requests for additional or clarifying information when evidence is ambiguous"
    )


class InterventionProposal(BaseModel):
    """Agent 2 Output: Policy-constrained candidate intervention selection."""
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="v1.0.0", description="Contract version")
    selected_intervention_id: str = Field(
        ...,
        description="Identifier from the synthetic institutional demo catalog"
    )
    rationale: str = Field(..., description="Grounded justification for intervention choice")
    target_role: str = Field(
        ...,
        description="Suggested owner role for executing this intervention"
    )
    alternative_intervention_ids: list[str] = Field(
        default_factory=list,
        description="Secondary fallback interventions from catalog"
    )
    evidence_references: list[EvidenceReference] = Field(
        default_factory=list,
        description="Telemetry features justifying this intervention"
    )


class ActionStep(BaseModel):
    """A concrete milestone step within a draft support plan."""
    model_config = ConfigDict(extra="forbid")

    step_number: int = Field(ge=1, le=10, description="Sequential step index")
    action_description: str = Field(..., description="Actionable task description")
    suggested_role: str = Field(..., description="Suggested executing role")
    target_days: int = Field(ge=1, le=60, description="Target completion timeline in days")
    step_id: Optional[str] = Field(default=None, description="Stable identifier, e.g. 'STEP-1'")
    evidence_reference: Optional[str] = Field(
        default=None,
        description="Relevant evidence feature or catalog rule justifying this step"
    )
    follow_up_evidence: Optional[str] = Field(
        default=None,
        description="Observable follow-up evidence to document completion without conflating action with student outcome"
    )


class SupportPlanDraft(BaseModel):
    """Agent 3 Output: Structured draft support plan."""
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="v1.0.0", description="Contract version")
    plan_title: str = Field(..., description="Descriptive title of the support plan")
    action_steps: list[ActionStep] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="List of 1 to 5 sequential action steps"
    )
    evidence_requirements: list[str] = Field(
        default_factory=list,
        description="Specific follow-up observations or notes required to verify completion"
    )
    target_window_days: int = Field(
        default=14,
        ge=1,
        le=60,
        description="Overall target completion window in days"
    )
    is_draft: bool = Field(
        default=True,
        description="Explicit indicator that plan is an unapproved draft awaiting advisor review"
    )
    rationale: Optional[str] = Field(
        default="",
        description="Concise rationale grounding the proposed plan structure"
    )
    limitations_and_questions: list[str] = Field(
        default_factory=list,
        description="Outstanding questions or information gaps requiring advisor discretion"
    )


class ChallengeFinding(BaseModel):
    """Structured advisory critique finding referencing target and rationale."""
    model_config = ConfigDict(extra="forbid")

    target: str = Field(..., description="Specific target, e.g. 'plan.step_1', 'interpretation.summary', or claim id")
    severity: ValidationSeverity = Field(default=ValidationSeverity.WARNING, description="Advisory severity level")
    reason: str = Field(..., description="Explanation of why this claim, step, or role is challenged")
    evidence_reference: Optional[str] = Field(default=None, description="Optional feature name or citation in question")


class EvidenceChallengeReport(BaseModel):
    """Agent 4 Output: Adversarial critique of plan grounding and assumptions."""
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default="v1.0.0", description="Contract version")
    critique_summary: str = Field(..., description="Overall evaluation of plan grounding")
    unsupported_claims: list[str] = Field(
        default_factory=list,
        description="Claims made in plan lacking evidence grounding"
    )
    catalog_divergences: list[str] = Field(
        default_factory=list,
        description="Deviations from catalog policies or suggested roles"
    )
    unjustified_certainty_flags: list[str] = Field(
        default_factory=list,
        description="Causal or diagnostic assertions flagged as unjustified"
    )
    flags_count: int = Field(ge=0, description="Total count of critique flags raised")
    findings: list[ChallengeFinding] = Field(
        default_factory=list,
        description="Structured list of challenge findings with target references"
    )


class ValidationFinding(BaseModel):
    """Individual finding produced by the deterministic application validator."""
    model_config = ConfigDict(extra="forbid")

    field: str = Field(..., description="Target field or property audited")
    severity: ValidationSeverity = Field(..., description="Finding severity")
    message: str = Field(..., description="Human-readable explanation of finding")
    code: str = Field(..., description="Machine-readable rule code, e.g. 'ERR_INVALID_CITATION'")


class ValidationSummary(BaseModel):
    """Summary of deterministic validation gate checks."""
    model_config = ConfigDict(extra="forbid")

    passed: bool = Field(..., description="Whether all required validation rules passed")
    findings: list[ValidationFinding] = Field(
        default_factory=list,
        description="List of validation findings"
    )
    error_count: int = Field(ge=0, description="Total error count")
    warning_count: int = Field(ge=0, description="Total warning count")


class StageExecutionRecord(BaseModel):
    """Audit record for a single logical stage execution."""
    model_config = ConfigDict(extra="forbid")

    stage_id: str = Field(..., description="Identifier of logical stage, e.g. 'stage_1_interpretation'")
    stage_name: str = Field(..., description="Human-readable stage title")
    status: StageStatus = Field(..., description="Final status of this stage")
    attempt_count: int = Field(default=0, ge=0, description="Number of execution attempts")
    duration_ms: float = Field(ge=0.0, description="Total execution duration in milliseconds")
    output: Optional[Any] = Field(default=None, description="Typed output if stage completed")
    error: Optional[str] = Field(default=None, description="Error message if stage failed")


class OrchestrationResult(BaseModel):
    """
    Authoritative result returned by the deterministic orchestration coordinator.

    Always preserves the authoritative ML Evidence Card even if AI enrichment fails.
    """
    model_config = ConfigDict(extra="forbid")

    run_id: str = Field(..., description="Unique run identifier (UUIDv4)")
    record_id: str = Field(..., description="Student record identifier")
    status: RunStatus = Field(..., description="Pipeline execution outcome")
    evidence_card: SutraEvidenceCard = Field(
        ...,
        description="Authoritative, preserved model risk prediction and attribution card"
    )
    stages: dict[str, StageExecutionRecord] = Field(
        default_factory=dict,
        description="Map of logical stage IDs to execution records"
    )
    validation_summary: ValidationSummary = Field(
        ...,
        description="Results from the deterministic application validator"
    )
    total_duration_ms: float = Field(ge=0.0, description="Total run duration in ms")
    retries_used: int = Field(default=0, ge=0, le=1, description="Number of retries used (max 1)")
