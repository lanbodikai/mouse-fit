"""Create an auditable model-source catalog for the local Mouse Fit database.

This script deliberately separates *viewer availability* from a reusable downloaded
asset.  A mouse being viewable on a web site does not grant a right to download,
decrypt, redistribute, or host that site's underlying model.  Entries are therefore
only marked ``ready`` after a local file is supplied from a source whose license or
direct permission allows the intended use.

The asset file itself belongs in ``frontend/public/models/mice``.  SQLite stores the
provenance and local path, not a BLOB, so deployments can serve it efficiently and
the license/source can be reviewed later.

Examples
--------
Audit local mice that EloShapes says have a 3D viewer::

    python backend/scripts/catalog_mouse_model_sources.py --sync-eloshapes

Register a file you downloaded through an authorized source::

    python backend/scripts/catalog_mouse_model_sources.py --register-file \
      --mouse-id logitech-g-pro-x-superlight-2 \
      --file C:\\Downloads\\gpx2.glb \
      --source-url https://example.com/official-download \
      --license "Brand permission, 2026-07-26"

The registration command copies the model into the public model library and marks it
ready only when ``--license`` is supplied. It accepts GLB, glTF, STL, OBJ and 3MF;
the simulator renders GLB/glTF and STL, so other formats remain catalogued as raw
assets until they are converted with a licensed conversion tool.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import sys
import tempfile
import urllib.request
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from sync_eloshapes_to_postgres import (
    DEFAULT_ELOSHAPES_BASE_URL,
    DEFAULT_PAGE_SIZE,
    DEFAULT_TIMEOUT_SEC,
    _join_brand_names,
    discover_source_config,
    fetch_table_rows,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "backend" / "data"
DB_PATH = DATA_DIR / "mousefit.db"
MICE_JSON_PATH = DATA_DIR / "mice.json"
MODEL_DIR = PROJECT_ROOT / "frontend" / "public" / "models" / "mice"
SUPPORTED_FORMATS = {".glb", ".gltf", ".stl", ".obj", ".3mf"}
RENDERABLE_FORMATS = {".glb", ".gltf", ".stl"}
PRINTABLES_GRAPHQL_URL = "https://api.printables.com/graphql/"
MAX_RENDERABLE_MOUSE_DIMENSION_MM = 250


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", type=Path, default=DB_PATH)
    parser.add_argument("--mice-json", type=Path, default=MICE_JSON_PATH)
    parser.add_argument("--model-dir", type=Path, default=MODEL_DIR)
    parser.add_argument("--sync-eloshapes", action="store_true", help="Record viewer-only 3D availability from the public EloShapes catalog.")
    parser.add_argument(
        "--import-printables-pack",
        type=str,
        metavar="PRINT_ID",
        help="Download a public Printables MODEL_FILES pack and register unambiguous exact mouse-name matches.",
    )
    parser.add_argument(
        "--discover-printables-candidates",
        action="store_true",
        help="Search Printables for exact-title whole-mouse candidates and save non-downloaded source records.",
    )
    parser.add_argument(
        "--discovery-limit",
        type=int,
        default=0,
        help="Limit Printables candidate discovery to this many local mice (0 means all).",
    )
    parser.add_argument("--write-manifest", action="store_true", help="Write simulator manifest entries for model assets marked ready.")
    parser.add_argument(
        "--write-missing-report",
        action="store_true",
        help="Regenerate docs/missing-3d-mouse-models.md from the current asset catalog.",
    )
    parser.add_argument("--base-url", default=DEFAULT_ELOSHAPES_BASE_URL)
    parser.add_argument("--timeout-sec", type=float, default=DEFAULT_TIMEOUT_SEC)
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
    parser.add_argument("--register-file", action="store_true", help="Register an authorized local asset file.")
    parser.add_argument("--mouse-id", help="The local mice.id to associate with --register-file.")
    parser.add_argument("--file", type=Path, help="Authorized local model file to copy into the model library.")
    parser.add_argument("--source-url", help="Canonical page or direct download URL for the source.")
    parser.add_argument("--license", help="License name/URL or the record of direct permission.")
    parser.add_argument("--notes", default="", help="Optional provenance or conversion notes.")
    return parser.parse_args()


def strict_name(value: str) -> str:
    """Case-insensitive matching while preserving punctuation and variant identity."""
    return re.sub(r"\s+", " ", value).strip().casefold()


def mouse_display_name(item: dict[str, Any]) -> str:
    return " ".join(
        part for part in (str(item.get("brand") or "").strip(), str(item.get("model") or "").strip()) if part
    )


def mouse_id(item: dict[str, Any]) -> str:
    variant = str(item.get("variant") or "").strip()
    base = mouse_display_name(item) + (f" {variant}" if variant else "")
    return re.sub(r"[^a-z0-9]+", "-", base.casefold()).strip("-") or "mouse"


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS mouse_model_assets (
            id INTEGER PRIMARY KEY,
            mouse_id TEXT NOT NULL,
            source_name TEXT NOT NULL,
            source_url TEXT NOT NULL,
            asset_url TEXT,
            local_path TEXT,
            file_format TEXT,
            license TEXT,
            status TEXT NOT NULL,
            sha256 TEXT,
            bytes INTEGER,
            length_mm REAL,
            width_mm REAL,
            height_mm REAL,
            notes TEXT NOT NULL DEFAULT '',
            discovered_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(mouse_id, source_url)
        )
        """
    )
    existing_columns = {str(row[1]) for row in conn.execute("PRAGMA table_info(mouse_model_assets)")}
    for column in ("length_mm", "width_mm", "height_mm"):
        if column not in existing_columns:
            conn.execute(f"ALTER TABLE mouse_model_assets ADD COLUMN {column} REAL")
    conn.execute("CREATE INDEX IF NOT EXISTS mouse_model_assets_mouse_id_idx ON mouse_model_assets(mouse_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS mouse_model_assets_status_idx ON mouse_model_assets(status)")
    conn.commit()


