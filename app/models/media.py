import uuid

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.constants.status import MediaType
from app.db.base import Base


class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_key = Column(String(500), unique=True, nullable=True)
    url = Column(String(1000), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    media_type = Column(SAEnum(MediaType), nullable=False)
    youtube_url = Column(String(1000), nullable=True)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    uploader = relationship("User", back_populates="media")
    content_media = relationship("ContentMedia", back_populates="media")
    popups = relationship("Popup", back_populates="media")
