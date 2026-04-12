from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class ExpandableCreate(BaseModel):
    article_id: UUID
    title: str
    body: str
    order: Optional[int] = 0


class ExpandableUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    order: Optional[int] = None
    is_visible: Optional[bool] = None


class ExpandableReorderItem(BaseModel):
    id: UUID
    order: int


class ExpandableRead(BaseModel):
    id: UUID
    article_id: UUID
    title: str
    body: str
    order: int
    is_visible: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
