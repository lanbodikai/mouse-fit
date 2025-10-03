# scripts/infer_trained.py  — safe: falls back to train if val is empty
from ultralytics import YOLO
from pathlib import Path

# change to your run folder if different
weights = "runs/seg/mouse_seg_all2/weights/best.pt"
src_val = Path("dataset/images/val")
src = src_val if any(src_val.glob("*")) else Path("dataset/images/train")
print("Running inference on:", src)

model = YOLO(weights)
model.predict(source=str(src), imgsz=640, device=0, save=True, project="runs/seg", name="inference_test")
print("Done — check runs/seg/inference_test/")
