# train_seg_v2.py
from ultralytics import YOLO

model = YOLO("yolov8n-seg.pt")  # or yolov8s-seg.pt if you want a bigger model
model.train(
    data="dataset_v2/data.yaml",
    epochs=80,
    imgsz=640,
    batch=4,
    device=0,
    workers=0,              # Windows-safe
    project="runs/seg",
    name="mouse_seg_v2"     # NEW run; won’t overwrite old
)
