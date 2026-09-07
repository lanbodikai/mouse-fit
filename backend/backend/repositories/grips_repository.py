from __future__ import annotations

from typing import Any, Dict, Optional

from backend.db.pool import get_conn


def insert_grip(
    session_id: str,
    user_id: Optional[str],
    grip: str,
    confidence: float,
    created_at: str,
    idempotency_key: Optional[str] = None,
) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO grips (session_id, user_id, idempotency_key, grip, confidence, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (session_id, user_id, idempotency_key, grip, confidence, created_at),
            )
        conn.commit()


def latest_grip_row(
    session_id: str,
    user_id: Optional[str],
    allow_guest_fallback: bool = True,
) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            row = None
            if user_id:
                cur.execute(
                    """
                    SELECT session_id, user_id, grip, confidence, created_at
                    FROM grips
                    WHERE session_id = %s AND user_id = %s
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (session_id, user_id),
                )
                row = cur.fetchone()
                if not allow_guest_fallback:
                    return row
            if row is None:
                cur.execute(
                    """
                    SELECT session_id, user_id, grip, confidence, created_at
                    FROM grips
                    WHERE session_id = %s AND user_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
    return row
