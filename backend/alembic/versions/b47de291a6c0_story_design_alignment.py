"""Align study stories with the database and moderation design."""
from alembic import op
import sqlalchemy as sa

revision = "b47de291a6c0"
down_revision = "a8c2e6f130bd"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "study_stories",
        sa.Column("status", sa.String(12), nullable=False, server_default="live"),
    )
    op.add_column(
        "study_stories",
        sa.Column("needs_review", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "study_stories",
        sa.Column("hidden_from_feed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        "UPDATE study_stories SET status = CASE "
        "WHEN published_at IS NULL AND scheduled_at IS NOT NULL THEN 'scheduled' "
        "WHEN published_at IS NULL THEN 'draft' "
        "WHEN expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP THEN 'expired' "
        "ELSE 'live' END"
    )
    op.create_table(
        "study_story_slide_views",
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("slide_index", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_story_slide_views_user_id", "study_story_slide_views", ["user_id"])
    op.create_table(
        "study_story_uploads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.String(80), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_story_uploads_user_id", "study_story_uploads", ["user_id"])
    op.create_index("ix_study_story_uploads_story_id", "study_story_uploads", ["story_id"])
    op.create_table(
        "study_story_responses_new",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("story_id", sa.String(36), sa.ForeignKey("study_stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("response_type", sa.String(24), nullable=False),
        sa.Column("slide_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sticker_key", sa.String(20), nullable=False, server_default=""),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("option_index", sa.Integer(), nullable=True),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.Column("anonymous", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "story_id",
            "user_id",
            "response_type",
            "slide_index",
            "sticker_key",
            name="uq_study_story_response_slot",
        ),
    )
    op.execute(
        "INSERT INTO study_story_responses_new "
        "(id, story_id, user_id, response_type, slide_index, sticker_key, answer, "
        "option_index, correct, anonymous, created_at) "
        "SELECT id, story_id, user_id, response_type, 0, '', answer, "
        "option_index, correct, anonymous, created_at FROM study_story_responses"
    )
    op.drop_table("study_story_responses")
    op.rename_table("study_story_responses_new", "study_story_responses")
    op.create_index("ix_study_story_responses_story_id", "study_story_responses", ["story_id"])
    op.create_index("ix_study_story_responses_user_id", "study_story_responses", ["user_id"])


def downgrade():
    op.drop_index("ix_study_story_uploads_story_id", table_name="study_story_uploads")
    op.create_table(
        "study_story_responses_old",
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
    op.execute(
        "INSERT INTO study_story_responses_old "
        "(id, story_id, user_id, response_type, answer, option_index, correct, anonymous, created_at) "
        "SELECT id, story_id, user_id, response_type, answer, option_index, correct, anonymous, created_at "
        "FROM study_story_responses"
    )
    op.drop_table("study_story_responses")
    op.rename_table("study_story_responses_old", "study_story_responses")
    op.create_index("ix_study_story_responses_story_id", "study_story_responses", ["story_id"])
    op.create_index("ix_study_story_responses_user_id", "study_story_responses", ["user_id"])
    op.drop_index("ix_study_story_uploads_user_id", table_name="study_story_uploads")
    op.drop_table("study_story_uploads")
    op.drop_index("ix_study_story_slide_views_user_id", table_name="study_story_slide_views")
    op.drop_table("study_story_slide_views")
    op.drop_column("study_stories", "hidden_from_feed")
    op.drop_column("study_stories", "needs_review")
    op.drop_column("study_stories", "status")
