from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.expandable import ExpandableRead
from app.schemas.highlight import HighlightWithPopupRead


class ArticleCreate(BaseModel):
    title: str
    body: str
    content_id: UUID
    order: Optional[int] = 0


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    order: Optional[int] = None


class ArticleRead(BaseModel):
    id: UUID
    title: str
    body: str
    content_id: UUID
    order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleFullRead(BaseModel):
    id: UUID
    title: str
    body: str
    content_id: UUID
    order: int
    created_at: datetime
    updated_at: datetime
    highlights: List[HighlightWithPopupRead] = []
    expandable_sections: List[ExpandableRead] = []

    model_config = {"from_attributes": True}
