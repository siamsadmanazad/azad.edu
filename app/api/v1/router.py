from fastapi import APIRouter

from app.api.v1.endpoints import articles, auth, content, expandable, highlights, media, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(content.router, prefix="/content", tags=["Content"])
api_router.include_router(media.router, prefix="/media", tags=["Media"])
api_router.include_router(articles.router, prefix="/articles", tags=["Articles"])
api_router.include_router(highlights.router, prefix="/highlights", tags=["Highlights"])
api_router.include_router(expandable.router, prefix="/expandable", tags=["Expandable Sections"])
