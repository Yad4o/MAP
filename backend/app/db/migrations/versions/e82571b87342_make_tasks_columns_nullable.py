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


def upgrade() -> None:
    # Fix nullable constraints that were incorrectly set to NOT NULL
    op.execute("ALTER TABLE tasks ALTER COLUMN description DROP NOT NULL;")
    op.execute("ALTER TABLE tasks ALTER COLUMN task_type DROP NOT NULL;")
    
    # Add columns that were missed due to schema drift from previous agent
    op.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;")
    op.execute("ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS title VARCHAR(500) DEFAULT 'Untitled Step' NOT NULL;")
    op.execute("ALTER TABLE task_steps ADD COLUMN IF NOT EXISTS \"order\" INTEGER DEFAULT 0 NOT NULL;")

def downgrade() -> None:
    pass
