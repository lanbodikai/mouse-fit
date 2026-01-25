from __future__ import annotations

import json
import re
import sqlite3
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DATA_DIR = REPO_ROOT / "backend" / "data"
MICE_JSON_PATH = BACKEND_DATA_DIR / "mice.json"
DB_PATH = BACKEND_DATA_DIR / "mousefit.db"

PROSETTINGS_URL = "https://prosettings.net/gear/lists/mice/"


@dataclass(frozen=True)
class MouseRow:
    name: str
    connection: Optional[str]
    shape: Optional[str]
    height_cm: Optional[float]
    width_cm: Optional[float]
    length_cm: Optional[float]
    weight_g: Optional[float]


def _fetch_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MouseFitBot/1.0; +https://mouse-fit.local)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    return raw.decode("utf-8", errors="ignore")


def _strip_tags(html: str) -> str:
    html = re.sub(r"<script\\b.*?</script>", "", html, flags=re.S | re.I)
    html = re.sub(r"<style\\b.*?</style>", "", html, flags=re.S | re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    html = html.replace("&nbsp;", " ").replace("&amp;", "&")
    html = html.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"")
    html = html.replace("&#039;", "'")
    html = re.sub(r"\\s+", " ", html).strip()
    return html


def _parse_float(text: str) -> Optional[float]:
    text = text.strip()
    if not text or text in {"—", "-", "n/a", "N/A"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_dims_cm(dims_text: str) -> tuple[Optional[float], Optional[float], Optional[float]]:
    parts = [p.strip() for p in dims_text.split("/") if p.strip()]
    if len(parts) < 3:
        return (None, None, None)
    h = _parse_float(parts[0])
    w = _parse_float(parts[1])
    l = _parse_float(parts[2])
    return (h, w, l)


def _extract_name(td_html: str) -> Optional[str]:
    # First column contains an <a> tag with the mouse name.
    matches = re.findall(r">([^<>]+)</a>", td_html)
    if not matches:
        return None
    name = _strip_tags(matches[-1])
    return name or None


def parse_prosettings_rows(html: str) -> list[MouseRow]:
    rows: list[MouseRow] = []
    for tr_html in re.findall(r"<tr\b[^>]*>(.*?)</tr>", html, flags=re.S | re.I):
        tds = re.findall(r"<td\b[^>]*>(.*?)</td>", tr_html, flags=re.S | re.I)
        if len(tds) < 6:
            continue

        name_td = None
        for td_html in tds:
            if "</picture>" in td_html.lower() and "</a>" in td_html.lower():
                name_td = td_html
                break
        if not name_td:
            continue

        name = _extract_name(name_td)
        if not name:
            continue

        cells = [_strip_tags(td) for td in tds]

        dims_idx = None
        for idx, cell in enumerate(cells):
            if re.match(r"^\d+(\.\d+)?\s*/\s*\d+(\.\d+)?\s*/\s*\d+(\.\d+)?$", cell):
                dims_idx = idx
                break
        if dims_idx is None:
            continue

        dims = cells[dims_idx]
        weight = cells[dims_idx + 1] if dims_idx + 1 < len(cells) else ""
        shape = cells[dims_idx - 1] if dims_idx - 1 >= 0 else None
        connection = cells[dims_idx - 2] if dims_idx - 2 >= 0 else None

        height_cm, width_cm, length_cm = _parse_dims_cm(dims)
        weight_g = _parse_float(weight)

        rows.append(
            MouseRow(
                name=name,
                connection=connection or None,
                shape=shape or None,
                height_cm=height_cm,
                width_cm=width_cm,
                length_cm=length_cm,
                weight_g=weight_g,
            )
        )
    return rows


def _normalize_ws(s: str) -> str:
    return re.sub(r"\\s+", " ", s).strip()


def _split_variant(model: str) -> tuple[str, Optional[str]]:
    model = _normalize_ws(model)
    m = re.match(r"^(.*)\\(([^()]+)\\)\\s*$", model)
    if not m:
        return (model, None)
    base = _normalize_ws(m.group(1))
    variant = _normalize_ws(m.group(2))
    return (base or model, variant or None)


def _dedupe_brands(brands: Iterable[str]) -> list[str]:
    out = []
    seen = set()
    for b in brands:
        key = b.strip().lower()
        if not key:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(b.strip())
    out.sort(key=lambda s: len(s), reverse=True)
    return out


def split_brand_model(name: str, known_brands: list[str]) -> tuple[str, str, Optional[str]]:
    name = _normalize_ws(name)
    for brand in known_brands:
        b = brand.strip()
        if not b:
            continue
        if name.lower() == b.lower():
            return (b, name, None)
        if name.lower().startswith((b + " ").lower()):
            model = _normalize_ws(name[len(b) :])
            model, variant = _split_variant(model)
            return (b, model, variant)
    parts = name.split(" ", 1)
    brand = parts[0]
    model = parts[1] if len(parts) > 1 else name
    model, variant = _split_variant(model)
    return (brand, model, variant)


def infer_ergo(shape_text: Optional[str]) -> Optional[bool]:
    if not shape_text:
        return None
    s = shape_text.lower()
    if "ergonomic" in s or "ergo" in s:
        return True
    if "ambidextrous" in s or "sym" in s:
        return False
    return None


def infer_wired(connection_text: Optional[str]) -> Optional[bool]:
    if not connection_text:
        return None
    s = connection_text.lower()
    if "wired" in s:
        return True
    if "wireless" in s:
        return False
    return None


def cm_to_mm(value: Optional[float]) -> Optional[float]:
    return None if value is None else round(value * 10.0, 2)


def load_existing_mice(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return []


def mouse_key(item: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(item.get("brand") or "").strip().lower(),
        str(item.get("model") or "").strip().lower(),
        str(item.get("variant") or "").strip().lower(),
    )


def merge_prosettings_into_mice_json(rows: list[MouseRow], mice_json_path: Path) -> list[dict[str, Any]]:
    existing = load_existing_mice(mice_json_path)
    existing_map = {mouse_key(m): m for m in existing}

    known_brands = _dedupe_brands([str(m.get("brand") or "") for m in existing] + [
        "Endgame Gear",
        "ASUS ROG",
        "Arbiter Studio",
        "Dark Project",
        "G-Wolves",
    ])

    for row in rows:
        brand, model, variant = split_brand_model(row.name, known_brands)
        key = (brand.lower(), model.lower(), (variant or "").lower())
        dst = existing_map.get(key)

        height_mm = cm_to_mm(row.height_cm)
        width_mm = cm_to_mm(row.width_cm)
        length_mm = cm_to_mm(row.length_cm)

        ergo = infer_ergo(row.shape)
        wired = infer_wired(row.connection)

        shape_norm: Optional[str] = None
        if ergo is True:
            shape_norm = "ergo"
        elif ergo is False:
            shape_norm = "sym"

        if dst is None:
            dst = {
                "brand": brand,
                "model": model,
                "variant": variant,
                "length_mm": length_mm,
                "width_mm": width_mm,
                "height_mm": height_mm,
                "weight_g": row.weight_g,
                "shape": shape_norm,
                "hump": None,
                "grips": [],
                "hands": [],
                "product_url": None,
                "image_url": None,
                "ergo": ergo,
                "wired": wired,
            }
            existing_map[key] = dst
            continue

        # Override with ProSettings dimensions + flags.
        if length_mm is not None:
            dst["length_mm"] = length_mm
        if width_mm is not None:
            dst["width_mm"] = width_mm
        if height_mm is not None:
            dst["height_mm"] = height_mm
        if row.weight_g is not None:
            dst["weight_g"] = row.weight_g
        if shape_norm is not None:
            dst["shape"] = shape_norm
        if ergo is not None:
            dst["ergo"] = ergo
        if wired is not None:
            dst["wired"] = wired

        # Ensure keys exist for compatibility.
        dst.setdefault("variant", variant)
        dst.setdefault("grips", [])
        dst.setdefault("hands", [])
        dst.setdefault("product_url", None)
        dst.setdefault("image_url", None)

    out = list(existing_map.values())
    for item in out:
        item.setdefault("variant", None)
        item.setdefault("grips", [])
        item.setdefault("hands", [])
        item.setdefault("product_url", None)
        item.setdefault("image_url", None)
        if "ergo" not in item or item.get("ergo") is None:
            shape = str(item.get("shape") or "").strip().lower()
            if shape == "ergo":
                item["ergo"] = True
            elif shape == "sym":
                item["ergo"] = False
            else:
                item.setdefault("ergo", None)
        else:
            item["ergo"] = bool(item["ergo"])
        if "wired" in item and item.get("wired") is not None:
            item["wired"] = bool(item["wired"])
        else:
            item.setdefault("wired", None)
    out.sort(key=lambda m: (str(m.get("brand") or "").lower(), str(m.get("model") or "").lower()))
    return out


def ensure_db_columns(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS mice (
            id TEXT PRIMARY KEY,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            variant TEXT,
            length_mm REAL,
            width_mm REAL,
            height_mm REAL,
            weight_g REAL,
            ergo INTEGER,
            wired INTEGER,
            shape TEXT,
            hump TEXT,
            grips TEXT,
            hands TEXT,
            product_url TEXT,
            image_url TEXT
        )
        """
    )
    cur.execute("PRAGMA table_info(mice)")
    cols = {row[1] for row in cur.fetchall()}
    if "ergo" not in cols:
        cur.execute("ALTER TABLE mice ADD COLUMN ergo INTEGER")
    if "wired" not in cols:
        cur.execute("ALTER TABLE mice ADD COLUMN wired INTEGER")
    conn.commit()


def upsert_mice_into_db(conn: sqlite3.Connection, mice: list[dict[str, Any]]) -> None:
    ensure_db_columns(conn)
    cur = conn.cursor()
    rows = []
    for item in mice:
        brand = str(item.get("brand") or "").strip()
        model = str(item.get("model") or "").strip()
        if not brand or not model:
            continue
        variant = str(item.get("variant") or "").strip() or None
        base_id = f"{brand}-{model}" + (f"-{variant}" if variant else "")
        mouse_id = re.sub(r"[^a-z0-9]+", "-", base_id.lower()).strip("-") or "item"

        ergo = item.get("ergo")
        wired = item.get("wired")
        ergo_i = None if ergo is None else int(bool(ergo))
        wired_i = None if wired is None else int(bool(wired))

        rows.append(
            (
                mouse_id,
                brand,
                model,
                variant,
                item.get("length_mm"),
                item.get("width_mm"),
                item.get("height_mm"),
                item.get("weight_g"),
                item.get("shape"),
                item.get("hump"),
                json.dumps(item.get("grips") or []),
                json.dumps(item.get("hands") or []),
                item.get("product_url"),
                item.get("image_url"),
                ergo_i,
                wired_i,
            )
        )

    cur.executemany(
        """
        INSERT INTO mice (
            id, brand, model, variant, length_mm, width_mm, height_mm, weight_g,
            shape, hump, grips, hands, product_url, image_url, ergo, wired
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            brand=excluded.brand,
            model=excluded.model,
            variant=excluded.variant,
            length_mm=excluded.length_mm,
            width_mm=excluded.width_mm,
            height_mm=excluded.height_mm,
            weight_g=excluded.weight_g,
            shape=excluded.shape,
            hump=excluded.hump,
            grips=excluded.grips,
            hands=excluded.hands,
            product_url=excluded.product_url,
            image_url=excluded.image_url,
            ergo=excluded.ergo,
            wired=excluded.wired
        """,
        rows,
    )
    conn.commit()


def main() -> int:
    html = _fetch_html(PROSETTINGS_URL)
    rows = parse_prosettings_rows(html)
    if not rows:
        print("No rows parsed from ProSettings page.", file=sys.stderr)
        return 2

    mice = merge_prosettings_into_mice_json(rows, MICE_JSON_PATH)
    MICE_JSON_PATH.write_text(json.dumps(mice, indent=2), encoding="utf-8")
    print(f"Wrote {len(mice)} mice -> {MICE_JSON_PATH}")

    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        try:
            upsert_mice_into_db(conn, mice)
        finally:
            conn.close()
        print(f"Upserted {len(mice)} mice into {DB_PATH}")
    else:
        print(f"DB not found at {DB_PATH}; skipped DB upsert.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
