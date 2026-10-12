"""
Specialist AI Agents for SUTRA Orchestration (Phase 2 & Phase 3).
"""

from backend.app.orchestration.agents.cohort_analyst import CohortLearningAnalyst
from backend.app.orchestration.agents.communication_drafter import CommunicationDrafter
from backend.app.orchestration.agents.evidence_challenge_agent import EvidenceChallengeAgent
from backend.app.orchestration.agents.intervention_strategist import InterventionStrategist
from backend.app.orchestration.agents.note_structuring_agent import NoteStructuringAgent
from backend.app.orchestration.agents.prompts import (
    COHORT_LEARNING_ANALYST_SYSTEM_PROMPT_V1,
    COHORT_LEARNING_ANALYST_VERSION,
    COMMUNICATION_DRAFTER_SYSTEM_PROMPT_V1,
    COMMUNICATION_DRAFTER_VERSION,
    EVIDENCE_CHALLENGE_AGENT_SYSTEM_PROMPT_V1,
    EVIDENCE_CHALLENGE_AGENT_VERSION,
    INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1,
    INTERVENTION_STRATEGIST_VERSION,
    NOTE_STRUCTURING_SYSTEM_PROMPT_V1,
    NOTE_STRUCTURING_VERSION,
    SIGNAL_INTERPRETER_SYSTEM_PROMPT_V1,
    SIGNAL_INTERPRETER_VERSION,
    SUPPORT_PLAN_DESIGNER_SYSTEM_PROMPT_V1,
    SUPPORT_PLAN_DESIGNER_VERSION,
    sanitize_untrusted_note,
    sanitize_untrusted_text,
)
from backend.app.orchestration.agents.signal_interpreter import StudentSignalInterpreter
from backend.app.orchestration.agents.support_plan_designer import SupportPlanDesigner

__all__ = [
    "StudentSignalInterpreter",
    "InterventionStrategist",
    "SupportPlanDesigner",
    "EvidenceChallengeAgent",
    "CommunicationDrafter",
    "NoteStructuringAgent",
    "CohortLearningAnalyst",
    "SIGNAL_INTERPRETER_SYSTEM_PROMPT_V1",
    "SIGNAL_INTERPRETER_VERSION",
    "INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1",
    "INTERVENTION_STRATEGIST_VERSION",
    "SUPPORT_PLAN_DESIGNER_SYSTEM_PROMPT_V1",
    "SUPPORT_PLAN_DESIGNER_VERSION",
    "EVIDENCE_CHALLENGE_AGENT_SYSTEM_PROMPT_V1",
    "EVIDENCE_CHALLENGE_AGENT_VERSION",
    "COMMUNICATION_DRAFTER_SYSTEM_PROMPT_V1",
    "COMMUNICATION_DRAFTER_VERSION",
    "NOTE_STRUCTURING_SYSTEM_PROMPT_V1",
    "NOTE_STRUCTURING_VERSION",
    "COHORT_LEARNING_ANALYST_SYSTEM_PROMPT_V1",
    "COHORT_LEARNING_ANALYST_VERSION",
    "sanitize_untrusted_text",
    "sanitize_untrusted_note",
]
