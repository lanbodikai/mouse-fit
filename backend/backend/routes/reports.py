from __future__ import annotations

from fastapi import APIRouter, Query, Request

from backend.controllers import report_controller
from backend.schemas.api import Report

router = APIRouter()


@router.post("/api/report/generate", response_model=Report)
def generate_report(request: Request, session_id: str = Query(...)) -> Report:
    return report_controller.generate_report(request, session_id)


@router.get("/api/report/latest", response_model=Report)
def latest_report(request: Request, session_id: str = Query(...)) -> Report:
    return report_controller.latest_report(request, session_id)


@router.post("/api/agent/chat")
def agent_chat():
    return report_controller.agent_chat()
