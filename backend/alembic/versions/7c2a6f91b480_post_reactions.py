"""Add emoji reactions to community posts and doubts."""
from alembic import op
import sqlalchemy as sa

revision = "7c2a6f91b480"
down_revision = "f7b9d1e3c550"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "discussion_reactions",
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("discussion_id", sa.String(length=36), sa.ForeignKey("discussions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("reaction", sa.String(length=20), primary_key=True),
    )
    op.create_index("ix_discussion_reactions_discussion_id", "discussion_reactions", ["discussion_id"])


def downgrade():
    op.drop_index("ix_discussion_reactions_discussion_id", table_name="discussion_reactions")
    op.drop_table("discussion_reactions")
