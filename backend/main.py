from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from backend.api.routes_rag import router as rag_router

try:
    from backend.api.routes_ml import router as ml_router  # type: ignore
except Exception:
    ml_router = None

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
_POOL: Optional[ConnectionPool] = None


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
                    report_json JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            _ensure_source_handle_unique_index(conn)
            cur.execute("CREATE INDEX IF NOT EXISTS mice_availability_status_idx ON mice (availability_status)")
            cur.execute("CREATE INDEX IF NOT EXISTS mice_brand_model_idx ON mice (brand, model)")
            cur.execute("CREATE INDEX IF NOT EXISTS measurements_session_id_id_idx ON measurements (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS grips_session_id_id_idx ON grips (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS reports_session_id_id_idx ON reports (session_id, id DESC)")

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
    created_at: str


class GripIn(BaseModel):
    session_id: str
    grip: str
    confidence: Optional[float] = 0.0


class GripOut(BaseModel):
    session_id: str
    grip: str
    confidence: float
    created_at: str


class MouseRecommendation(BaseModel):
    id: str
    brand: str
    model: str
    score: float
    reason: str


class Report(BaseModel):
    session_id: str
    measurement: MeasurementOut
    grip: Optional[GripOut]
    recommendations: List[MouseRecommendation]
    summary: str
    created_at: str


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
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag_router)
if ml_router is not None:
    app.include_router(ml_router)


@app.on_event("startup")
def on_startup() -> None:
    init_pool()
    init_db()
    warm = os.getenv("MOUSEFIT_WARMUP_RAG", "1").strip().lower() in {"1", "true", "yes", "on"}
    if warm:
        try:
            from backend.rag.retriever import warmup

            warmup()
        except Exception:
            pass


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


def latest_measurement(conn, session_id: str) -> Optional[MeasurementOut]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT session_id, length_mm, width_mm, length_cm, width_cm, created_at
            FROM measurements
            WHERE session_id = %s
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
        created_at=_iso_ts(row["created_at"]),
    )


def latest_grip(conn, session_id: str) -> Optional[GripOut]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT session_id, grip, confidence, created_at
            FROM grips
            WHERE session_id = %s
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
def health() -> dict:
    return {"ok": True}


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
        raise HTTPException(status_code=404, detail="Mouse not found")
    return row_to_mouse(row)


@app.post("/api/measurements", response_model=MeasurementOut)
def save_measurement(payload: MeasurementIn) -> MeasurementOut:
    created_at = utc_now()
    length_cm = round(payload.length_mm / 10, 2)
    width_cm = round(payload.width_mm / 10, 2)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO measurements (session_id, length_mm, width_mm, length_cm, width_cm, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    payload.session_id,
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
        created_at=created_at,
    )


@app.post("/api/grip", response_model=GripOut)
def save_grip(payload: GripIn) -> GripOut:
    created_at = utc_now()
    confidence = payload.confidence or 0.0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO grips (session_id, grip, confidence, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    payload.session_id,
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
        created_at=created_at,
    )


@app.post("/api/report/generate", response_model=Report)
def generate_report(session_id: str = Query(...)) -> Report:
    with get_conn() as conn:
        measurement = latest_measurement(conn, session_id)
        if not measurement:
            raise HTTPException(status_code=404, detail="No measurement found for session_id")
        grip = latest_grip(conn, session_id)

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
            measurement=measurement,
            grip=grip,
            recommendations=top,
            summary=summary,
            created_at=utc_now(),
        )

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reports (session_id, report_json, created_at)
                VALUES (%s, %s::jsonb, %s)
                """,
                (session_id, json.dumps(report.model_dump()), report.created_at),
            )
        conn.commit()

    return report


@app.get("/api/report/latest", response_model=Report)
def latest_report(session_id: str = Query(...)) -> Report:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT report_json
                FROM reports
                WHERE session_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (session_id,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="No report found for session_id")

    report_json = row.get("report_json")
    if isinstance(report_json, dict):
        return Report.model_validate(report_json)
    if isinstance(report_json, str):
        try:
            return Report.model_validate_json(report_json)
        except ValueError:
            pass
    raise HTTPException(status_code=500, detail="Invalid stored report format")


@app.post("/api/agent/chat")
def agent_chat(payload: dict) -> dict:
    return {
        "reply": "Agent endpoint is a placeholder in v2. Provide integration later.",
        "input": payload,
    }
