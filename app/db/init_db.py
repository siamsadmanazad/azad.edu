import app.models  # noqa: F401 — registers all models with SQLAlchemy
from app.db.base import Base
from app.db.session import SessionLocal, engine


def seed_roles() -> None:
    from app.constants.roles import RoleEnum
    from app.models.role import Role

    db = SessionLocal()
    try:
        for role_name in [RoleEnum.TEACHER.value, RoleEnum.STUDENT.value]:
            if not db.query(Role).filter(Role.name == role_name).first():
                db.add(Role(name=role_name))
        db.commit()
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    seed_roles()
