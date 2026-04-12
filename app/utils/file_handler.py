import re

from app.constants.status import MediaType

ALLOWED_MIME_TYPES: dict[MediaType, set[str]] = {
    MediaType.IMAGE: {"image/jpeg", "image/png", "image/gif", "image/webp"},
    MediaType.AUDIO: {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"},
    MediaType.VIDEO: {"video/mp4", "video/webm", "video/ogg", "video/quicktime"},
    MediaType.YOUTUBE: set(),
}


def validate_mime_type(mime_type: str, media_type: MediaType) -> bool:
    if media_type == MediaType.YOUTUBE:
        return True
    return mime_type in ALLOWED_MIME_TYPES.get(media_type, set())


def sanitize_filename(filename: str) -> str:
    filename = re.sub(r"[^\w\s\-.]", "", filename)
    filename = re.sub(r"\s+", "_", filename.strip())
    return filename[:255] or "file"
