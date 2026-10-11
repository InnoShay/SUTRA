import uuid
from typing import List, Optional
from pydantic import BaseModel


class CampusMembershipItem(BaseModel):
    institution_id: uuid.UUID
    institution_name: Optional[str] = None
    roles: List[str]
    is_active: bool


class AuthMeResponse(BaseModel):
    user_id: uuid.UUID
    email: Optional[str] = None
    memberships: List[CampusMembershipItem]


class CampusResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    roles: List[str]
