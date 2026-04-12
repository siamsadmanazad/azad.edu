from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.constants.roles import RoleEnum


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None


class RoleRead(BaseModel):
    name: str

    model_config = {"from_attributes": True}


class UserRead(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: RoleRead
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
