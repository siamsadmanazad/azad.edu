from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate


def login(email: str, password: str, db: Session) -> TokenResponse:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    token_data = {"sub": str(user.id), "role": user.role.name}
    return TokenResponse(access_token=create_access_token(token_data))


def register(user_data: UserCreate, db: Session) -> User:
    existing = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    role = db.query(Role).filter(Role.name == user_data.role.value).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{user_data.role.value}' not configured",
        )
    user = User(
        email=user_data.email.lower(),
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
