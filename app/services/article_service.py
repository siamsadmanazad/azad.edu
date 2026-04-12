from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.content import Content
from app.schemas.article import ArticleCreate, ArticleUpdate


def _assert_teacher_owns_content(content_id: UUID, teacher_id: UUID, db: Session) -> Content:
    content = db.query(Content).filter(
        Content.id == content_id,
        Content.deleted_at.is_(None),
    ).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    if content.teacher_id != teacher_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your content")
    return content


def create(article_data: ArticleCreate, teacher_id: UUID, db: Session) -> Article:
    _assert_teacher_owns_content(article_data.content_id, teacher_id, db)
    article = Article(
        title=article_data.title,
        body=article_data.body,
        content_id=article_data.content_id,
        order=article_data.order or 0,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def get_by_id(article_id: UUID, db: Session) -> Article:
    article = db.query(Article).filter(
        Article.id == article_id,
        Article.deleted_at.is_(None),
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return article


def update(article_id: UUID, article_data: ArticleUpdate, teacher_id: UUID, db: Session) -> Article:
    article = get_by_id(article_id, db)
    _assert_teacher_owns_content(article.content_id, teacher_id, db)
    if article_data.title is not None:
        article.title = article_data.title
    if article_data.body is not None:
        article.body = article_data.body
    if article_data.order is not None:
        article.order = article_data.order
    db.commit()
    db.refresh(article)
    return article


def delete(article_id: UUID, teacher_id: UUID, db: Session) -> None:
    article = get_by_id(article_id, db)
    _assert_teacher_owns_content(article.content_id, teacher_id, db)
    article.deleted_at = datetime.now(timezone.utc)
    db.commit()


def get_by_content(
    content_id: UUID,
    db: Session,
    skip: int = 0,
    limit: int = 20,
) -> List[Article]:
    return (
        db.query(Article)
        .filter(Article.content_id == content_id, Article.deleted_at.is_(None))
        .order_by(Article.order)
        .offset(skip)
        .limit(limit)
        .all()
    )
