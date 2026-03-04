"""baseline schema with auth-ready columns

Revision ID: 20260226_000001
Revises:
Create Date: 2026-02-26
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260226_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
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
        );
        """
    )

    op.execute(
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
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS grips (
            id BIGSERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            user_id TEXT,
            grip TEXT NOT NULL,
            confidence DOUBLE PRECISION NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id BIGSERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            user_id TEXT,
            report_json JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            display_name TEXT,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )

    op.execute("ALTER TABLE measurements ADD COLUMN IF NOT EXISTS user_id TEXT;")
    op.execute("ALTER TABLE grips ADD COLUMN IF NOT EXISTS user_id TEXT;")
    op.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id TEXT;")

    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS mice_source_handle_uniq ON mice (source_handle);")
    op.execute("CREATE INDEX IF NOT EXISTS mice_availability_status_idx ON mice (availability_status);")
    op.execute("CREATE INDEX IF NOT EXISTS mice_brand_model_idx ON mice (brand, model);")
    op.execute("CREATE INDEX IF NOT EXISTS measurements_session_id_id_idx ON measurements (session_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS measurements_user_id_id_idx ON measurements (user_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS grips_session_id_id_idx ON grips (session_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS grips_user_id_id_idx ON grips (user_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS reports_session_id_id_idx ON reports (session_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS reports_user_id_id_idx ON reports (user_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);")


def downgrade() -> None:
    # Intentional no-op for safety in shared environments.
    pass
