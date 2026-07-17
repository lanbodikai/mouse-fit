from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from backend.repositories import profiles_repository
from backend.schemas.api import MeOut, ProfileOut
from backend.utils.common import as_dict, as_optional_bool, iso_ts, normalize_avatar_url, normalize_optional_timestamp, normalize_theme, pick_first_text


def row_to_profile(row: Dict[str, Any], correlation_id: str) -> ProfileOut:
    metadata = as_dict(row.get("metadata")) or {}
    theme = normalize_theme(metadata.get("theme"))
    avatar_url = normalize_avatar_url(pick_first_text([metadata.get("avatar_url"), metadata.get("picture")], 2048))
    return ProfileOut(
        id=str(row.get("id") or ""),
        email=row.get("email"),
        display_name=row.get("display_name"),
        avatar_url=avatar_url,
        theme=theme if theme in {"light", "dark"} else None,
        created_at=iso_ts(row.get("created_at")),
        updated_at=iso_ts(row.get("updated_at")),
        request_id=correlation_id,
    )


def row_to_me(row: Dict[str, Any], correlation_id: str) -> MeOut:
    profile = row_to_profile(row, correlation_id)
    metadata = as_dict(row.get("metadata")) or {}
    return MeOut(
        id=profile.id,
        email=profile.email,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
        theme=profile.theme,
        hasCompletedSurvey=as_optional_bool(metadata.get("has_completed_survey")) is True,
        surveyDismissedUntil=normalize_optional_timestamp(metadata.get("survey_dismissed_until")),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        request_id=profile.request_id,
    )


def ensure_profile(
    user_id: str,
    user_email: Optional[str],
    display_name: Optional[str],
    avatar_url: Optional[str],
    theme: Optional[str] = None,
    metadata_updates: Optional[Dict[str, Any]] = None,
    update_display_name: bool = False,
) -> Dict[str, Any]:
    profiles_repository.upsert_profile(
        user_id=user_id,
        email=user_email,
        display_name=display_name,
        avatar_url=avatar_url,
        theme=theme,
        metadata_updates=metadata_updates,
        update_display_name=update_display_name,
    )
    row = profiles_repository.read_profile_row(user_id)
    if not row:
        raise LookupError("Profile could not be read.")
    return row


def dismiss_until_timestamp() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
