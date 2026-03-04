from __future__ import annotations

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from psycopg.rows import dict_row
try:
    from psycopg_pool import ConnectionPool
except Exception:  # pragma: no cover - optional in limited test envs
    ConnectionPool = None  # type: ignore[assignment]

from backend import config
from backend.auth import AuthError, parse_bearer_token, verify_bearer_token
from backend.api.routes_rag import router as rag_router
from backend.metrics import METRICS

try:
    import sentry_sdk
except Exception:  # pragma: no cover - optional dependency
    sentry_sdk = None

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
_POOL: Optional[ConnectionPool] = None
LOGGER = logging.getLogger("mousefit.api")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    out = []
    prev_dash = False
    for ch in value.lower().strip():
        if ch.isalnum():
            out.append(ch)
            prev_dash = False
        else:
            if not prev_dash:
                out.append("-")
                prev_dash = True
    slug = "".join(out).strip("-")
    return slug or "item"


def _require_database_url() -> str:
    conninfo = DATABASE_URL or os.getenv("DATABASE_URL", "").strip()
    if not conninfo:
        raise RuntimeError("DATABASE_URL is required.")
    return conninfo


def init_pool(database_url: Optional[str] = None) -> None:
    global _POOL
    if _POOL is not None:
        return
    if ConnectionPool is None:
        raise RuntimeError("psycopg_pool is required to initialize the database pool.")
    conninfo = (database_url or _require_database_url()).strip()
    _POOL = ConnectionPool(
        conninfo=conninfo,
        min_size=1,
        max_size=10,
        kwargs={"row_factory": dict_row},
    )
    _POOL.wait()


def close_pool() -> None:
    global _POOL
    if _POOL is not None:
        _POOL.close()
        _POOL = None


def get_pool() -> ConnectionPool:
    if _POOL is None:
        raise RuntimeError("Database pool is not initialized.")
    return _POOL


def get_conn():
    return get_pool().connection()


def _ensure_columns(conn, table_name: str, required: Dict[str, str]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table_name,),
        )
        existing = {str(row["column_name"]) for row in cur.fetchall()}
        for col, col_def in required.items():
            if col not in existing:
                cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col} {col_def}")


