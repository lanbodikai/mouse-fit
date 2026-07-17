from __future__ import annotations

import json
from typing import Any, Dict, Optional

from backend.db.pool import get_conn
from backend.utils.common import normalize_avatar_url, normalize_theme


def upsert_profile(
    user_id: str,
    email: Optional[str],
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    theme: Optional[str] = None,
    metadata_updates: Optional[Dict[str, Any]] = None,
    update_display_name: bool = False,
) -> None:
    metadata_patch: Dict[str, Any] = dict(metadata_updates or {})
    normalized_theme = normalize_theme(theme)
    if normalized_theme:
        metadata_patch["theme"] = normalized_theme
    normalized_avatar = normalize_avatar_url(avatar_url)
    if normalized_avatar:
        metadata_patch["avatar_url"] = normalized_avatar
    metadata_json = json.dumps(metadata_patch) if metadata_patch else None
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO profiles (id, email, display_name, metadata, updated_at)
                VALUES (%s, %s, %s, %s::jsonb, NOW())
                ON CONFLICT (id) DO UPDATE
                SET email = COALESCE(EXCLUDED.email, profiles.email),
                    display_name = CASE
                        WHEN %s THEN EXCLUDED.display_name
                        ELSE COALESCE(profiles.display_name, EXCLUDED.display_name)
                    END,
                    metadata = CASE
                        WHEN EXCLUDED.metadata IS NULL THEN profiles.metadata
                        ELSE COALESCE(profiles.metadata, '{}'::jsonb) || EXCLUDED.metadata
                    END,
                    updated_at = NOW()
                """,
                (user_id, email, display_name, metadata_json, update_display_name),
            )
        conn.commit()


def read_profile_row(user_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, display_name, metadata, created_at, updated_at
                FROM profiles
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    return row
