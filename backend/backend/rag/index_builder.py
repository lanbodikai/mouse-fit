from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from sentence_transformers import SentenceTransformer

from backend import config

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
        data = json.load(handle)
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
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
        "wireless": pick("wireless", "Wireless"),
        "colorways": item.get("colorways") or item.get("Colorways"),
        "product_url": pick("product_url", "productUrl"),
        "image_url": pick("image_url", "imageUrl"),
        "grips": item.get("grips") or item.get("Grips"),
        "hands": item.get("hands") or item.get("Hands"),
    }


def _key_for(mouse: Dict[str, Any]) -> str:
    raw = f"{mouse.get('brand', '').lower()}_{mouse.get('model', '').lower()}"
    raw = re.sub(r"\s+", "_", raw)
    raw = re.sub(r"[^\w_]", "", raw)
    return raw.strip("_") or "mouse"


def _read_sources() -> Dict[str, str]:
    sources = {}
    if not config.RAG_SOURCES_DIR.exists():
        return sources
    for path in config.RAG_SOURCES_DIR.glob("*.md"):
        sources[path.stem] = path.read_text(encoding="utf-8")
    return sources


def _build_doc_text(mouse: Dict[str, Any], extra: str) -> str:
    parts: List[str] = []
    brand = mouse.get("brand") or ""
    model = mouse.get("model") or ""
    if brand or model:
        parts.append(f"MODEL: {brand} {model}".strip())
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

    if extra:
        parts.append(extra)
    return "\n\n".join(parts)


def _iter_dataset() -> Iterable[Dict[str, Any]]:
    yield from _read_json_list(config.DATASET_DIR / "mice_seed.json")
    yield from _read_json_list(config.DATASET_DIR / "mice.json")
    yield from _read_csv(config.DATASET_DIR / "mice_seed.csv")


def build_embeddings(rebuild: bool = False) -> int:
    config.RAG_DIR.mkdir(parents=True, exist_ok=True)
    config.RAG_SOURCES_DIR.mkdir(parents=True, exist_ok=True)

    if config.RAG_EMBEDDINGS_PATH.exists() and not rebuild:
        return 0

    sources = _read_sources()
    mice: List[Dict[str, Any]] = []
    for row in _iter_dataset():
        normalized = _normalize_mouse(row)
        if normalized["brand"] and normalized["model"]:
            mice.append(normalized)

    embedder = SentenceTransformer(config.EMBED_MODEL_NAME)

    docs: List[Dict[str, Any]] = []
    for mouse in mice:
        doc_id = _key_for(mouse)
        extra = sources.get(doc_id, "")
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
                metadatas=[d["meta"] for d in docs],
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
