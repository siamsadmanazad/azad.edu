from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.constants.status import ContentStatus
from app.schemas.article import ArticleFullRead
from app.schemas.media import MediaRead


class ContentCreate(BaseModel):
    title: str
    description: Optional[str] = None


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class ContentRead(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: ContentStatus
    teacher_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContentFullView(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: ContentStatus
    teacher_id: UUID
    created_at: datetime
    updated_at: datetime
    media: List[MediaRead] = []
    articles: List[ArticleFullRead] = []

    model_config = {"from_attributes": True}
