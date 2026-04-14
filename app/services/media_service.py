import uuid as uuid_lib
from uuid import UUID

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants.status import MediaType
from app.core.config import settings
from app.models.content import ContentMedia
from app.models.media import Media
from app.schemas.media import MediaConfirm, PresignedURLRequest, PresignedURLResponse, YoutubeMediaCreate
from app.utils.file_handler import sanitize_filename, validate_mime_type


def _get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.CLOUDFLARE_R2_ENDPOINT_URL,
        aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def generate_presigned_url(
    request: PresignedURLRequest,
    uploader_id: UUID,
    db: Session,
) -> PresignedURLResponse:
    if not settings.CLOUDFLARE_R2_ENDPOINT_URL or not settings.CLOUDFLARE_R2_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage (R2) is not configured on this server.",
        )
    if not validate_mime_type(request.mime_type, request.media_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mime type for {request.media_type.value}",
        )
    safe_name = sanitize_filename(request.filename)
    file_key = f"uploads/{uploader_id}/{uuid_lib.uuid4()}/{safe_name}"
    try:
        client = _get_r2_client()
        upload_url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.CLOUDFLARE_R2_BUCKET_NAME,
                "Key": file_key,
                "ContentType": request.mime_type,
            },
            ExpiresIn=900,
        )
    except ClientError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate upload URL",
        )
    return PresignedURLResponse(upload_url=upload_url, file_key=file_key)


def confirm_upload(data: MediaConfirm, uploader_id: UUID, db: Session) -> Media:
    media = Media(
        file_key=data.file_key,
        url=data.url,
        mime_type=data.mime_type,
        size_bytes=data.size_bytes,
        media_type=data.media_type,
        uploader_id=uploader_id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def add_youtube(data: YoutubeMediaCreate, uploader_id: UUID, db: Session) -> Media:
    media = Media(
        url=data.youtube_url,
        youtube_url=data.youtube_url,
        media_type=MediaType.YOUTUBE,
        uploader_id=uploader_id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def get_by_id(media_id: UUID, db: Session) -> Media:
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    return media


def attach_to_content(content_id: UUID, media_id: UUID, order: int, db: Session) -> ContentMedia:
    link = ContentMedia(content_id=content_id, media_id=media_id, order=order)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def delete_media(media_id: UUID, uploader_id: UUID, db: Session) -> None:
    media = get_by_id(media_id, db)
    if media.uploader_id != uploader_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your media")
    if media.file_key:
        try:
            client = _get_r2_client()
            client.delete_object(
                Bucket=settings.CLOUDFLARE_R2_BUCKET_NAME,
                Key=media.file_key,
            )
        except ClientError:
            pass  # File may already be gone — still clean up the DB record
    db.delete(media)
    db.commit()
