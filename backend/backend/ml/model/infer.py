from __future__ import annotations

from typing import Any, Dict, Tuple

from backend.ml.model.load import model_status


DEFAULT_LABEL = "unknown"


def predict(payload: Dict[str, Any]) -> Tuple[str, float, Dict[str, Any]]:
    """Minimal inference wrapper.

    This is a placeholder that surfaces model availability while keeping
    the request/response shape stable for the frontend.
    """
    model_loaded, model_path = model_status()

    label = payload.get("label") or payload.get("grip") or DEFAULT_LABEL
    confidence = float(payload.get("confidence", 0.0)) if payload else 0.0

    metadata = {
        "model_loaded": model_loaded,
        "model_path": model_path,
    }
    return str(label), confidence, metadata
