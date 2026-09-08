from __future__ import annotations

from fastapi import APIRouter, Body, Query, Request

from backend.controllers import report_controller
from backend.schemas.api import Report, ReportGenerateIn

router = APIRouter()


@router.post("/api/report/generate", response_model=Report)
def generate_report(
    request: Request,
    payload: ReportGenerateIn | None = Body(default=None),
    session_id: str | None = Query(default=None),
) -> Report:
    """Accept the new profile payload while retaining the legacy query-string contract."""
    resolved_session_id = payload.session_id if payload else session_id
    if not resolved_session_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="session_id is required")
    return report_controller.generate_report(request, resolved_session_id, payload.preferences if payload else None)


@router.get("/api/report/latest", response_model=Report)
def latest_report(request: Request, session_id: str = Query(...)) -> Report:
    return report_controller.latest_report(request, session_id)


@router.post("/api/agent/chat")
def agent_chat():
    return report_controller.agent_chat()
