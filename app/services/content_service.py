from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants.status import ContentStatus
from app.models.content import Content, ContentMedia
from app.models.media import Media
from app.schemas.content import ContentCreate, ContentUpdate


def create(content_data: ContentCreate, teacher_id: UUID, db: Session) -> Content:
    content = Content(
        title=content_data.title,
        description=content_data.description,
        teacher_id=teacher_id,
        status=ContentStatus.DRAFT,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content


def get_by_id(content_id: UUID, db: Session) -> Content:
    content = db.query(Content).filter(
        Content.id == content_id,
        Content.deleted_at.is_(None),
    ).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return content


def _assert_owner(content: Content, teacher_id: UUID) -> None:
    if content.teacher_id != teacher_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your content")


def update(content_id: UUID, content_data: ContentUpdate, teacher_id: UUID, db: Session) -> Content:
    content = get_by_id(content_id, db)
    _assert_owner(content, teacher_id)
    if content_data.title is not None:
        content.title = content_data.title
    if content_data.description is not None:
        content.description = content_data.description
    db.commit()
    db.refresh(content)
    return content


def delete(content_id: UUID, teacher_id: UUID, db: Session) -> None:
    content = get_by_id(content_id, db)
    _assert_owner(content, teacher_id)
    content.deleted_at = datetime.now(timezone.utc)
    db.commit()


def publish(content_id: UUID, teacher_id: UUID, db: Session) -> Content:
    content = get_by_id(content_id, db)
    _assert_owner(content, teacher_id)
    content.status = ContentStatus.PUBLISHED
    db.commit()
    db.refresh(content)
    return content


def unpublish(content_id: UUID, teacher_id: UUID, db: Session) -> Content:
    content = get_by_id(content_id, db)
    _assert_owner(content, teacher_id)
    content.status = ContentStatus.DRAFT
    db.commit()
    db.refresh(content)
    return content


def get_all_for_teacher(
    teacher_id: UUID,
    db: Session,
    status_filter: ContentStatus | None = None,
    skip: int = 0,
    limit: int = 20,
) -> List[Content]:
    query = db.query(Content).filter(
        Content.teacher_id == teacher_id,
        Content.deleted_at.is_(None),
    )
    if status_filter is not None:
        query = query.filter(Content.status == status_filter)
    return query.order_by(Content.created_at.desc()).offset(skip).limit(limit).all()


def get_published(db: Session, skip: int = 0, limit: int = 20) -> List[Content]:
    return (
        db.query(Content)
        .filter(Content.status == ContentStatus.PUBLISHED, Content.deleted_at.is_(None))
        .order_by(Content.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_media(content_id: UUID, db: Session) -> List[Media]:
    get_by_id(content_id, db)  # validates content exists
    return (
        db.query(Media)
        .join(ContentMedia, ContentMedia.media_id == Media.id)
        .filter(ContentMedia.content_id == content_id)
        .order_by(ContentMedia.order)
        .all()
    )


def get_full_view(content_id: UUID, is_student: bool, db: Session) -> dict:
    from app.models.article import Article
    from app.models.highlight import Highlight
    from app.services.expandable_service import get_by_article as get_sections

    content = get_by_id(content_id, db)

    if is_student and content.status != ContentStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    media = get_media(content_id, db)

    articles = (
        db.query(Article)
        .filter(Article.content_id == content_id, Article.deleted_at.is_(None))
        .order_by(Article.order)
        .all()
    )

    articles_full = []
    for article in articles:
        highlights = (
            db.query(Highlight)
            .filter(Highlight.article_id == article.id)
            .all()
        )
        sections = get_sections(article.id, db, visible_only=is_student)
        articles_full.append({
            "id": article.id,
            "title": article.title,
            "body": article.body,
            "content_id": article.content_id,
            "order": article.order,
            "created_at": article.created_at,
            "updated_at": article.updated_at,
            "highlights": [
                {
                    "id": h.id,
                    "article_id": h.article_id,
                    "anchor_key": h.anchor_key,
                    "display_text": h.display_text,
                    "created_at": h.created_at,
                    "popup": h.popup,
                }
                for h in highlights
            ],
            "expandable_sections": sections,
        })

    return {
        "id": content.id,
        "title": content.title,
        "description": content.description,
        "status": content.status,
        "teacher_id": content.teacher_id,
        "created_at": content.created_at,
        "updated_at": content.updated_at,
        "media": media,
        "articles": articles_full,
    }
