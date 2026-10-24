"""Persist exam, clinical, and new community workspace state."""
from alembic import op
import sqlalchemy as sa

revision = "e2f4a7c9b118"
down_revision = "c951ab20e315"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "feature_states",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("exam_track", sa.String(30), nullable=False, server_default="NEET PG"),
        sa.Column("mistake_notes", sa.JSON(), nullable=False),
        sa.Column("clinical_logs", sa.JSON(), nullable=False),
        sa.Column("clinical_state", sa.JSON(), nullable=False),
        sa.Column("community", sa.JSON(), nullable=False),
        sa.Column("followed_creators", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "discussion_reply_likes",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("reply_id", sa.String(36), sa.ForeignKey("discussion_replies.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade():
    op.drop_table("discussion_reply_likes")
    op.drop_table("feature_states")
