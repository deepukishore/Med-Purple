import re
from pathlib import Path


PROFILE_AVATAR_DIR = Path(__file__).resolve().parents[1] / "media" / "profiles"


def profile_avatar_filename(user_id: str, avatar_url: str | None) -> str | None:
    if not isinstance(avatar_url, str):
        return None
    match = re.fullmatch(
        rf"/media/profiles/{re.escape(user_id)}-([0-9a-f]{{12}})\.(jpg|png|webp)",
        avatar_url,
    )
    if not match:
        return None
    return avatar_url.rsplit("/", 1)[-1]


def profile_avatar_url(user_id: str, avatar_url: str | None) -> str | None:
    return avatar_url if profile_avatar_filename(user_id, avatar_url) else None


def remove_profile_avatar_file(user_id: str, avatar_url: str | None) -> None:
    filename = profile_avatar_filename(user_id, avatar_url)
    if filename:
        (PROFILE_AVATAR_DIR / filename).unlink(missing_ok=True)
