from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.highlight import HighlightCreate, HighlightRead
from app.schemas.popup import PopupCreate, PopupRead, PopupUpdate
from app.services import highlight_service

router = APIRouter()


@router.post("", response_model=HighlightRead, status_code=201)
def create_highlight(
    data: HighlightCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return highlight_service.create(data, current_user.id, db)


@router.get("/by-article/{article_id}", response_model=List[HighlightRead])
def list_highlights(
    article_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return highlight_service.get_by_article(article_id, db)


@router.delete("/{highlight_id}", status_code=204)
def delete_highlight(
    highlight_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    highlight_service.delete(highlight_id, current_user.id, db)


@router.get("/{highlight_id}/popup", response_model=PopupRead)
def get_popup(
    highlight_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return highlight_service.get_popup(highlight_id, db)


@router.post("/{highlight_id}/popup", response_model=PopupRead, status_code=201)
def create_popup(
    highlight_id: UUID,
    data: PopupCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return highlight_service.create_popup(highlight_id, data, current_user.id, db)


@router.patch("/{highlight_id}/popup", response_model=PopupRead)
def update_popup(
    highlight_id: UUID,
    data: PopupUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return highlight_service.update_popup(highlight_id, data, current_user.id, db)