def local_mouse_ids(mice_json_path: Path) -> dict[str, str]:
    payload = json.loads(mice_json_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"Expected a list in {mice_json_path}")
    return {strict_name(mouse_display_name(item)): mouse_id(item) for item in payload if mouse_display_name(item)}


def canonical_asset_name(value: str) -> str:
    """Normalize names without collapsing meaningful model variants (O vs O-, V2 vs V2 Pro)."""
    stem = Path(value).stem.casefold()
    stem = re.sub(r"\(\s*supports?\s*\)", "", stem)
    stem = stem.replace("model o-", "model o minus").replace("model d-", "model d minus")
    stem = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", stem)).strip()
    return stem


def local_exact_asset_matches(conn: sqlite3.Connection) -> dict[str, str]:
    """Return only non-ambiguous local mouse names for automatic source matching."""
    candidates: dict[str, list[str]] = {}
    for mouse_id_value, brand, model, variant in conn.execute("SELECT id, brand, model, COALESCE(variant, '') FROM mice"):
        title = " ".join(part for part in (brand, model, variant) if part).strip()
        key = canonical_asset_name(title)
        candidates.setdefault(key, []).append(mouse_id_value)
    return {key: ids[0] for key, ids in candidates.items() if len(ids) == 1}


def upsert_asset(conn: sqlite3.Connection, record: dict[str, Any]) -> None:
    now = datetime.now(UTC).isoformat()
    conn.execute(
        """
        INSERT INTO mouse_model_assets (
            mouse_id, source_name, source_url, asset_url, local_path, file_format,
            license, status, sha256, bytes, length_mm, width_mm, height_mm,
            notes, discovered_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(mouse_id, source_url) DO UPDATE SET
            asset_url=excluded.asset_url,
            local_path=excluded.local_path,
            file_format=excluded.file_format,
            license=excluded.license,
            status=excluded.status,
            sha256=excluded.sha256,
            bytes=excluded.bytes,
            length_mm=excluded.length_mm,
            width_mm=excluded.width_mm,
            height_mm=excluded.height_mm,
            notes=excluded.notes,
            updated_at=excluded.updated_at
        """,
        (
            record["mouse_id"], record["source_name"], record["source_url"], record.get("asset_url"),
            record.get("local_path"), record.get("file_format"), record.get("license"), record["status"],
            record.get("sha256"), record.get("bytes"),
            record.get("length_mm"), record.get("width_mm"), record.get("height_mm"),
            record.get("notes", ""), now, now,
        ),
    )


