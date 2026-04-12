import re


def is_valid_youtube_url(url: str) -> bool:
    pattern = r"^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w\-]+"
    return bool(re.match(pattern, url))


def is_valid_anchor_key(key: str) -> bool:
    pattern = r"^[a-z0-9\-]+$"
    return bool(re.match(pattern, key)) and len(key) <= 255
