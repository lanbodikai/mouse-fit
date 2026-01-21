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
    RagQuery,
    RagPreferences,
    RagSource,
    RerankRequest,
    RerankResponse,
    ReportRequest,
    ReportResponse,
)

router = APIRouter()


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

    resp = requests.post(
        config.GROQ_URL,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {config.GROQ_API_KEY}"},
        data=json.dumps(payload),
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
    sources = retrieve(payload.query, payload.prefs, payload.top_k)
    if not sources:
        return RagAnswer(answer="No sources available.", sources=[])

    context = _build_context(sources, max_lines=18)
    try:
        answer = _call_groq(
            [
                {"role": "system", "content": RAG_SYSTEM},
                {"role": "system", "content": f"CONTEXT:\n{context}"},
                {"role": "user", "content": payload.query},
            ],
            temperature=0.2,
        )
    except HTTPException:
        # fallback if no key configured
        answer = " ".join(source.text.split("\n")[0] for source in sources[:3])

    return RagAnswer(answer=answer, sources=sources)


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
    match = re.search(r"(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)", text)
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
    cleaned = first_line.strip().replace("#", "").replace("*", "").replace("•", "").strip()
    parts = cleaned.split()
    if len(parts) < 2:
        return {"brand": "", "model": ""}
    return {"brand": parts[0], "model": " ".join(parts[1:])}


def _normalize_doc(source: RagSource) -> Candidate:
    first_line = source.text.split("\n")[0] if source.text else ""
    brand_model = _parse_brand_model(first_line)
    dims = _parse_dims(source.text)
    weight = _parse_weight(source.text)
    shape = _parse_shape(source.text)
    return Candidate(
        id=source.id.lower(),
        brand=brand_model.get("brand", ""),
        model=brand_model.get("model", ""),
        length_mm=dims.get("length_mm"),
        width_mm=dims.get("width_mm"),
        height_mm=dims.get("height_mm"),
        weight_g=weight,
        shape=shape,
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
        f"• {c.brand} {c.model}" for c in payload.candidates[:5] if c.brand and c.model
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
