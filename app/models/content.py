import uuid

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.constants.status import ContentStatus
from app.db.base import Base


class Content(Base):
    __tablename__ = "content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum(ContentStatus, values_callable=lambda x: [e.value for e in x]),
        default=ContentStatus.DRAFT,
        nullable=False,
        index=True,
    )
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    teacher = relationship("User", back_populates="content")
    articles = relationship("Article", back_populates="content", cascade="all, delete-orphan")
    content_media = relationship(
        "ContentMedia", back_populates="content", cascade="all, delete-orphan"
    )


class ContentMedia(Base):
    __tablename__ = "content_media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id = Column(UUID(as_uuid=True), ForeignKey("content.id"), nullable=False, index=True)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media.id"), nullable=False, index=True)
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    content = relationship("Content", back_populates="content_media")
    media = relationship("Media", back_populates="content_media")
