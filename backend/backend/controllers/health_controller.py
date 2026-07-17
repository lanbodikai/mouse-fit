from __future__ import annotations

from fastapi import Request

from backend.metrics import METRICS
from backend.middleware.request_context import request_id


def get_health(request: Request) -> dict:
    return {"ok": True, "request_id": request_id(request)}


def get_metrics(request: Request) -> dict:
    return {
        "ok": True,
        "request_id": request_id(request),
        "metrics": METRICS.snapshot(),
    }
