from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.schemas.popup import PopupRead
from app.utils.validators import is_valid_anchor_key


class HighlightCreate(BaseModel):
    article_id: UUID
    anchor_key: str
    display_text: str

    @field_validator("anchor_key")
    @classmethod
    def validate_anchor_key(cls, v: str) -> str:
        if not is_valid_anchor_key(v):
            raise ValueError(
                "anchor_key must contain only lowercase letters, numbers, and hyphens "
                "(e.g. 'sondehe-1'). Max 255 characters."
            )
        return v


class HighlightRead(BaseModel):
    id: UUID
    article_id: UUID
    anchor_key: str
    display_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HighlightWithPopupRead(BaseModel):
    id: UUID
    article_id: UUID
    anchor_key: str
    display_text: str
    created_at: datetime
    popup: Optional[PopupRead] = None

    model_config = {"from_attributes": True}
