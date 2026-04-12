from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserUpdate


def get_by_id(user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def get_by_email(email: str, db: Session) -> User | None:
    return db.query(User).filter(User.email == email.lower()).first()


def update_profile(user_id: UUID, user_update: UserUpdate, db: Session) -> User:
    user = get_by_id(user_id, db)
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    db.commit()
    db.refresh(user)
    return user
