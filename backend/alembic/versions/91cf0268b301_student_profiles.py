"""Add optional medical student profile details."""
from alembic import op
import sqlalchemy as sa

revision = "91cf0268b301"
down_revision = "72ab51e009fa"
branch_labels = None
depends_on = None


def upgrade():
    for name, size in (("college", 160), ("university", 160), ("specialty", 100)):
        op.add_column("users", sa.Column(name, sa.String(size), nullable=False, server_default=""))
    op.add_column("users", sa.Column("graduation_year", sa.Integer(), nullable=True))


def downgrade():
    for name in ("graduation_year", "specialty", "university", "college"):
        op.drop_column("users", name)
