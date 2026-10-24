"""Add shared notes and persisted study-room messages."""
from alembic import op
import sqlalchemy as sa

revision = "f7b9d1e3c550"
down_revision = "f1a6c8d0e442"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "study_room_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("room_id", sa.String(100), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.String(2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_study_room_messages_room_id", "study_room_messages", ["room_id"])
    op.create_index("ix_study_room_messages_user_id", "study_room_messages", ["user_id"])
    op.create_table(
        "collaborative_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_collaborative_notes_owner_id", "collaborative_notes", ["owner_id"])


def downgrade():
    op.drop_index("ix_collaborative_notes_owner_id", table_name="collaborative_notes")
    op.drop_table("collaborative_notes")
    op.drop_index("ix_study_room_messages_user_id", table_name="study_room_messages")
    op.drop_index("ix_study_room_messages_room_id", table_name="study_room_messages")
    op.drop_table("study_room_messages")
