from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.ml.model.infer import predict
from backend.ml.model.yolo import run_yolo_from_base64
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


class YoloRequest(BaseModel):
    image: str = Field(..., description="Base64 image bytes (no data: prefix).")
    conf: float = Field(0.25, ge=0.0, le=1.0)
    iou: float = Field(0.45, ge=0.0, le=1.0)
    max_det: int = Field(50, ge=1, le=300)


@router.post("/api/ml/yolo")
def ml_yolo(payload: YoloRequest) -> dict:
    try:
        detections = run_yolo_from_base64(
            payload.image,
            conf=float(payload.conf),
            iou=float(payload.iou),
            max_det=int(payload.max_det),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e}")
    return {"detections": detections}
