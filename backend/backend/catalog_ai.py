from __future__ import annotations

import json
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence

from backend import config
from backend.db.pool import get_conn

try:
    import psycopg
    from psycopg.rows import dict_row
except Exception:  # pragma: no cover - optional in limited environments
    psycopg = None  # type: ignore[assignment]
    dict_row = None  # type: ignore[assignment]

ChatLlmFn = Callable[[List[Dict[str, Any]], float, Optional[Dict[str, Any]]], str]

_CATALOG_CACHE_LOCK = threading.Lock()
_CATALOG_CACHE: List[Dict[str, Any]] | None = None
_CATALOG_CACHE_EXPIRES_AT = 0.0

_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "best",
    "between",
    "but",
    "by",
    "compare",
    "for",
    "from",
    "give",
    "help",
    "i",
    "if",
    "in",
    "is",
    "it",
    "me",
    "mouse",
    "mice",
    "my",
    "need",
    "of",
    "on",
    "or",
    "recommend",
    "show",
    "shortlist",
    "should",
    "the",
    "these",
    "this",
    "to",
    "understand",
    "want",
    "what",
    "which",
    "with",
}


@dataclass
class ChatIntent:
    latest_user: str
    conversation: str
    compare_requested: bool = False
    grips: List[str] = field(default_factory=list)
    hand_sizes: List[str] = field(default_factory=list)
    shapes: List[str] = field(default_factory=list)
    wireless: Optional[bool] = None
    handedness: Optional[str] = None
    max_weight_g: Optional[float] = None
    budget_max_usd: Optional[float] = None
    priorities: List[str] = field(default_factory=list)
    candidate_names: List[str] = field(default_factory=list)
    derived_hand_length_cm: Optional[float] = None
    derived_hand_width_cm: Optional[float] = None


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def _safe_float(value: Any) -> Optional[float]:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    return []


def _display_name(mouse: Dict[str, Any]) -> str:
    parts = [mouse.get("brand"), mouse.get("model"), mouse.get("variant")]
    return " ".join(str(part).strip() for part in parts if str(part or "").strip()).strip() or str(mouse.get("id") or "Unknown mouse")


def _mouse_search_text(mouse: Dict[str, Any]) -> str:
    parts: List[str] = [
        str(mouse.get("id") or ""),
        str(mouse.get("brand") or ""),
        str(mouse.get("model") or ""),
        str(mouse.get("variant") or ""),
        str(mouse.get("shape") or ""),
        str(mouse.get("hump") or ""),
        str(mouse.get("side_profile") or ""),
        str(mouse.get("hand_compatibility") or ""),
        str(mouse.get("availability_status") or ""),
    ]
    parts.extend(_as_list(mouse.get("grips")))
    parts.extend(_as_list(mouse.get("hands")))
    return _normalize(" ".join(parts))


