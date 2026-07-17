from __future__ import annotations

from fastapi import HTTPException, Query, Request
from fastapi.responses import JSONResponse

from backend.middleware.request_context import request_id, request_profile_seed, request_user_email, request_user_id
from backend.services import grip_service, measurement_service, mice_service, profile_service, report_service


def generate_report(request: Request, session_id: str = Query(...)):
    user_id = request_user_id(request)
    if user_id:
        seed_display_name, seed_avatar_url = request_profile_seed(request)
        profile_service.ensure_profile(
            user_id,
            request_user_email(request),
            seed_display_name,
            seed_avatar_url,
        )

    measurement = measurement_service.latest_measurement(session_id, user_id)
    if not measurement:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "No measurement found for session_id"})

    grip = grip_service.latest_grip(session_id, user_id)
    correlation_id = request_id(request)
    measurement.request_id = correlation_id
    if grip is not None:
        grip.request_id = correlation_id

    report = report_service.build_report(
        session_id=session_id,
        user_id=user_id,
        measurement=measurement,
        grip=grip,
        mice=mice_service.list_scoreable_mice(),
        correlation_id=correlation_id,
    )
    report_service.save_report(report)
    return report


def latest_report(request: Request, session_id: str = Query(...)):
    try:
        report = report_service.read_latest_report(session_id, request_user_id(request), request_id(request))
    except ValueError as exc:
        raise HTTPException(status_code=500, detail={"code": "invalid_report", "message": str(exc)}) from exc
    if report is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "No report found for session_id"})
    return report


def agent_chat() -> JSONResponse:
    return JSONResponse(
        status_code=410,
        content={
            "code": "endpoint_deprecated",
            "message": "Use /api/chat instead of /api/agent/chat.",
        },
    )
