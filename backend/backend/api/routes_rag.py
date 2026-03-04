from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request

from backend import config
from backend.rate_limit import RATE_LIMITER, RateLimitSpec

router = APIRouter()
_SESSION = requests.Session()
CHAT_LIMIT = RateLimitSpec(max_requests=20, window_seconds=60)


def _client_key(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if isinstance(user_id, str) and user_id:
        return f"user:{user_id}"
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    ip = forwarded or (request.client.host if request.client else "unknown")
    return f"ip:{ip}"


def _enforce_limit(request: Request, spec: RateLimitSpec, scope: str) -> None:
    key = f"{scope}:{_client_key(request)}"
    if RATE_LIMITER.allow(key, spec):
        return
    raise HTTPException(
        status_code=429,
        detail={
            "code": "rate_limited",
            "message": f"Rate limit exceeded for {scope}.",
        },
    )


def _limit_chat(request: Request) -> None:
    _enforce_limit(request, CHAT_LIMIT, "chat")


def _deprecated_endpoint(path: str) -> None:
    raise HTTPException(
        status_code=410,
        detail={
            "code": "endpoint_deprecated",
            "message": f"{path} has been deprecated; use survey matcher + /api/chat rerank.",
        },
    )


def _call_groq(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    if not config.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY on server")

    payload: Dict[str, Any] = {
        "model": model or config.GROQ_DEFAULT_MODEL,
        "temperature": temperature,
        "messages": messages,
    }
    if response_format:
        payload["response_format"] = response_format

    resp = _SESSION.post(
        config.GROQ_URL,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {config.GROQ_API_KEY}"},
        json=payload,
        timeout=60,
    )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


@router.post("/api/rag/query")
def rag_query_deprecated() -> Dict[str, Any]:
    _deprecated_endpoint("/api/rag/query")
    return {}


@router.post("/api/candidates")
def rag_candidates_deprecated() -> Dict[str, Any]:
    _deprecated_endpoint("/api/candidates")
    return {}


@router.post("/api/rerank")
def rag_rerank_deprecated() -> Dict[str, Any]:
    _deprecated_endpoint("/api/rerank")
    return {}


@router.post("/api/report")
def rag_report_deprecated() -> Dict[str, Any]:
    _deprecated_endpoint("/api/report")
    return {}


@router.post("/api/chat")
def rag_chat(payload: Dict[str, Any], request: Request, _: None = Depends(_limit_chat)) -> Dict[str, Any]:
    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        raise HTTPException(status_code=400, detail={"code": "invalid_request", "message": "messages[] is required"})

    reply = _call_groq(
        messages,
        model=payload.get("model"),
        temperature=float(payload.get("temperature", 0.6)),
    )
    return {
        "reply": reply,
        "request_id": getattr(request.state, "request_id", ""),
    }
