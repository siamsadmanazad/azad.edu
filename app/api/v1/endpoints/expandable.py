from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_teacher
from app.db.session import get_db
from app.models.user import User
from app.schemas.expandable import (
    ExpandableCreate,
    ExpandableRead,
    ExpandableReorderItem,
    ExpandableUpdate,
)
from app.services import expandable_service

router = APIRouter()


@router.post("", response_model=ExpandableRead, status_code=201)
def create_section(
    data: ExpandableCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return expandable_service.create(data, current_user.id, db)


@router.get("/by-article/{article_id}", response_model=List[ExpandableRead])
def list_sections(
    article_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    visible_only = current_user.role.name == "student"
    return expandable_service.get_by_article(article_id, db, visible_only=visible_only)


@router.patch("/{section_id}", response_model=ExpandableRead)
def update_section(
    section_id: UUID,
    data: ExpandableUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return expandable_service.update(section_id, data, current_user.id, db)


@router.delete("/{section_id}", status_code=204)
def delete_section(
    section_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    expandable_service.delete(section_id, current_user.id, db)


@router.post("/reorder/{article_id}", response_model=List[ExpandableRead])
def reorder_sections(
    article_id: UUID,
    order_list: List[ExpandableReorderItem],
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return expandable_service.reorder(article_id, order_list, current_user.id, db)


@router.post("/{section_id}/toggle-visibility", response_model=ExpandableRead)
def toggle_visibility(
    section_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return expandable_service.toggle_visibility(section_id, current_user.id, db)