def sync_eloshapes(conn: sqlite3.Connection, args: argparse.Namespace) -> int:
    local_ids = local_mouse_ids(args.mice_json)
    supabase_url, apikey, table_name = discover_source_config(args.base_url.rstrip("/"), args.timeout_sec)
    import requests

    with requests.Session() as session:
        rows = fetch_table_rows(
            session, f"{supabase_url}/rest/v1", apikey, table_name, args.timeout_sec, args.page_size, "mouse"
        )

    matches = 0
    for row in rows:
        if row.get("mouse__has_3d_model") is not True:
            continue
        brand = _join_brand_names(row.get("general__brand_names"), row.get("general__brands_separator"))
        model = str(row.get("general__model") or "").strip()
        handle = str(row.get("general__handle") or "").strip()
        local_id = local_ids.get(strict_name(f"{brand} {model}"))
        if not local_id or not handle:
            continue
        upsert_asset(
            conn,
            {
                "mouse_id": local_id,
                "source_name": "EloShapes",
                "source_url": f"{args.base_url.rstrip('/')}/mouse/{handle}",
                "status": "viewer_only",
                "notes": "Public catalog marks this mouse as 3D viewable. No reusable download URL or redistribution license was supplied, so no asset was downloaded.",
            },
        )
        matches += 1
    conn.commit()
    print(f"Recorded {matches} EloShapes viewer-only entries. No model files were downloaded.")
    return matches


