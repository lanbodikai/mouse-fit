from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional

import psycopg
import requests
from psycopg.rows import dict_row

DEFAULT_ELOSHAPES_BASE_URL = os.getenv("ELOSHAPES_BASE_URL", "https://www.eloshapes.com").strip().rstrip("/")
DEFAULT_TIMEOUT_SEC = float(os.getenv("ELOSHAPES_TIMEOUT_SEC", "45"))
DEFAULT_PAGE_SIZE = int(os.getenv("ELOSHAPES_PAGE_SIZE", "500"))


def slugify(value: str) -> str:
    out: List[str] = []
    prev_dash = False
    for ch in value.lower().strip():
        if ch.isalnum():
            out.append(ch)
            prev_dash = False
        else:
            if not prev_dash:
                out.append("-")
                prev_dash = True
    slug = "".join(out).strip("-")
    return slug or "item"


def _clean_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_shape(shape_raw: Optional[str]) -> Optional[str]:
    if not shape_raw:
        return None
    val = shape_raw.strip().lower()
    if val == "symmetrical":
        return "sym"
    if val == "ergonomic":
        return "ergo"
    if val == "hybrid":
        return "hybrid"
    if "sym" in val:
        return "sym"
    if "ergo" in val:
        return "ergo"
    if "hybrid" in val:
        return "hybrid"
    return None


def _normalize_hump_bucket(hump_raw: Optional[str]) -> Optional[str]:
    if not hump_raw:
        return None
    val = hump_raw.strip().lower()
    if "front" in val:
        return "front"
    if "center" in val:
        return "center"
    if "back" in val:
        return "back"
    return None


def _legacy_hump(hump_bucket: Optional[str]) -> Optional[str]:
    if not hump_bucket:
        return None
    return hump_bucket.capitalize()


def _normalize_side_profile(side_curvature_raw: Optional[str]) -> Optional[str]:
    if not side_curvature_raw:
        return None
    val = side_curvature_raw.strip().lower()
    if val == "flat":
        return "flat"
    return "slanted"


def _join_brand_names(brand_names: Any, separator: Optional[str]) -> str:
    sep = separator if separator is not None else " "
    if isinstance(brand_names, list):
        names = [str(x).strip() for x in brand_names if str(x).strip()]
        if names:
            return sep.join(names)
    if isinstance(brand_names, str) and brand_names.strip():
        return brand_names.strip()
    return "Unknown"


def _first_brand_handle(row: Dict[str, Any]) -> Optional[str]:
    handles = row.get("general__brand_handles")
    if isinstance(handles, list):
        for handle in handles:
            cleaned = _clean_text(handle)
            if cleaned:
                return cleaned
    return None


def _pick_first_url(links: Any) -> Optional[str]:
    if not isinstance(links, list):
        return None
    for entry in links:
        if not isinstance(entry, dict):
            continue
        url = _clean_text(entry.get("url"))
        if url and url.startswith(("http://", "https://")):
            return url
    return None


def _pick_image_url(row: Dict[str, Any]) -> Optional[str]:
    for key in ("mouse__top_view", "mouse__side_view", "mouse__back_view"):
        maybe = _clean_text(row.get(key))
        if maybe and maybe.startswith(("http://", "https://")):
            return maybe
    images = row.get("general__images")
    if isinstance(images, list):
        for image in images:
            if not isinstance(image, dict):
                continue
            urls = image.get("urls")
            if isinstance(urls, list):
                for raw in urls:
                    maybe = _clean_text(raw)
                    if maybe and maybe.startswith(("http://", "https://")):
                        return maybe
    return None


def discover_supabase_credentials(base_url: str, timeout_sec: float) -> tuple[str, str]:
    url = f"{base_url}/mouse/browse"
    resp = requests.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MouseFitSync/1.0; +https://mouse-fit.local)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout=timeout_sec,
    )
    resp.raise_for_status()
    html = resp.text

    match = re.search(r'supabase:\s*\{\s*url:"([^"]+)"\s*,\s*key:"([^"]+)"', html)
    if not match:
        raise RuntimeError("Could not discover EloShapes Supabase credentials from runtime config.")
    return match.group(1).strip().rstrip("/"), match.group(2).strip()


