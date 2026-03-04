from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sentence_transformers import SentenceTransformer

from backend import config

try:
    import psycopg
    from psycopg.rows import dict_row
except Exception:  # pragma: no cover - optional dependency
    psycopg = None
    dict_row = None

try:
    import chromadb
    from chromadb.config import Settings
except Exception:  # pragma: no cover - optional dependency
    chromadb = None
    Settings = None


def _read_json_list(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        try:
            data = json.load(handle)
        except json.JSONDecodeError:
            return []
    if isinstance(data, dict):
        for key in ("mice", "items", "rows", "data"):
            maybe = data.get(key)
            if isinstance(maybe, list):
                data = maybe
                break
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict) and item]
    return []


def _read_csv(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [row for row in reader if isinstance(row, dict)]


def _normalize_mouse(item: Dict[str, Any]) -> Dict[str, Any]:
    def pick(*keys: str) -> Optional[str]:
        for key in keys:
            val = item.get(key)
            if val not in (None, ""):
                return str(val).strip()
        return None

    def pick_float(*keys: str) -> Optional[float]:
        for key in keys:
            val = item.get(key)
            if val not in (None, ""):
                try:
                    return float(val)
                except (TypeError, ValueError):
                    return None
        return None

    def pick_list(*keys: str) -> Optional[List[str]]:
        for key in keys:
            val = item.get(key)
            if val in (None, ""):
                continue
            if isinstance(val, list):
                out = [str(v).strip() for v in val if str(v).strip()]
                return out or None
            if isinstance(val, str):
                parts = [part.strip() for part in re.split(r"[,;/|]", val) if part.strip()]
                return parts or [val.strip()]
        return None

    def pick_boolish(*keys: str) -> Optional[bool]:
        for key in keys:
            val = item.get(key)
            if val in (None, ""):
                continue
            if isinstance(val, bool):
                return val
            sval = str(val).strip().lower()
            if not sval:
                continue
            if sval in {"true", "yes", "1", "wireless"}:
                return True
            if sval in {"false", "no", "0", "wired"}:
                return False
        return None

    wireless_bool = pick_boolish("wireless", "Wireless")
    if wireless_bool is None:
        wired_bool = pick_boolish("wired", "Wired")
        if wired_bool is not None:
            wireless_bool = not wired_bool

    return {
        "brand": pick("brand", "Brand") or "",
        "model": pick("model", "Model") or "",
        "variant": pick("variant", "Variant"),
        "length_mm": pick_float("length_mm", "length", "len"),
        "width_mm": pick_float("width_mm", "width", "wid"),
        "height_mm": pick_float("height_mm", "height", "ht"),
        "weight_g": pick_float("weight_g", "weight", "mass"),
        "shape": pick("shape", "Shape"),
        "hump": pick("hump", "Hump"),
        "wireless": (
            "wireless"
            if wireless_bool is True
            else ("wired" if wireless_bool is False else None)
        ),
        "ergo": item.get("ergo"),
        "wired": item.get("wired"),
        "colorways": item.get("colorways") or item.get("Colorways"),
        "product_url": pick("product_url", "productUrl"),
        "image_url": pick("image_url", "imageUrl"),
        "availability_status": pick("availability_status", "availabilityStatus"),
        "source": pick("source", "Source"),
        "source_handle": pick("source_handle", "sourceHandle"),
        "grips": pick_list("grips", "Grips"),
        "hands": pick_list("hands", "Hands"),
        "side_profile": pick("side_profile", "sideProfile"),
        "hand_compatibility": pick("hand_compatibility", "handCompatibility"),
        "price_usd": pick_float("price_usd", "price", "msrp", "priceUsd", "priceUSD"),
        "price_status": pick("price_status", "priceStatus"),
    }


def _key_for(mouse: Dict[str, Any]) -> str:
    raw = "_".join(
        [
            str(mouse.get("brand", "")).lower(),
            str(mouse.get("model", "")).lower(),
            str(mouse.get("variant", "") or "").lower(),
        ]
    )
    raw = re.sub(r"\s+", "_", raw)
    raw = re.sub(r"[^\w_]", "", raw)
    return raw.strip("_") or "mouse"


def _unique_id(base_id: str, seen: Dict[str, int]) -> str:
    count = seen.get(base_id, 0) + 1
    seen[base_id] = count
    if count == 1:
        return base_id
    return f"{base_id}__{count}"


def _read_sources() -> Dict[str, str]:
    sources = {}
    if not config.RAG_SOURCES_DIR.exists():
        return sources
    for path in config.RAG_SOURCES_DIR.glob("*.md"):
        sources[path.stem] = path.read_text(encoding="utf-8")
    return sources


def _source_lookup_key_variants(mouse: Dict[str, Any]) -> List[str]:
    brand = str(mouse.get("brand") or "")
    model = str(mouse.get("model") or "")
    variant = str(mouse.get("variant") or "")
    keys: List[str] = []
    for raw in (
        f"{brand}_{model}_{variant}",
        f"{brand}_{model}",
        f"{brand}{model}{variant}",
        f"{brand}{model}",
    ):
        cleaned = re.sub(r"\s+", "_", raw.lower())
        cleaned = re.sub(r"[^\w_]", "", cleaned).strip("_")
        if cleaned and cleaned not in keys:
            keys.append(cleaned)
    return keys


def _build_doc_text(mouse: Dict[str, Any], extra: str) -> str:
    parts: List[str] = []
    brand = mouse.get("brand") or ""
    model = mouse.get("model") or ""
    if brand or model:
        parts.append(f"MODEL: {brand} {model}".strip())
    if mouse.get("variant"):
        parts.append(f"VARIANT: {mouse['variant']}")
    if brand:
        parts.append(f"COMPANY: {brand}")
    colorways = mouse.get("colorways")
    if isinstance(colorways, list):
        parts.append(f"COLORWAYS: {', '.join([str(c) for c in colorways if c])}")
    elif colorways:
        parts.append(f"COLORWAYS: {colorways}")

    spec_bits = []
    for key in ("length_mm", "width_mm", "height_mm"):
        val = mouse.get(key)
        if val is None:
            break
        spec_bits.append(str(val))
    dims = "x".join(spec_bits) if len(spec_bits) == 3 else ""
    weight = mouse.get("weight_g")
    shape = mouse.get("shape")
    wireless = mouse.get("wireless")
    spec_parts = []
    if dims:
        spec_parts.append(f"{dims} mm")
    if weight:
        spec_parts.append(f"{weight} g")
    if shape:
        spec_parts.append(str(shape))
    if wireless:
        spec_parts.append(str(wireless))
    if spec_parts:
        parts.append("SPECS: " + ", ".join(spec_parts))
    if mouse.get("hump"):
        parts.append(f"HUMP: {mouse['hump']}")
    if mouse.get("availability_status"):
        parts.append(f"AVAILABILITY: {mouse['availability_status']}")
    if mouse.get("price_usd") is not None:
        try:
            parts.append(f"PRICE_USD: ${float(mouse['price_usd']):.2f}")
        except (TypeError, ValueError):
            pass
    if mouse.get("price_status"):
        parts.append(f"PRICE_STATUS: {mouse['price_status']}")
    if mouse.get("source"):
        parts.append(f"SOURCE: {mouse['source']}")
    if mouse.get("grips"):
        parts.append(f"RECOMMENDED_GRIPS: {', '.join(str(x) for x in mouse['grips'])}")
    if mouse.get("hands"):
        parts.append(f"HAND_COMPATIBILITY: {', '.join(str(x) for x in mouse['hands'])}")
    if mouse.get("side_profile"):
        parts.append(f"SIDE_PROFILE: {mouse['side_profile']}")
    if mouse.get("hand_compatibility"):
        parts.append(f"FIT_NOTES: {mouse['hand_compatibility']}")
    if mouse.get("product_url"):
        parts.append(f"PRODUCT_URL: {mouse['product_url']}")

    if extra:
        parts.append(extra)
    return "\n\n".join(parts)


def _dataset_files() -> List[Path]:
    if not config.DATASET_DIR.exists():
        return []
    files: List[Path] = []
    for pattern in ("*.json", "*.csv"):
        files.extend(config.DATASET_DIR.glob(pattern))
    return sorted(path for path in files if path.is_file())


def _iter_dataset() -> Iterable[Dict[str, Any]]:
    for path in _dataset_files():
        suffix = path.suffix.lower()
        rows = _read_json_list(path) if suffix == ".json" else _read_csv(path)
        for row in rows:
            yield row


def _iter_postgres_dataset() -> Iterable[Dict[str, Any]]:
    if psycopg is None or not config.DATABASE_URL:
        return []

    try:
        with psycopg.connect(config.DATABASE_URL, row_factory=dict_row) as conn:
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
                        ergo,
                        wired,
                        shape,
                        hump,
                        grips,
                        hands,
                        product_url,
                        image_url,
                        source,
                        source_handle,
                        availability_status,
                        side_profile,
                        hand_compatibility,
                        price_usd,
                        price_status
                    FROM mice
                    """
                )
                return list(cur.fetchall())
    except Exception:
        return []


def _postgres_latest_update_ts() -> Optional[float]:
    if psycopg is None or not config.DATABASE_URL:
        return None
    try:
        with psycopg.connect(config.DATABASE_URL, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT EXTRACT(
                        EPOCH FROM GREATEST(
                            COALESCE(MAX(updated_at), TIMESTAMPTZ 'epoch'),
                            COALESCE(MAX(created_at), TIMESTAMPTZ 'epoch')
                        )
                    ) AS latest_epoch
                    FROM mice
                    """
                )
                row = cur.fetchone() or {}
                latest = row.get("latest_epoch")
                if latest is None:
                    return None
                return float(latest)
    except Exception:
        return None