def _ensure_source_handle_unique_index(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'mice'
              AND indexname = 'mice_source_handle_uniq'
            """
        )
        row = cur.fetchone()
        if row:
            indexdef = str(row.get("indexdef") or "")
            # Replace legacy partial index so ON CONFLICT(source_handle) can infer it.
            if " WHERE " in indexdef.upper():
                cur.execute("DROP INDEX IF EXISTS mice_source_handle_uniq")
                cur.execute("CREATE UNIQUE INDEX mice_source_handle_uniq ON mice (source_handle)")
        else:
            cur.execute("CREATE UNIQUE INDEX mice_source_handle_uniq ON mice (source_handle)")


def init_db() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS mice (
                    id TEXT PRIMARY KEY,
                    brand TEXT NOT NULL,
                    model TEXT NOT NULL,
                    variant TEXT,
                    length_mm DOUBLE PRECISION,
                    width_mm DOUBLE PRECISION,
                    height_mm DOUBLE PRECISION,
                    weight_g DOUBLE PRECISION,
                    ergo BOOLEAN,
                    wired BOOLEAN,
                    shape TEXT,
                    hump TEXT,
                    grips JSONB NOT NULL DEFAULT '[]'::jsonb,
                    hands JSONB NOT NULL DEFAULT '[]'::jsonb,
                    product_url TEXT,
                    image_url TEXT,
                    source TEXT,
                    source_handle TEXT,
                    availability_status TEXT,
                    shape_raw TEXT,
                    hump_raw TEXT,
                    hump_bucket TEXT,
                    front_flare_raw TEXT,
                    side_curvature_raw TEXT,
                    side_profile TEXT,
                    hand_compatibility TEXT,
                    affiliate_links JSONB,
                    brand_discount TEXT,
                    discount_code TEXT,
                    price_usd NUMERIC,
                    price_status TEXT,
                    source_payload JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS measurements (
                    id BIGSERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    length_mm DOUBLE PRECISION NOT NULL,
                    width_mm DOUBLE PRECISION NOT NULL,
                    length_cm DOUBLE PRECISION NOT NULL,
                    width_cm DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS grips (
                    id BIGSERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    grip TEXT NOT NULL,
                    confidence DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id BIGSERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    report_json JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS profiles (
                    id TEXT PRIMARY KEY,
                    email TEXT,
                    display_name TEXT,
                    metadata JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            _ensure_source_handle_unique_index(conn)
            cur.execute("CREATE INDEX IF NOT EXISTS mice_availability_status_idx ON mice (availability_status)")
            cur.execute("CREATE INDEX IF NOT EXISTS mice_brand_model_idx ON mice (brand, model)")
            cur.execute("CREATE INDEX IF NOT EXISTS measurements_session_id_id_idx ON measurements (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS measurements_user_id_id_idx ON measurements (user_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS grips_session_id_id_idx ON grips (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS grips_user_id_id_idx ON grips (user_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS reports_session_id_id_idx ON reports (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS reports_user_id_id_idx ON reports (user_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email)")

        _ensure_columns(
            conn,
            "mice",
            {
                "ergo": "BOOLEAN",
                "wired": "BOOLEAN",
                "grips": "JSONB NOT NULL DEFAULT '[]'::jsonb",
                "hands": "JSONB NOT NULL DEFAULT '[]'::jsonb",
                "source": "TEXT",
                "source_handle": "TEXT",
                "availability_status": "TEXT",
                "shape_raw": "TEXT",
                "hump_raw": "TEXT",
                "hump_bucket": "TEXT",
                "front_flare_raw": "TEXT",
                "side_curvature_raw": "TEXT",
                "side_profile": "TEXT",
                "hand_compatibility": "TEXT",
                "affiliate_links": "JSONB",
                "brand_discount": "TEXT",
                "discount_code": "TEXT",
                "price_usd": "NUMERIC",
                "price_status": "TEXT",
                "source_payload": "JSONB",
                "created_at": "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
                "updated_at": "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            },
        )
        _ensure_columns(
            conn,
            "measurements",
            {
                "user_id": "TEXT",
            },
        )
        _ensure_columns(
            conn,
            "grips",
            {
                "user_id": "TEXT",
            },
        )
        _ensure_columns(
            conn,
            "reports",
            {
                "user_id": "TEXT",
            },
        )
        conn.commit()


def _iso_ts(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, str) and value.strip():
        return value
    return utc_now()


def _as_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        return parsed if isinstance(parsed, list) else []
    return []


def _as_dict(value: Any) -> Optional[Dict[str, Any]]:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


class Mouse(BaseModel):
    id: str
    brand: str
    model: str
    variant: Optional[str] = None
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    weight_g: Optional[float] = None
    ergo: Optional[bool] = None
    wired: Optional[bool] = None
    shape: Optional[str] = None
    hump: Optional[str] = None
    grips: List[str] = Field(default_factory=list)
    hands: List[str] = Field(default_factory=list)
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    source_handle: Optional[str] = None
    availability_status: Optional[str] = None
    shape_raw: Optional[str] = None
    hump_raw: Optional[str] = None
    hump_bucket: Optional[str] = None
    front_flare_raw: Optional[str] = None
    side_curvature_raw: Optional[str] = None
    side_profile: Optional[str] = None
    hand_compatibility: Optional[str] = None
    affiliate_links: List[Dict[str, Any]] = Field(default_factory=list)
    brand_discount: Optional[str] = None
    discount_code: Optional[str] = None
    price_usd: Optional[float] = None
    price_status: Optional[str] = None
    source_payload: Optional[Dict[str, Any]] = None


class MeasurementIn(BaseModel):
    session_id: str
    length_mm: float
    width_mm: float


class MeasurementOut(BaseModel):
    session_id: str
    length_mm: float
    width_mm: float
    length_cm: float
    width_cm: float
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    created_at: str


class GripIn(BaseModel):
    session_id: str
    grip: str
    confidence: Optional[float] = 0.0


class GripOut(BaseModel):
    session_id: str
    grip: str
    confidence: float
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    created_at: str


class MouseRecommendation(BaseModel):
    id: str
    brand: str
    model: str
    score: float
    reason: str


class Report(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    measurement: MeasurementOut
    grip: Optional[GripOut]
    recommendations: List[MouseRecommendation]
    summary: str
    request_id: Optional[str] = None
    created_at: str


class ProfileOut(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    theme: Optional[Literal["light", "dark"]] = None
    created_at: str
    updated_at: str
    request_id: Optional[str] = None


class ProfileUpdateIn(BaseModel):
    display_name: Optional[str] = None
    theme: Optional[Literal["light", "dark"]] = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        if len(normalized) > 80:
            raise ValueError("display_name must be 80 characters or fewer.")
        return normalized


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

if sentry_sdk is not None and config.SENTRY_DSN:
    sentry_sdk.init(dsn=config.SENTRY_DSN, traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")))

app = FastAPI(title="MouseFit v2 API")

app.add_middleware(GZipMiddleware, minimum_size=1000)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",
    "https://mousefit.pro",
    "https://www.mousefit.pro",
    "https://lanbodikai.github.io",
]


def _parse_cors_origins(value: str | None) -> List[str]:
    if not value:
        return []
    out: List[str] = []
    for item in value.split(","):
        origin = item.strip()
        if origin:
            out.append(origin)
    return out


EXTRA_CORS_ORIGINS = _parse_cors_origins(os.getenv("CORS_ALLOW_ORIGINS"))
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ALLOW_ORIGIN_REGEX",
    r"^https://((mouse-fit|mousefit)(?:-[a-z0-9-]+)?\.vercel\.app|([a-z0-9-]+\.)?mousefit\.pro)$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*DEFAULT_CORS_ORIGINS, *EXTRA_CORS_ORIGINS],
    allow_origin_regex=CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


def _request_id(request: Request) -> str:
    value = getattr(request.state, "request_id", "")
    return value if isinstance(value, str) and value else ""


def _error_payload(request: Request, code: str, message: str, detail: Any = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": _request_id(request),
    }
    if detail is not None:
        payload["detail"] = detail
    return payload


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.user_id = None
    request.state.auth_claims = None

    auth_header = request.headers.get("Authorization")
    token = parse_bearer_token(auth_header)
    if token and config.ENABLE_AUTH:
        try:
            auth_ctx = verify_bearer_token(token)
            request.state.user_id = auth_ctx.user_id
            request.state.auth_claims = auth_ctx.claims
        except AuthError as exc:
            payload = _error_payload(request, exc.code, exc.message)
            return JSONResponse(status_code=exc.status_code, content=payload, headers={"X-Request-ID": request_id})

    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    METRICS.record(request.method, request.url.path, response.status_code, elapsed_ms)
    LOGGER.info(
        "request_completed method=%s path=%s status=%s elapsed_ms=%.2f request_id=%s user_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
        request.state.user_id,
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        code = str(detail.get("code") or f"http_{exc.status_code}")
        message = str(detail.get("message") or "Request failed.")
        payload = _error_payload(request, code, message, detail.get("detail"))
    else:
        payload = _error_payload(request, f"http_{exc.status_code}", str(detail or "Request failed."))
    return JSONResponse(status_code=exc.status_code, content=payload, headers={"X-Request-ID": _request_id(request)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    payload = _error_payload(request, "validation_error", "Request validation failed.", exc.errors())
    return JSONResponse(status_code=422, content=payload, headers={"X-Request-ID": _request_id(request)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    LOGGER.exception("unhandled_exception request_id=%s", _request_id(request))
    payload = _error_payload(request, "internal_error", "Internal server error.")
    return JSONResponse(status_code=500, content=payload, headers={"X-Request-ID": _request_id(request)})


app.include_router(rag_router)


@app.on_event("startup")
def on_startup() -> None:
    if os.getenv("MOUSEFIT_SKIP_STARTUP", "0").strip().lower() in {"1", "true", "yes", "on"}:
        return
    init_pool()
    auto_schema_init = os.getenv("MOUSEFIT_AUTO_SCHEMA_INIT", "0").strip().lower() in {"1", "true", "yes", "on"}
    if auto_schema_init:
        init_db()
    warm = os.getenv("MOUSEFIT_WARMUP_RAG", "0").strip().lower() in {"1", "true", "yes", "on"}
    if warm:
        try:
            from backend.rag.retriever import warmup

            warmup()
        except Exception:
            LOGGER.exception("rag_warmup_failed")


@app.on_event("shutdown")
def on_shutdown() -> None:
    close_pool()


def row_to_mouse(row: Dict[str, Any]) -> Mouse:
    grips = [str(x) for x in _as_list(row.get("grips"))]
    hands = [str(x) for x in _as_list(row.get("hands"))]
    affiliate_links = _as_list(row.get("affiliate_links"))
    affiliate_links = [x for x in affiliate_links if isinstance(x, dict)]

    ergo_raw = row.get("ergo")
    wired_raw = row.get("wired")
    ergo = None if ergo_raw is None else bool(ergo_raw)
    wired = None if wired_raw is None else bool(wired_raw)

    return Mouse(
        id=str(row.get("id")),
        brand=str(row.get("brand") or ""),
        model=str(row.get("model") or ""),
        variant=row.get("variant"),
        length_mm=row.get("length_mm"),
        width_mm=row.get("width_mm"),
        height_mm=row.get("height_mm"),
        weight_g=row.get("weight_g"),
        ergo=ergo,
        wired=wired,
        shape=row.get("shape"),
        hump=row.get("hump"),
        grips=grips,
        hands=hands,
        product_url=row.get("product_url"),
        image_url=row.get("image_url"),
        source_handle=row.get("source_handle"),
        availability_status=row.get("availability_status"),
        shape_raw=row.get("shape_raw"),
        hump_raw=row.get("hump_raw"),
        hump_bucket=row.get("hump_bucket"),
        front_flare_raw=row.get("front_flare_raw"),
        side_curvature_raw=row.get("side_curvature_raw"),
        side_profile=row.get("side_profile"),
        hand_compatibility=row.get("hand_compatibility"),
        affiliate_links=affiliate_links,
        brand_discount=row.get("brand_discount"),
        discount_code=row.get("discount_code"),
        price_usd=(None if row.get("price_usd") is None else float(row["price_usd"])),
        price_status=row.get("price_status"),
        source_payload=_as_dict(row.get("source_payload")),
    )


def _request_user_id(request: Request) -> Optional[str]:
    value = getattr(request.state, "user_id", None)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _request_user_email(request: Request) -> Optional[str]:
    claims = getattr(request.state, "auth_claims", None)
    if not isinstance(claims, dict):
        return None
    value = claims.get("email")
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _normalize_theme(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if normalized in {"light", "dark"}:
        return normalized
    return None


def _upsert_profile(
    conn,
    user_id: str,
    email: Optional[str],
    display_name: Optional[str] = None,
    theme: Optional[str] = None,
    update_display_name: bool = False,
) -> None:
    metadata_patch: Dict[str, Any] = {}
    normalized_theme = _normalize_theme(theme)
    if normalized_theme:
        metadata_patch["theme"] = normalized_theme
    metadata_json = json.dumps(metadata_patch) if metadata_patch else None
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO profiles (id, email, display_name, metadata, updated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE
            SET email = COALESCE(EXCLUDED.email, profiles.email),
                display_name = CASE
                    WHEN %s THEN EXCLUDED.display_name
                    ELSE profiles.display_name
                END,
                metadata = CASE
                    WHEN EXCLUDED.metadata IS NULL THEN profiles.metadata
                    ELSE COALESCE(profiles.metadata, '{}'::jsonb) || EXCLUDED.metadata
                END,
                updated_at = NOW()
            """,
            (user_id, email, display_name, metadata_json, update_display_name),
        )