def register_file(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    if not args.mouse_id or not args.file or not args.source_url or not args.license:
        raise ValueError("--register-file requires --mouse-id, --file, --source-url, and --license.")
    source = args.file.resolve()
    if not source.is_file():
        raise ValueError(f"Model file does not exist: {source}")
    extension = source.suffix.casefold()
    if extension not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported model format {extension or '(none)'}. Allowed: {', '.join(sorted(SUPPORTED_FORMATS))}")
    if conn.execute("SELECT 1 FROM mice WHERE id = ?", (args.mouse_id,)).fetchone() is None:
        raise ValueError(f"No local mouse exists with id '{args.mouse_id}'.")

    args.model_dir.mkdir(parents=True, exist_ok=True)
    destination = args.model_dir / f"{args.mouse_id}{extension}"
    if source != destination.resolve():
        shutil.copy2(source, destination)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    renderable = extension in RENDERABLE_FORMATS
    upsert_asset(
        conn,
        {
            "mouse_id": args.mouse_id,
            "source_name": "Authorized local import",
            "source_url": args.source_url,
            "asset_url": f"/models/mice/{destination.name}" if renderable else None,
            "local_path": destination.relative_to(PROJECT_ROOT).as_posix(),
            "file_format": extension[1:],
            "license": args.license,
            "status": "ready" if renderable else "needs_conversion",
            "sha256": digest,
            "bytes": destination.stat().st_size,
            "notes": args.notes or ("Ready for simulator" if renderable else "Raw asset registered; convert to GLB/glTF or STL before simulator use."),
        },
    )
    conn.commit()
    print(f"Registered {destination.name} for {args.mouse_id} ({'ready' if renderable else 'needs conversion'}).")


def _printables_request(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    import requests

    response = requests.post(
        PRINTABLES_GRAPHQL_URL,
        json={"query": query, "variables": variables},
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://www.printables.com",
            "Referer": "https://www.printables.com/",
            "User-Agent": "Mozilla/5.0 (compatible; MouseFitAssetCatalog/1.0)",
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        raise ValueError(f"Printables API error: {payload['errors']}")
    return payload["data"]


def _printables_pack(print_id: str) -> dict[str, Any]:
    query = """
        query($id: ID!) {
          print(id: $id) {
            id name slug user { handle }
            license { id name disallowRemixing }
            excludeCommercialUsage
            stls { id name fileSize }
            downloadPacks { id fileSize fileType }
          }
        }
    """
    result = _printables_request(query, {"id": str(print_id)}).get("print")
    if not isinstance(result, dict):
        raise ValueError(f"Printables model {print_id} was not found.")
    return result


def _search_printables(query_text: str) -> list[dict[str, Any]]:
    query = """
        query($query: String!, $limit: Int!, $offset: Int!) {
          searchPrints2(query: $query, limit: $limit, offset: $offset) {
            items { id name slug filesCount user { handle } }
          }
        }
    """
    result = _printables_request(query, {"query": query_text, "limit": 12, "offset": 0}).get("searchPrints2")
    return result.get("items", []) if isinstance(result, dict) else []


def discover_printables_candidates(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    mice = conn.execute("SELECT id, brand, model, COALESCE(variant, '') FROM mice ORDER BY brand COLLATE NOCASE, model COLLATE NOCASE").fetchall()
    if args.discovery_limit:
        mice = mice[: args.discovery_limit]
    discovered = 0
    for index, (mouse_id_value, brand, model, variant) in enumerate(mice, start=1):
        title = " ".join(part for part in (brand, model, variant) if part).strip()
        target_name = canonical_asset_name(title)
        try:
            candidates = _search_printables(title)
        except Exception as exc:  # Keep a long search resumable when one request fails.
            print(f"[discovery] skipped {title}: {exc}", file=sys.stderr)
            continue
        exact = next(
            (
                item
                for item in candidates
                if int(item.get("filesCount") or 0) > 0 and canonical_asset_name(str(item.get("name") or "")) == target_name
            ),
            None,
        )
        if not exact:
            continue
        try:
            details = _printables_pack(str(exact["id"]))
        except Exception as exc:
            print(f"[discovery] could not verify {title}: {exc}", file=sys.stderr)
            continue
        license_info = details.get("license") or {}
        license_name = str(license_info.get("name") or "").strip()
        if not license_name or license_info.get("disallowRemixing") is True or not details.get("stls"):
            continue
        source_url = f"https://www.printables.com/model/{details['id']}-{details['slug']}"
        upsert_asset(
            conn,
            {
                "mouse_id": mouse_id_value,
                "source_name": "Printables",
                "source_url": source_url,
                "file_format": "stl",
                "license": license_name,
                "status": "candidate",
                "notes": f"Exact-title public candidate by @{(details.get('user') or {}).get('handle') or 'unknown'}; download not yet approved for automated import.",
            },
        )
        discovered += 1
        print(f"[discovery] {index}/{len(mice)} {title} -> {source_url}")
    conn.commit()
    print(f"Saved {discovered} verified Printables candidates from {len(mice)} local mice.")


def _printables_download_url(print_id: str, pack_id: str) -> str:
    mutation = """
        mutation($printId: ID!, $ids: [ID!]!, $fileType: DownloadFileTypeEnum!) {
          getDownloadLink(
            printId: $printId,
            source: model_detail,
            files: [{ fileType: $fileType, ids: $ids }]
          ) { ok errors { field messages code } output { link ttl } }
        }
    """
    result = _printables_request(
        mutation,
        {"printId": str(print_id), "ids": [str(pack_id)], "fileType": "pack"},
    ).get("getDownloadLink")
    if not isinstance(result, dict) or not result.get("ok"):
        raise ValueError(f"Printables did not issue a download URL: {result.get('errors') if isinstance(result, dict) else result}")
    link = result.get("output", {}).get("link")
    if not isinstance(link, str) or not link.startswith("https://"):
        raise ValueError("Printables returned an invalid download URL.")
    return link


def _download_to(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; MouseFitAssetCatalog/1.0)"})
    with urllib.request.urlopen(request, timeout=180) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output, length=1024 * 1024)


def _safe_extract_archive(archive: Path, destination: Path) -> list[Path]:
    destination_resolved = destination.resolve()
    extracted: list[Path] = []
    with zipfile.ZipFile(archive) as bundle:
        for member in bundle.infolist():
            if member.is_dir():
                continue
            target = (destination / member.filename).resolve()
            if target != destination_resolved and destination_resolved not in target.parents:
                raise ValueError(f"Refusing unsafe archive member: {member.filename}")
            target.parent.mkdir(parents=True, exist_ok=True)
            with bundle.open(member) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)
            extracted.append(target)
    return extracted


def import_printables_pack(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    details = _printables_pack(args.import_printables_pack)
    license_info = details.get("license") or {}
    license_name = str(license_info.get("name") or "").strip()
    if not license_name:
        raise ValueError("The Printables listing has no license. It will not be downloaded.")
    if license_info.get("disallowRemixing") is True:
        raise ValueError("The Printables listing disallows remixing. It will not be imported into the simulator.")

    packs = details.get("downloadPacks") or []
    pack = next((entry for entry in packs if entry.get("fileType") == "MODEL_FILES"), None)
    if not isinstance(pack, dict) or not pack.get("id"):
        raise ValueError("The Printables listing does not expose a MODEL_FILES download pack.")

    source_url = f"https://www.printables.com/model/{details['id']}-{details['slug']}"
    source_slug = f"printables-{details['id']}-{details['slug']}"
    output_dir = args.model_dir / "sources" / source_slug
    raw_dir = output_dir / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading {details['name']} ({int(pack.get('fileSize') or 0):,} bytes) from Printables…")
    download_url = _printables_download_url(str(details["id"]), str(pack["id"]))
    with tempfile.TemporaryDirectory(prefix="mouse-fit-printables-") as temporary:
        archive = Path(temporary) / "model-files.zip"
        _download_to(download_url, archive)
        extracted = _safe_extract_archive(archive, raw_dir)

    expected_files = {str(entry.get("name")): entry for entry in details.get("stls") or []}
    exact_matches = local_exact_asset_matches(conn)
    author = str((details.get("user") or {}).get("handle") or "unknown")
    attribution = f"Printables model by @{author}; {license_name}. Source: {source_url}"
    registered = 0
    unmatched = 0
    for asset in extracted:
        if asset.suffix.casefold() not in SUPPORTED_FORMATS:
            continue
        match_id = exact_matches.get(canonical_asset_name(asset.name))
        if not match_id:
            unmatched += 1
            continue
        listed = expected_files.get(asset.name, {})
        relative_path = asset.relative_to(PROJECT_ROOT).as_posix()
        upsert_asset(
            conn,
            {
                "mouse_id": match_id,
                "source_name": "Printables",
                "source_url": f"{source_url}#file-{listed.get('id', asset.name)}",
                "asset_url": "/" + relative_path.removeprefix("frontend/public/").replace("\\", "/"),
                "local_path": relative_path,
                "file_format": asset.suffix.casefold().lstrip("."),
                "license": license_name,
                "status": "ready",
                "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
                "bytes": asset.stat().st_size,
                "notes": f"{attribution} Raw STL asset; rendered directly by the simulator STL loader.",
            },
        )
        registered += 1
    conn.commit()
    print(f"Imported {len(extracted)} source files; registered {registered} exact local mouse matches; {unmatched} need an explicit model mapping.")


def write_manifest(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    rows = conn.execute(
        """
        SELECT a.mouse_id, a.asset_url, a.file_format, a.source_url, a.source_name,
               m.brand, m.model, m.variant,
               COALESCE(a.length_mm, m.length_mm),
               COALESCE(a.width_mm, m.width_mm),
               COALESCE(a.height_mm, m.height_mm),
               m.shape
        FROM mouse_model_assets AS a
        JOIN mice AS m ON m.id = a.mouse_id
        WHERE a.status = 'ready' AND a.asset_url IS NOT NULL
        ORDER BY m.brand COLLATE NOCASE, m.model COLLATE NOCASE,
                 CASE a.source_name
                     WHEN 'FindMyMouse' THEN 0
                     WHEN 'Authorized local import' THEN 1
                     ELSE 2
                 END,
                 a.updated_at DESC
        """
    ).fetchall()
    models: list[dict[str, Any]] = []
    seen_mouse_ids: set[str] = set()
    for row in rows:
        mouse_id_value, asset_url, file_format, source_url, _source_name, brand, model, variant, length, width, height, shape = row
        if mouse_id_value in seen_mouse_ids:
            continue
        seen_mouse_ids.add(mouse_id_value)
        if str(file_format).casefold() not in {"glb", "gltf", "stl"}:
            continue
        dimensions = (length, width, height)
        if not all(
            isinstance(dimension, (int, float))
            and 0 < float(dimension) <= MAX_RENDERABLE_MOUSE_DIMENSION_MM
            for dimension in dimensions
        ):
            print(f"Skipped invalid mouse dimensions for {mouse_id_value}: {dimensions}", file=sys.stderr)
            continue
        display_name = " ".join(part for part in (str(model or "").strip(), str(variant or "").strip()) if part)
        models.append(
            {
                "id": mouse_id_value,
                "sourceHandle": None,
                "brand": brand,
                "name": display_name or model,
                "dimensionsMm": {"lengthMm": length, "widthMm": width, "heightMm": height},
                "shape": shape,
                "assetUrl": quote(str(asset_url), safe="/%:-_."),
                "assetFormat": str(file_format).casefold(),
                "sourceUrl": source_url,
                "transform": {"scale": [1, 1, 1], "rotation": [0, 0, 0], "position": [0, 0, 0]},
            }
        )
    manifest = {
        "version": 2,
        "source": "Authorized community and official mouse models",
        "generatedAt": datetime.now(UTC).isoformat(),
        "models": models,
        "failures": [],
    }
    manifest_path = args.model_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(models)} simulator-ready model entries to {manifest_path}")


def write_missing_report(conn: sqlite3.Connection) -> None:
    excluded_ids = {"zaunkoenig-m2k"}
    rows = conn.execute(
        """
        SELECT m.id, m.brand, m.model, COALESCE(m.variant, ''),
               m.length_mm, m.width_mm, m.height_mm,
               MAX(CASE WHEN a.status = 'ready' AND a.asset_url IS NOT NULL THEN 1 ELSE 0 END) AS ready,
               MAX(CASE WHEN a.status = 'candidate' THEN 1 ELSE 0 END) AS candidate,
               MAX(CASE WHEN a.status = 'viewer_only' THEN 1 ELSE 0 END) AS viewer_only
        FROM mice AS m
        LEFT JOIN mouse_model_assets AS a ON a.mouse_id = m.id
        GROUP BY m.id, m.brand, m.model, m.variant
        ORDER BY m.brand COLLATE NOCASE, m.model COLLATE NOCASE, m.variant COLLATE NOCASE
        """
    ).fetchall()
    rows = [row for row in rows if row[0] not in excluded_ids]

    def is_simulator_ready(row: tuple[Any, ...]) -> bool:
        return bool(row[7]) and all(
            isinstance(dimension, (int, float))
            and 0 < float(dimension) <= MAX_RENDERABLE_MOUSE_DIMENSION_MM
            for dimension in row[4:7]
        )

    ready_count = sum(is_simulator_ready(row) for row in rows)
    missing = [row for row in rows if not is_simulator_ready(row)]
    candidates = [row for row in missing if row[8]]
    viewer_only = [row for row in missing if not row[8] and row[9]]
    no_source = [row for row in missing if not row[8] and not row[9]]

    def display_name(row: tuple[Any, ...]) -> str:
        return " ".join(part for part in (str(row[1]).strip(), str(row[2]).strip(), str(row[3]).strip()) if part)

    def section(title: str, explanation: str, entries: list[tuple[Any, ...]]) -> list[str]:
        lines = [f"## {title} ({len(entries)})", "", explanation, ""]
        lines.extend(f"- {display_name(row)}" for row in entries)
        lines.append("")
        return lines

    report = [
        "# Mice without a simulator-ready 3D model",
        "",
        f"Generated {datetime.now(UTC).date().isoformat()} from backend/data/mousefit.db.",
        "",
        f"- Catalog entries: {len(rows)} (Zaunkoenig M2K excluded because it was removed from the simulator)",
        f"- Imported simulator models: {ready_count}",
        f"- Missing a simulator-ready local model: {len(missing)}",
        "",
        "A viewer-only source is intentionally not imported unless a reusable asset and permission are recorded locally.",
        "",
    ]
    report.extend(section(
        "Candidate source found",
        "A compatible source candidate is recorded, but it has not been imported into the simulator.",
        candidates,
    ))
    report.extend(section(
        "3D viewer exists, but no reusable asset",
        "These mice are marked as viewable in an external 3D viewer, but no downloadable/re-distributable model is available locally.",
        viewer_only,
    ))
    report.extend(section(
        "No recorded 3D model source",
        "No model source is currently recorded for these catalog entries.",
        no_source,
    ))
    report_path = PROJECT_ROOT / "docs" / "missing-3d-mouse-models.md"
    report_path.write_text("\n".join(report).rstrip() + "\n", encoding="utf-8")
    print(f"Wrote missing-model report: {ready_count} ready, {len(missing)} missing.")


def main() -> int:
    args = parse_args()
    if (
        not args.sync_eloshapes
        and not args.register_file
        and not args.import_printables_pack
        and not args.write_manifest
        and not args.write_missing_report
        and not args.discover_printables_candidates
    ):
        raise SystemExit(
            "Choose --sync-eloshapes, --import-printables-pack, --discover-printables-candidates, "
            "--write-manifest, --write-missing-report, or --register-file. Run with --help for details."
        )
    with sqlite3.connect(args.db) as conn:
        ensure_schema(conn)
        if args.sync_eloshapes:
            sync_eloshapes(conn, args)
        if args.import_printables_pack:
            import_printables_pack(conn, args)
        if args.discover_printables_candidates:
            discover_printables_candidates(conn, args)
        if args.write_manifest:
            write_manifest(conn, args)
        if args.write_missing_report:
            write_missing_report(conn)
        if args.register_file:
            register_file(conn, args)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(2)
