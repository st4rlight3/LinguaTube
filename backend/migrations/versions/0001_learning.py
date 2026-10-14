"""Owner-scoped learning records and translation budgets."""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('owner', sa.String(128), nullable=False),
        sa.Column('kind', sa.String(24), nullable=False),
        sa.Column('key', sa.String(128), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('owner', 'kind', 'key'))
    op.create_index('ix_records_owner', 'records', ['owner'])
    op.create_table('translation_budgets',
        sa.Column('key', sa.String(160), primary_key=True),
        sa.Column('used', sa.Integer(), nullable=False))

def downgrade():
    op.drop_table('translation_budgets')
    op.drop_index('ix_records_owner', table_name='records')
    op.drop_table('records')
