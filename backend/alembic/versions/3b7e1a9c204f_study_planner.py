"""Add saved study blocks."""
from alembic import op
import sqlalchemy as sa

revision = "3b7e1a9c204f"
down_revision = "192f9d705da0"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("study_blocks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("subject", sa.String(50), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("time", sa.String(5), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("done", sa.Boolean(), nullable=False))
    op.create_index("ix_study_blocks_user_id", "study_blocks", ["user_id"])
    op.create_index("ix_study_blocks_day", "study_blocks", ["day"])


def downgrade():
    op.drop_table("study_blocks")
