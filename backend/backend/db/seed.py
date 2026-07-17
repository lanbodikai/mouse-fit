from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from backend import config
from backend.db.pool import get_conn
from backend.utils.common import as_list, as_optional_bool, as_optional_float, pick_first_text, slugify

LOGGER = logging.getLogger("mousefit.api")


def seed_mice_rows_from_json() -> List[Dict[str, Any]]:
    path = config.DATASET_DIR / "mice.json"
    if not path.exists():
        LOGGER.warning("mice_seed_missing path=%s", path)
        return []

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        LOGGER.exception("mice_seed_invalid_json path=%s", path)
        return []

    if not isinstance(payload, list):
        LOGGER.warning("mice_seed_unexpected_shape path=%s", path)
        return []

    seen_source_handles: set[str] = set()
    rows: List[Dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue

        brand = pick_first_text([item.get("brand")], 120)
        model = pick_first_text([item.get("model")], 160)
        if not brand or not model:
            continue

        variant = pick_first_text([item.get("variant")], 160)
        base_source_handle = pick_first_text([item.get("source_handle"), item.get("id")], 200)
        if not base_source_handle:
            base_source_handle = slugify(" ".join(part for part in [brand, model, variant or ""] if part))

        source_handle = base_source_handle
        suffix = 2
        while source_handle in seen_source_handles:
            source_handle = f"{base_source_handle}-{suffix}"
            suffix += 1
        seen_source_handles.add(source_handle)

        rows.append(
            {
                "id": source_handle,
                "brand": brand,
                "model": model,
                "variant": variant,
                "length_mm": as_optional_float(item.get("length_mm")),
                "width_mm": as_optional_float(item.get("width_mm")),
                "height_mm": as_optional_float(item.get("height_mm")),
                "weight_g": as_optional_float(item.get("weight_g")),
                "ergo": as_optional_bool(item.get("ergo")),
                "wired": as_optional_bool(item.get("wired")),
                "shape": pick_first_text([item.get("shape")], 80),
                "hump": pick_first_text([item.get("hump")], 80),
                "grips": [str(value) for value in as_list(item.get("grips")) if str(value).strip()],
                "hands": [str(value) for value in as_list(item.get("hands")) if str(value).strip()],
                "product_url": pick_first_text([item.get("product_url")], 2048),
                "image_url": pick_first_text([item.get("image_url")], 2048),
                "image_urls": [str(value).strip() for value in as_list(item.get("image_urls")) if str(value).strip()],
                "source": pick_first_text([item.get("source")], 120) or "seed:mice.json",
                "source_handle": source_handle,
            }
        )

    return rows


def seed_mice_from_json_if_empty() -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM mice")
            row = cur.fetchone()
            existing_count = int(row.get("count") or 0) if row else 0
            if existing_count > 0:
                return 0

            seed_rows = seed_mice_rows_from_json()
            if not seed_rows:
                return 0

            cur.executemany(
                """
                INSERT INTO mice (
                    id,
                    brand,
                    model,
                    variant,
                    length_mm,
                    width_mm,
                    height_mm,
                    weight_g,
                    ergo,
                    wired,
                    shape,
                    hump,
                    grips,
                    hands,
                    product_url,
                    image_url,
                    image_urls,
                    source,
                    source_handle,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s::jsonb, %s::jsonb, %s, %s, %s::jsonb, %s, %s, NOW(), NOW()
                )
                """,
                [
                    (
                        row["id"],
                        row["brand"],
                        row["model"],
                        row["variant"],
                        row["length_mm"],
                        row["width_mm"],
                        row["height_mm"],
                        row["weight_g"],
                        row["ergo"],
                        row["wired"],
                        row["shape"],
                        row["hump"],
                        json.dumps(row["grips"]),
                        json.dumps(row["hands"]),
                        row["product_url"],
                        row["image_url"],
                        json.dumps(row["image_urls"]),
                        row["source"],
                        row["source_handle"],
                    )
                    for row in seed_rows
                ],
            )
        conn.commit()

    LOGGER.info("mice_seed_loaded count=%s source=%s", len(seed_rows), config.DATASET_DIR / "mice.json")
    return len(seed_rows)
