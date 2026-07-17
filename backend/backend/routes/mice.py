from __future__ import annotations

from fastapi import APIRouter, Request, Response

from backend.controllers import mice_controller
from backend.schemas.api import GripIn, GripOut, MeasurementIn, MeasurementOut, Mouse

router = APIRouter()


@router.get("/api/mice", response_model=list[Mouse])
def list_mice(response: Response) -> list[Mouse]:
    return mice_controller.list_mice(response)


@router.get("/api/mice/{mouse_id}", response_model=Mouse)
def get_mouse(mouse_id: str) -> Mouse:
    return mice_controller.get_mouse(mouse_id)


@router.post("/api/measurements", response_model=MeasurementOut)
def save_measurement(payload: MeasurementIn, request: Request) -> MeasurementOut:
    return mice_controller.save_measurement(payload, request)


@router.post("/api/grip", response_model=GripOut)
def save_grip(payload: GripIn, request: Request) -> GripOut:
    return mice_controller.save_grip(payload, request)
