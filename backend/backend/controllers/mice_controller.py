from __future__ import annotations

from fastapi import HTTPException, Request, Response

from backend.middleware.request_context import request_id, request_profile_seed, request_user_email, request_user_id
from backend.schemas.api import GripIn, GripOut, MeasurementIn, MeasurementOut, Mouse
from backend.services import grip_service, measurement_service, mice_service, profile_service


def list_mice(response: Response) -> list[Mouse]:
    response.headers["Cache-Control"] = "public, max-age=300"
    return mice_service.list_mice()


def get_mouse(mouse_id: str) -> Mouse:
    mouse = mice_service.get_mouse(mouse_id)
    if not mouse:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Mouse not found"})
    return mouse


def save_measurement(payload: MeasurementIn, request: Request, idempotency_key: str | None = None) -> MeasurementOut:
    user_id = request_user_id(request)
    if user_id:
        seed_display_name, seed_avatar_url = request_profile_seed(request)
        profile_service.ensure_profile(
            user_id,
            request_user_email(request),
            seed_display_name,
            seed_avatar_url,
        )
    result = measurement_service.save_measurement(
        payload.session_id, user_id, payload.length_mm, payload.width_mm, idempotency_key
    )
    result.request_id = request_id(request)
    return result


def save_grip(payload: GripIn, request: Request, idempotency_key: str | None = None) -> GripOut:
    user_id = request_user_id(request)
    if user_id:
        seed_display_name, seed_avatar_url = request_profile_seed(request)
        profile_service.ensure_profile(
            user_id,
            request_user_email(request),
            seed_display_name,
            seed_avatar_url,
        )
    result = grip_service.save_grip(
        payload.session_id, user_id, payload.grip, payload.confidence or 0.0, idempotency_key
    )
    result.request_id = request_id(request)
    return result
