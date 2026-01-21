from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Dict, List

from backend import config


def _read_csv(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def build_mice_json() -> Path:
    """Convert mice_seed.csv into a normalized mice.json file."""
    rows = _read_csv(config.DATASET_DIR / "mice_seed.csv")
    out: List[Dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "brand": row.get("brand") or row.get("Brand") or "",
                "model": row.get("model") or row.get("Model") or "",
                "variant": row.get("variant") or row.get("Variant") or "",
                "length_mm": float(row["length_mm"]) if row.get("length_mm") else None,
                "width_mm": float(row["width_mm"]) if row.get("width_mm") else None,
                "height_mm": float(row["height_mm"]) if row.get("height_mm") else None,
                "weight_g": float(row["weight_g"]) if row.get("weight_g") else None,
                "shape": row.get("shape") or "",
                "hump": row.get("hump") or "",
                "grips": row.get("grips") or "",
                "hands": row.get("hands") or "",
                "product_url": row.get("product_url") or "",
                "image_url": row.get("image_url") or "",
            }
        )

    path = config.DATASET_DIR / "mice.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    return path


if __name__ == "__main__":
    out_path = build_mice_json()
    print(f"Wrote {out_path}")
