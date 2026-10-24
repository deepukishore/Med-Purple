"""Persist verified MCQ set completions for learning quests."""
from alembic import op
import sqlalchemy as sa

revision = "b820df61a104"
down_revision = "91cf0268b301"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "mcq_completions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("correct", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "fingerprint"),
    )
    op.create_index("ix_mcq_completions_user_id", "mcq_completions", ["user_id"])


def downgrade():
    op.drop_table("mcq_completions")
