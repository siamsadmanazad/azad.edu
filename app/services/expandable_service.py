from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.expandable import ExpandableSection
from app.schemas.expandable import ExpandableCreate, ExpandableReorderItem, ExpandableUpdate
from app.services.article_service import get_by_id as get_article


def _assert_teacher_owns_article(article_id: UUID, teacher_id: UUID, db: Session):
    article = get_article(article_id, db)
    if article.content.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not your article"
        )
    return article


def create(data: ExpandableCreate, teacher_id: UUID, db: Session) -> ExpandableSection:
    _assert_teacher_owns_article(data.article_id, teacher_id, db)
    section = ExpandableSection(
        article_id=data.article_id,
        title=data.title,
        body=data.body,
        order=data.order or 0,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def get_by_id(section_id: UUID, db: Session) -> ExpandableSection:
    section = db.query(ExpandableSection).filter(
        ExpandableSection.id == section_id,
        ExpandableSection.deleted_at.is_(None),
    ).first()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    return section


def update(
    section_id: UUID, data: ExpandableUpdate, teacher_id: UUID, db: Session
) -> ExpandableSection:
    section = get_by_id(section_id, db)
    _assert_teacher_owns_article(section.article_id, teacher_id, db)
    if data.title is not None:
        section.title = data.title
    if data.body is not None:
        section.body = data.body
    if data.order is not None:
        section.order = data.order
    if data.is_visible is not None:
        section.is_visible = data.is_visible
    db.commit()
    db.refresh(section)
    return section


def delete(section_id: UUID, teacher_id: UUID, db: Session) -> None:
    section = get_by_id(section_id, db)
    _assert_teacher_owns_article(section.article_id, teacher_id, db)
    section.deleted_at = datetime.now(timezone.utc)
    db.commit()


def get_by_article(
    article_id: UUID, db: Session, visible_only: bool = False
) -> List[ExpandableSection]:
    query = db.query(ExpandableSection).filter(
        ExpandableSection.article_id == article_id,
        ExpandableSection.deleted_at.is_(None),
    )
    if visible_only:
        query = query.filter(ExpandableSection.is_visible == True)  # noqa: E712
    return query.order_by(ExpandableSection.order).all()


def reorder(
    article_id: UUID,
    order_list: List[ExpandableReorderItem],
    teacher_id: UUID,
    db: Session,
) -> List[ExpandableSection]:
    _assert_teacher_owns_article(article_id, teacher_id, db)
    for item in order_list:
        db.query(ExpandableSection).filter(
            ExpandableSection.id == item.id,
            ExpandableSection.article_id == article_id,
        ).update({"order": item.order})
    db.commit()
    return get_by_article(article_id, db, visible_only=False)


def toggle_visibility(section_id: UUID, teacher_id: UUID, db: Session) -> ExpandableSection:
    section = get_by_id(section_id, db)
    _assert_teacher_owns_article(section.article_id, teacher_id, db)
    section.is_visible = not section.is_visible
    db.commit()
    db.refresh(section)
    return section
