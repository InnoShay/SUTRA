import uuid
from typing import List, Optional
from pydantic import BaseModel


class InterventionItem(BaseModel):
    id: Optional[uuid.UUID] = None
    intervention_key: str
    display_label: str
    domain: str
    recipient_role: str
    required_purpose_key: str
    requires_human_approval: bool = True
    description: Optional[str] = None
