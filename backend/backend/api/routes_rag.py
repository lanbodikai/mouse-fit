from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, HTTPException

from backend import config
from backend.rag.prompts import RAG_SYSTEM, RERANK_SYSTEM, REPORT_SYSTEM
from backend.rag.retriever import retrieve
from backend.rag.schemas import (
    Candidate,
    CandidateRequest,
    CandidateResponse,
    RagAnswer,
    RagRecommendation,
    RagQuery,
    RagPreferences,
    RagSource,
    RerankRequest,
    RerankResponse,
    ReportRequest,
    ReportResponse,
)

router = APIRouter()
_SESSION = requests.Session()


def _clip_text(value: Any, limit: int = 140) -> str:
    text = str(value).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _reason_for_source(query: str, prefs: RagPreferences, source: RagSource) -> str:
    meta = source.meta or {}
    reasons: List[str] = []
    brand = str(meta.get("brand") or "").strip()
    model = str(meta.get("model") or "").strip()
    mouse_name = f"{brand} {model}".strip() or "This mouse"

    wireless_val = str(meta.get("wireless", "")).lower()
    if prefs.wireless is True and "wireless" in wireless_val:
        reasons.append("it matches your wireless preference")
    if prefs.wireless is False and "wireless" not in wireless_val:
        reasons.append("it matches your wired preference")

    shape_pref = (prefs.shape or "").strip().lower()
    shape_val = str(meta.get("shape", "")).strip().lower()
    if shape_pref and shape_pref in shape_val:
        reasons.append(f"its {shape_val or 'overall'} shape lines up with your requested {shape_pref} profile")
    grip_pref = (prefs.grip or "").strip().lower()
    if grip_pref:
        raw_grips = meta.get("grips") or []
        if isinstance(raw_grips, str):
            raw_grips = [part.strip() for part in raw_grips.split(",")]
        grip_list = [str(x).strip().lower() for x in raw_grips if str(x).strip()]
        if grip_pref in grip_list:
            reasons.append(f"its fit profile supports {grip_pref} grip")

    weight_clause = ""
    if prefs.targetWeight and prefs.targetWeight.max and meta.get("weight_g") is not None:
        try:
            weight = float(meta["weight_g"])
            if weight <= prefs.targetWeight.max:
                weight_clause = f"At {weight:g}g, it stays under your {prefs.targetWeight.max:g}g target."
            else:
                weight_clause = f"It weighs {weight:g}g, which is above your {prefs.targetWeight.max:g}g target."
        except (TypeError, ValueError):
            pass

    dims = []
    for key in ("length_mm", "width_mm", "height_mm"):
        val = meta.get(key)
        if val is None:
            dims = []
            break
        dims.append(str(val))
    size_clause = f"Its shape dimensions are {dims[0]} x {dims[1]} x {dims[2]} mm." if dims else ""
    price_clause = ""
    price_raw = meta.get("price_usd")
    if price_raw is not None:
        try:
            price_clause = f"Current listed price is about ${float(price_raw):.2f}."
        except (TypeError, ValueError):
            pass

    fit_clause = (
        f"{mouse_name} is recommended because {', and '.join(reasons)}."
        if reasons
        else f"{mouse_name} is recommended because it is one of the strongest semantic matches to your request."
    )

    query_hint = _clip_text(query, 90)
    tail = f"It also aligns well with your query ({query_hint}) with a similarity score of {source.score:.3f}."
    return " ".join(part for part in (fit_clause, weight_clause, size_clause, price_clause, tail) if part)


def _rating_from_score(score: float) -> float:
    normalized = max(0.0, min(1.0, (score + 1.0) / 2.0))
    return round(normalized * 10.0, 1)


def _shape_bucket(meta: Dict[str, Any]) -> str:
    shape = str(meta.get("shape") or "").strip().lower()
    if not shape:
        return "unknown"
    if "ergo" in shape:
        return "ergo"
    if "sym" in shape or "ambi" in shape:
        return "sym"
    return shape


def _pick_shape_diverse(sources: List[RagSource], limit: int = 3) -> List[RagSource]:
    if not sources:
        return []
    picked: List[RagSource] = []
    seen_shapes: set[str] = set()
    for source in sources:
        shape_key = _shape_bucket(source.meta or {})
        if shape_key in seen_shapes:
            continue
        picked.append(source)
        seen_shapes.add(shape_key)
        if len(picked) >= limit:
            return picked[:limit]
    return picked[:limit]


def _top3_recommendations(query: str, prefs: RagPreferences, sources: List[RagSource]) -> List[RagRecommendation]:
    recommendations: List[RagRecommendation] = []
    for idx, source in enumerate(sources[:3], start=1):
        meta = source.meta or {}
        name = f"{meta.get('brand', '')} {meta.get('model', '')}".strip() or source.id
        recommendations.append(
            RagRecommendation(
                rank=idx,
                id=source.id,
                name=name,
                rating=_rating_from_score(source.score),
                reasoning=_reason_for_source(query, prefs, source),
                score=source.score,
            )
        )
    return recommendations


