from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PopupCreate(BaseModel):
    text: str
    media_id: Optional[UUID] = None


class PopupUpdate(BaseModel):
    text: Optional[str] = None
    media_id: Optional[UUID] = None


class PopupRead(BaseModel):
    id: UUID
    highlight_id: UUID
    text: str
    media_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
