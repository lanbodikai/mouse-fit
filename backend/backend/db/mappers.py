from __future__ import annotations

from typing import Any, Dict

from backend.schemas.api import Mouse
from backend.utils.common import as_dict, as_list, iso_ts


def row_to_mouse(row: Dict[str, Any]) -> Mouse:
    grips = [str(value) for value in as_list(row.get("grips"))]
    hands = [str(value) for value in as_list(row.get("hands"))]
    affiliate_links = [value for value in as_list(row.get("affiliate_links")) if isinstance(value, dict)]

    ergo_raw = row.get("ergo")
    wired_raw = row.get("wired")
    ergo = None if ergo_raw is None else bool(ergo_raw)
    wired = None if wired_raw is None else bool(wired_raw)

    return Mouse(
        id=str(row.get("id")),
        brand=str(row.get("brand") or ""),
        model=str(row.get("model") or ""),
        variant=row.get("variant"),
        length_mm=row.get("length_mm"),
        width_mm=row.get("width_mm"),
        height_mm=row.get("height_mm"),
        weight_g=row.get("weight_g"),
        ergo=ergo,
        wired=wired,
        shape=row.get("shape"),
        hump=row.get("hump"),
        grips=grips,
        hands=hands,
        product_url=row.get("product_url"),
        image_url=row.get("image_url"),
        image_urls=[str(value) for value in as_list(row.get("image_urls")) if str(value).strip()],
        source_handle=row.get("source_handle"),
        availability_status=row.get("availability_status"),
        shape_raw=row.get("shape_raw"),
        hump_raw=row.get("hump_raw"),
        hump_bucket=row.get("hump_bucket"),
        front_flare_raw=row.get("front_flare_raw"),
        side_curvature_raw=row.get("side_curvature_raw"),
        side_profile=row.get("side_profile"),
        hand_compatibility=row.get("hand_compatibility"),
        affiliate_links=affiliate_links,
        brand_discount=row.get("brand_discount"),
        discount_code=row.get("discount_code"),
        price_usd=None if row.get("price_usd") is None else float(row["price_usd"]),
        price_status=row.get("price_status"),
        source_payload=as_dict(row.get("source_payload")),
        created_at=iso_ts(row.get("created_at")) if row.get("created_at") else None,
        updated_at=iso_ts(row.get("updated_at")) if row.get("updated_at") else None,
    )
