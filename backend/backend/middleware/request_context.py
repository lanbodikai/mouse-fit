from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request

from backend import config
from backend.auth import AuthError, parse_bearer_token, verify_bearer_token
from backend.metrics import METRICS
from backend.utils.common import normalize_avatar_url, pick_first_text

LOGGER = logging.getLogger("mousefit.api")


def request_id(request: Request) -> str:
    value = getattr(request.state, "request_id", "")
    return value if isinstance(value, str) and value else ""


def error_payload(request: Request, code: str, message: str, detail: Any = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": request_id(request),
    }
    if detail is not None:
        payload["detail"] = detail
    return payload


async def request_context_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = correlation_id
    request.state.user_id = None
    request.state.auth_claims = None
    request.state.auth_error = None

    token = parse_bearer_token(request.headers.get("Authorization"))
    if token and config.ENABLE_AUTH:
        try:
            auth_context = verify_bearer_token(token)
            request.state.user_id = auth_context.user_id
            request.state.auth_claims = auth_context.claims
        except AuthError as exc:
            request.state.auth_error = exc
            LOGGER.warning(
                "auth_token_rejected method=%s path=%s code=%s request_id=%s",
                request.method,
                request.url.path,
                exc.code,
                correlation_id,
            )

    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = correlation_id
    METRICS.record(request.method, request.url.path, response.status_code, elapsed_ms)
    LOGGER.info(
        "request_completed method=%s path=%s status=%s elapsed_ms=%.2f request_id=%s user_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        correlation_id,
        request.state.user_id,
    )
    return response


def request_user_id(request: Request) -> Optional[str]:
    value = getattr(request.state, "user_id", None)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def request_user_email(request: Request) -> Optional[str]:
    claims = getattr(request.state, "auth_claims", None)
    if not isinstance(claims, dict):
        return None
    value = claims.get("email")
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def request_profile_seed(request: Request) -> tuple[Optional[str], Optional[str]]:
    claims = getattr(request.state, "auth_claims", None)
    if not isinstance(claims, dict):
        return None, None

    metadata_candidates: List[Dict[str, Any]] = []
    for key in ("user_metadata", "raw_user_meta_data"):
        maybe_metadata = claims.get(key)
        if isinstance(maybe_metadata, dict):
            metadata_candidates.append(maybe_metadata)

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    for metadata in metadata_candidates:
        first_name = pick_first_text([metadata.get("first_name"), metadata.get("given_name")], 40)
        last_name = pick_first_text([metadata.get("last_name"), metadata.get("family_name")], 40)
        if first_name or last_name:
            break

    combined_name = " ".join(part for part in [first_name, last_name] if part) or None
    display_name = pick_first_text(
        [
            *[metadata.get("full_name") for metadata in metadata_candidates],
            *[metadata.get("name") for metadata in metadata_candidates],
            *[metadata.get("display_name") for metadata in metadata_candidates],
            *[metadata.get("preferred_username") for metadata in metadata_candidates],
            *[metadata.get("username") for metadata in metadata_candidates],
            claims.get("name"),
            claims.get("preferred_username"),
            combined_name,
        ],
        80,
    )
    avatar_url = normalize_avatar_url(
        pick_first_text(
            [
                *[metadata.get("avatar_url") for metadata in metadata_candidates],
                *[metadata.get("picture") for metadata in metadata_candidates],
                *[metadata.get("avatar") for metadata in metadata_candidates],
                claims.get("avatar_url"),
                claims.get("picture"),
            ],
            2048,
        )
    )
    return display_name, avatar_url


def require_authenticated_user(request: Request) -> tuple[str, Optional[str]]:
    auth_error = getattr(request.state, "auth_error", None)
    if isinstance(auth_error, AuthError):
        raise HTTPException(
            status_code=auth_error.status_code,
            detail={"code": auth_error.code, "message": auth_error.message},
        )
    user_id = request_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail={"code": "auth_required", "message": "Authentication required."})
    return user_id, request_user_email(request)
