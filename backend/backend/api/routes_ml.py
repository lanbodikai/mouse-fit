from __future__ import annotations

from fastapi import APIRouter

from backend.ml.model.infer import predict
from backend.ml.model.schemas import MLPredictRequest, MLPredictResponse

router = APIRouter()


@router.post("/api/ml/predict", response_model=MLPredictResponse)
def ml_predict(payload: MLPredictRequest) -> MLPredictResponse:
    label, confidence, metadata = predict(payload.payload)
    return MLPredictResponse(
        session_id=payload.session_id,
        prediction=label,
        confidence=confidence,
        metadata=metadata,
    )
