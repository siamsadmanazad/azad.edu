import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Popup(Base):
    __tablename__ = "popups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    highlight_id = Column(
        UUID(as_uuid=True), ForeignKey("highlights.id"), nullable=False, unique=True
    )
    text = Column(Text, nullable=False)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    highlight = relationship("Highlight", back_populates="popup")
    media = relationship("Media", back_populates="popups")
