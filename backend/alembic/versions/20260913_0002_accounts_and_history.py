"""accounts, history and evidence metadata

Adds what the deployed frontend needs so it can stay stateless on Vercel:
the `students` table (auth + profile), case mirror columns on `investigations`
(history list), transcript attachments on `messages`, and display metadata on
`evidence_items`.

Written to be safe on a database that `AUTO_CREATE_DB` already provisioned:
every step is guarded by inspection, so this migration can be run before or
after the app boots.

Revision ID: 20260913_0002
Revises: 20260911_0001
Create Date: 2026-09-13
"""
from alembic import op
import sqlalchemy as sa

revision = "20260913_0002"
down_revision = "20260911_0001"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(name: str) -> bool:
    return _inspector().has_table(name)


def _has_column(table: str, column: str) -> bool:
    if not _has_table(table):
        return False
    return column in {item["name"] for item in _inspector().get_columns(table)}


def _add(table: str, column: str, definition) -> None:
    if not _has_column(table, column):
        op.add_column(table, sa.Column(column, definition, nullable=True))


def upgrade() -> None:
    if not _has_table("students"):
        op.create_table(
            "students",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("key", sa.String(), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=True),
            sa.Column("email", sa.String(length=320), nullable=True),
            sa.Column("password_hash", sa.String(), nullable=True),
            sa.Column("preferred_language", sa.String(), nullable=False, server_default="roman_urdu"),
            sa.Column("degree_level", sa.String(length=20), nullable=True),
            sa.Column("target_countries", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("funding_preference", sa.String(length=40), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("key", name="uq_students_key"),
        )
        op.create_index("ix_students_key", "students", ["key"], unique=True)
        op.create_index("ix_students_email", "students", ["email"])

    _add("investigations", "student_key", sa.String())
    _add("investigations", "title", sa.String(length=300))
    _add("investigations", "language", sa.String())
    _add("investigations", "country", sa.String(length=120))
    _add("investigations", "degree_level", sa.String(length=20))
    _add("investigations", "program_name", sa.String(length=300))
    _add("investigations", "university_name", sa.String(length=300))
    _add("investigations", "scholarship_name", sa.String(length=300))
    _add("investigations", "agent_name", sa.String(length=300))
    _add("investigations", "funding_type", sa.String(length=40))
    _add("investigations", "payment_amount", sa.Float())
    _add("investigations", "overall_risk", sa.String())
    _add("investigations", "summary", sa.Text())
    _add("investigations", "needs_reverification", sa.Boolean())

    if _has_table("investigations"):
        existing_indexes = {item["name"] for item in _inspector().get_indexes("investigations")}
        if "ix_investigations_student_updated" not in existing_indexes:
            op.create_index(
                "ix_investigations_student_updated",
                "investigations",
                ["student_key", "updated_at"],
            )

    _add("messages", "attachments", sa.JSON())

    _add("evidence_items", "label", sa.String(length=300))
    _add("evidence_items", "mime", sa.String(length=120))
    _add("evidence_items", "size_bytes", sa.Integer())
    _add("evidence_items", "url", sa.String())
    _add("evidence_items", "note", sa.Text())
    _add("evidence_items", "analysis_status", sa.String())

    # Backfill rows created before this revision so history is not orphaned.
    if _has_column("investigations", "student_key"):
        op.execute("UPDATE investigations SET student_key = 'guest_student' WHERE student_key IS NULL")
        op.execute("UPDATE investigations SET language = 'roman_urdu' WHERE language IS NULL")
        op.execute(
            "UPDATE investigations SET overall_risk = 'pending_more_info' WHERE overall_risk IS NULL"
        )
        op.execute("UPDATE investigations SET needs_reverification = FALSE WHERE needs_reverification IS NULL")


def downgrade() -> None:
    if _has_table("investigations") and "ix_investigations_student_updated" in {
        item["name"] for item in _inspector().get_indexes("investigations")
    }:
        op.drop_index("ix_investigations_student_updated", table_name="investigations")
    for table, columns in (
        ("evidence_items", ["analysis_status", "note", "url", "size_bytes", "mime", "label"]),
        ("messages", ["attachments"]),
        (
            "investigations",
            [
                "needs_reverification", "summary", "overall_risk", "payment_amount",
                "funding_type", "agent_name", "scholarship_name", "university_name",
                "program_name", "degree_level", "country", "language", "title", "student_key",
            ],
        ),
    ):
        for column in columns:
            if _has_column(table, column):
                op.drop_column(table, column)
    if _has_table("students"):
        op.drop_index("ix_students_email", table_name="students")
        op.drop_index("ix_students_key", table_name="students")
        op.drop_table("students")
