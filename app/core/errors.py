from typing import Any, List, Optional
from fastapi import HTTPException, status


class SutraException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[List[Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details or []


class AuthenticationError(SutraException):
    def __init__(self, message: str = "Authentication required or invalid token", code: str = "AUTHENTICATION_REQUIRED"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=code,
            message=message,
        )


class PermissionDeniedError(SutraException):
    def __init__(self, message: str = "Action not permitted for this role or active membership", code: str = "PERMISSION_DENIED"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code=code,
            message=message,
        )


class CampusAccessDeniedError(SutraException):
    def __init__(self, message: str = "Cross-campus access denied", code: str = "FORBIDDEN_CAMPUS_ACCESS"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code=code,
            message=message,
        )


class ResourceNotFoundError(SutraException):
    def __init__(self, message: str = "Requested resource not found", code: str = "RESOURCE_NOT_FOUND"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code=code,
            message=message,
        )


class StateConflictError(SutraException):
    def __init__(self, message: str = "Operation conflicts with current resource state", code: str = "STATE_CONFLICT"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code=code,
            message=message,
        )
