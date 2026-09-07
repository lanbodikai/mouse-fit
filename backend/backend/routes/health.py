from __future__ import annotations

from fastapi import APIRouter, Request

from backend.controllers import health_controller

router = APIRouter()


@router.get("/api/health")
def health(request: Request) -> dict:
    return health_controller.get_health(request)


@router.get("/api/ready")
def ready(request: Request):
    return health_controller.get_ready(request)


@router.get("/api/metrics")
def metrics(request: Request) -> dict:
    return health_controller.get_metrics(request)