def _read_profile_row(conn, user_id: str) -> Optional[Dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, email, display_name, metadata, created_at, updated_at
            FROM profiles
            WHERE id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return row


def _row_to_profile(row: Dict[str, Any], request_id: str) -> ProfileOut:
    metadata = _as_dict(row.get("metadata")) or {}
    theme = _normalize_theme(metadata.get("theme"))
    return ProfileOut(
        id=str(row.get("id") or ""),
        email=row.get("email"),
        display_name=row.get("display_name"),
        theme=theme if theme in {"light", "dark"} else None,
        created_at=_iso_ts(row.get("created_at")),
        updated_at=_iso_ts(row.get("updated_at")),
        request_id=request_id,
    )


def _require_authenticated_user(request: Request) -> tuple[str, Optional[str]]:
    user_id = _request_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail={"code": "auth_required", "message": "Authentication required."})
    return user_id, _request_user_email(request)


def latest_measurement(conn, session_id: str, user_id: Optional[str]) -> Optional[MeasurementOut]:
    with conn.cursor() as cur:
        row = None
        if user_id:
            cur.execute(
                """
                SELECT session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at
                FROM measurements
                WHERE session_id = %s AND user_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (session_id, user_id),
            )
            row = cur.fetchone()
        if row is None:
            cur.execute(
                """
                SELECT session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at
                FROM measurements
                WHERE session_id = %s AND user_id IS NULL
                ORDER BY id DESC
                LIMIT 1
                """,
                (session_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    return MeasurementOut(
        session_id=row["session_id"],
        length_mm=float(row["length_mm"]),
        width_mm=float(row["width_mm"]),
        length_cm=float(row["length_cm"]),
        width_cm=float(row["width_cm"]),
        user_id=row.get("user_id"),
        created_at=_iso_ts(row["created_at"]),
    )


def latest_grip(conn, session_id: str, user_id: Optional[str]) -> Optional[GripOut]:
    with conn.cursor() as cur:
        row = None
        if user_id:
            cur.execute(
                """
                SELECT session_id, user_id, grip, confidence, created_at
                FROM grips
                WHERE session_id = %s AND user_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (session_id, user_id),
            )
            row = cur.fetchone()
        if row is None:
            cur.execute(
                """
                SELECT session_id, user_id, grip, confidence, created_at
                FROM grips
                WHERE session_id = %s AND user_id IS NULL
                ORDER BY id DESC
                LIMIT 1
                """,
                (session_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    return GripOut(
        session_id=row["session_id"],
        grip=row["grip"],
        confidence=float(row["confidence"]),
        user_id=row.get("user_id"),
        created_at=_iso_ts(row["created_at"]),
    )


def score_mouse(mouse: Mouse, measurement: MeasurementOut, grip: Optional[GripOut]) -> MouseRecommendation:
    length_diff = abs((mouse.length_mm or 0) - measurement.length_mm)
    width_diff = abs((mouse.width_mm or 0) - measurement.width_mm)
    base_score = max(0.0, 100 - (length_diff * 1.2 + width_diff * 1.4))
    reason_parts = [
        f"Length off by {length_diff:.1f} mm",
        f"width off by {width_diff:.1f} mm",
    ]
    if grip and mouse.grips:
        if grip.grip.lower() in [g.lower() for g in mouse.grips]:
            base_score += 8
            reason_parts.append("matches grip preference")
        else:
            base_score -= 6
            reason_parts.append("different grip profile")
    return MouseRecommendation(
        id=mouse.id,
        brand=mouse.brand,
        model=mouse.model,
        score=round(base_score, 2),
        reason="; ".join(reason_parts),
    )


@app.get("/api/health")
def health(request: Request) -> dict:
    return {"ok": True, "request_id": _request_id(request)}


@app.get("/api/metrics")
def metrics(request: Request) -> dict:
    return {
        "ok": True,
        "request_id": _request_id(request),
        "metrics": METRICS.snapshot(),
    }


@app.get("/api/profile/me", response_model=ProfileOut)
def get_profile_me(request: Request) -> ProfileOut:
    user_id, user_email = _require_authenticated_user(request)
    with get_conn() as conn:
        _upsert_profile(conn, user_id, user_email)
        row = _read_profile_row(conn, user_id)
        conn.commit()
    if not row:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": "Profile could not be read."})
    return _row_to_profile(row, _request_id(request))


@app.post("/api/profile/me", response_model=ProfileOut)
def update_profile_me(payload: ProfileUpdateIn, request: Request) -> ProfileOut:
    user_id, user_email = _require_authenticated_user(request)
    with get_conn() as conn:
        _upsert_profile(
            conn,
            user_id,
            user_email,
            display_name=payload.display_name,
            theme=payload.theme,
            update_display_name=True,
        )
        row = _read_profile_row(conn, user_id)
        conn.commit()
    if not row:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": "Profile could not be read."})
    return _row_to_profile(row, _request_id(request))


@app.get("/api/mice", response_model=List[Mouse])
def list_mice(response: Response) -> List[Mouse]:
    response.headers["Cache-Control"] = "public, max-age=300"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice ORDER BY brand, model")
            rows = cur.fetchall()
    return [row_to_mouse(row) for row in rows]


@app.get("/api/mice/{mouse_id}", response_model=Mouse)
def get_mouse(mouse_id: str) -> Mouse:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice WHERE id = %s", (mouse_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Mouse not found"})
    return row_to_mouse(row)