def _format_top3_answer(recommendations: List[RagRecommendation]) -> str:
    count = len(recommendations[:3])
    lines = [f"Top {count} recommendations with reasoning:"]
    for rec in recommendations[:3]:
        lines.append(f"{rec.rank}. {rec.name} ({rec.id})")
        lines.append(f"Rating: {rec.rating}/10")
        lines.append(f"Reasoning: {rec.reasoning}")
    return "\n".join(lines)


def _profile_to_query(profile: Dict[str, Any]) -> str:
    bits = []
    if profile.get("length_mm"):
        bits.append(f"hand length {profile['length_mm']}mm")
    if profile.get("width_mm"):
        bits.append(f"hand width {profile['width_mm']}mm")
    if profile.get("grip"):
        bits.append(f"grip {profile['grip']}")
    if profile.get("wireless") is True:
        bits.append("wireless")
    if profile.get("wireless") is False:
        bits.append("wired")
    if profile.get("budget"):
        bits.append(f"budget ${profile['budget']}")
    return ", ".join(bits)


def _call_groq(messages: List[Dict[str, Any]], model: Optional[str] = None, temperature: float = 0.3,
               response_format: Optional[Dict[str, Any]] = None) -> str:
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


def _build_context(sources: List[RagSource], max_lines: int = 24) -> str:
    blocks = []
    for source in sources:
        text = "\n".join(source.text.split("\n")[:max_lines])
        blocks.append(f"[#{source.id}]\n{text}")
    return "\n\n---\n\n".join(blocks)


@router.post("/api/rag/query", response_model=RagAnswer)
def rag_query(payload: RagQuery) -> RagAnswer:
    prefs = payload.prefs or RagPreferences()
    k = max(3, int(payload.top_k or 3))
    pool = retrieve(payload.query, prefs, k=min(max(k * 6, 18), 128))
    sources = _pick_shape_diverse(pool, limit=3)
    if not sources:
        return RagAnswer(answer="No sources available.", sources=[], recommendations=[])

    recommendations = _top3_recommendations(payload.query, prefs, sources)
    answer = _format_top3_answer(recommendations)
    return RagAnswer(answer=answer, sources=sources, recommendations=recommendations)


def _is_mouse_doc(text: str) -> bool:
    text = text.lower()
    if "mouse" not in text:
        return False
    if any(term in text for term in [
        "keyboard",
        "keycap",
        "switch",
        "headset",
        "earbud",
        "monitor",
        "chair",
        "tennis",
        "racket",
        "knife",
        "goggles",
        "phone",
        "laptop",
    ]):
        return False
    return True


def _parse_dims(text: str) -> Dict[str, float]:
    import re
    match = re.search(r"(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)", text)
    if not match:
        return {}
    return {
        "length_mm": float(match.group(1)),
        "width_mm": float(match.group(2)),
        "height_mm": float(match.group(3)),
    }


def _parse_weight(text: str) -> Optional[float]:
    import re
    match = re.search(r"(\d+(?:\.\d+)?)\s*g\b", text, re.IGNORECASE)
    return float(match.group(1)) if match else None


def _parse_shape(text: str) -> Optional[str]:
    text = text.lower()
    if "sym" in text or "ambidex" in text:
        return "sym"
    if "ergo" in text:
        return "ergo"
    return None


def _parse_brand_model(first_line: str) -> Dict[str, str]:
    cleaned = first_line.strip().replace("#", "").replace("*", "").replace("-", "").strip()
    parts = cleaned.split()
    if len(parts) < 2:
        return {"brand": "", "model": ""}
    return {"brand": parts[0], "model": " ".join(parts[1:])}


def _safe_float(value: Any) -> Optional[float]:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_doc(source: RagSource) -> Candidate:
    first_line = source.text.split("\n")[0] if source.text else ""
    brand_model = _parse_brand_model(first_line)
    dims = _parse_dims(source.text)
    weight = _parse_weight(source.text)
    shape = _parse_shape(source.text)
    meta = source.meta or {}

    grips_raw = meta.get("grips") or []
    if isinstance(grips_raw, str):
        grips = [part.strip() for part in grips_raw.split(",") if part.strip()]
    elif isinstance(grips_raw, list):
        grips = [str(part).strip() for part in grips_raw if str(part).strip()]
    else:
        grips = []

    hands_raw = meta.get("hands") or []
    if isinstance(hands_raw, str):
        hands = [part.strip() for part in hands_raw.split(",") if part.strip()]
    elif isinstance(hands_raw, list):
        hands = [str(part).strip() for part in hands_raw if str(part).strip()]
    else:
        hands = []

    return Candidate(
        id=source.id.lower(),
        brand=str(meta.get("brand") or brand_model.get("brand") or ""),
        model=str(meta.get("model") or brand_model.get("model") or ""),
        length_mm=_safe_float(meta.get("length_mm")) or dims.get("length_mm"),
        width_mm=_safe_float(meta.get("width_mm")) or dims.get("width_mm"),
        height_mm=_safe_float(meta.get("height_mm")) or dims.get("height_mm"),
        weight_g=_safe_float(meta.get("weight_g")) or weight,
        shape=str(meta.get("shape") or shape or "") or None,
        price_usd=_safe_float(meta.get("price_usd")),
        grips=grips,
        hands=hands,
        hand_compatibility=(str(meta.get("hand_compatibility")) if meta.get("hand_compatibility") else None),
    )


