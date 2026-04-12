from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.highlight import Highlight
from app.models.popup import Popup
from app.schemas.highlight import HighlightCreate
from app.schemas.popup import PopupCreate, PopupUpdate
from app.services.article_service import get_by_id as get_article


def _assert_teacher_owns_article(article_id: UUID, teacher_id: UUID, db: Session):
    article = get_article(article_id, db)
    if article.content.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not your article"
        )
    return article


def create(highlight_data: HighlightCreate, teacher_id: UUID, db: Session) -> Highlight:
    _assert_teacher_owns_article(highlight_data.article_id, teacher_id, db)
    existing = db.query(Highlight).filter(
        Highlight.article_id == highlight_data.article_id,
        Highlight.anchor_key == highlight_data.anchor_key,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Anchor key '{highlight_data.anchor_key}' already exists in this article",
        )
    highlight = Highlight(
        article_id=highlight_data.article_id,
        anchor_key=highlight_data.anchor_key,
        display_text=highlight_data.display_text,
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return highlight


def get_by_id(highlight_id: UUID, db: Session) -> Highlight:
    highlight = db.query(Highlight).filter(Highlight.id == highlight_id).first()
    if not highlight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Highlight not found")
    return highlight


def get_by_article(article_id: UUID, db: Session) -> List[Highlight]:
    return db.query(Highlight).filter(Highlight.article_id == article_id).all()


def delete(highlight_id: UUID, teacher_id: UUID, db: Session) -> None:
    highlight = get_by_id(highlight_id, db)
    _assert_teacher_owns_article(highlight.article_id, teacher_id, db)
    db.delete(highlight)
    db.commit()


def create_popup(
    highlight_id: UUID, popup_data: PopupCreate, teacher_id: UUID, db: Session
) -> Popup:
    highlight = get_by_id(highlight_id, db)
    _assert_teacher_owns_article(highlight.article_id, teacher_id, db)
    if highlight.popup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Popup already exists. Use PATCH to update it.",
        )
    popup = Popup(
        highlight_id=highlight_id,
        text=popup_data.text,
        media_id=popup_data.media_id,
    )
    db.add(popup)
    db.commit()
    db.refresh(popup)
    return popup


def update_popup(
    highlight_id: UUID, popup_data: PopupUpdate, teacher_id: UUID, db: Session
) -> Popup:
    highlight = get_by_id(highlight_id, db)
    _assert_teacher_owns_article(highlight.article_id, teacher_id, db)
    if not highlight.popup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No popup found for this highlight"
        )
    popup = highlight.popup
    if popup_data.text is not None:
        popup.text = popup_data.text
    if popup_data.media_id is not None:
        popup.media_id = popup_data.media_id
    db.commit()
    db.refresh(popup)
    return popup


def get_popup(highlight_id: UUID, db: Session) -> Popup:
    highlight = get_by_id(highlight_id, db)
    if not highlight.popup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No popup for this highlight"
        )
    return highlight.popup
