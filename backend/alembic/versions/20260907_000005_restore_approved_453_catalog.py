"""replace the production catalog with the approved 453-mouse snapshot

Revision ID: 20260907_000005
Revises: 20260907_000004
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import sqlalchemy as sa
from alembic import op


revision = "20260907_000005"
down_revision = "20260907_000004"
branch_labels = None
depends_on = None

SNAPSHOT_COUNT = 453
SNAPSHOT_PATH = Path(__file__).resolve().parents[2] / "data" / "mousefit.db"
PROTECTED_BRANDS = {"attack", "hitscan", "pmm", "scyrox", "vxe", "zaunkoenig"}


def _json_list(value: object) -> str:
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return json.dumps(parsed)
        except json.JSONDecodeError:
            pass
    return "[]"


def _optional_bool(value: object) -> bool | None:
    if value is None:
        return None
    return bool(value)


def upgrade() -> None:
    """Load the catalog that was manually approved on 2026-07-26.

    The snapshot is versioned with the repository.  Validating it before the
    replacement prevents a partial or accidental catalog wipe on deployment.
    """
    if not SNAPSHOT_PATH.is_file():
        raise RuntimeError(f"Approved catalog snapshot is missing: {SNAPSHOT_PATH}")

    with sqlite3.connect(SNAPSHOT_PATH) as snapshot:
        snapshot.row_factory = sqlite3.Row
        rows = snapshot.execute(
            """
            SELECT id, brand, model, variant, length_mm, width_mm, height_mm,
                   weight_g, ergo, wired, shape, hump, grips, hands,
                   product_url, image_url
            FROM mice ORDER BY id
            """
        ).fetchall()

    if len(rows) != SNAPSHOT_COUNT:
        raise RuntimeError(f"Approved catalog must contain {SNAPSHOT_COUNT} mice; found {len(rows)}")
    brands = {str(row["brand"]).strip().lower() for row in rows}
    missing_protected = PROTECTED_BRANDS - brands
    if missing_protected:
        raise RuntimeError(f"Approved catalog is missing protected brands: {sorted(missing_protected)}")

    payload = [
        {
            "id": row["id"],
            "brand": row["brand"],
            "model": row["model"],
            "variant": row["variant"],
            "length_mm": row["length_mm"],
            "width_mm": row["width_mm"],
            "height_mm": row["height_mm"],
            "weight_g": row["weight_g"],
            "ergo": _optional_bool(row["ergo"]),
            "wired": _optional_bool(row["wired"]),
            "shape": row["shape"],
            "hump": row["hump"],
            "grips": _json_list(row["grips"]),
            "hands": _json_list(row["hands"]),
            "product_url": row["product_url"],
            "image_url": row["image_url"],
            "source": "legacy:approved-453-snapshot",
            "source_handle": f"legacy-snapshot:{row['id']}",
        }
        for row in rows
    ]

    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM mice"))
    bind.execute(
        sa.text(
            """
            INSERT INTO mice (
                id, brand, model, variant, length_mm, width_mm, height_mm,
                weight_g, ergo, wired, shape, hump, grips, hands,
                product_url, image_url, source, source_handle, created_at, updated_at
            ) VALUES (
                :id, :brand, :model, :variant, :length_mm, :width_mm, :height_mm,
                :weight_g, :ergo, :wired, :shape, :hump,
                CAST(:grips AS jsonb), CAST(:hands AS jsonb),
                :product_url, :image_url, :source, :source_handle, NOW(), NOW()
            )
            """
        ),
        payload,
    )

    final_count = bind.execute(sa.text("SELECT COUNT(*) FROM mice")).scalar_one()
    if final_count != SNAPSHOT_COUNT:
        raise RuntimeError(f"Catalog replacement verification failed: expected {SNAPSHOT_COUNT}, got {final_count}")


def downgrade() -> None:
    # This is intentionally irreversible: the superseded production catalog
    # is not a curated restore source.
    pass
