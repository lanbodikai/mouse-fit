from __future__ import annotations

import base64
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from backend.ml.model.load import load_onnx

try:  # optional dependency installed in the backend image
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None  # type: ignore


def _decode_base64_image(b64: str) -> Tuple[np.ndarray, int, int]:
    if Image is None:
        raise RuntimeError("Server missing Pillow (PIL). Install 'pillow' in backend requirements.")

    try:
        raw = base64.b64decode(b64, validate=True)
    except Exception:
        # Some browsers include newlines or URL-safe base64; retry without strict validation.
        raw = base64.b64decode(b64)

    img = Image.open(BytesIO(raw)).convert("RGB")
    w, h = img.size
    arr = np.asarray(img, dtype=np.float32) / 255.0  # HWC, 0..1
    return arr, w, h


def _as_nxd(pred: np.ndarray) -> np.ndarray:
    # Accept [1,D,N] / [1,N,D] / [D,N] / [N,D] and return [N,D]
    if pred.ndim == 3:
        pred = np.squeeze(pred, axis=0)
    if pred.ndim != 2:
        raise ValueError(f"Unexpected prediction shape: {pred.shape}")
    # If one dim is "small" (channels/features) and the other is large (anchors), transpose as needed.
    if pred.shape[0] <= 256 and pred.shape[1] > pred.shape[0]:
        return pred.T
    return pred


def _xywh_to_xyxy(xywh: np.ndarray, w: int, h: int) -> np.ndarray:
    # Heuristic: treat as normalized if widths/heights are mostly <= ~1.
    wh = xywh[:, 2:4]
    is_norm = float(np.nanmax(wh)) <= 1.25
    scale = np.array([w, h, w, h], dtype=np.float32) if is_norm else np.array([1, 1, 1, 1], dtype=np.float32)
    cxcywh = xywh * scale
    cx = cxcywh[:, 0]
    cy = cxcywh[:, 1]
    bw = cxcywh[:, 2]
    bh = cxcywh[:, 3]
    x1 = cx - bw / 2
    y1 = cy - bh / 2
    x2 = cx + bw / 2
    y2 = cy + bh / 2
    boxes = np.stack([x1, y1, x2, y2], axis=1)
    boxes[:, 0] = np.clip(boxes[:, 0], 0, w - 1)
    boxes[:, 1] = np.clip(boxes[:, 1], 0, h - 1)
    boxes[:, 2] = np.clip(boxes[:, 2], 0, w - 1)
    boxes[:, 3] = np.clip(boxes[:, 3], 0, h - 1)
    return boxes


def _iou_one_to_many(box: np.ndarray, boxes: np.ndarray) -> np.ndarray:
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])
    inter = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    area_a = max(0.0, (box[2] - box[0])) * max(0.0, (box[3] - box[1]))
    area_b = np.maximum(0.0, boxes[:, 2] - boxes[:, 0]) * np.maximum(0.0, boxes[:, 3] - boxes[:, 1])
    union = area_a + area_b - inter + 1e-9
    return inter / union


def _nms(boxes: np.ndarray, scores: np.ndarray, iou: float, max_det: int) -> List[int]:
    if boxes.size == 0:
        return []
    order = scores.argsort()[::-1]
    keep: List[int] = []
    while order.size > 0 and len(keep) < max_det:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        rest = order[1:]
        ious = _iou_one_to_many(boxes[i], boxes[rest])
        order = rest[ious < iou]
    return keep


def _pick_det_and_proto(outputs: List[np.ndarray]) -> Tuple[np.ndarray, bool]:
    det: Optional[np.ndarray] = None
    has_proto = False
    for out in outputs:
        if not isinstance(out, np.ndarray):
            continue
        if out.ndim == 4 and 32 in out.shape:
            has_proto = True
        if out.ndim == 3:
            # Prefer the large-anchor head, e.g. [1,*,8400]
            if det is None:
                det = out
            else:
                cur = max(det.shape[-1], det.shape[-2])
                nxt = max(out.shape[-1], out.shape[-2])
                if nxt > cur:
                    det = out
    if det is None:
        raise ValueError("Model did not return a detection tensor.")
    return det, has_proto


def _postprocess_yolo(
    det_raw: np.ndarray,
    image_w: int,
    image_h: int,
    conf: float,
    iou: float,
    max_det: int,
    has_proto: bool,
) -> List[Dict[str, Any]]:
    det = _as_nxd(det_raw)  # [N,D]
    if det.shape[1] < 5:
        raise ValueError(f"Unexpected YOLO head shape: {det.shape}")

    xywh = det[:, 0:4].astype(np.float32)
    obj = det[:, 4].astype(np.float32)

    # Layout variants:
    # - det: [cx,cy,w,h,obj]                      (single-class, no proto)
    # - seg single-class: [cx,cy,w,h,obj,mask32]  (D=37)
    # - det multi-class:  [cx,cy,w,h,obj,cls...]  (D=5+C)
    # - seg multi-class:  [cx,cy,w,h,obj,cls...,mask32]
    d = det.shape[1]
    mask_coef = 32 if has_proto and d >= 5 + 32 else 0
    num_cls = max(0, d - 5 - mask_coef)

    if num_cls <= 0:
        scores = obj
        cls_ids = np.zeros_like(scores, dtype=np.int64)
    else:
        cls = det[:, 5 : 5 + num_cls].astype(np.float32)
        cls_ids = np.argmax(cls, axis=1).astype(np.int64)
        cls_best = cls[np.arange(cls.shape[0]), cls_ids]
        scores = obj * cls_best

    keep = scores >= float(conf)
    if not np.any(keep):
        return []

    xywh = xywh[keep]
    scores = scores[keep]
    cls_ids = cls_ids[keep]

    boxes = _xywh_to_xyxy(xywh, image_w, image_h)
    keep_idx = _nms(boxes, scores, float(iou), int(max_det))

    out: List[Dict[str, Any]] = []
    for i in keep_idx:
        x1, y1, x2, y2 = boxes[i].tolist()
        out.append(
            {
                "box": [float(x1), float(y1), float(x2), float(y2)],
                "score": float(scores[i]),
                "class": int(cls_ids[i]),
            }
        )
    return out


def run_yolo_from_base64(b64: str, conf: float = 0.25, iou: float = 0.45, max_det: int = 50) -> List[Dict[str, Any]]:
    session = load_onnx()
    if session is None:
        raise RuntimeError("YOLO model unavailable (onnxruntime not installed or model file missing).")

    arr, w, h = _decode_base64_image(b64)

    # Ensure NCHW input
    inp = np.transpose(arr, (2, 0, 1))[None, :, :, :].astype(np.float32)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: inp})
    det_raw, has_proto = _pick_det_and_proto(outputs)

    return _postprocess_yolo(
        det_raw=det_raw,
        image_w=w,
        image_h=h,
        conf=conf,
        iou=iou,
        max_det=max_det,
        has_proto=has_proto,
    )
