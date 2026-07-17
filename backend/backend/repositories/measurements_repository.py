from __future__ import annotations

from typing import Any, Dict, Optional

from backend.db.pool import get_conn


def insert_measurement(
    session_id: str,
    user_id: Optional[str],
    length_mm: float,
    width_mm: float,
    length_cm: float,
    width_cm: float,
    created_at: str,
) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO measurements (session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at),
            )
        conn.commit()


def latest_measurement_row(session_id: str, user_id: Optional[str]) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            row = None
            if user_id:
                cur.execute(
                    """
                    SELECT session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at
                    FROM measurements
                    WHERE session_id = %s AND user_id = %s
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (session_id, user_id),
                )
                row = cur.fetchone()
            if row is None:
                cur.execute(
                    """
                    SELECT session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at
                    FROM measurements
                    WHERE session_id = %s AND user_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
    return row
