"""remove confirmed non-popular mouse brands

Revision ID: 20260907_000004
Revises: 20260727_000003
"""

from __future__ import annotations

from alembic import op


revision = "20260907_000004"
down_revision = "20260727_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The catalog decision is intentionally forward-only: the removed product
    # records cannot be reconstructed safely by a generic downgrade.
    op.execute(
        """
        DELETE FROM mice
        WHERE lower(btrim(brand)) = ANY (
            ARRAY[
                'arbiter',
                'arbiter studio',
                'dareu',
                'dark project',
                'dream',
                'evga',
                'fallen',
                'flick',
                'gx',
                'microsoft',
                'msi',
                'nzxt',
                'phylina',
                'rampage',
                'roccat',
                'sprime',
                'teevolution',
                'trust',
                'waizowl'
            ]
        );
        """
    )


def downgrade() -> None:
    # Intentional no-op: deleted catalog records require a curated restore.
    pass
