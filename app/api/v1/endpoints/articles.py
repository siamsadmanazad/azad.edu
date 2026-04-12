from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleRead, ArticleUpdate
from app.services import article_service

router = APIRouter()


@router.post("", response_model=ArticleRead, status_code=201)
def create_article(
    data: ArticleCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return article_service.create(data, current_user.id, db)


@router.get("/by-content/{content_id}", response_model=List[ArticleRead])
def list_articles(
    content_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    return article_service.get_by_content(content_id, db, skip=skip, limit=limit)


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(
    article_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return article_service.get_by_id(article_id, db)


@router.patch("/{article_id}", response_model=ArticleRead)
def update_article(
    article_id: UUID,
    data: ArticleUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return article_service.update(article_id, data, current_user.id, db)


@router.delete("/{article_id}", status_code=204)
def delete_article(
    article_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    article_service.delete(article_id, current_user.id, db)