@app.post("/api/measurements", response_model=MeasurementOut)
def save_measurement(payload: MeasurementIn, request: Request) -> MeasurementOut:
    created_at = utc_now()
    length_cm = round(payload.length_mm / 10, 2)
    width_cm = round(payload.width_mm / 10, 2)
    user_id = _request_user_id(request)
    user_email = _request_user_email(request)
    with get_conn() as conn:
        if user_id:
            _upsert_profile(conn, user_id, user_email)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO measurements (session_id, user_id, length_mm, width_mm, length_cm, width_cm, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.session_id,
                    user_id,
                    payload.length_mm,
                    payload.width_mm,
                    length_cm,
                    width_cm,
                    created_at,
                ),
            )
        conn.commit()
    return MeasurementOut(
        session_id=payload.session_id,
        length_mm=payload.length_mm,
        width_mm=payload.width_mm,
        length_cm=length_cm,
        width_cm=width_cm,
        user_id=user_id,
        request_id=_request_id(request),
        created_at=created_at,
    )


@app.post("/api/grip", response_model=GripOut)
def save_grip(payload: GripIn, request: Request) -> GripOut:
    created_at = utc_now()
    confidence = payload.confidence or 0.0
    user_id = _request_user_id(request)
    user_email = _request_user_email(request)
    with get_conn() as conn:
        if user_id:
            _upsert_profile(conn, user_id, user_email)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO grips (session_id, user_id, grip, confidence, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    payload.session_id,
                    user_id,
                    payload.grip,
                    confidence,
                    created_at,
                ),
            )
        conn.commit()
    return GripOut(
        session_id=payload.session_id,
        grip=payload.grip,
        confidence=confidence,
        user_id=user_id,
        request_id=_request_id(request),
        created_at=created_at,
    )


