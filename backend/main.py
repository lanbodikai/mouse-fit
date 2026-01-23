from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.api.routes_ml import router as ml_router
from backend.api.routes_rag import router as rag_router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "mousefit.db")
MICE_JSON_PATH = os.path.join(BASE_DIR, "data", "mice.json")


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


class Mouse(BaseModel):
    id: str
    brand: str
    model: str
    variant: Optional[str] = None
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    weight_g: Optional[float] = None
    shape: Optional[str] = None
    hump: Optional[str] = None
    grips: List[str] = Field(default_factory=list)
    hands: List[str] = Field(default_factory=list)
    product_url: Optional[str] = None
    image_url: Optional[str] = None


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

app.include_router(rag_router)
app.include_router(ml_router)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS mice (
            id TEXT PRIMARY KEY,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            variant TEXT,
            length_mm REAL,
            width_mm REAL,
            height_mm REAL,
            weight_g REAL,
            shape TEXT,
            hump TEXT,
            grips TEXT,
            hands TEXT,
            product_url TEXT,
            image_url TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            length_mm REAL NOT NULL,
            width_mm REAL NOT NULL,
            length_cm REAL NOT NULL,
            width_cm REAL NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS grips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            grip TEXT NOT NULL,
            confidence REAL NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            report_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()

    cur.execute("SELECT COUNT(*) AS count FROM mice")
    if cur.fetchone()["count"] == 0:
        seed_mice(conn)
    conn.close()


def seed_mice(conn: sqlite3.Connection) -> None:
    if not os.path.exists(MICE_JSON_PATH):
        return
    with open(MICE_JSON_PATH, "r", encoding="utf-8") as handle:
        raw = json.load(handle)

    rows = []
    for item in raw:
        brand = str(item.get("brand") or "").strip()
        model = str(item.get("model") or "").strip()
        if not brand or not model:
            continue
        variant = str(item.get("variant") or "").strip() or None
        base_id = f"{brand}-{model}"
        if variant:
            base_id = f"{base_id}-{variant}"
        mouse_id = slugify(base_id)
        rows.append(
            (
                mouse_id,
                brand,
                model,
                variant,
                item.get("length_mm"),
                item.get("width_mm"),
                item.get("height_mm"),
                item.get("weight_g"),
                item.get("shape"),
                item.get("hump"),
                json.dumps(item.get("grips") or []),
                json.dumps(item.get("hands") or []),
                item.get("product_url"),
                item.get("image_url"),
            )
        )

    conn.executemany(
        """
        INSERT INTO mice (
            id, brand, model, variant, length_mm, width_mm, height_mm, weight_g,
            shape, hump, grips, hands, product_url, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def row_to_mouse(row: sqlite3.Row) -> Mouse:
    return Mouse(
        id=row["id"],
        brand=row["brand"],
        model=row["model"],
        variant=row["variant"],
        length_mm=row["length_mm"],
        width_mm=row["width_mm"],
        height_mm=row["height_mm"],
        weight_g=row["weight_g"],
        shape=row["shape"],
        hump=row["hump"],
        grips=json.loads(row["grips"] or "[]"),
        hands=json.loads(row["hands"] or "[]"),
        product_url=row["product_url"],
        image_url=row["image_url"],
    )


def latest_measurement(conn: sqlite3.Connection, session_id: str) -> Optional[MeasurementOut]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT * FROM measurements
        WHERE session_id = ?
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
        length_mm=row["length_mm"],
        width_mm=row["width_mm"],
        length_cm=row["length_cm"],
        width_cm=row["width_cm"],
        created_at=row["created_at"],
    )


def latest_grip(conn: sqlite3.Connection, session_id: str) -> Optional[GripOut]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT * FROM grips
        WHERE session_id = ?
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
        confidence=row["confidence"],
        created_at=row["created_at"],
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
def list_mice() -> List[Mouse]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM mice ORDER BY brand, model")
    rows = cur.fetchall()
    conn.close()
    return [row_to_mouse(row) for row in rows]


@app.get("/api/mice/{mouse_id}", response_model=Mouse)
def get_mouse(mouse_id: str) -> Mouse:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM mice WHERE id = ?", (mouse_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Mouse not found")
    return row_to_mouse(row)


@app.post("/api/measurements", response_model=MeasurementOut)
def save_measurement(payload: MeasurementIn) -> MeasurementOut:
    created_at = utc_now()
    length_cm = round(payload.length_mm / 10, 2)
    width_cm = round(payload.width_mm / 10, 2)
    conn = get_conn()
    conn.execute(
        """
        INSERT INTO measurements (session_id, length_mm, width_mm, length_cm, width_cm, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
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
    conn.close()
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
    conn = get_conn()
    conn.execute(
        """
        INSERT INTO grips (session_id, grip, confidence, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            payload.session_id,
            payload.grip,
            payload.confidence or 0.0,
            created_at,
        ),
    )
    conn.commit()
    conn.close()
    return GripOut(
        session_id=payload.session_id,
        grip=payload.grip,
        confidence=payload.confidence or 0.0,
        created_at=created_at,
    )


@app.post("/api/report/generate", response_model=Report)
def generate_report(session_id: str = Query(...)) -> Report:
    conn = get_conn()
    measurement = latest_measurement(conn, session_id)
    if not measurement:
        conn.close()
        raise HTTPException(status_code=404, detail="No measurement found for session_id")
    grip = latest_grip(conn, session_id)

    cur = conn.cursor()
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

    conn.execute(
        "INSERT INTO reports (session_id, report_json, created_at) VALUES (?, ?, ?)",
        (session_id, report.model_dump_json(), report.created_at),
    )
    conn.commit()
    conn.close()
    return report


@app.get("/api/report/latest", response_model=Report)
def latest_report(session_id: str = Query(...)) -> Report:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT report_json FROM reports
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (session_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No report found for session_id")
    return Report.model_validate_json(row["report_json"])


@app.post("/api/agent/chat")
def agent_chat(payload: dict) -> dict:
    return {
        "reply": "Agent endpoint is a placeholder in v2. Provide integration later.",
        "input": payload,
    }
