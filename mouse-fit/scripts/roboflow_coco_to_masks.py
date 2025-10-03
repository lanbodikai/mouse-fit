# scripts/roboflow_coco_to_masks.py
# Usage (PowerShell / cmd):
#   python .\scripts\roboflow_coco_to_masks.py "path/to/My First Project.v1i.coco-segmentation (1).zip"
#
# Output:
#   dataset/images/train/*.jpg
#   dataset/masks/train/*.png

import sys, json, zipfile, os
from pathlib import Path
from PIL import Image, ImageDraw

def ensure(p): 
    Path(p).mkdir(parents=True, exist_ok=True)

def extract_and_make_masks(zip_path):
    zip_path = Path(zip_path)
    out_images = Path("dataset/images/train")
    out_masks  = Path("dataset/masks/train")
    ensure(out_images); ensure(out_masks)

    with zipfile.ZipFile(zip_path, 'r') as z:
        # find annotation JSON (Roboflow uses train/_annotations.coco.json)
        json_paths = [n for n in z.namelist() if n.endswith('.coco.json') or n.endswith('_annotations.coco.json') or n.endswith('.json')]
        if not json_paths:
            print("No annotation JSON found in zip. Found:", z.namelist()[:30])
            return
        ann_name = json_paths[0]
        print("Using annotation JSON:", ann_name)
        ann_raw = z.read(ann_name).decode('utf-8')
        ann = json.loads(ann_raw)

        # map image_id -> info
        images = {img['id']: img for img in ann.get('images', [])}
        # group annotations per image_id
        ann_by_img = {}
        for a in ann.get('annotations', []):
            img_id = a['image_id']
            ann_by_img.setdefault(img_id, []).append(a)

        # extract image files (from zip root, e.g., train/<filename>)
        img_entries = [n for n in z.namelist() if any(n.lower().endswith(ext) for ext in ['.jpg','.jpeg','.png'])]
        print(f"Found {len(img_entries)} image files in ZIP (will extract those referenced by JSON).")

        # extract only images that are in ann['images']
        for img_id, info in images.items():
            fname = info['file_name']
            # some exports put images under 'train/' prefix; try both
            candidate_paths = [fname, f"train/{fname}", f"valid/{fname}", f"images/{fname}"]
            zpath = None
            for cp in candidate_paths:
                if cp in z.namelist():
                    zpath = cp; break
            if zpath is None:
                # fall back to searching similar name in zip
                matches = [n for n in img_entries if n.endswith(fname)]
                if matches:
                    zpath = matches[0]
            if zpath is None:
                print("WARNING: image file for", fname, "not found in zip; skipping")
                continue

            # extract image
            out_image_path = out_images / Path(fname).name
            with z.open(zpath) as f:
                img = Image.open(f).convert("RGB")
                img.save(out_image_path)
            w = info.get('width', img.width)
            h = info.get('height', img.height)

            # build mask
            mask = Image.new("L", (w, h), 0)
            draw = ImageDraw.Draw(mask)
            anns = ann_by_img.get(img_id, [])
            for a in anns:
                seg = a.get('segmentation')
                if not seg:
                    continue
                # seg is list of polygons (COCO) or RLE dict; handle polygons here
                if isinstance(seg, list):
                    # a may contain multiple polygons (list of lists)
                    for poly in seg:
                        # poly is flat list [x0,y0,x1,y1,...]
                        pts = [(poly[i], poly[i+1]) for i in range(0, len(poly), 2)]
                        try:
                            draw.polygon(pts, outline=255, fill=255)
                        except Exception as ex:
                            print("polygon draw failed for", fname, "err:", ex)
                else:
                    # RLE or other format: we skip (could support with pycocotools)
                    print(f"NOTE: annotation for image {fname} uses RLE or unsupported segmentation format; skip.")
            out_mask_path = out_masks / (Path(fname).stem + ".png")
            mask.save(out_mask_path)
            print("wrote", out_image_path, "and", out_mask_path)

    print("Done. Images ->", out_images, " Masks ->", out_masks)
    print("If you also have a val/valid split in the ZIP, re-run with that JSON or manually move some pairs to dataset/images/val and dataset/masks/val.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python roboflow_coco_to_masks.py path/to/roboflow_zip.zip")
        sys.exit(1)
    extract_and_make_masks(sys.argv[1])
