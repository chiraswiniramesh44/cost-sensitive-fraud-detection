
"""Add transaction ownership for account isolation."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "dea02de918e1"
down_revision: Union[str, Sequence[str], None] = "47a6d07e6924"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_transactions_user_id_users",
        "transactions",
        "users",
        ["user_id"],
        ["id"],
    )

    # Remove global uniqueness so different users can reuse an external ID.
    op.drop_index(
        "ix_transactions_external_id",
        table_name="transactions",
    )

    # Enforce uniqueness per user instead.
    op.create_unique_constraint(
        "uq_transactions_user_external_id",
        "transactions",
        ["user_id", "external_id"],
    )

    op.create_index(
        "idx_transactions_external_id",
        "transactions",
        ["external_id"],
        unique=False,
    )

    op.create_index(
        "ix_transactions_user_id",
        "transactions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_transactions_user_id",
        table_name="transactions",
    )

    op.drop_index(
        "idx_transactions_external_id",
        table_name="transactions",
    )

    op.drop_constraint(
        "uq_transactions_user_external_id",
        "transactions",
        type_="unique",
    )

    # Restore the previous global uniqueness rule.
    op.create_index(
        "ix_transactions_external_id",
        "transactions",
        ["external_id"],
        unique=True,
    )

    op.drop_constraint(
        "fk_transactions_user_id_users",
        "transactions",
        type_="foreignkey",
    )

    op.drop_column("transactions", "user_id")