def _non_empty_count(mouse: Dict[str, Any]) -> int:
    score = 0
    for key in (
        "brand",
        "model",
        "variant",
        "length_mm",
        "width_mm",
        "height_mm",
        "weight_g",
        "shape",
        "hump",
        "wireless",
        "grips",
        "hands",
        "product_url",
        "source",
        "availability_status",
        "side_profile",
        "hand_compatibility",
        "price_usd",
        "price_status",
    ):
        val = mouse.get(key)
        if val in (None, "", []):
            continue
        score += 1
    return score


def _merge_mouse(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(a)
    for key, val in b.items():
        if val in (None, "", []):
            continue
        prev = merged.get(key)
        if prev in (None, "", []):
            merged[key] = val
            continue
        if isinstance(prev, list) and isinstance(val, list):
            seen = {str(x).strip().lower() for x in prev}
            for item in val:
                token = str(item).strip().lower()
                if token and token not in seen:
                    prev.append(item)
                    seen.add(token)
            merged[key] = prev
    return merged


def _collect_mice() -> Dict[Tuple[str, str, str], Dict[str, Any]]:
    mice: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    for row in [*_iter_dataset(), *_iter_postgres_dataset()]:
        normalized = _normalize_mouse(row)
        if not (normalized["brand"] and normalized["model"]):
            continue
        dataset_key = (
            str(normalized.get("brand") or "").strip().lower(),
            str(normalized.get("model") or "").strip().lower(),
            str(normalized.get("variant") or "").strip().lower(),
        )
        current = mice.get(dataset_key)
        if not current:
            mice[dataset_key] = normalized
            continue
        merged = _merge_mouse(current, normalized)
        # Keep whichever record is richer after merge.
        mice[dataset_key] = merged if _non_empty_count(merged) >= _non_empty_count(current) else current
    return mice


def _needs_rebuild(rebuild: bool = False) -> bool:
    if rebuild:
        return True
    if not config.RAG_EMBEDDINGS_PATH.exists():
        return True

    emb_path = config.RAG_EMBEDDINGS_PATH
    try:
        raw_docs = json.loads(emb_path.read_text(encoding="utf-8"))
    except Exception:
        return True
    if not isinstance(raw_docs, list) or not raw_docs:
        return True

    # If source docs were removed/added, stale embeddings length will drift.
    if len(raw_docs) != len(_collect_mice()):
        return True

    emb_mtime = emb_path.stat().st_mtime
    for dataset in _dataset_files():
        if dataset.stat().st_mtime > emb_mtime:
            return True

    pg_latest = _postgres_latest_update_ts()
    if pg_latest is not None and pg_latest > emb_mtime:
        return True

    if config.RAG_SOURCES_DIR.exists():
        for source in config.RAG_SOURCES_DIR.glob("*.md"):
            if source.stat().st_mtime > emb_mtime:
                return True
    return False


def _chroma_meta(meta: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, value in meta.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            out[key] = value
            continue
        if isinstance(value, list):
            text = ", ".join(str(x) for x in value if x is not None and str(x).strip())
            if text:
                out[key] = text
            continue
        out[key] = str(value)
    return out


def build_embeddings(rebuild: bool = False) -> int:
    config.RAG_DIR.mkdir(parents=True, exist_ok=True)
    config.RAG_SOURCES_DIR.mkdir(parents=True, exist_ok=True)

    if not _needs_rebuild(rebuild=rebuild):
        return 0

    sources = _read_sources()
    mice = _collect_mice()

    embedder = SentenceTransformer(config.EMBED_MODEL_NAME)

    docs: List[Dict[str, Any]] = []
    seen_ids: Dict[str, int] = {}
    for mouse in mice.values():
        doc_id = _unique_id(_key_for(mouse), seen_ids)
        extra = ""
        for key in _source_lookup_key_variants(mouse):
            if key in sources:
                extra = sources[key]
                break
        text = _build_doc_text(mouse, extra)
        embedding = embedder.encode(text, normalize_embeddings=True).tolist()
        docs.append({"id": doc_id, "text": text, "meta": mouse, "vector": embedding})

    config.RAG_EMBEDDINGS_PATH.write_text(json.dumps(docs, indent=2), encoding="utf-8")

    if chromadb is not None:
        client = chromadb.PersistentClient(path=str(config.RAG_CHROMA_PATH), settings=Settings(allow_reset=True))
        client.reset()
        collection = client.get_or_create_collection(config.RAG_COLLECTION)
        if docs:
            collection.add(
                ids=[d["id"] for d in docs],
                documents=[d["text"] for d in docs],
                metadatas=[_chroma_meta(d["meta"]) for d in docs],
                embeddings=[d["vector"] for d in docs],
            )
    return len(docs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build MouseFit RAG embeddings/index.")
    parser.add_argument("--rebuild", action="store_true", help="Force rebuild of embeddings/index.")
    args = parser.parse_args()
    count = build_embeddings(rebuild=args.rebuild)
    print(f"Wrote {count} docs to {config.RAG_EMBEDDINGS_PATH}")


if __name__ == "__main__":
    main()
