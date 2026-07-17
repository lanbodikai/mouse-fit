from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend import config
from backend.middleware.error_handlers import register_error_handlers
from backend.middleware.request_context import request_context_middleware
from backend.routes import health, mice, profiles, rag, reports
from backend.services.bootstrap_service import on_shutdown, on_startup

try:
    import sentry_sdk
except Exception:  # pragma: no cover - optional dependency
    sentry_sdk = None


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

if sentry_sdk is not None and config.SENTRY_DSN:
    sentry_sdk.init(dsn=config.SENTRY_DSN, traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")))


DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "https://mousefit.pro",
    "https://www.mousefit.pro",
    "https://lanbodikai.github.io",
]


def parse_cors_origins(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title="MouseFit v2 API")
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    default_origin_regex = (
        r"^(http://(localhost|127\.0\.0\.1):\d+|"
        r"https://((mouse-fit|mousefit)(?:-[a-z0-9-]+)?\.vercel\.app|([a-z0-9-]+\.)?mousefit\.pro))$"
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[*DEFAULT_CORS_ORIGINS, *parse_cors_origins(os.getenv("CORS_ALLOW_ORIGINS"))],
        allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX", default_origin_regex) or None,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )
    app.middleware("http")(request_context_middleware)
    register_error_handlers(app)
    app.include_router(rag.router)
    app.include_router(health.router)
    app.include_router(profiles.router)
    app.include_router(mice.router)
    app.include_router(reports.router)
    app.add_event_handler("startup", on_startup)
    app.add_event_handler("shutdown", on_shutdown)
    return app


app = create_app()
