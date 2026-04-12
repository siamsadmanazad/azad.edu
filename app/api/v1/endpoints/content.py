from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.constants.status import ContentStatus
from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.content import ContentCreate, ContentFullView, ContentRead, ContentUpdate
from app.schemas.media import MediaRead
from app.services import content_service

router = APIRouter()


@router.get("/{content_id}/view", response_model=ContentFullView)
def get_content_full_view(
    content_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_student = current_user.role.name == "student"
    return content_service.get_full_view(content_id, is_student, db)


@router.get("/{content_id}/media", response_model=List[MediaRead])
def get_content_media(
    content_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return content_service.get_media(content_id, db)


@router.post("", response_model=ContentRead, status_code=201)
def create_content(
    data: ContentCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return content_service.create(data, current_user.id, db)


@router.get("", response_model=List[ContentRead])
def list_content(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[ContentStatus] = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    if current_user.role.name == "teacher":
        return content_service.get_all_for_teacher(
            current_user.id, db, status_filter=status_filter, skip=skip, limit=limit
        )
    return content_service.get_published(db, skip=skip, limit=limit)


@router.get("/{content_id}", response_model=ContentRead)
def get_content(
    content_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = content_service.get_by_id(content_id, db)
    if current_user.role.name == "student" and content.status.value != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return content


@router.patch("/{content_id}", response_model=ContentRead)
def update_content(
    content_id: UUID,
    data: ContentUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return content_service.update(content_id, data, current_user.id, db)


@router.delete("/{content_id}", status_code=204)
def delete_content(
    content_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    content_service.delete(content_id, current_user.id, db)


@router.post("/{content_id}/publish", response_model=ContentRead)
def publish_content(
    content_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return content_service.publish(content_id, current_user.id, db)


@router.post("/{content_id}/unpublish", response_model=ContentRead)
def unpublish_content(
    content_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return content_service.unpublish(content_id, current_user.id, db)
