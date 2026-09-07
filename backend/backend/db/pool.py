from __future__ import annotations

import os
from typing import Optional

from psycopg.rows import dict_row

try:
    from psycopg_pool import ConnectionPool
except Exception:  # pragma: no cover - optional in limited test envs
    ConnectionPool = None  # type: ignore[assignment]

from backend import config

_POOL: Optional[ConnectionPool] = None


def require_database_url() -> str:
    conninfo = config.DATABASE_URL or os.getenv("DATABASE_URL", "").strip()
    if not conninfo:
        raise RuntimeError("DATABASE_URL is required.")
    return conninfo


def init_pool(database_url: Optional[str] = None) -> None:
    global _POOL
    if _POOL is not None:
        return
    if ConnectionPool is None:
        raise RuntimeError("psycopg_pool is required to initialize the database pool.")
    conninfo = (database_url or require_database_url()).strip()
    _POOL = ConnectionPool(
        conninfo=conninfo,
        min_size=config.DB_POOL_MIN_SIZE,
        max_size=config.DB_POOL_MAX_SIZE,
        kwargs={"row_factory": dict_row},
    )
    _POOL.wait()


def close_pool() -> None:
    global _POOL
    if _POOL is not None:
        _POOL.close()
        _POOL = None


def get_pool() -> ConnectionPool:
    if _POOL is None:
        raise RuntimeError("Database pool is not initialized.")
    return _POOL


def get_conn():
    return get_pool().connection()
