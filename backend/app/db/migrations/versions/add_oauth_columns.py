"""add_oauth_columns

Revision ID: 5b9a2f1c7d4e
Revises: e82571b87342
Create Date: 2026-07-17 09:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b9a2f1c7d4e'
down_revision: Union[str, None] = 'e82571b87342'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(256), nullable=True)
        batch_op.add_column(sa.Column('oauth_provider', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('oauth_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('avatar_url', sa.String(500), nullable=True))
        batch_op.create_index(
            batch_op.f('ix_users_oauth_provider_oauth_id'),
            ['oauth_provider', 'oauth_id'],
            unique=True,
        )


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_oauth_provider_oauth_id'))
        batch_op.drop_column('avatar_url')
        batch_op.drop_column('oauth_id')
        batch_op.drop_column('oauth_provider')
        batch_op.alter_column('password_hash', existing_type=sa.String(256), nullable=False)
