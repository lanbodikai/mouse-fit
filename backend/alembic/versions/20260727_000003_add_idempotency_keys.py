"""add idempotency keys for retry-safe writes

Revision ID: 20260727_000003
Revises: 20260522_000002
"""

from __future__ import annotations

from alembic import op


revision = "20260727_000003"
down_revision = "20260522_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("measurements", "grips", "reports"):
        op.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS idempotency_key TEXT;")
        op.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS {table}_idempotency_uniq "
            f"ON {table} (COALESCE(user_id, ''), idempotency_key) "
            "WHERE idempotency_key IS NOT NULL;"
        )
    op.execute("CREATE INDEX IF NOT EXISTS measurements_session_user_id_idx ON measurements (session_id, user_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS grips_session_user_id_idx ON grips (session_id, user_id, id DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS reports_session_user_id_idx ON reports (session_id, user_id, id DESC);")


def downgrade() -> None:
    # Keep this migration forward-only so rollback cannot delete retry metadata.
    pass
