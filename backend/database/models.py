"""
ORM models. These are database-agnostic (pure SQLAlchemy types), so the
same models + migrations work against SQLite (dev) and Postgres (prod).

RAG embeddings are stored as JSON-encoded float lists here (portable across
SQLite/Postgres). When moving to pgvector in production, only rag/retriever.py
needs to change to use a native vector column - this table can stay or be
migrated via Alembic.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Float, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Investigation(Base):
    """A single student case, from first message to final report."""
    __tablename__ = "investigations"
    __table_args__ = (Index("ix_investigations_status", "status"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    status: Mapped[str] = mapped_column(String, default="in_progress")
    # in_progress | ready_for_verification | verifying | completed

    # The structured case object, updated as the investigator learns more.
    # e.g. {"university": ..., "agent": ..., "payment_amount": ..., "claims": [...]}
    structured_case: Mapped[dict] = mapped_column(JSON, default=dict)

    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String, nullable=True)
    final_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="investigation", cascade="all, delete-orphan"
    )
    evidence_items: Mapped[list["EvidenceItem"]] = relationship(
        back_populates="investigation", cascade="all, delete-orphan"
    )
    evidence_records: Mapped[list["EvidenceRecord"]] = relationship(
        back_populates="investigation", cascade="all, delete-orphan"
    )


class Message(Base):
    """One turn of the investigation chat."""
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_investigation_created", "investigation_id", "created_at"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    investigation_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"))
    role: Mapped[str] = mapped_column(String)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    investigation: Mapped["Investigation"] = relationship(back_populates="messages")


class EvidenceItem(Base):
    """A raw piece of evidence the student submitted (screenshot, text, doc)."""
    __tablename__ = "evidence_items"
    __table_args__ = (Index("ix_evidence_items_investigation_created", "investigation_id", "created_at"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    investigation_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"))
    evidence_type: Mapped[str] = mapped_column(String)
    # text | image | document

    file_path: Mapped[str | None] = mapped_column(String, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured JSON extracted by the multimodal parser
    extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    investigation: Mapped["Investigation"] = relationship(back_populates="evidence_items")


class EvidenceRecord(Base):
    """
    A single NORMALIZED verification result, in the common shape used across
    every source (Hipo, OpenSanctions, Tavily, Gemini Search, RAG, payment rules, etc.)
    This is what the aggregator and risk engine consume.
    """
    __tablename__ = "evidence_records"
    __table_args__ = (Index("ix_evidence_records_investigation_domain", "investigation_id", "domain"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    investigation_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"))

    domain: Mapped[str] = mapped_column(String)
    # institution | agent | payment | document

    claim: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String)
    source_type: Mapped[str] = mapped_column(String)
    # official_university | government | hipo | opensanctions | tavily_web |
    # static_dataset | rag_pattern | agent_website | rule_logic

    authority: Mapped[str] = mapped_column(String)
    # high | medium | low

    result: Mapped[str] = mapped_column(String)
    # verified | not_found | claimed | contradicted | unable_to_verify

    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    investigation: Mapped["Investigation"] = relationship(back_populates="evidence_records")


class FraudPattern(Base):
    """
    RAG knowledge base entries (scam patterns, phrases, cases).
    Dev: embedding stored as JSON float list, searched via numpy in rag/retriever.py.
    Prod: migrate to a pgvector column; only retriever.py's internals change.
    """
    __tablename__ = "fraud_patterns"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    category: Mapped[str] = mapped_column(String)
    # visa_fraud | payment_scam | fake_document | fake_scholarship | agent_manipulation

    country: Mapped[str] = mapped_column(String, default="Pakistan")
    pattern: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)  # low | medium | high
    text: Mapped[str] = mapped_column(Text)
    # The actual chunk text that gets embedded (examples, description, etc.)

    language: Mapped[str] = mapped_column(String, default="English")
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)

    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # list[float] - populated once at ingestion time


class BannedAgent(Base):
    """Static-ish reference table for known-bad agents (HEC/FIA/news compiled)."""
    __tablename__ = "banned_agents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    agent_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)  # banned | warned | reported
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    date_reported: Mapped[str | None] = mapped_column(String, nullable=True)
