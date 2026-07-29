"""create_task_messages_table

Revision ID: 9f3a1b2c8d7e
Revises: 5b9a2f1c7d4e
Create Date: 2026-07-28 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f3a1b2c8d7e'
down_revision: Union[str, None] = '5b9a2f1c7d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # task_messages holds a task's follow-up conversation thread (the
    # chat-facing log), separate from task_steps (the internal agent
    # execution trace).
    op.create_table(
        "task_messages",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "task_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_task_messages_task_id", "task_messages", ["task_id"])


def downgrade() -> None:
    op.drop_index("ix_task_messages_task_id", table_name="task_messages")
    op.drop_table("task_messages")
