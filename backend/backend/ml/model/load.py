from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

from backend import config

try:
    import onnxruntime as ort
except Exception:  # pragma: no cover - optional dependency
    ort = None


_session = None


def load_onnx(model_path: Optional[Path] = None):
    global _session
    if _session is not None:
        return _session
    if ort is None:
        return None
    path = model_path or config.MODEL_ONNX_PATH
    if not path or not Path(path).exists():
        return None
    _session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    return _session


def model_status() -> Tuple[bool, Optional[str]]:
    session = load_onnx()
    if session is None:
        return False, None
    return True, config.MODEL_ONNX_PATH.as_posix()