@router.post("/api/candidates", response_model=CandidateResponse)
def rag_candidates(payload: CandidateRequest) -> CandidateResponse:
    profile = payload.profile.model_dump() if payload.profile else {}
    prefs = RagPreferences(
        grip=payload.profile.grip,
        wireless=payload.profile.wireless,
        targetWeight=payload.profile.targetWeight,
    )
    query = ", ".join(
        [
            f"grip {profile['grip']}" if profile.get("grip") else "",
            f"length {profile['length_mm']}mm" if profile.get("length_mm") else "",
            f"width {profile['width_mm']}mm" if profile.get("width_mm") else "",
            "mouse",
        ]
    ).strip(", ")

    docs = retrieve(query, prefs=prefs, k=payload.k)
    filtered = [doc for doc in docs if _is_mouse_doc(doc.text)]
    normalized: List[Candidate] = []
    for doc in filtered:
        candidate = _normalize_doc(doc)
        if candidate.brand and candidate.model:
            normalized.append(candidate)

    unique: Dict[str, Candidate] = {}
    for candidate in normalized:
        if candidate.id not in unique:
            unique[candidate.id] = candidate

    if not unique:
        raise HTTPException(status_code=404, detail="No mouse candidates found from RAG.")
    return CandidateResponse(candidates=list(unique.values()))


@router.post("/api/rerank", response_model=RerankResponse)
def rag_rerank(payload: RerankRequest) -> RerankResponse:
    if not payload.candidates:
        raise HTTPException(status_code=400, detail="No candidates")

    query = _profile_to_query(payload.profile.model_dump())
    prefs = RagPreferences(
        grip=payload.profile.grip,
        wireless=payload.profile.wireless,
        targetWeight=payload.profile.targetWeight,
    )
    retrieved = retrieve(query, prefs=prefs, k=24)
    allow = {candidate.id.lower() for candidate in payload.candidates}
    ctx_docs = [doc for doc in retrieved if doc.id.lower() in allow][:12]
    ctx = _build_context(ctx_docs, max_lines=28)

    user_msg = {
        "role": "user",
        "content": (
            f"Profile: {query or '(unspecified)'}\n\n"
            f"CANDIDATES:\n{json.dumps([c.model_dump() for c in payload.candidates[:12]], indent=2)}\n\n"
            f"CONTEXT:\n{ctx}\n\n"
            "Return JSON {grip, ranked:[{id,score,reason,flags:[]},...], best_id}. No prose."
        ),
    }

    reply = _call_groq(
        [
            {"role": "system", "content": RERANK_SYSTEM},
            {"role": "system", "content": "Use [#id] only inside reason if citing a doc."},
            user_msg,
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    try:
        payload_json = json.loads(reply or "{}")
    except json.JSONDecodeError:
        payload_json = {}
    idset = {c.id for c in payload.candidates}
    ranked = [r for r in payload_json.get("ranked", []) if r.get("id") in idset]
    ranked.sort(key=lambda item: item.get("score") or 0, reverse=True)
    best_id = ranked[0]["id"] if ranked else payload.candidates[0].id

    return RerankResponse(
        grip=payload_json.get("grip") or payload.profile.grip,
        ranked=ranked,
        best_id=best_id,
    )


@router.post("/api/report", response_model=ReportResponse)
def rag_report(payload: ReportRequest) -> ReportResponse:
    query = _profile_to_query(payload.profile.model_dump())
    prefs = RagPreferences(
        grip=payload.profile.grip,
        wireless=payload.profile.wireless,
        targetWeight=payload.profile.targetWeight,
    )

    retrieved = retrieve(query, prefs=prefs, k=12)
    allow = {candidate.id.lower() for candidate in payload.candidates}
    narrowed = [doc for doc in retrieved if doc.id.lower() in allow] if allow else retrieved
    ctx = _build_context(narrowed[:8], max_lines=24)

    candidate_summary = " ".join(
        f"- {c.brand} {c.model}" for c in payload.candidates[:5] if c.brand and c.model
    )

    reply = _call_groq(
        [
            {"role": "system", "content": REPORT_SYSTEM},
            {"role": "system", "content": f"CONTEXT:\n{ctx}"},
            {
                "role": "user",
                "content": (
                    f"User profile: {query or '(unspecified)'}\nCandidates: {candidate_summary or '(none)'}"
                    "\nWrite exactly two paragraphs."
                ),
            },
        ],
        temperature=0.3,
    )
    return ReportResponse(report=reply)


@router.post("/api/chat")
def rag_chat(payload: Dict[str, Any]) -> Dict[str, Any]:
    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        raise HTTPException(status_code=400, detail="messages[] is required")

    reply = _call_groq(
        messages,
        model=payload.get("model"),
        temperature=float(payload.get("temperature", 0.6)),
    )
    return {"reply": reply}
