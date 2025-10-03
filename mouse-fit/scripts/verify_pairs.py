# scripts/verify_pairs.py
from pathlib import Path
for split in ("train","val"):
    img_dir = Path(f"dataset/images/{split}")
    mask_dir = Path(f"dataset/masks/{split}")
    imgs = sorted([p for p in img_dir.glob("*") if p.suffix.lower() in (".jpg",".jpeg",".png")])
    missing = [p.name for p in imgs if not (mask_dir / (p.stem + ".png")).exists()]
    print(f"{split}: images={len(imgs)} masks={len(list(mask_dir.glob('*.png')))} missing_masks={len(missing)}")
    if missing: print(" examples:", missing[:10])
