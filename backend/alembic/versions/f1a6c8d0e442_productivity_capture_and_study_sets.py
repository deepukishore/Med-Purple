"""Add quick captures, study sets, history, and preferences."""
from alembic import op
import sqlalchemy as sa

revision = "f1a6c8d0e442"
down_revision = "e2f4a7c9b118"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("feature_states", sa.Column("preferences", sa.JSON(), nullable=False))
    op.create_table(
        "quick_captures",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("media_name", sa.String(200), nullable=False),
        sa.Column("media_data", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_quick_captures_user_id", "quick_captures", ["user_id"])
    op.create_table(
        "study_sets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_sets_user_id", "study_sets", ["user_id"])
    op.create_table(
        "study_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("reference_id", sa.String(100), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("subject", sa.String(80), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_history_user_id", "study_history", ["user_id"])


def downgrade():
    op.drop_index("ix_study_history_user_id", table_name="study_history")
    op.drop_table("study_history")
    op.drop_index("ix_study_sets_user_id", table_name="study_sets")
    op.drop_table("study_sets")
    op.drop_index("ix_quick_captures_user_id", table_name="quick_captures")
    op.drop_table("quick_captures")
    op.drop_column("feature_states", "preferences")
