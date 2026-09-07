from __future__ import annotations

from typing import Optional

from backend.repositories import measurements_repository
from backend.schemas.api import MeasurementOut
from backend.utils.common import iso_ts, utc_now


def save_measurement(
    session_id: str,
    user_id: Optional[str],
    length_mm: float,
    width_mm: float,
    idempotency_key: Optional[str] = None,
) -> MeasurementOut:
    created_at = utc_now()
    length_cm = round(length_mm / 10, 2)
    width_cm = round(width_mm / 10, 2)
    measurements_repository.insert_measurement(
        session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at, idempotency_key
    )
    return MeasurementOut(
        session_id=session_id,
        length_mm=length_mm,
        width_mm=width_mm,
        length_cm=length_cm,
        width_cm=width_cm,
        user_id=user_id,
        created_at=created_at,
    )


def latest_measurement(
    session_id: str,
    user_id: Optional[str],
    allow_guest_fallback: bool = True,
) -> Optional[MeasurementOut]:
    row = measurements_repository.latest_measurement_row(session_id, user_id, allow_guest_fallback)
    if not row:
        return None
    return MeasurementOut(
        session_id=row["session_id"],
        length_mm=float(row["length_mm"]),
        width_mm=float(row["width_mm"]),
        length_cm=float(row["length_cm"]),
        width_cm=float(row["width_cm"]),
        user_id=row.get("user_id"),
        created_at=iso_ts(row["created_at"]),
    )