def fetch_table_rows(
    session: requests.Session,
    supabase_rest_base: str,
    apikey: str,
    table_name: str,
    timeout_sec: float,
    page_size: int,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    all_rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        range_end = offset + page_size - 1
        headers = {
            "apikey": apikey,
            "Authorization": f"Bearer {apikey}",
            "Accept-Profile": "api",
            "Range": f"{offset}-{range_end}",
        }
        params: Dict[str, str] = {"select": "*"}
        if category:
            params["general__category"] = f"eq.{category}"

        resp = session.get(
            f"{supabase_rest_base}/{table_name}",
            headers=headers,
            params=params,
            timeout=timeout_sec,
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Failed querying {table_name}: HTTP {resp.status_code} - {resp.text[:400]}"
            )

        page = resp.json()
        if not isinstance(page, list):
            raise RuntimeError(f"Unexpected response format for table {table_name}.")
        all_rows.extend(page)

        if len(page) < page_size:
            break
        offset += page_size

    return all_rows


def build_affiliate_lookup(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        handle = _clean_text(row.get("brand_handle"))
        if not handle:
            continue
        if handle not in out:
            out[handle] = row
    return out


def transform_product(
    row: Dict[str, Any],
    availability_status: str,
    affiliate_lookup: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    source_handle = _clean_text(row.get("general__handle"))
    brand = _join_brand_names(row.get("general__brand_names"), _clean_text(row.get("general__brands_separator")))
    model = _clean_text(row.get("general__model")) or "Unknown"
    variant = _clean_text(row.get("general__variant"))

    shape_raw = _clean_text(row.get("mouse__shape"))
    shape = _normalize_shape(shape_raw)
    hump_raw = _clean_text(row.get("mouse__hump_placement"))
    hump_bucket = _normalize_hump_bucket(hump_raw)
    side_curvature_raw = _clean_text(row.get("mouse__side_curvature"))
    side_profile = _normalize_side_profile(side_curvature_raw)
    hand_compatibility = _clean_text(row.get("mouse__hand_compatibility"))
    front_flare_raw = _clean_text(row.get("mouse__front_flare"))

    wireless = row.get("mouse__wireless")
    wired = None if wireless is None else (not bool(wireless))
    ergo = None
    if shape == "ergo":
        ergo = True
    elif shape == "sym":
        ergo = False

    product_affiliate_links = row.get("general__affiliate_links")
    if not isinstance(product_affiliate_links, list):
        product_affiliate_links = []
    product_url = _pick_first_url(product_affiliate_links)

    brand_handle = _first_brand_handle(row)
    affiliate_row = affiliate_lookup.get(brand_handle or "")
    brand_discount = _clean_text(affiliate_row.get("discount")) if affiliate_row else None
    discount_code = _clean_text(affiliate_row.get("code")) if affiliate_row else None
    if not product_url and affiliate_row:
        product_url = _pick_first_url(affiliate_row.get("links"))

    source_id = (source_handle or "").strip() or slugify(f"{brand}-{model}-{variant or ''}")
    return {
        "id": source_id,
        "brand": brand,
        "model": model,
        "variant": variant,
        "length_mm": _to_float(row.get("mouse__length")),
        "width_mm": _to_float(row.get("mouse__width")),
        "height_mm": _to_float(row.get("mouse__height")),
        "weight_g": _to_float(row.get("mouse__weight")),
        "ergo": ergo,
        "wired": wired,
        "shape": shape,
        "hump": _legacy_hump(hump_bucket),
        "grips": [],
        "hands": [],
        "product_url": product_url,
        "image_url": _pick_image_url(row),
        "source": "eloshapes",
        "source_handle": source_handle,
        "availability_status": availability_status,
        "shape_raw": shape_raw,
        "hump_raw": hump_raw,
        "hump_bucket": hump_bucket,
        "front_flare_raw": front_flare_raw,
        "side_curvature_raw": side_curvature_raw,
        "side_profile": side_profile,
        "hand_compatibility": hand_compatibility,
        "affiliate_links": product_affiliate_links,
        "brand_discount": brand_discount,
        "discount_code": discount_code,
        "price_usd": None,
        "price_status": "not_exposed_by_source",
        "source_payload": row,
    }


def ensure_mice_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS mice (
                id TEXT PRIMARY KEY,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                variant TEXT,
                length_mm DOUBLE PRECISION,
                width_mm DOUBLE PRECISION,
                height_mm DOUBLE PRECISION,
                weight_g DOUBLE PRECISION,
                ergo BOOLEAN,
                wired BOOLEAN,
                shape TEXT,
                hump TEXT,
                grips JSONB NOT NULL DEFAULT '[]'::jsonb,
                hands JSONB NOT NULL DEFAULT '[]'::jsonb,
                product_url TEXT,
                image_url TEXT,
                source TEXT,
                source_handle TEXT,
                availability_status TEXT,
                shape_raw TEXT,
                hump_raw TEXT,
                hump_bucket TEXT,
                front_flare_raw TEXT,
                side_curvature_raw TEXT,
                side_profile TEXT,
                hand_compatibility TEXT,
                affiliate_links JSONB,
                brand_discount TEXT,
                discount_code TEXT,
                price_usd NUMERIC,
                price_status TEXT,
                source_payload JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cur.execute(
            """
            SELECT indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'mice'
              AND indexname = 'mice_source_handle_uniq'
            """
        )
        row = cur.fetchone()
        if row:
            indexdef = str(row.get("indexdef") or "")
            if " WHERE " in indexdef.upper():
                cur.execute("DROP INDEX IF EXISTS mice_source_handle_uniq")
                cur.execute("CREATE UNIQUE INDEX mice_source_handle_uniq ON mice (source_handle)")
        else:
            cur.execute("CREATE UNIQUE INDEX mice_source_handle_uniq ON mice (source_handle)")
        cur.execute("CREATE INDEX IF NOT EXISTS mice_availability_status_idx ON mice (availability_status)")
        cur.execute("CREATE INDEX IF NOT EXISTS mice_brand_model_idx ON mice (brand, model)")
    conn.commit()


UPSERT_SQL = """
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
    source,
    source_handle,
    availability_status,
    shape_raw,
    hump_raw,
    hump_bucket,
    front_flare_raw,
    side_curvature_raw,
    side_profile,
    hand_compatibility,
    affiliate_links,
    brand_discount,
    discount_code,
    price_usd,
    price_status,
    source_payload,
    updated_at
) VALUES (
    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
    %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
    %s::jsonb, %s, %s, %s, %s, %s::jsonb, NOW()
)
ON CONFLICT (id) DO UPDATE SET
    id = EXCLUDED.id,
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    variant = EXCLUDED.variant,
    length_mm = EXCLUDED.length_mm,
    width_mm = EXCLUDED.width_mm,
    height_mm = EXCLUDED.height_mm,
    weight_g = EXCLUDED.weight_g,
    ergo = EXCLUDED.ergo,
    wired = EXCLUDED.wired,
    shape = EXCLUDED.shape,
    hump = EXCLUDED.hump,
    grips = EXCLUDED.grips,
    hands = EXCLUDED.hands,
    product_url = EXCLUDED.product_url,
    image_url = EXCLUDED.image_url,
    source = EXCLUDED.source,
    availability_status = EXCLUDED.availability_status,
    shape_raw = EXCLUDED.shape_raw,
    hump_raw = EXCLUDED.hump_raw,
    hump_bucket = EXCLUDED.hump_bucket,
    front_flare_raw = EXCLUDED.front_flare_raw,
    side_curvature_raw = EXCLUDED.side_curvature_raw,
    side_profile = EXCLUDED.side_profile,
    hand_compatibility = EXCLUDED.hand_compatibility,
    affiliate_links = EXCLUDED.affiliate_links,
    brand_discount = EXCLUDED.brand_discount,
    discount_code = EXCLUDED.discount_code,
    price_usd = EXCLUDED.price_usd,
    price_status = EXCLUDED.price_status,
    source_payload = EXCLUDED.source_payload,
    updated_at = NOW()
"""


def upsert_mice(conn, mice_rows: List[Dict[str, Any]]) -> int:
    if not mice_rows:
        return 0
    with conn.cursor() as cur:
        # Keep non-EloShapes rows intact, but replace previously synced EloShapes rows to
        # avoid key drift from older import formats.
        cur.execute("DELETE FROM mice WHERE source = 'eloshapes'")
        cur.executemany(
            UPSERT_SQL,
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
                    row["source"],
                    row["source_handle"],
                    row["availability_status"],
                    row["shape_raw"],
                    row["hump_raw"],
                    row["hump_bucket"],
                    row["front_flare_raw"],
                    row["side_curvature_raw"],
                    row["side_profile"],
                    row["hand_compatibility"],
                    json.dumps(row["affiliate_links"]),
                    row["brand_discount"],
                    row["discount_code"],
                    row["price_usd"],
                    row["price_status"],
                    json.dumps(row["source_payload"]),
                )
                for row in mice_rows
            ],
        )
    conn.commit()
    return len(mice_rows)


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync EloShapes mice data into Postgres.")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=os.getenv("DATABASE_URL", "").strip(),
        help="Target Postgres connection string. Defaults to DATABASE_URL env var.",
    )
    parser.add_argument(
        "--base-url",
        dest="base_url",
        default=DEFAULT_ELOSHAPES_BASE_URL,
        help=f"EloShapes base URL (default: {DEFAULT_ELOSHAPES_BASE_URL})",
    )
    parser.add_argument(
        "--timeout-sec",
        dest="timeout_sec",
        type=float,
        default=DEFAULT_TIMEOUT_SEC,
        help=f"HTTP timeout in seconds (default: {DEFAULT_TIMEOUT_SEC})",
    )
    parser.add_argument(
        "--page-size",
        dest="page_size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help=f"Supabase pagination size (default: {DEFAULT_PAGE_SIZE})",
    )
    parser.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Fetch and transform data only; do not write to Postgres.",
    )
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    if args.page_size <= 0:
        print("page-size must be > 0", file=sys.stderr)
        return 2

    base_url = args.base_url.strip().rstrip("/")
    print(f"[sync] Discovering source config from {base_url}/mouse/browse")
    supabase_url, supabase_key = discover_supabase_credentials(base_url, args.timeout_sec)
    rest_base = f"{supabase_url}/rest/v1"
    print(f"[sync] Supabase project detected: {supabase_url}")

    with requests.Session() as session:
        available = fetch_table_rows(
            session=session,
            supabase_rest_base=rest_base,
            apikey=supabase_key,
            table_name="products_available_v8",
            timeout_sec=args.timeout_sec,
            page_size=args.page_size,
            category="mouse",
        )
        coming_soon = fetch_table_rows(
            session=session,
            supabase_rest_base=rest_base,
            apikey=supabase_key,
            table_name="products_coming_soon_v8",
            timeout_sec=args.timeout_sec,
            page_size=args.page_size,
            category="mouse",
        )
        affiliates = fetch_table_rows(
            session=session,
            supabase_rest_base=rest_base,
            apikey=supabase_key,
            table_name="affiliates_available_v2",
            timeout_sec=args.timeout_sec,
            page_size=args.page_size,
            category=None,
        )

    print(f"[sync] Fetched available mice: {len(available)}")
    print(f"[sync] Fetched coming-soon mice: {len(coming_soon)}")
    print(f"[sync] Fetched affiliate rows: {len(affiliates)}")

    affiliate_lookup = build_affiliate_lookup(affiliates)
    transformed_map: Dict[str, Dict[str, Any]] = {}

    for row in coming_soon:
        transformed = transform_product(row, "coming_soon", affiliate_lookup)
        if transformed["source_handle"]:
            transformed_map[transformed["source_handle"]] = transformed

    for row in available:
        transformed = transform_product(row, "available", affiliate_lookup)
        if transformed["source_handle"]:
            transformed_map[transformed["source_handle"]] = transformed

    transformed_rows = list(transformed_map.values())
    print(f"[sync] Transformed rows (deduped by source_handle): {len(transformed_rows)}")

    if args.dry_run:
        sample = transformed_rows[:2]
        print("[sync] Dry run enabled; not writing to database.")
        print("[sync] Sample rows:")
        print(json.dumps(sample, indent=2)[:2000])
        return 0

    database_url = args.database_url.strip()
    if not database_url:
        print("DATABASE_URL or --database-url is required when not using --dry-run.", file=sys.stderr)
        return 2

    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        ensure_mice_schema(conn)
        upserted = upsert_mice(conn, transformed_rows)
    print(f"[sync] Upserted {upserted} rows into Postgres.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
