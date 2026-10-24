"""Persist server-scored timed MCQ exam sessions."""
from alembic import op
import sqlalchemy as sa


revision = "d14e6b9a3c21"
down_revision = "b47de291a6c0"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "mcq_exam_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_ids", sa.JSON(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("pass_mark", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
    )
    op.create_index("ix_mcq_exam_sessions_user_id", "mcq_exam_sessions", ["user_id"])


def downgrade():
    op.drop_index("ix_mcq_exam_sessions_user_id", table_name="mcq_exam_sessions")
    op.drop_table("mcq_exam_sessions")
