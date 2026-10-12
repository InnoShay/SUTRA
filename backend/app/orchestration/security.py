"""
Security Context and Authorization Boundary for SUTRA Phase 1.

CRITICAL ARCHITECTURAL BOUNDARY:
This module provides a server-side SecurityContext strictly for dependency injection,
unit test isolation, and explicit multi-tenant permission checking.
It is explicitly NOT a production authentication system (JWT/OAuth/SSO must be
implemented in Phase 4 prior to deploying student-facing workflows).
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SecurityRole(str, Enum):
    """Permitted roles within the institutional support structure."""
    ACADEMIC_ADVISOR = "ACADEMIC_ADVISOR"
    MODULE_TUTOR = "MODULE_TUTOR"
    PEER_MENTOR = "PEER_MENTOR"
    STUDENT_SUCCESS_COACH = "STUDENT_SUCCESS_COACH"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"


class AuthorizationError(Exception):
    """Raised when an action violates campus boundary or permission policy."""
    pass


class SecurityContext(BaseModel):
    """
    Server-side authorization context representing the active caller.

    Client-supplied headers (e.g. X-Campus-ID, X-User-Role) are NEVER trusted
    as proof of authorization. The SecurityContext is constructed by server-side
    middleware from cryptographically verified tokens.
    """
    model_config = ConfigDict(extra="forbid")

    actor_id: str = Field(..., description="Unique user identifier, e.g. 'ADVISOR-042'")
    campus_id: str = Field(..., description="Authorized home campus identifier, e.g. 'CAMPUS-NORTH'")
    role: SecurityRole = Field(..., description="Assigned institutional role")
    is_test_context: bool = Field(
        default=True,
        description="Explicit test/development flag. Must be False only with real IdP verification."
    )

    def authorize_case_access(self, target_campus_id: str, student_record_id: str) -> None:
        """
        Authorize case review access for a specific student record.

        Enforces strict campus isolation boundary: an advisor from CAMPUS-NORTH
        cannot access or trigger orchestration for a student at CAMPUS-SOUTH.
        """
        if self.role == SecurityRole.SYSTEM_ADMIN:
            return  # System administrator has cross-campus auditing scope

        if self.campus_id != target_campus_id:
            raise AuthorizationError(
                f"Access denied: Actor '{self.actor_id}' from campus '{self.campus_id}' "
                f"cannot access student '{student_record_id}' at campus '{target_campus_id}'."
            )

    @classmethod
    def create_test_context(
        cls,
        actor_id: str = "TEST-ADVISOR-01",
        campus_id: str = "CAMPUS-DEFAULT",
        role: SecurityRole = SecurityRole.ACADEMIC_ADVISOR,
    ) -> "SecurityContext":
        """Factory for deterministic unit testing."""
        return cls(
            actor_id=actor_id,
            campus_id=campus_id,
            role=role,
            is_test_context=True,
        )