def _load_catalog_from_db() -> List[Dict[str, Any]]:
    if psycopg is None or dict_row is None or not config.DATABASE_URL:
        return []
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        id,
                        brand,
                        model,
                        variant,
                        length_mm,
                        width_mm,
                        height_mm,
                        weight_g,
                        wired,
                        shape,
                        hump,
                        grips,
                        hands,
                        product_url,
                        image_url,
                        availability_status,
                        side_profile,
                        hand_compatibility,
                        brand_discount,
                        discount_code,
                        price_usd
                    FROM mice
                    ORDER BY brand, model, variant NULLS FIRST
                    """
                )
                return [dict(row) for row in cur.fetchall()]
    except Exception:
        return []


def _load_catalog_from_json() -> List[Dict[str, Any]]:
    path = config.DATASET_DIR / "mice.json"
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(payload, list):
        return []
    rows: List[Dict[str, Any]] = []
    for item in payload:
        if isinstance(item, dict):
            rows.append(item)
    return rows


def load_catalog_mice() -> List[Dict[str, Any]]:
    global _CATALOG_CACHE, _CATALOG_CACHE_EXPIRES_AT
    now = time.monotonic()
    if _CATALOG_CACHE is not None and now < _CATALOG_CACHE_EXPIRES_AT:
        return _CATALOG_CACHE
    with _CATALOG_CACHE_LOCK:
        now = time.monotonic()
        if _CATALOG_CACHE is not None and now < _CATALOG_CACHE_EXPIRES_AT:
            return _CATALOG_CACHE
        rows = _load_catalog_from_db() or _load_catalog_from_json()
        _CATALOG_CACHE = rows
        _CATALOG_CACHE_EXPIRES_AT = time.monotonic() + config.CATALOG_CACHE_TTL_SECONDS
        return rows


def _parse_hand_measurements(text: str) -> tuple[Optional[float], Optional[float]]:
    match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(cm|mm)?(?:\s*(?:hand|hands))?",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None, None
    length = float(match.group(1))
    width = float(match.group(2))
    unit = (match.group(3) or "cm").lower()
    if unit == "mm":
        length /= 10.0
        width /= 10.0
    return length, width


def _derive_hand_size(length_cm: Optional[float], width_cm: Optional[float]) -> Optional[str]:
    if length_cm is None and width_cm is None:
        return None
    score = 0.0
    if length_cm is not None:
        score += length_cm * 0.7
    if width_cm is not None:
        score += width_cm * 0.3
    if score < 17.8:
        return "small"
    if score < 19.8:
        return "medium"
    return "large"


def _parse_preferences_from_text(text: str) -> ChatIntent:
    normalized = _normalize(text)
    latest_user = text.strip()
    intent = ChatIntent(
        latest_user=latest_user,
        conversation=text.strip(),
        compare_requested=bool(re.search(r"\b(compare|versus|vs|difference)\b", normalized)),
    )

    if "relaxed claw" in normalized:
        intent.grips.append("claw")
        intent.priorities.append("relaxed claw")
    for grip in ("claw", "palm", "fingertip"):
        if re.search(rf"\b{re.escape(grip)}\b", normalized):
            intent.grips.append(grip)

    if any(term in normalized for term in ("symmetrical", "symmetric", "sym ", "symm", "ambidextrous", "ambi")):
        intent.shapes.append("sym")
    if any(term in normalized for term in ("ergonomic", "ergo")):
        intent.shapes.append("ergo")

    for size in ("small", "medium", "large"):
        if re.search(rf"\b{size}\s+hands?\b", normalized):
            intent.hand_sizes.append(size)

    length_cm, width_cm = _parse_hand_measurements(text)
    intent.derived_hand_length_cm = length_cm
    intent.derived_hand_width_cm = width_cm
    derived_size = _derive_hand_size(length_cm, width_cm)
    if derived_size and derived_size not in intent.hand_sizes:
        intent.hand_sizes.append(derived_size)

    if "wireless" in normalized and "wired" not in normalized:
        intent.wireless = True
    elif "wired" in normalized:
        intent.wireless = False

    if "left handed" in normalized or "left-handed" in normalized:
        intent.handedness = "left"
    elif "right handed" in normalized or "right-handed" in normalized:
        intent.handedness = "right"
    elif "ambidextrous" in normalized:
        intent.handedness = "ambidextrous"

    weight_match = re.search(r"(?:under|below|less than|max(?:imum)? of)\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)", normalized)
    if weight_match:
        intent.max_weight_g = float(weight_match.group(1))
    else:
        around_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:g|grams?)", normalized)
        if around_match and any(term in normalized for term in ("light", "lighter", "lightweight", "under", "below")):
            intent.max_weight_g = float(around_match.group(1))

    budget_match = re.search(r"(?:under|below|less than|max(?:imum)? of)\s*\$?\s*(\d+(?:\.\d+)?)", normalized)
    if budget_match and "$" in text:
        intent.budget_max_usd = float(budget_match.group(1))

    for priority in ("lightweight", "lighter", "small", "smaller", "large", "larger", "control", "comfort"):
        if priority in normalized:
            intent.priorities.append(priority)

    compare_match = re.search(
        r"(?:compare|difference between)\s+(.+?)\s+(?:vs|versus|and)\s+(.+?)(?:$|\s+for\b|\s+with\b|\s+under\b|\s+which\b|\s+what\b|\?)",
        text,
        re.IGNORECASE,
    )
    if compare_match:
        for group in (compare_match.group(1), compare_match.group(2)):
            candidate_name = str(group).strip(" ,.?")
            if candidate_name:
                intent.candidate_names.append(candidate_name)
    else:
        versus_match = re.search(
            r"(.+?)\s+(?:vs|versus)\s+(.+?)(?:$|\s+for\b|\s+with\b|\s+under\b|\s+which\b|\s+what\b|\?)",
            text,
            re.IGNORECASE,
        )
        if versus_match:
            for group in (versus_match.group(1), versus_match.group(2)):
                candidate_name = str(group).strip(" ,.?")
                if candidate_name:
                    intent.candidate_names.append(candidate_name)

    return intent


def _extract_intent_with_llm(conversation: str, llm_call: Optional[ChatLlmFn]) -> Dict[str, Any]:
    if llm_call is None:
        return {}
    reply = llm_call(
        [
            {
                "role": "system",
                "content": (
                    "Extract mouse-shopping intent from the conversation. "
                    "Return strict JSON only with keys: compare_requested, candidate_names, grip, hand_size, "
                    "shape, wireless, handedness, max_weight_g, budget_max_usd, priorities."
                ),
            },
            {
                "role": "user",
                "content": f"Conversation:\n{conversation}",
            },
        ],
        0.1,
        {"type": "json_object"},
    )
    try:
        payload = json.loads(reply or "{}")
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _merge_intent(intent: ChatIntent, llm_data: Dict[str, Any]) -> ChatIntent:
    if not llm_data:
        return intent

    compare_requested = llm_data.get("compare_requested")
    if isinstance(compare_requested, bool):
        intent.compare_requested = intent.compare_requested or compare_requested

    grip = str(llm_data.get("grip") or "").strip().lower()
    if grip in {"claw", "palm", "fingertip"} and grip not in intent.grips:
        intent.grips.append(grip)

    hand_size = str(llm_data.get("hand_size") or "").strip().lower()
    if hand_size in {"small", "medium", "large"} and hand_size not in intent.hand_sizes:
        intent.hand_sizes.append(hand_size)

    shape = str(llm_data.get("shape") or "").strip().lower()
    if shape in {"sym", "ergo"} and shape not in intent.shapes:
        intent.shapes.append(shape)

    wireless = llm_data.get("wireless")
    if isinstance(wireless, bool):
        intent.wireless = wireless

    handedness = str(llm_data.get("handedness") or "").strip().lower()
    if handedness in {"left", "right", "ambidextrous"}:
        intent.handedness = handedness

    max_weight = _safe_float(llm_data.get("max_weight_g"))
    if max_weight is not None:
        intent.max_weight_g = max_weight

    budget_max = _safe_float(llm_data.get("budget_max_usd"))
    if budget_max is not None:
        intent.budget_max_usd = budget_max

    priorities = llm_data.get("priorities")
    if isinstance(priorities, list):
        for value in priorities:
            text = str(value).strip().lower()
            if text and text not in intent.priorities:
                intent.priorities.append(text)

    candidate_names = llm_data.get("candidate_names")
    if isinstance(candidate_names, list):
        for value in candidate_names:
            text = str(value).strip()
            if text and text not in intent.candidate_names:
                intent.candidate_names.append(text)

    return intent


def _find_mentioned_mice(catalog: Sequence[Dict[str, Any]], intent: ChatIntent) -> List[Dict[str, Any]]:
    normalized_query = _normalize(intent.conversation)
    name_hints = [_normalize(value) for value in intent.candidate_names if value.strip()]
    matches: List[tuple[int, Dict[str, Any]]] = []

    def score_hint(mouse: Dict[str, Any], hint: str) -> int:
        if not hint:
            return 0
        display_name = _normalize(_display_name(mouse))
        mouse_id = _normalize(str(mouse.get("id") or ""))
        brand = _normalize(str(mouse.get("brand") or ""))
        model = _normalize(str(mouse.get("model") or ""))
        if hint == display_name:
            return 3000 + len(hint)
        if hint == model:
            return 2900 + len(hint)
        if hint == mouse_id:
            return 2800 + len(hint)
        if display_name.endswith(f" {hint}") or hint in display_name:
            return 2600 + len(hint)
        if model and hint in model:
            return 2500 + len(hint)
        if brand and model and brand in hint and model in hint:
            return 2400 + len(hint)
        return 0

    if name_hints:
        unique_from_hints: List[Dict[str, Any]] = []
        seen_ids: set[str] = set()
        for hint in name_hints:
            best_score = 0
            best_mouse: Optional[Dict[str, Any]] = None
            for mouse in catalog:
                candidate_score = score_hint(mouse, hint)
                if candidate_score > best_score:
                    best_score = candidate_score
                    best_mouse = mouse
            if best_mouse is None:
                continue
            mouse_id = str(best_mouse.get("id") or "")
            if mouse_id in seen_ids:
                continue
            seen_ids.add(mouse_id)
            unique_from_hints.append(best_mouse)
        if unique_from_hints:
            return unique_from_hints[:4]

    for mouse in catalog:
        display_name = _normalize(_display_name(mouse))
        mouse_id = _normalize(str(mouse.get("id") or ""))
        brand = _normalize(str(mouse.get("brand") or ""))
        model = _normalize(str(mouse.get("model") or ""))
        score = 0
        if display_name and display_name in normalized_query:
            score = max(score, 1200 + len(display_name))
        if mouse_id and mouse_id in normalized_query:
            score = max(score, 1100 + len(mouse_id))
        if brand and model and brand in normalized_query and model in normalized_query:
            score = max(score, 1000 + len(model))
        if model and len(model.split()) >= 2 and model in normalized_query:
            score = max(score, 950 + len(model))
        for hint in name_hints:
            if hint and (hint in display_name or display_name in hint or hint == mouse_id):
                score = max(score, 1300 + len(hint))
        if score > 0:
            matches.append((score, mouse))

    matches.sort(key=lambda item: item[0], reverse=True)
    unique: List[Dict[str, Any]] = []
    seen_ids: set[str] = set()
    for _, mouse in matches:
        mouse_id = str(mouse.get("id") or "")
        if mouse_id in seen_ids:
            continue
        seen_ids.add(mouse_id)
        unique.append(mouse)
        if len(unique) >= 4:
            break
    return unique


def _tokenize_query(text: str) -> List[str]:
    tokens = [token for token in _normalize(text).split() if token and token not in _STOPWORDS and not token.isdigit()]
    return tokens


def _score_mouse(mouse: Dict[str, Any], intent: ChatIntent, query_tokens: Sequence[str], mentioned_ids: set[str]) -> tuple[float, List[str]]:
    score = 0.0
    reasons: List[str] = []
    mouse_id = str(mouse.get("id") or "")
    grips = [value.lower() for value in _as_list(mouse.get("grips"))]
    hands = [value.lower() for value in _as_list(mouse.get("hands"))]
    hand_compatibility = str(mouse.get("hand_compatibility") or "").lower()
    shape = str(mouse.get("shape") or "").lower()
    title_text = _mouse_search_text(mouse)

    if mouse_id in mentioned_ids:
        score += 500.0
        reasons.append("explicitly mentioned in your question")

    overlap = sum(1 for token in query_tokens if token in title_text)
    if overlap:
        score += overlap * 3.0

    if intent.grips:
        matched = [grip for grip in intent.grips if grip in grips or grip in hand_compatibility]
        if matched:
            score += 24.0 + 4.0 * len(matched)
            reasons.append(f"supports {', '.join(matched)} grip")
        else:
            score -= 6.0

    if intent.hand_sizes:
        matched_sizes = [size for size in intent.hand_sizes if size in hands or size in hand_compatibility]
        if matched_sizes:
            score += 20.0 + 3.0 * len(matched_sizes)
            reasons.append(f"listed for {', '.join(matched_sizes)} hands")
        else:
            score -= 4.0

    if intent.shapes:
        matched_shapes = [requested for requested in intent.shapes if requested in shape]
        if matched_shapes:
            score += 18.0
            reasons.append(f"matches your {matched_shapes[0]} shape preference")
        else:
            score -= 8.0

    wired = mouse.get("wired")
    if intent.wireless is True:
        if wired is False:
            score += 14.0
            reasons.append("is wireless")
        elif wired is True:
            score -= 10.0
    elif intent.wireless is False:
        if wired is True:
            score += 12.0
            reasons.append("is wired")
        elif wired is False:
            score -= 8.0

    if intent.handedness:
        if intent.handedness in hand_compatibility:
            score += 10.0
            reasons.append(f"fits {intent.handedness}-hand use")
        elif intent.handedness == "ambidextrous" and "ambi" in shape:
            score += 10.0
            reasons.append("has an ambidextrous shape")

    weight_g = _safe_float(mouse.get("weight_g"))
    if intent.max_weight_g is not None:
        if weight_g is None:
            score -= 3.0
        elif weight_g <= intent.max_weight_g:
            score += 16.0 + max(0.0, 10.0 - (intent.max_weight_g - weight_g) * 0.35)
            reasons.append(f"stays under {intent.max_weight_g:g} g")
        else:
            score -= min(28.0, (weight_g - intent.max_weight_g) * 1.8)

    if any(priority in intent.priorities for priority in ("lightweight", "lighter")) and weight_g is not None:
        score += max(0.0, 18.0 - weight_g / 4.5)

    length_mm = _safe_float(mouse.get("length_mm"))
    if any(priority in intent.priorities for priority in ("small", "smaller")) and length_mm is not None:
        score += max(0.0, 14.0 - max(0.0, length_mm - 112.0) * 0.5)
    if any(priority in intent.priorities for priority in ("large", "larger")) and length_mm is not None:
        score += max(0.0, 14.0 - max(0.0, 124.0 - length_mm) * 0.6)

    price_usd = _safe_float(mouse.get("price_usd"))
    if intent.budget_max_usd is not None:
        if price_usd is None:
            score -= 1.0
        elif price_usd <= intent.budget_max_usd:
            score += 10.0
            reasons.append(f"is within your ${intent.budget_max_usd:g} budget")
        else:
            score -= 14.0

    availability = str(mouse.get("availability_status") or "").lower()
    if availability == "available":
        score += 3.0

    if not reasons:
        reasons.append("is one of the closest matches in the current MouseFit catalog")

    return score, reasons


def _spec_summary(mouse: Dict[str, Any]) -> str:
    parts: List[str] = []
    dims = [_safe_float(mouse.get("length_mm")), _safe_float(mouse.get("width_mm")), _safe_float(mouse.get("height_mm"))]
    if all(value is not None for value in dims):
        parts.append(f"{dims[0]:g} x {dims[1]:g} x {dims[2]:g} mm")
    weight_g = _safe_float(mouse.get("weight_g"))
    if weight_g is not None:
        parts.append(f"{weight_g:g} g")
    shape = str(mouse.get("shape") or "").strip()
    if shape:
        parts.append(shape)
    wired = mouse.get("wired")
    if wired is True:
        parts.append("wired")
    elif wired is False:
        parts.append("wireless")
    return ", ".join(parts) if parts else "spec data is limited in the current catalog"


def _rank_sort_key(item: Dict[str, Any]) -> tuple[float, float]:
    weight_g = _safe_float(item["mouse"].get("weight_g"))
    return (float(item["score"]), -(weight_g if weight_g is not None else 9999.0))


def _shortlist(catalog: Sequence[Dict[str, Any]], intent: ChatIntent) -> List[Dict[str, Any]]:
    mentioned = _find_mentioned_mice(catalog, intent)
    mentioned_ids = {str(mouse.get("id") or "") for mouse in mentioned}
    query_tokens = _tokenize_query(intent.conversation)

    if intent.compare_requested and len(mentioned) >= 2:
        scored_mentions: List[Dict[str, Any]] = []
        for mouse in mentioned[:3]:
            score, reasons = _score_mouse(mouse, intent, query_tokens, mentioned_ids)
            scored_mentions.append({"mouse": mouse, "score": score, "reasons": reasons})
        scored_mentions.sort(key=_rank_sort_key, reverse=True)
        return scored_mentions

    scored: List[Dict[str, Any]] = []
    for mouse in catalog:
        score, reasons = _score_mouse(mouse, intent, query_tokens, mentioned_ids)
        if score <= -25.0:
            continue
        scored.append({"mouse": mouse, "score": score, "reasons": reasons})
    scored.sort(key=_rank_sort_key, reverse=True)
    return scored[:6]


def _deterministic_compare_reply(intent: ChatIntent, shortlisted: Sequence[Dict[str, Any]], catalog_size: int) -> str:
    if len(shortlisted) < 2:
        return _deterministic_shortlist_reply(intent, shortlisted, catalog_size)

    lines = [f"Based on the current MouseFit database ({catalog_size} mice), here is the direct comparison:"]
    for item in shortlisted[:2]:
        mouse = item["mouse"]
        name = _display_name(mouse)
        reason = "; ".join(item["reasons"][:2])
        lines.append(f"- {name}: {_spec_summary(mouse)}. Why it fits: {reason}.")

    winner = shortlisted[0]
    winner_name = _display_name(winner["mouse"])
    lines.append("")
    lines.append(f"My pick: {winner_name}. It edges out the other option because {'; '.join(winner['reasons'][:3])}.")

    if intent.budget_max_usd is not None and all(_safe_float(item["mouse"].get("price_usd")) is None for item in shortlisted[:2]):
        lines.append("Price data is missing for these entries in the current database, so budget was not used in the final decision.")
    note = _support_note(shortlisted[:2], intent)
    if note:
        lines.append(note)

    return "\n".join(lines)


def _deterministic_shortlist_reply(intent: ChatIntent, shortlisted: Sequence[Dict[str, Any]], catalog_size: int) -> str:
    if not shortlisted:
        return (
            f"I could not find a confident match in the current MouseFit database ({catalog_size} mice). "
            "Tell me your grip, hand size, wireless or wired preference, and weight target, and I can narrow it down."
        )

    lines = [f"Based on the current MouseFit database ({catalog_size} mice), these are the strongest matches:"]
    for index, item in enumerate(shortlisted[:3], start=1):
        mouse = item["mouse"]
        name = _display_name(mouse)
        reason = "; ".join(item["reasons"][:3])
        lines.append(f"{index}. {name} - {_spec_summary(mouse)}. Why it matches: {reason}.")

    top = shortlisted[0]
    top_name = _display_name(top["mouse"])
    lines.append("")
    lines.append(f"My top recommendation right now is {top_name} because {'; '.join(top['reasons'][:3])}.")

    if intent.budget_max_usd is not None and all(_safe_float(item["mouse"].get("price_usd")) is None for item in shortlisted[:3]):
        lines.append("Price data is missing for most of the current catalog, so I did not use price as a deciding factor.")
    note = _support_note(shortlisted[:3], intent)
    if note:
        lines.append(note)

    return "\n".join(lines)


def _support_note(shortlisted: Sequence[Dict[str, Any]], intent: ChatIntent) -> Optional[str]:
    if not shortlisted:
        return None
    asked_for_fit_tags = bool(intent.grips or intent.hand_sizes)
    if not asked_for_fit_tags:
        return None
    has_grip_tags = any(_as_list(item["mouse"].get("grips")) for item in shortlisted)
    has_hand_tags = any(_as_list(item["mouse"].get("hands")) for item in shortlisted)
    if has_grip_tags or has_hand_tags:
        return None
    return (
        "The current database has limited grip and hand-size tags for these mice, "
        "so the ranking leaned more on the available shape, weight, size, and wired/wireless data."
    )


def _llm_ready_candidates(shortlisted: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for item in shortlisted[:4]:
        mouse = item["mouse"]
        out.append(
            {
                "id": mouse.get("id"),
                "name": _display_name(mouse),
                "shape": mouse.get("shape"),
                "weight_g": _safe_float(mouse.get("weight_g")),
                "dimensions_mm": {
                    "length": _safe_float(mouse.get("length_mm")),
                    "width": _safe_float(mouse.get("width_mm")),
                    "height": _safe_float(mouse.get("height_mm")),
                },
                "wired": mouse.get("wired"),
                "grips": _as_list(mouse.get("grips")),
                "hands": _as_list(mouse.get("hands")),
                "hand_compatibility": mouse.get("hand_compatibility"),
                "availability_status": mouse.get("availability_status"),
                "price_usd": _safe_float(mouse.get("price_usd")),
                "decision_reasons": item["reasons"][:4],
            }
        )
    return out


def _render_with_llm(intent: ChatIntent, shortlisted: Sequence[Dict[str, Any]], catalog_size: int, llm_call: Optional[ChatLlmFn]) -> Optional[str]:
    if llm_call is None or not shortlisted:
        return None
    facts = json.dumps(_llm_ready_candidates(shortlisted), indent=2)
    try:
        return llm_call(
            [
                {
                    "role": "system",
                    "content": (
                        "You are MouseFit AI. Answer using only the provided catalog facts. "
                        "Do not invent mice, specs, prices, or compatibility. "
                        "If data is missing, say it is missing. Make a direct recommendation."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"User request:\n{intent.latest_user}\n\n"
                        f"Catalog size: {catalog_size}\n"
                        f"Compare mode: {intent.compare_requested}\n"
                        f"Grounded candidates:\n{facts}\n\n"
                        "Write a concise natural-language answer with a clear best pick and why."
                    ),
                },
            ],
            0.2,
            None,
        ).strip() or None
    except Exception:
        return None


def generate_catalog_chat_reply(messages: List[Dict[str, Any]], llm_call: Optional[ChatLlmFn] = None) -> str:
    user_messages = [str(message.get("content") or "").strip() for message in messages if message.get("role") == "user" and str(message.get("content") or "").strip()]
    if not user_messages:
        return "Ask about grip, shape, hand size, weight, or a mouse comparison, and I will answer from the current MouseFit database."

    recent_conversation = "\n".join(user_messages[-4:])
    intent = _parse_preferences_from_text(recent_conversation)
    intent.latest_user = user_messages[-1]
    # Intent extraction is deliberately deterministic by default. A chat turn
    # should not require two paid upstream requests before a response can be
    # rendered. The optional second pass remains available for experiments.
    llm_intent = (
        _extract_intent_with_llm(recent_conversation, llm_call)
        if config.CHAT_USE_INTENT_LLM
        else {}
    )
    intent = _merge_intent(intent, llm_intent)

    catalog = load_catalog_mice()
    catalog_size = len(catalog)
    if catalog_size == 0:
        return "The MouseFit catalog is empty right now, so I cannot make a database-backed recommendation yet."
    shortlisted = _shortlist(catalog, intent)

    llm_reply = _render_with_llm(intent, shortlisted, catalog_size, llm_call)
    if llm_reply:
        return llm_reply

    if intent.compare_requested:
        return _deterministic_compare_reply(intent, shortlisted, catalog_size)
    return _deterministic_shortlist_reply(intent, shortlisted, catalog_size)
