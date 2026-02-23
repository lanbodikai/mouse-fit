from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from fastapi import APIRouter, HTTPException

from backend import config
from backend.rag.prompts import FIT_SYSTEM, RAG_SYSTEM, RERANK_SYSTEM, REPORT_SYSTEM
from backend.rag.retriever import retrieve
from backend.rag.schemas import (
    Candidate,
    CandidateRequest,
    CandidateResponse,
    FitRecommendation,
    FitRequest,
    FitResponse,
    FitSource,
    RagAnswer,
    RagPreferences,
    RagQuery,
    RagSource,
    RerankRequest,
    RerankResponse,
    ReportRequest,
    ReportResponse,
)

router = APIRouter()
_SESSION = requests.Session()


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
    if profile.get("budgetMin"):
        bits.append(f"budget min ${profile['budgetMin']}")
    if profile.get("budgetMax"):
        bits.append(f"budget max ${profile['budgetMax']}")
    if profile.get("weightPreference"):
        bits.append(f"weight preference {profile['weightPreference']}")
    return ", ".join(bits)


def _call_model(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    response_format: Optional[Dict[str, Any]] = None,
    prefer_xai: bool = True,
    provider_hint: Optional[str] = None,
) -> Tuple[str, str, str]:
    providers: List[Tuple[str, str, str, str]] = []
    use_xai = provider_hint in {None, "", "xai"}
    use_google = provider_hint in {None, "", "google"}
    use_groq = provider_hint in {None, "", "groq"}
    if use_xai and config.XAI_API_KEY:
        providers.append(("xai", config.XAI_URL, config.XAI_API_KEY, model or config.XAI_DEFAULT_MODEL))
    if use_google and config.GOOGLE_API_KEY:
        providers.append(("google", config.GOOGLE_URL, config.GOOGLE_API_KEY, model or config.GOOGLE_DEFAULT_MODEL))
    if use_groq and config.GROQ_API_KEY:
        providers.append(("groq", config.GROQ_URL, config.GROQ_API_KEY, model or config.GROQ_DEFAULT_MODEL))

    if not providers:
        raise HTTPException(status_code=500, detail="Missing XAI_API_KEY, GOOGLE_API_KEY, or GROQ_API_KEY on server")

    if provider_hint in {"xai", "google", "groq"}:
        providers.sort(key=lambda item: 0 if item[0] == provider_hint else 1)
    elif prefer_xai:
        providers.sort(key=lambda item: 0 if item[0] == "xai" else (1 if item[0] == "groq" else 2))
    else:
        providers.sort(key=lambda item: 0 if item[0] == "google" else (1 if item[0] == "groq" else 2))

    last_error: Optional[str] = None
    for provider, url, key, chosen_model in providers:
        payload: Dict[str, Any] = {
            "model": chosen_model,
            "temperature": temperature,
            "messages": messages,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            resp = _SESSION.post(
                url,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
                json=payload,
                timeout=60,
            )
            if not resp.ok:
                last_error = f"{provider}: {resp.status_code} {resp.text}"
                continue
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return content, provider, chosen_model
        except requests.RequestException as exc:
            last_error = f"{provider}: {exc}"

    raise HTTPException(status_code=502, detail=f"LLM request failed: {last_error or 'unknown error'}")


def _call_google(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    content, _, _ = _call_model(
        messages=messages,
        model=model,
        temperature=temperature,
        response_format=response_format,
        prefer_xai=False,
        provider_hint="google",
    )
    return content


def _call_groq(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    content, _, _ = _call_model(
        messages=messages,
        model=model,
        temperature=temperature,
        response_format=response_format,
        prefer_xai=False,
        provider_hint="groq",
    )
    return content


def _build_context(sources: List[RagSource], max_lines: int = 24) -> str:
    blocks = []
    for source in sources:
        text = "\n".join(source.text.split("\n")[:max_lines])
        blocks.append(f"[#{source.id}]\n{text}")
    return "\n\n---\n\n".join(blocks)


def _parse_json_object_from_text(text: str) -> Dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass

    # Recover JSON payloads wrapped in markdown/code fences.
    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", raw, re.IGNORECASE)
    if fenced:
        try:
            parsed = json.loads(fenced.group(1))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            pass

    # Recover first JSON object in free-form text.
    first = raw.find("{")
    last = raw.rfind("}")
    if first >= 0 and last > first:
        try:
            parsed = json.loads(raw[first : last + 1])
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _is_mouse_doc(text: str) -> bool:
    text = text.lower()
    if "mouse" not in text:
        return False
    if any(
        term in text
        for term in [
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
        ]
    ):
        return False
    return True


def _parse_dims(text: str) -> Dict[str, float]:
    match = re.search(r"(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)", text)
    if not match:
        return {}
    return {
        "length_mm": float(match.group(1)),
        "width_mm": float(match.group(2)),
        "height_mm": float(match.group(3)),
    }


def _parse_weight(text: str) -> Optional[float]:
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


def _slug(value: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return out or "source"


def _size_fit_score(candidate: Candidate, profile: Dict[str, Any]) -> float:
    score = 70.0
    if candidate.length_mm and profile.get("length_mm"):
        length_diff = abs(float(candidate.length_mm) - float(profile["length_mm"]))
        score += max(0.0, 24.0 - (length_diff * 1.1))
    if candidate.width_mm and profile.get("width_mm"):
        width_diff = abs(float(candidate.width_mm) - float(profile["width_mm"]))
        score += max(0.0, 24.0 - (width_diff * 1.7))
    if profile.get("targetWeight") and candidate.weight_g:
        target = profile["targetWeight"]
        min_w = target.get("min")
        max_w = target.get("max")
        if min_w and candidate.weight_g < min_w:
            score -= (min_w - candidate.weight_g) * 0.8
        if max_w and candidate.weight_g > max_w:
            score -= (candidate.weight_g - max_w) * 0.9
    weight_pref = str(profile.get("weightPreference") or "").lower()
    if candidate.weight_g and weight_pref in {"lighter", "heavier"}:
        if weight_pref == "lighter":
            score += max(0.0, 16.0 - max(0.0, candidate.weight_g - 55.0) * 0.55)
        else:
            score += max(0.0, 16.0 - max(0.0, 75.0 - candidate.weight_g) * 0.35)
    return max(0.0, min(100.0, score))


def _fmt_mm(value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    return f"{float(value):.1f}".rstrip("0").rstrip(".")


def _fmt_g(value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    return f"{float(value):.1f}".rstrip("0").rstrip(".")


def _build_fit_reason(
    candidate: Candidate,
    profile: Dict[str, Any],
    source_index: Optional[Dict[str, FitSource]] = None,
    citations: Optional[List[str]] = None,
) -> str:
    parts: List[str] = []

    profile_length = profile.get("length_mm")
    profile_width = profile.get("width_mm")
    if candidate.length_mm is not None and profile_length is not None:
        diff = abs(float(candidate.length_mm) - float(profile_length))
        parts.append(
            f"Length {(_fmt_mm(candidate.length_mm) or '?')}mm is {(_fmt_mm(diff) or '?')}mm from your hand length"
        )
    if candidate.width_mm is not None and profile_width is not None:
        diff = abs(float(candidate.width_mm) - float(profile_width))
        parts.append(f"Width {(_fmt_mm(candidate.width_mm) or '?')}mm is close to your hand width")

    grip = str(profile.get("grip") or "").lower()
    if grip:
        shape = (candidate.shape or "").lower()
        if grip == "fingertip":
            if candidate.weight_g is not None and float(candidate.weight_g) <= 65:
                parts.append("Low weight supports fingertip micro-adjustments")
            elif candidate.weight_g is not None:
                parts.append("Weight is manageable but less ideal for fingertip play")
            else:
                parts.append("Shape and size profile can work for fingertip use")
        elif grip == "claw":
            if shape == "sym":
                parts.append("Symmetrical shell is typically stable for claw grip")
            else:
                parts.append("Body proportions fit a claw-oriented hand posture")
        elif grip == "palm":
            if shape == "ergo":
                parts.append("Ergonomic shell supports fuller palm contact")
            else:
                parts.append("Overall size can provide stable palm support")

    weight_pref = str(profile.get("weightPreference") or "").lower()
    if candidate.weight_g is not None and weight_pref in {"lighter", "heavier"}:
        if weight_pref == "lighter":
            parts.append(f"At {(_fmt_g(candidate.weight_g) or '?')}g it aligns with your lighter preference")
        else:
            parts.append(f"At {(_fmt_g(candidate.weight_g) or '?')}g it aligns with your heavier preference")

    wireless_pref = profile.get("wireless")
    if wireless_pref is True:
        parts.append("Matches your wireless preference")
    elif wireless_pref is False:
        parts.append("Matches your wired preference")

    if source_index and citations:
        evidence_hits = []
        for cid in citations:
            source = source_index.get(cid)
            if source and source.kind in {"rag", "web"}:
                evidence_hits.append(source.kind.upper())
        if evidence_hits:
            kinds = sorted(set(evidence_hits))
            parts.append(f"Supported by {' + '.join(kinds)} evidence")

    if not parts:
        return "Overall dimensions are a strong match for your hand profile."
    return "; ".join(parts[:4]) + "."


def _web_search_sources(query: str, limit: int = 3) -> List[FitSource]:
    params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
    try:
        resp = _SESSION.get("https://api.duckduckgo.com/", params=params, timeout=8)
        if not resp.ok:
            return []
        data = resp.json()
    except Exception:
        return []

    out: List[FitSource] = []

    abstract = str(data.get("AbstractText") or "").strip()
    abstract_url = str(data.get("AbstractURL") or "").strip()
    heading = str(data.get("Heading") or "Web source").strip()
    if abstract and abstract_url:
        out.append(
            FitSource(
                id=f"web-{_slug(heading)}-0",
                title=heading,
                url=abstract_url,
                kind="web",
                snippet=abstract,
            )
        )

    def flatten(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        flat: List[Dict[str, Any]] = []
        for item in items:
            topics = item.get("Topics") if isinstance(item, dict) else None
            if isinstance(topics, list):
                flat.extend(flatten(topics))
            elif isinstance(item, dict):
                flat.append(item)
        return flat

    related = flatten(data.get("RelatedTopics") or [])
    for idx, item in enumerate(related):
        if len(out) >= limit:
            break
        text = str(item.get("Text") or "").strip()
        url = str(item.get("FirstURL") or "").strip()
        if not text or not url:
            continue
        title = text.split(" - ")[0].strip() or "Related source"
        out.append(
            FitSource(
                id=f"web-{_slug(title)}-{idx+1}",
                title=title,
                url=url,
                kind="web",
                snippet=text,
            )
        )

    return out[:limit]


def _fallback_rank(candidates: List[Candidate], profile: Dict[str, Any], top_k: int) -> List[Dict[str, Any]]:
    scored = []
    for candidate in candidates:
        score = _size_fit_score(candidate, profile)
        citations = [candidate.id]
        reason = _build_fit_reason(candidate, profile, citations=citations)
        scored.append({"id": candidate.id, "score": score, "reason": reason, "citations": citations})
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:top_k]


def _load_dataset_candidates(limit: int = 120) -> List[Candidate]:
    path = Path(__file__).resolve().parents[2] / "data" / "mice.json"
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    out: List[Candidate] = []
    for item in raw[:limit]:
        brand = str(item.get("brand") or "").strip()
        model = str(item.get("model") or "").strip()
        if not brand or not model:
            continue
        cid = str(item.get("id") or _slug(f"{brand}-{model}"))
        out.append(
            Candidate(
                id=cid.lower(),
                brand=brand,
                model=model,
                length_mm=item.get("length_mm"),
                width_mm=item.get("width_mm"),
                height_mm=item.get("height_mm"),
                weight_g=item.get("weight_g"),
                shape=item.get("shape"),
            )
        )
    return out


@router.post("/api/rag/query", response_model=RagAnswer)
def rag_query(payload: RagQuery) -> RagAnswer:
    sources = retrieve(payload.query, payload.prefs, payload.top_k)
    if not sources:
        return RagAnswer(answer="No sources available.", sources=[])

    context = _build_context(sources, max_lines=18)
    try:
        answer = _call_google(
            [
                {"role": "system", "content": RAG_SYSTEM},
                {"role": "system", "content": f"CONTEXT:\n{context}"},
                {"role": "user", "content": payload.query},
            ],
            temperature=0.2,
        )
    except HTTPException:
        answer = " ".join(source.text.split("\n")[0] for source in sources[:3])

    return RagAnswer(answer=answer, sources=sources)


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

    reply = _call_google(
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

    reply = _call_google(
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


@router.post("/api/fit/recommend", response_model=FitResponse)
def fit_recommend(payload: FitRequest) -> FitResponse:
    profile = payload.profile.model_dump()
    top_k = max(1, min(3, int(payload.top_k or 3)))
    query = _profile_to_query(profile) or "gaming mouse fit"
    prefs = RagPreferences(
        grip=payload.profile.grip,
        wireless=payload.profile.wireless,
        targetWeight=payload.profile.targetWeight,
    )

    docs = retrieve(query, prefs=prefs, k=max(top_k * 10, int(payload.candidate_k or 36)))
    docs = [doc for doc in docs if _is_mouse_doc(doc.text)]

    doc_by_id: Dict[str, RagSource] = {}
    candidates: List[Candidate] = []
    for doc in docs:
        candidate = _normalize_doc(doc)
        if not (candidate.brand and candidate.model):
            continue
        if candidate.id in doc_by_id:
            continue
        doc_by_id[candidate.id] = doc
        candidates.append(candidate)

    if not candidates:
        seed = _load_dataset_candidates()
        if not seed:
            raise HTTPException(status_code=404, detail="No mouse candidates found from RAG or dataset.")
        candidates = seed

    candidates.sort(key=lambda c: _size_fit_score(c, profile), reverse=True)
    preselected = candidates[:12]

    sources: List[FitSource] = []
    for candidate in preselected:
        src = doc_by_id.get(candidate.id)
        if not src:
            continue
        first_line = (src.text.split("\n")[0] or f"{candidate.brand} {candidate.model}").strip()
        snippet = " ".join(src.text.split("\n")[:2]).strip()
        sources.append(
            FitSource(
                id=candidate.id,
                title=first_line,
                kind="rag",
                snippet=snippet,
            )
        )

    web_sources: List[FitSource] = []
    for candidate in preselected[:4]:
        name = f"{candidate.brand} {candidate.model}".strip()
        web_sources.extend(_web_search_sources(f"{name} mouse dimensions weight review", limit=2))
    source_index: Dict[str, FitSource] = {}
    for item in [*sources, *web_sources]:
        if item.id not in source_index:
            source_index[item.id] = item

    provider = "rule-based"
    model = "none"
    ranked: List[Dict[str, Any]] = []
    llm_mode = str(payload.llm_mode or "auto").strip().lower()
    if llm_mode not in {"auto", "xai_only", "google_only", "groq_only", "rule_only"}:
        llm_mode = "auto"

    source_payload = [
        {
            "id": src.id,
            "title": src.title,
            "kind": src.kind,
            "url": src.url,
            "snippet": src.snippet,
        }
        for src in source_index.values()
    ]

    if llm_mode != "rule_only":
        prefer_xai = llm_mode not in {"google_only", "groq_only"}
        provider_hint = (
            "xai"
            if llm_mode == "xai_only"
            else ("google" if llm_mode == "google_only" else ("groq" if llm_mode == "groq_only" else None))
        )
        forced_model = payload.llm_model
        if not forced_model:
            if llm_mode == "xai_only":
                forced_model = config.XAI_DEFAULT_MODEL
            elif llm_mode == "google_only":
                forced_model = config.GOOGLE_DEFAULT_MODEL
            elif llm_mode == "groq_only":
                forced_model = config.GROQ_DEFAULT_MODEL
        try:
            reply, provider, model = _call_model(
                [
                    {"role": "system", "content": FIT_SYSTEM},
                    {
                        "role": "user",
                        "content": (
                            f"PROFILE:\n{json.dumps(profile, indent=2)}\n\n"
                            f"CANDIDATES:\n{json.dumps([c.model_dump() for c in preselected], indent=2)}\n\n"
                            f"SOURCES:\n{json.dumps(source_payload, indent=2)}\n\n"
                            f"Return top {top_k}."
                        ),
                    },
                ],
                model=forced_model,
                temperature=0.2,
                response_format={"type": "json_object"},
                prefer_xai=prefer_xai,
                provider_hint=provider_hint,
            )
            parsed = _parse_json_object_from_text(reply)
            ranked = parsed.get("ranked") if isinstance(parsed.get("ranked"), list) else []
            if not ranked:
                raise ValueError("LLM returned no ranked recommendations")
        except Exception as exc:
            if payload.allow_fallback:
                provider = "rule-based"
                model = "none"
                ranked = _fallback_rank(preselected, profile, top_k)
            else:
                raise HTTPException(status_code=502, detail=f"LLM ranking failed: {exc}")
    else:
        ranked = _fallback_rank(preselected, profile, top_k)

    candidate_index = {c.id: c for c in preselected}
    cleaned_ranked: List[Dict[str, Any]] = []
    seen = set()
    for item in ranked:
        cid = str(item.get("id") or "")
        if cid in seen or cid not in candidate_index:
            continue
        seen.add(cid)
        citations = [str(c) for c in (item.get("citations") or []) if str(c) in source_index]
        default_reason = _build_fit_reason(
            candidate_index[cid],
            profile,
            source_index=source_index,
            citations=citations or [cid],
        )
        raw_reason = str(item.get("reason") or "").strip()
        final_reason = raw_reason or default_reason
        cleaned_ranked.append(
            {
                "id": cid,
                "score": float(item.get("score") or _size_fit_score(candidate_index[cid], profile)),
                "reason": final_reason,
                "citations": citations,
            }
        )

    if len(cleaned_ranked) < top_k:
        for candidate in preselected:
            if candidate.id in seen:
                continue
            seen.add(candidate.id)
            cleaned_ranked.append(
                {
                    "id": candidate.id,
                    "score": _size_fit_score(candidate, profile),
                    "reason": _build_fit_reason(candidate, profile, source_index=source_index, citations=[candidate.id]),
                    "citations": [candidate.id],
                }
            )
            if len(cleaned_ranked) >= top_k:
                break

    cleaned_ranked.sort(key=lambda item: item["score"], reverse=True)
    cleaned_ranked = cleaned_ranked[:top_k]

    recommendations: List[FitRecommendation] = []
    for item in cleaned_ranked:
        candidate = candidate_index[item["id"]]
        recommendations.append(
            FitRecommendation(
                id=candidate.id,
                brand=candidate.brand,
                model=candidate.model,
                score=max(0.0, min(100.0, float(item["score"]))),
                reason=item["reason"],
                length_mm=candidate.length_mm,
                width_mm=candidate.width_mm,
                height_mm=candidate.height_mm,
                weight_g=candidate.weight_g,
                citations=item["citations"] or [candidate.id],
            )
        )

    return FitResponse(
        recommendations=recommendations,
        sources=list(source_index.values())[:24],
        provider=provider,
        model=model,
    )


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

