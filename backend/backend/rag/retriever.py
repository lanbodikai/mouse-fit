from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from backend import config
from backend.rag.schemas import RagPreferences, RagSource

try:
    import chromadb
except Exception:  # pragma: no cover - optional dependency
    chromadb = None


_embedder: Optional[SentenceTransformer] = None
_collection = None


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(config.EMBED_MODEL_NAME)
    return _embedder


def _get_collection():
    global _collection
    if _collection is not None:
        return _collection
    if chromadb is None:
        return None
    client = chromadb.PersistentClient(path=str(config.RAG_CHROMA_PATH))
    _collection = client.get_or_create_collection(config.RAG_COLLECTION)
    return _collection


def warmup() -> None:
    """Preload embedder / vector store to avoid first-request latency."""
    _get_collection()
    _get_embedder()


def _load_docs(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9
    return float(np.dot(a, b) / denom)


def _hard_filter(meta: Dict[str, Any], prefs: RagPreferences) -> bool:
    if prefs.shape and prefs.shape.lower() not in str(meta.get("shape", "")).lower():
        return False
    if prefs.wireless is True and not any(
        term in str(meta.get("wireless", "")).lower() for term in ("wireless", "2.4", "bluetooth")
    ):
        return False
    if prefs.wireless is False and any(
        term in str(meta.get("wireless", "")).lower() for term in ("wireless", "bluetooth")
    ):
        return False
    if prefs.targetWeight and prefs.targetWeight.max and meta.get("weight_g"):
        try:
            if float(meta["weight_g"]) > prefs.targetWeight.max:
                return False
        except (TypeError, ValueError):
            return False
    return True


def retrieve(query: str, prefs: Optional[RagPreferences] = None, k: int = 8) -> List[RagSource]:
    prefs = prefs or RagPreferences()
    query = query or ""

    collection = _get_collection()
    if collection is not None:
        results = collection.query(query_texts=[query], n_results=max(k * 3, k))
        docs: List[RagSource] = []
        ids = results.get("ids", [[]])[0]
        texts = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        for doc_id, text, meta, dist in zip(ids, texts, metas, distances):
            meta = meta or {}
            if not _hard_filter(meta, prefs):
                continue
            score = 1.0 - float(dist) if dist is not None else 0.0
            docs.append(RagSource(id=doc_id, text=text or "", meta=meta, score=score))
            if len(docs) >= k:
                break
        return docs

    docs = _load_docs(config.RAG_EMBEDDINGS_PATH)
    if not docs:
        return []

    embedder = _get_embedder()
    query_vec = embedder.encode(query, normalize_embeddings=True)
    scored: List[RagSource] = []
    for doc in docs:
        meta = doc.get("meta") or {}
        if not _hard_filter(meta, prefs):
            continue
        score = _cosine(query_vec, np.array(doc.get("vector", []), dtype=np.float32))
        scored.append(
            RagSource(
                id=str(doc.get("id", "")),
                text=str(doc.get("text", "")),
                meta=meta,
                score=score,
            )
        )

    scored.sort(key=lambda item: item.score, reverse=True)
    return scored[:k]
