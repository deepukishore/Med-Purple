"""Persistent, interactive study stories."""
from alembic import op
import sqlalchemy as sa

revision = "a8c2e6f130bd"
down_revision = "f7b9d1e3c550"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "study_story_groups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_story_groups_owner_id", "study_story_groups", ["owner_id"])
    op.create_table(
        "study_story_group_members",
        sa.Column("group_id", sa.String(36), sa.ForeignKey("study_story_groups.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "study_stories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("group_id", sa.String(36), sa.ForeignKey("study_story_groups.id", ondelete="CASCADE"), nullable=True),
        sa.Column("reply_to_story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("subject", sa.String(50), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("slides", sa.JSON(), nullable=False),
        sa.Column("excluded_user_ids", sa.JSON(), nullable=False),
        sa.Column("audience", sa.String(24), nullable=False),
        sa.Column("anonymous", sa.Boolean(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("highlight", sa.String(80), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("user_id", "group_id", "reply_to_story_id", "subject", "kind", "published_at", "expires_at"):
        op.create_index(f"ix_study_stories_{column}", "study_stories", [column])
    op.create_table(
        "study_story_follows",
        sa.Column("follower_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("creator_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "study_story_close_friends",
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("friend_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "study_story_hides",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("creator_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "study_story_blocks",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("blocked_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "study_story_views",
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_story_views_user_id", "study_story_views", ["user_id"])
    op.create_table(
        "study_story_responses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("response_type", sa.String(24), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("option_index", sa.Integer(), nullable=True),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.Column("anonymous", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("story_id", "user_id", "response_type"),
    )
    op.create_index("ix_study_story_responses_story_id", "study_story_responses", ["story_id"])
    op.create_index("ix_study_story_responses_user_id", "study_story_responses", ["user_id"])
    op.create_table(
        "study_story_reactions",
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("reaction", sa.String(24), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "study_story_flags",
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("flag", sa.String(24), primary_key=True),
        sa.Column("details", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    for table in (
        "study_story_flags",
        "study_story_reactions",
        "study_story_responses",
        "study_story_views",
        "study_story_blocks",
        "study_story_hides",
        "study_story_close_friends",
        "study_story_follows",
        "study_stories",
        "study_story_group_members",
    ):
        op.drop_table(table)
    op.drop_index("ix_study_story_groups_owner_id", table_name="study_story_groups")
    op.drop_table("study_story_groups")
