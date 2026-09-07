from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.db.pool import get_conn
from backend.metrics import METRICS
from backend.middleware.request_context import request_id


def get_health(request: Request) -> dict:
    return {"ok": True, "request_id": request_id(request)}


def get_ready(request: Request):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "code": "database_unavailable", "request_id": request_id(request)},
        )
    return {"ok": True, "request_id": request_id(request)}


def get_metrics(request: Request) -> dict:
    return {
        "ok": True,
        "request_id": request_id(request),
        "metrics": METRICS.snapshot(),
    }
