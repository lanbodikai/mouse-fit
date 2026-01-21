from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class MLPredictRequest(BaseModel):
    session_id: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class MLPredictResponse(BaseModel):
    session_id: str
    prediction: str
    confidence: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelStatus(BaseModel):
    model_loaded: bool
    model_path: Optional[str] = None
