from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.constants.status import MediaType


class PresignedURLRequest(BaseModel):
    filename: str
    mime_type: str
    media_type: MediaType


class PresignedURLResponse(BaseModel):
    upload_url: str
    file_key: str


class MediaConfirm(BaseModel):
    file_key: str
    url: str
    mime_type: str
    size_bytes: int
    media_type: MediaType


class YoutubeMediaCreate(BaseModel):
    youtube_url: str


class MediaRead(BaseModel):
    id: UUID
    file_key: Optional[str]
    url: str
    mime_type: Optional[str]
    size_bytes: Optional[int]
    media_type: MediaType
    youtube_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
