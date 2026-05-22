"""add image_urls to mice

Revision ID: 20260522_000002
Revises: 20260226_000001
Create Date: 2026-05-22
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260522_000002"
down_revision = "20260226_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE mice ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;")


def downgrade() -> None:
    # Intentional no-op for safety in shared environments.
    pass
