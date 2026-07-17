from __future__ import annotations

from typing import Dict

from backend.db.pool import get_conn


def ensure_columns(conn, table_name: str, required: Dict[str, str]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table_name,),
        )
        existing = {str(row["column_name"]) for row in cur.fetchall()}
        for column_name, column_definition in required.items():
            if column_name not in existing:
                cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")


def ensure_source_handle_unique_index(conn) -> None:
    with conn.cursor() as cur:
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


def init_db() -> None:
    with get_conn() as conn:
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
                    image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
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
                CREATE TABLE IF NOT EXISTS measurements (
                    id BIGSERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    length_mm DOUBLE PRECISION NOT NULL,
                    width_mm DOUBLE PRECISION NOT NULL,
                    length_cm DOUBLE PRECISION NOT NULL,
                    width_cm DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS grips (
                    id BIGSERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    grip TEXT NOT NULL,
                    confidence DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id BIGSERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    report_json JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS profiles (
                    id TEXT PRIMARY KEY,
                    email TEXT,
                    display_name TEXT,
                    metadata JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            ensure_source_handle_unique_index(conn)
            cur.execute("CREATE INDEX IF NOT EXISTS mice_availability_status_idx ON mice (availability_status)")
            cur.execute("CREATE INDEX IF NOT EXISTS mice_brand_model_idx ON mice (brand, model)")
            cur.execute("CREATE INDEX IF NOT EXISTS measurements_session_id_id_idx ON measurements (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS measurements_user_id_id_idx ON measurements (user_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS grips_session_id_id_idx ON grips (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS grips_user_id_id_idx ON grips (user_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS reports_session_id_id_idx ON reports (session_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS reports_user_id_id_idx ON reports (user_id, id DESC)")
            cur.execute("CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email)")

        ensure_columns(
            conn,
            "mice",
            {
                "ergo": "BOOLEAN",
                "wired": "BOOLEAN",
                "grips": "JSONB NOT NULL DEFAULT '[]'::jsonb",
                "hands": "JSONB NOT NULL DEFAULT '[]'::jsonb",
                "source": "TEXT",
                "source_handle": "TEXT",
                "availability_status": "TEXT",
                "image_urls": "JSONB NOT NULL DEFAULT '[]'::jsonb",
                "shape_raw": "TEXT",
                "hump_raw": "TEXT",
                "hump_bucket": "TEXT",
                "front_flare_raw": "TEXT",
                "side_curvature_raw": "TEXT",
                "side_profile": "TEXT",
                "hand_compatibility": "TEXT",
                "affiliate_links": "JSONB",
                "brand_discount": "TEXT",
                "discount_code": "TEXT",
                "price_usd": "NUMERIC",
                "price_status": "TEXT",
                "source_payload": "JSONB",
                "created_at": "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
                "updated_at": "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            },
        )
        ensure_columns(conn, "measurements", {"user_id": "TEXT"})
        ensure_columns(conn, "grips", {"user_id": "TEXT"})
        ensure_columns(conn, "reports", {"user_id": "TEXT"})
        conn.commit()
