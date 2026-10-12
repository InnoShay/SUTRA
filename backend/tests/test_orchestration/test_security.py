"""
Unit tests for SecurityContext and authorization boundaries in SUTRA Phase 1.

Tests campus boundary isolation, role permissions, and test-only isolation flags.
"""

import pytest
from pydantic import ValidationError

from backend.app.orchestration.security import (
    AuthorizationError,
    SecurityContext,
    SecurityRole,
)


def test_security_context_authorizes_same_campus(mock_security_context: SecurityContext):
    """Advisor is authorized to access student records belonging to their assigned home campus."""
    # mock_security_context has campus_id="CAMPUS-MAIN"
    mock_security_context.authorize_case_access(
        target_campus_id="CAMPUS-MAIN",
        student_record_id="SYNTH-TEST-001",
    )  # Should not raise any error


def test_security_context_denies_cross_campus_access(mock_security_context: SecurityContext):
    """Advisor is blocked from accessing records belonging to a different campus."""
    with pytest.raises(AuthorizationError) as exc_info:
        mock_security_context.authorize_case_access(
            target_campus_id="CAMPUS-SATELLITE-WEST",
            student_record_id="SYNTH-TEST-999",
        )

    assert "Access denied" in str(exc_info.value)
    assert "CAMPUS-MAIN" in str(exc_info.value)
    assert "CAMPUS-SATELLITE-WEST" in str(exc_info.value)


def test_system_admin_has_cross_campus_scope():
    """System administrator role has cross-campus scope for audit and compliance purposes."""
    admin_context = SecurityContext.create_test_context(
        actor_id="SYS-ADMIN-01",
        campus_id="CAMPUS-CENTRAL",
        role=SecurityRole.SYSTEM_ADMIN,
    )

    # Admin can access any campus record without raising AuthorizationError
    admin_context.authorize_case_access(
        target_campus_id="CAMPUS-REMOTE",
        student_record_id="STUDENT-ANY",
    )


def test_security_context_is_test_only_by_default():
    """SecurityContext explicitly marks itself as test/development-only."""
    ctx = SecurityContext.create_test_context()
    assert ctx.is_test_context is True


def test_security_context_forbids_arbitrary_client_fields():
    """SecurityContext rejects client attempts to inject unvetted headers or permissions."""
    with pytest.raises(ValidationError):
        SecurityContext(
            actor_id="UNTRUSTED-CLIENT",
            campus_id="CAMPUS-ANY",
            role=SecurityRole.ACADEMIC_ADVISOR,
            client_injected_superadmin=True,  # Extra forbidden field
        )
