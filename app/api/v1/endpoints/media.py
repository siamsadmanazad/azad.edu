from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.media import (
    MediaConfirm,
    MediaRead,
    PresignedURLRequest,
    PresignedURLResponse,
    YoutubeMediaCreate,
)
from app.services import content_service, media_service

router = APIRouter()


@router.post("/presigned-url", response_model=PresignedURLResponse)
def get_presigned_url(
    request: PresignedURLRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return media_service.generate_presigned_url(request, current_user.id, db)


@router.post("/confirm", response_model=MediaRead, status_code=201)
def confirm_upload(
    data: MediaConfirm,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return media_service.confirm_upload(data, current_user.id, db)


@router.post("/youtube", response_model=MediaRead, status_code=201)
def add_youtube(
    data: YoutubeMediaCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return media_service.add_youtube(data, current_user.id, db)


@router.post("/{media_id}/attach/{content_id}", status_code=200)
def attach_to_content(
    media_id: UUID,
    content_id: UUID,
    order: int = 0,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    content = content_service.get_by_id(content_id, db)
    if content.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your content",
        )
    media_service.attach_to_content(content_id, media_id, order, db)
    return {"message": "Media attached successfully"}


@router.delete("/{media_id}", status_code=204)
def delete_media(
    media_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    media_service.delete_media(media_id, current_user.id, db)
