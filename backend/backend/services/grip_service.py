from __future__ import annotations

from typing import Optional

from backend.repositories import grips_repository
from backend.schemas.api import GripOut
from backend.utils.common import iso_ts, utc_now


def save_grip(
    session_id: str,
    user_id: Optional[str],
    grip: str,
    confidence: float,
    idempotency_key: Optional[str] = None,
) -> GripOut:
    created_at = utc_now()
    grips_repository.insert_grip(session_id, user_id, grip, confidence, created_at, idempotency_key)
    return GripOut(
        session_id=session_id,
        grip=grip,
        confidence=confidence,
        user_id=user_id,
        created_at=created_at,
    )


def latest_grip(
    session_id: str,
    user_id: Optional[str],
    allow_guest_fallback: bool = True,
) -> Optional[GripOut]:
    row = grips_repository.latest_grip_row(session_id, user_id, allow_guest_fallback)
    if not row:
        return None
    return GripOut(
        session_id=row["session_id"],
        grip=row["grip"],
        confidence=float(row["confidence"]),
        user_id=row.get("user_id"),
        created_at=iso_ts(row["created_at"]),
    )
