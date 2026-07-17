from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.middleware.request_context import error_payload, request_id

LOGGER = logging.getLogger("mousefit.api")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            code = str(detail.get("code") or f"http_{exc.status_code}")
            message = str(detail.get("message") or "Request failed.")
            payload = error_payload(request, code, message, detail.get("detail"))
        else:
            payload = error_payload(request, f"http_{exc.status_code}", str(detail or "Request failed."))
        return JSONResponse(status_code=exc.status_code, content=payload, headers={"X-Request-ID": request_id(request)})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        payload = error_payload(request, "validation_error", "Request validation failed.", exc.errors())
        return JSONResponse(status_code=422, content=payload, headers={"X-Request-ID": request_id(request)})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        LOGGER.exception("unhandled_exception request_id=%s", request_id(request))
        payload = error_payload(request, "internal_error", "Internal server error.")
        return JSONResponse(status_code=500, content=payload, headers={"X-Request-ID": request_id(request)})
