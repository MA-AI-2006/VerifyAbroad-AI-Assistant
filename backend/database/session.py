"""Async SQLAlchemy session management for SQLite development and Postgres production.

Connection-string handling is deliberately forgiving, because the same code has
to run against local SQLite, Render's internal Postgres, and Supabase/Neon
(required SSL + PgBouncer-compatible prepared-statement settings).
"""
import logging

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config import settings

logger = logging.getLogger(__name__)


def _connect_args() -> dict:
    if settings.is_sqlite:
        return {"check_same_thread": False}

    args: dict = {}
    # Supabase and Neon both require TLS. `sslmode=require` is accepted either as
    # a URL query param (which we strip here) or via the DB_SSLMODE env var.
    sslmode = settings.db_sslmode or ""
    if not sslmode and "sslmode=" in settings.database_url:
        try:
            sslmode = settings.database_url.split("sslmode=")[1].split("&")[0]
        except IndexError:
            sslmode = ""
    if sslmode and sslmode != "disable":
        args["ssl"] = "require" if sslmode.startswith("require") else sslmode
    # PgBouncer (Supabase's transaction pooler, port 6543) does not support the
    # extended-query prepared statements asyncpg uses by default.
    args["statement_cache_size"] = 0
    return args


def _safe_url(url: str) -> str:
    if "@" in url:
        scheme, _, rest = url.partition("://")
        _, _, host = rest.rpartition("@")
        return f"{scheme}://***:***@{host}"
    return url


engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args=_connect_args(),
    pool_pre_ping=True,
    **({} if settings.is_sqlite else {"pool_size": 5, "max_overflow": 5, "pool_recycle": 300}),
)

logger.info("Database engine configured: %s", _safe_url(settings.database_url))

AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Idempotent schema creation.

    Creates anything missing. `Base.metadata.create_all` never rewrites an
    existing table, so an already-migrated database is left alone.
    """
    import database.models  # noqa: F401  (register mappings on Base.metadata)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _add_missing_columns()


#: Columns introduced after the initial migration, applied opportunistically so a
#: Supabase database created by an earlier build keeps working without a
#: hand-written migration dance during a demo.
_LATE_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "investigations": [
        ("student_key", "VARCHAR"),
        ("title", "VARCHAR(300)"),
        ("language", "VARCHAR DEFAULT 'roman_urdu'"),
        ("country", "VARCHAR(120)"),
        ("degree_level", "VARCHAR(20)"),
        ("program_name", "VARCHAR(300)"),
        ("university_name", "VARCHAR(300)"),
        ("scholarship_name", "VARCHAR(300)"),
        ("agent_name", "VARCHAR(300)"),
        ("funding_type", "VARCHAR(40)"),
        ("payment_amount", "DOUBLE PRECISION"),
        ("overall_risk", "VARCHAR DEFAULT 'pending_more_info'"),
        ("summary", "TEXT"),
        ("needs_reverification", "BOOLEAN DEFAULT FALSE"),
    ],
    "messages": [
        ("attachments", "JSON DEFAULT '[]'"),
    ],
    "evidence_items": [
        ("label", "VARCHAR(300)"),
        ("mime", "VARCHAR(120)"),
        ("size_bytes", "INTEGER"),
        ("url", "VARCHAR"),
        ("note", "TEXT"),
        ("analysis_status", "VARCHAR DEFAULT 'analyzed'"),
    ],
}


async def _add_missing_columns() -> None:
    from sqlalchemy import inspect, text

    try:
        async with engine.connect() as conn:
            def _existing(sync_conn):
                inspector = inspect(sync_conn)
                tables = set(inspector.get_table_names())
                return {
                    table: {column["name"] for column in inspector.get_columns(table)}
                    for table in tables
                }

            columns_by_table = await conn.run_sync(_existing)
    except Exception:
        logger.exception("Could not introspect schema for late column additions")
        return

    nullable_defaults = {
        "student_key": "guest_student",
        "language": "roman_urdu",
        "overall_risk": "pending_more_info",
    }
    async with engine.begin() as conn:
        for table, columns in _LATE_COLUMNS.items():
            if table not in columns_by_table:
                continue
            present = columns_by_table[table]
            for name, definition in columns:
                if name in present:
                    continue
                ddl = f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {name} {definition}"
                if settings.is_sqlite:
                    # SQLite has no IF NOT EXISTS for ADD COLUMN.
                    default = nullable_defaults.get(name)
                    suffix = f" NOT NULL DEFAULT '{default}'" if default else ""
                    ddl = f"ALTER TABLE {table} ADD COLUMN {name} {definition.split(' DEFAULT')[0]}{suffix}"
                try:
                    await conn.execute(text(ddl))
                    logger.info("Schema patch applied: %s.%s", table, name)
                except Exception:
                    logger.warning("Could not add %s.%s (probably already present)", table, name)


async def check_database() -> dict:
    from sqlalchemy import text

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        logger.exception("Database connectivity check failed")
        return {"status": "error", "detail": str(exc)}
