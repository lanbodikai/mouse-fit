from __future__ import annotations

from typing import List, Optional

from backend.db.mappers import row_to_mouse
from backend.db.pool import get_conn
from backend.schemas.api import Mouse


def list_mice() -> List[Mouse]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice ORDER BY brand, model")
            rows = cur.fetchall()
    return [row_to_mouse(row) for row in rows]


def get_mouse(mouse_id: str) -> Optional[Mouse]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice WHERE id = %s", (mouse_id,))
            row = cur.fetchone()
    if not row:
        return None
    return row_to_mouse(row)


def list_scoreable_mice() -> List[Mouse]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice")
            rows = cur.fetchall()
    return [row_to_mouse(row) for row in rows]
