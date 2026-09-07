from __future__ import annotations

import threading
import time
from typing import List, Optional

from backend import config
from backend.db.mappers import row_to_mouse
from backend.db.pool import get_conn
from backend.schemas.api import Mouse


_CACHE_LOCK = threading.Lock()
_CACHE_EXPIRES_AT = 0.0
_CACHE: List[Mouse] | None = None


def _catalog_cache() -> List[Mouse]:
    global _CACHE, _CACHE_EXPIRES_AT
    now = time.monotonic()
    if _CACHE is not None and now < _CACHE_EXPIRES_AT:
        return _CACHE
    with _CACHE_LOCK:
        now = time.monotonic()
        if _CACHE is not None and now < _CACHE_EXPIRES_AT:
            return _CACHE
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM mice ORDER BY brand, model")
                rows = cur.fetchall()
        _CACHE = [row_to_mouse(row) for row in rows]
        _CACHE_EXPIRES_AT = time.monotonic() + config.CATALOG_CACHE_TTL_SECONDS
        return _CACHE


def list_mice() -> List[Mouse]:
    return list(_catalog_cache())


def get_mouse(mouse_id: str) -> Optional[Mouse]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice WHERE id = %s", (mouse_id,))
            row = cur.fetchone()
    if not row:
        return None
    return row_to_mouse(row)


def list_scoreable_mice() -> List[Mouse]:
    return list(_catalog_cache())
