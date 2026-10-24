"""Personal study material, reviews and community discussions."""
from alembic import op
import sqlalchemy as sa

revision = "72ab51e009fa"
down_revision = "3b7e1a9c204f"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("saved_items") as batch:
        batch.alter_column("clip_id", existing_type=sa.String(40), nullable=True)
    op.create_table("card_reviews",
        sa.Column("item_id", sa.String(36), sa.ForeignKey("saved_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("due", sa.Date(), nullable=False),
        sa.Column("interval", sa.Integer(), nullable=False),
        sa.Column("reviews", sa.Integer(), nullable=False))
    op.create_index("ix_card_reviews_user_id", "card_reviews", ["user_id"])
    op.create_table("discussions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("subject", sa.String(50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_discussions_user_id", "discussions", ["user_id"])
    op.create_table("discussion_replies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("discussion_id", sa.String(36), sa.ForeignKey("discussions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_discussion_replies_user_id", "discussion_replies", ["user_id"])
    op.create_index("ix_discussion_replies_discussion_id", "discussion_replies", ["discussion_id"])


def downgrade():
    op.drop_table("discussion_replies")
    op.drop_table("discussions")
    op.drop_table("card_reviews")
    # Keep nullable clip_id so manually authored study material remains intact.
