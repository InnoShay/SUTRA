"""
Synthetic Demo Authentication Mode & Production Security Boundary (Phase 4).

CRITICAL SECURITY ARCHITECTURE BOUNDARIES:
1. Synthetic Demo Auth is STRICTLY a development/testing affordance for local hackathon
   demonstrations.
2. It is strictly disabled in production (SUTRA_ENV=production or ENVIRONMENT=production).
3. It refuses to serve requests with non-localhost Host headers.
4. Client-supplied headers (e.g., X-Role, X-Campus, X-Actor) are NEVER trusted as proof
   of identity or authorization. Identities are resolved server-side from tokens.
5. In production mode, if no verified IdP (OIDC/JWKS) is configured, the system FAILS CLOSED.
"""

import os
from typing import Optional
from fastapi import Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict

from backend.app.orchestration.security import SecurityContext, SecurityRole


class DemoPersona(BaseModel):
    """Server-side verified synthetic persona definition."""
    model_config = ConfigDict(extra="forbid")

    actor_id: str
    display_name: str
    role: SecurityRole
    campus_id: str
    description: str


DEMO_PERSONAS: dict[str, DemoPersona] = {
    "ADV-MAIN-01": DemoPersona(
        actor_id="ADV-MAIN-01",
        display_name="Dr. Sarah Chen (Senior Academic Advisor)",
        role=SecurityRole.ACADEMIC_ADVISOR,
        campus_id="CAMPUS-MAIN",
        description="Authorized Academic Advisor for CAMPUS-MAIN students.",
    ),
    "COACH-MAIN-01": DemoPersona(
        actor_id="COACH-MAIN-01",
        display_name="Marcus Vance (Student Success Coach)",
        role=SecurityRole.STUDENT_SUCCESS_COACH,
        campus_id="CAMPUS-MAIN",
        description="Student Success Coach for CAMPUS-MAIN support tasks.",
    ),
    "TUTOR-MAIN-01": DemoPersona(
        actor_id="TUTOR-MAIN-01",
        display_name="Dr. Liam Patel (Module Tutor)",
        role=SecurityRole.MODULE_TUTOR,
        campus_id="CAMPUS-MAIN",
        description="Module Tutor for academic referrals on CAMPUS-MAIN.",
    ),
    "ADV-REMOTE-02": DemoPersona(
        actor_id="ADV-REMOTE-02",
        display_name="Elena Rostova (Remote Academic Advisor)",
        role=SecurityRole.ACADEMIC_ADVISOR,
        campus_id="CAMPUS-REMOTE",
        description="Advisor isolated to CAMPUS-REMOTE (cannot review CAMPUS-MAIN cases).",
    ),
    "ADMIN-01": DemoPersona(
        actor_id="ADMIN-01",
        display_name="System Auditor",
        role=SecurityRole.SYSTEM_ADMIN,
        campus_id="CAMPUS-SYSTEM",
        description="System Administrator with cross-campus audit oversight.",
    ),
}

DEFAULT_DEMO_ACTOR = "ADV-MAIN-01"


def is_production_env() -> bool:
    """Check if application is running in production mode."""
    env = os.getenv("SUTRA_ENV", os.getenv("ENVIRONMENT", "development")).lower()
    return env in ["production", "prod"]


def is_demo_auth_allowed() -> bool:
    """
    Determine if demo authentication mode is permitted.
    Demo auth is strictly prohibited in production environments.
    """
    if is_production_env():
        return False
    # In non-production, enabled by default for local development demo
    val = os.getenv("SUTRA_DEMO_AUTH_ENABLED", "true").lower()
    return val in ["true", "1", "yes"]


def validate_local_host(request: Request) -> None:
    """
    Refuse demo auth if the request host is an external or non-local address.
    """
    host = request.headers.get("host", "").split(":")[0].lower()
    allowed_hosts = {"localhost", "127.0.0.1", "testserver", "[::1]", "0.0.0.0"}
    if host and host not in allowed_hosts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Security error: Synthetic demo authentication cannot be accessed from host '{host}'. Localhost binding required.",
        )


def get_current_security_context(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> SecurityContext:
    """
    FastAPI dependency resolving server-side authenticated SecurityContext.
    
    In production:
      Fails closed if production IdP is unconfigured.
    In local development:
      Resolves token against server-side DEMO_PERSONAS directory.
      Rejects arbitrary untrusted headers.
    """
    if is_production_env():
        # Fail closed in production until production IdP (OIDC/JWKS) is integrated
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Production authentication provider is not configured. SUTRA fails closed in production mode.",
        )

    if not is_demo_auth_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Synthetic demo authentication mode is disabled in this environment.",
        )

    validate_local_host(request)

    # Resolve token
    actor_id: Optional[str] = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer ") :].strip()
        # Format expected: 'demo-token-<actor_id>' or just '<actor_id>'
        if token.startswith("demo-token-"):
            candidate_id = token[len("demo-token-") :]
            if candidate_id in DEMO_PERSONAS:
                actor_id = candidate_id
        elif token in DEMO_PERSONAS:
            actor_id = token

    # Fallback to default demo actor for effortless browser access if no header passed
    if not actor_id:
        actor_id = DEFAULT_DEMO_ACTOR

    persona = DEMO_PERSONAS.get(actor_id)
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or unknown demo actor identifier '{actor_id}'.",
        )

    return SecurityContext(
        actor_id=persona.actor_id,
        campus_id=persona.campus_id,
        role=persona.role,
        is_test_context=True,
    )
