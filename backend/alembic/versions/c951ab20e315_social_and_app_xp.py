"""App-wide XP history, community engagement, and solved doubts."""
from alembic import op
import sqlalchemy as sa

revision = "c951ab20e315"
down_revision = "b820df61a104"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("discussions", sa.Column("kind", sa.String(20), nullable=False, server_default="community"))
    op.add_column("discussions", sa.Column("accepted_reply_id", sa.String(36), nullable=True))
    op.create_index("ix_discussions_kind", "discussions", ["kind"])
    op.create_table("discussion_likes",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("discussion_id", sa.String(36), sa.ForeignKey("discussions.id", ondelete="CASCADE"), primary_key=True))
    op.create_table("xp_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_key", sa.String(160), nullable=False),
        sa.Column("activity", sa.String(40), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "event_key"))
    op.create_index("ix_xp_events_user_id", "xp_events", ["user_id"])
    op.create_index("ix_xp_events_day", "xp_events", ["day"])
    op.create_table("focus_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("seconds", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False))
    op.create_index("ix_focus_sessions_user_id", "focus_sessions", ["user_id"])


def downgrade():
    for table in ("focus_sessions", "xp_events", "discussion_likes"):
        op.drop_table(table)
    op.drop_index("ix_discussions_kind", table_name="discussions")
    op.drop_column("discussions", "accepted_reply_id")
    op.drop_column("discussions", "kind")
