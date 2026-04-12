import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User


def create_superuser() -> None:
    email = input("Email: ").strip().lower()
    full_name = input("Full name: ").strip()
    password = input("Password: ").strip()

    if len(password) < 8:
        print("Password must be at least 8 characters.")
        return

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"User with email '{email}' already exists.")
            return

        role = db.query(Role).filter(Role.name == "teacher").first()
        if not role:
            role = Role(name="teacher")
            db.add(role)
            db.flush()

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role_id=role.id,
        )
        db.add(user)
        db.commit()
        print(f"Teacher account created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    create_superuser()
