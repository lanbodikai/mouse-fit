"""Import authorized EloShapes mouse 3D assets into the Mouse Fit public manifest.

This importer intentionally does not guess model URLs or enumerate storage buckets.  It
only follows model-asset references that EloShapes exposes in the mouse records fetched
by ``sync_eloshapes_to_postgres.py``.  That keeps the import repeatable and makes the
generated manifest an audit trail of exactly which source URL produced each asset.

Run a report first:
    python backend/scripts/import_eloshapes_mouse_models.py

After confirming the report, write the assets and manifest:
    python backend/scripts/import_eloshapes_mouse_models.py --download
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urlparse

import requests

from scripts.sync_eloshapes_to_postgres import (
    DEFAULT_ELOSHAPES_BASE_URL,
    DEFAULT_TIMEOUT_SEC,
    SOURCE_HEADERS,
    _normalize_shape,
    _to_float,
    discover_source_config,
    fetch_table_rows,
    slugify,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "frontend" / "public" / "models" / "mice"
DEFAULT_MANIFEST_PATH = DEFAULT_OUTPUT_DIR / "manifest.json"
MODEL_EXTENSIONS = {".glb", ".gltf"}
MODEL_URL_PATTERN = re.compile(
    r"https?://[^\s\"'<>]+?\.(?:glb|gltf)(?:\?[^\s\"'<>]*)?",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_ELOSHAPES_BASE_URL)
    parser.add_argument("--timeout-sec", type=float, default=DEFAULT_TIMEOUT_SEC)
    parser.add_argument("--page-size", type=int, default=500)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST_PATH)
    parser.add_argument(
        "--download",
        action="store_true",
        help="Download discovered assets and write the manifest. Without this flag the script reports only.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit discovered models for a small validation import (0 means all).",
    )
    parser.add_argument(
        "--delay-ms",
        type=int,
        default=80,
        help="Delay between asset downloads to be considerate of the source service.",
    )
    return parser.parse_args()


def _walk_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for nested in value.values():
            yield from _walk_strings(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _walk_strings(nested)


def find_model_urls(row: dict[str, Any]) -> list[str]:
    """Return distinct, publicly referenced GLB/glTF URLs from a product record."""
    urls: list[str] = []
    seen: set[str] = set()
    for text in _walk_strings(row):
        candidates = [text] if text.lower().split("?", 1)[0].endswith(tuple(MODEL_EXTENSIONS)) else MODEL_URL_PATTERN.findall(text)
        for candidate in candidates:
            url = unquote(candidate.strip())
            parsed = urlparse(url)
            if parsed.scheme not in {"https", "http"} or not parsed.netloc:
                continue
            if Path(parsed.path).suffix.lower() not in MODEL_EXTENSIONS or url in seen:
                continue
            seen.add(url)
            urls.append(url)
    return urls


def row_dimensions(row: dict[str, Any]) -> dict[str, float | None]:
    return {
        "lengthMm": _to_float(row.get("mouse__length")),
        "widthMm": _to_float(row.get("mouse__width")),
        "heightMm": _to_float(row.get("mouse__height")),
    }


def make_entry(row: dict[str, Any], source_url: str, local_name: str) -> dict[str, Any]:
    source_handle = str(row.get("general__handle") or "").strip()
    model = str(row.get("general__model") or "Mouse").strip()
    brands = row.get("general__brand_names")
    brand = " ".join(str(item).strip() for item in brands) if isinstance(brands, list) else str(brands or "Unknown")
    return {
        "id": source_handle or slugify(f"{brand}-{model}"),
        "sourceHandle": source_handle or None,
        "brand": brand.strip() or "Unknown",
        "name": model,
        "dimensionsMm": row_dimensions(row),
        "shape": _normalize_shape(str(row.get("mouse__shape") or "")),
        "assetUrl": f"/models/mice/{local_name}",
        "sourceUrl": source_url,
        # The importer cannot infer a vendor model's axis convention. These are
        # intentionally editable per entry after visual QA in the simulator.
        "transform": {"scale": [1, 1, 1], "rotation": [0, 0, 0], "position": [0, 0, 0]},
    }


def validate_model_payload(response: requests.Response, extension: str) -> None:
    if extension == ".glb":
        if response.content[:4] != b"glTF":
            raise ValueError("asset does not have a valid GLB header")
        return
    try:
        payload = response.json()
    except ValueError as exc:
        raise ValueError("asset is not valid glTF JSON") from exc
    if not isinstance(payload, dict) or "asset" not in payload:
        raise ValueError("asset is not a glTF document")


def download_asset(session: requests.Session, url: str, destination: Path, timeout_sec: float) -> tuple[int, str]:
    response = session.get(url, headers={**SOURCE_HEADERS, "Accept": "model/gltf-binary,model/gltf+json,*/*"}, timeout=timeout_sec)
    response.raise_for_status()
    extension = Path(urlparse(url).path).suffix.lower()
    validate_model_payload(response, extension)
    destination.write_bytes(response.content)
    content_type = response.headers.get("Content-Type") or mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
    return len(response.content), content_type


def main() -> int:
    args = parse_args()
    if args.limit < 0 or args.page_size < 1 or args.delay_ms < 0:
        raise SystemExit("--limit, --page-size, and --delay-ms must be non-negative (page size must be at least 1).")

    base_url = args.base_url.rstrip("/")
    print(f"[models] Discovering authorized model references from {base_url}/mouse/browse")
    supabase_url, apikey, table_name = discover_source_config(base_url, args.timeout_sec)
    with requests.Session() as session:
        rows = fetch_table_rows(
            session,
            f"{supabase_url}/rest/v1",
            apikey,
            table_name,
            args.timeout_sec,
            args.page_size,
            "mouse",
        )
        discovered: list[tuple[dict[str, Any], str]] = []
        for row in rows:
            for url in find_model_urls(row):
                discovered.append((row, url))

        if args.limit:
            discovered = discovered[: args.limit]
        print(f"[models] Catalog rows: {len(rows)}; directly referenced GLB/glTF assets: {len(discovered)}")
        if not discovered:
            print("[models] No downloadable GLB/glTF URL is exposed by the catalog payload. No files were written.")
            print("[models] Add an approved source adapter for the designated EloShapes viewer endpoint, then rerun this importer.")
            return 0

        entries: list[dict[str, Any]] = []
        failures: list[dict[str, str]] = []
        for number, (row, source_url) in enumerate(discovered, start=1):
            source_handle = str(row.get("general__handle") or "mouse")
            extension = Path(urlparse(source_url).path).suffix.lower()
            filename = f"{slugify(source_handle)}{extension}"
            entry = make_entry(row, source_url, filename)
            if not args.download:
                print(f"[models] would import {entry['id']} <- {source_url}")
                entries.append(entry)
                continue

            args.output_dir.mkdir(parents=True, exist_ok=True)
            destination = args.output_dir / filename
            try:
                byte_count, content_type = download_asset(session, source_url, destination, args.timeout_sec)
                entry["bytes"] = byte_count
                entry["contentType"] = content_type
                entry["sha256"] = hashlib.sha256(destination.read_bytes()).hexdigest()
                entries.append(entry)
                print(f"[models] imported {entry['id']} ({byte_count:,} bytes)")
            except (requests.RequestException, OSError, ValueError) as exc:
                failures.append({"id": entry["id"], "url": source_url, "reason": str(exc)})
                print(f"[models] skipped {entry['id']}: {exc}", file=sys.stderr)
            if args.delay_ms:
                time.sleep(args.delay_ms / 1000)

    if args.download:
        manifest = {
            "version": 1,
            "source": "EloShapes (authorized import)",
            "generatedAt": datetime.now(UTC).isoformat(),
            "models": entries,
            "failures": failures,
        }
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"[models] Wrote {len(entries)} model entries to {args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
