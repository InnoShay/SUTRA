"""
SUTRA Orchestration Foundation — Phase 1.

Deterministic multi-agent execution coordinator, contracts, synthetic catalog,
mock provider, context boundaries, and evidentiary validation gates.
"""

from backend.app.orchestration.contracts import (
    EvidencePacket,
    EvidenceReference,
    ClaimKind,
    SignalInterpretation,
    InterventionProposal,
    SupportPlanDraft,
    EvidenceChallengeReport,
    ChallengeFinding,
    OrchestrationResult,
    RunStatus,
    StageStatus,
    StageExecutionRecord,
    ValidationFinding,
    ValidationSeverity,
    ValidationSummary,
)
from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.provider import (
    LLMProviderProtocol,
    LiveProviderClient,
    MockLLMClient,
    ProviderResponse,
    ProviderRecoverableError,
    ProviderFatalError,
    ProviderTimeoutError,
)
from backend.app.orchestration.context import AgentContextFilter
from backend.app.orchestration.security import SecurityContext
from backend.app.orchestration.repository import InMemoryRunRepository
from backend.app.orchestration.validator import DeterministicValidator
from backend.app.orchestration.coordinator import OrchestrationCoordinator
from backend.app.orchestration.agents import (
    StudentSignalInterpreter,
    InterventionStrategist,
    SupportPlanDesigner,
    EvidenceChallengeAgent,
)

__all__ = [
    "EvidencePacket",
    "EvidenceReference",
    "ClaimKind",
    "SignalInterpretation",
    "InterventionProposal",
    "SupportPlanDraft",
    "EvidenceChallengeReport",
    "ChallengeFinding",
    "OrchestrationResult",
    "RunStatus",
    "StageStatus",
    "StageExecutionRecord",
    "ValidationFinding",
    "ValidationSeverity",
    "ValidationSummary",
    "SyntheticDemoCatalog",
    "LLMProviderProtocol",
    "LiveProviderClient",
    "MockLLMClient",
    "ProviderResponse",
    "ProviderRecoverableError",
    "ProviderFatalError",
    "ProviderTimeoutError",
    "AgentContextFilter",
    "SecurityContext",
    "InMemoryRunRepository",
    "DeterministicValidator",
    "OrchestrationCoordinator",
    "StudentSignalInterpreter",
    "InterventionStrategist",
    "SupportPlanDesigner",
    "EvidenceChallengeAgent",
]