@app.post("/api/report/generate", response_model=Report)
def generate_report(request: Request, session_id: str = Query(...)) -> Report:
    user_id = _request_user_id(request)
    user_email = _request_user_email(request)
    with get_conn() as conn:
        if user_id:
            _upsert_profile(conn, user_id, user_email)
        measurement = latest_measurement(conn, session_id, user_id)
        if not measurement:
            raise HTTPException(
                status_code=404,
                detail={"code": "not_found", "message": "No measurement found for session_id"},
            )
        grip = latest_grip(conn, session_id, user_id)
        measurement.request_id = _request_id(request)
        if grip is not None:
            grip.request_id = _request_id(request)

        with conn.cursor() as cur:
            cur.execute("SELECT * FROM mice")
            mice = [row_to_mouse(row) for row in cur.fetchall()]

        scored = [score_mouse(m, measurement, grip) for m in mice if m.length_mm and m.width_mm]
        scored.sort(key=lambda x: x.score, reverse=True)
        top = scored[:5]

        if grip:
            summary = (
                f"Based on a {measurement.length_mm:.1f} x {measurement.width_mm:.1f} mm hand and "
                f"{grip.grip} grip, these mice fit your profile best."
            )
        else:
            summary = (
                f"Based on a {measurement.length_mm:.1f} x {measurement.width_mm:.1f} mm hand, "
                "these mice fit your profile best."
            )

        report = Report(
            session_id=session_id,
            user_id=user_id,
            measurement=measurement,
            grip=grip,
            recommendations=top,
            summary=summary,
            request_id=_request_id(request),
            created_at=utc_now(),
        )

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reports (session_id, user_id, report_json, created_at)
                VALUES (%s, %s, %s::jsonb, %s)
                """,
                (session_id, user_id, json.dumps(report.model_dump()), report.created_at),
            )
        conn.commit()

    return report


@app.get("/api/report/latest", response_model=Report)
def latest_report(request: Request, session_id: str = Query(...)) -> Report:
    user_id = _request_user_id(request)
    with get_conn() as conn:
        with conn.cursor() as cur:
            row = None
            if user_id:
                cur.execute(
                    """
                    SELECT report_json
                    FROM reports
                    WHERE session_id = %s AND user_id = %s
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (session_id, user_id),
                )
                row = cur.fetchone()
            if row is None:
                cur.execute(
                    """
                    SELECT report_json
                    FROM reports
                    WHERE session_id = %s AND user_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (session_id,),
                )
                row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "No report found for session_id"})

    report_json = row.get("report_json")
    if isinstance(report_json, dict):
        report = Report.model_validate(report_json)
        report.request_id = _request_id(request)
        return report
    if isinstance(report_json, str):
        try:
            report = Report.model_validate_json(report_json)
            report.request_id = _request_id(request)
            return report
        except ValueError:
            pass
    raise HTTPException(status_code=500, detail={"code": "invalid_report", "message": "Invalid stored report format"})


@app.post("/api/agent/chat")
def agent_chat() -> JSONResponse:
    return JSONResponse(
        status_code=410,
        content={
            "code": "endpoint_deprecated",
            "message": "Use /api/chat instead of /api/agent/chat.",
        },
    )
