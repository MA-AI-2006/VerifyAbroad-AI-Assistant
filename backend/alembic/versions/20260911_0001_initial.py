"""Initial VerifyAbroad-AI schema

Revision ID: 20260911_0001
Revises:
Create Date: 2026-09-11
"""
from alembic import op
import sqlalchemy as sa

revision = "20260911_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "investigations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("structured_case", sa.JSON(), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=True),
        sa.Column("risk_level", sa.String(), nullable=True),
        sa.Column("final_report", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_investigations_status", "investigations", ["status"])

    op.create_table(
        "messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("investigation_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_messages_investigation_created", "messages", ["investigation_id", "created_at"])

    op.create_table(
        "evidence_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("investigation_id", sa.String(), nullable=False),
        sa.Column("evidence_type", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("extracted_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_items_investigation_created", "evidence_items", ["investigation_id", "created_at"])

    op.create_table(
        "evidence_records",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("investigation_id", sa.String(), nullable=False),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("claim", sa.Text(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("authority", sa.String(), nullable=False),
        sa.Column("result", sa.String(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("raw_response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["investigation_id"], ["investigations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_records_investigation_domain", "evidence_records", ["investigation_id", "domain"])

    op.create_table(
        "fraud_patterns",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("pattern", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("source_url", sa.String(), nullable=True),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "banned_agents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("agent_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("source_url", sa.String(), nullable=True),
        sa.Column("date_reported", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("banned_agents")
    op.drop_table("fraud_patterns")
    op.drop_index("ix_evidence_records_investigation_domain", table_name="evidence_records")
    op.drop_table("evidence_records")
    op.drop_index("ix_evidence_items_investigation_created", table_name="evidence_items")
    op.drop_table("evidence_items")
    op.drop_index("ix_messages_investigation_created", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_investigations_status", table_name="investigations")
    op.drop_table("investigations")
