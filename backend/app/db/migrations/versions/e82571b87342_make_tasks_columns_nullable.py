"""make_tasks_columns_nullable

Revision ID: e82571b87342
Revises: 342ee80a1129
Create Date: 2026-06-20 17:33:10.225901

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e82571b87342'
down_revision: Union[str, None] = '342ee80a1129'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table_name: str) -> set[str]:
    """Column names currently on `table_name`, via the live inspector.

    Used so this migration is safe to run twice and safe on dialects
    (SQLite) that don't support "ADD COLUMN IF NOT EXISTS".
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name)}


def upgrade() -> None:
    # Fix nullable constraints that were incorrectly set to NOT NULL.
    # batch_alter_table works on both Postgres (plain ALTER COLUMN) and
    # SQLite (recreate-table strategy), unlike the raw "ALTER COLUMN ...
    # DROP NOT NULL" SQL this migration used to run, which is Postgres-only
    # syntax and fails outright on SQLite.
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.alter_column(
            "description",
            existing_type=sa.Text(),
            nullable=True,
        )
        batch_op.alter_column(
            "task_type",
            existing_type=sa.String(length=50),
            nullable=True,
        )

    # Add columns that were missed due to schema drift from a previous
    # agent. Guarded with an inspector check instead of "IF NOT EXISTS"
    # (also Postgres-only) so this is idempotent across dialects.
    tasks_columns = _existing_columns("tasks")
    if "updated_at" not in tasks_columns:
        with op.batch_alter_table("tasks", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "updated_at",
                    sa.DateTime(timezone=True),
                    server_default=sa.text("CURRENT_TIMESTAMP"),
                    nullable=False,
                )
            )

    task_steps_columns = _existing_columns("task_steps")
    if "title" not in task_steps_columns:
        with op.batch_alter_table("task_steps", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "title",
                    sa.String(length=500),
                    server_default="Untitled Step",
                    nullable=False,
                )
            )
    if "order" not in task_steps_columns:
        with op.batch_alter_table("task_steps", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "order",
                    sa.Integer(),
                    server_default="0",
                    nullable=False,
                )
            )


def downgrade() -> None:
    task_steps_columns = _existing_columns("task_steps")
    with op.batch_alter_table("task_steps", schema=None) as batch_op:
        if "order" in task_steps_columns:
            batch_op.drop_column("order")
        if "title" in task_steps_columns:
            batch_op.drop_column("title")

    tasks_columns = _existing_columns("tasks")
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        if "updated_at" in tasks_columns:
            batch_op.drop_column("updated_at")
        batch_op.alter_column(
            "task_type",
            existing_type=sa.String(length=50),
            nullable=False,
        )
        batch_op.alter_column(
            "description",
            existing_type=sa.Text(),
            nullable=False,
        )
