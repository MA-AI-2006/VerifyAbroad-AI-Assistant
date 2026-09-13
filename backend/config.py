"""Application settings.

Everything is environment-driven so the same image runs locally (SQLite, no keys)
and on Render (Supabase/Neon Postgres + provider keys). Values are parsed once at
import time; `normalize_database_url` keeps hand-written connection strings working.
"""
import logging
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent


def normalize_database_url(raw: str) -> str:
    """Rewrite user-supplied DSNs to async SQLAlchemy drivers.

    - `postgres://` / `postgresql://`  -> `postgresql+asyncpg://` (Supabase, Neon, Render)
    - `sqlite:///./app.db`             -> `sqlite+aiosqlite:///./app.db`
    Already-normalized URLs pass through untouched.
    """
    url = (raw or "").strip()
    if not url:
        return "sqlite+aiosqlite:///./app.db"
    if url.startswith("postgresql+asyncpg://") or url.startswith("sqlite+aiosqlite:///"):
        return url
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres+asyncpg://"):
        return "postgresql+asyncpg://" + url[len("postgres+asyncpg://"):]
    if url.startswith("sqlite:///"):
        return "sqlite+aiosqlite://" + url[len("sqlite:///"):]
    if url.startswith("sqlite://"):
        return "sqlite+aiosqlite://" + url[len("sqlite://"):]
    logger.warning("Unrecognized DATABASE_URL scheme (%s); using it verbatim", url.split("://")[0])
    return url


def _resolve_local_path(value: str) -> str:
    """Relative data paths are anchored to the app directory, not the CWD.

    Render runs gunicorn/uvicorn from /opt/render/project/src, where a bare
    `./uploads` resolves correctly, but a `./app.db` written elsewhere silently
    creates a second empty database. Anchoring avoids that class of bug.
    """
    path = Path(value)
    if path.is_absolute():
        return str(path)
    return str((BASE_DIR / path).resolve())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    environment: str = "development"
    # Render/Supabase friendly: create_all is idempotent, so it is safe on a
    # fresh managed database and saves a release-command step during a hackathon.
    auto_create_db: bool = True
    log_level: str = "INFO"
    # "*" is fine here: the browser never calls this service directly. All
    # requests come from the Next.js server (route handlers), which ignores CORS.
    allowed_origins: str = "*"

    port: int = Field(default=10000, ge=1, le=65535)

    database_url: str = "sqlite+aiosqlite:///./app.db"
    storage_backend: str = "local"
    local_upload_dir: str = "./uploads"
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_bucket: str = "evidence-files"
    storage_timeout_seconds: float = Field(default=20.0, gt=0, le=120)
    rag_backend: str = "memory"
    db_sslmode: str | None = None

    gemini_api_key: str = ""
    groq_api_key: str = ""
    tavily_api_key: str = ""
    opensanctions_api_key: str = ""

    # Model ids drift; they stay in env so a provider deprecation is a config
    # change, not a redeploy of new code. gemini-3.8-flash / gemini-embedding-2
    # are the current ids; llama-3.3-70b-versatile was retired on 2026-08-16.
    gemini_model: str = "gemini-3.8-flash"
    gemini_embedding_model: str = "gemini-embedding-2"
    groq_model: str = "qwen/qwen3.6-27b"
    tavily_search_depth: str = "basic"
    tavily_max_results: int = Field(default=5, gt=0, le=10)

    llm_timeout_seconds: float = Field(default=45.0, gt=0, le=180)
    web_timeout_seconds: float = Field(default=20.0, gt=0, le=120)
    free_source_timeout_seconds: float = Field(default=10.0, gt=0, le=60)
    max_chat_messages: int = Field(default=40, gt=1, le=200)
    max_chat_chars: int = Field(default=60000, gt=1000, le=250000)
    max_evidence_text_chars: int = Field(default=50000, gt=100, le=200000)
    max_upload_bytes: int = Field(default=15 * 1024 * 1024, gt=1024, le=50 * 1024 * 1024)
    # When true (default) every LLM/RAG step has a deterministic fallback, so a
    # missing or failing provider key degrades the answer instead of 502-ing.
    offline_fallbacks: bool = True
    ingest_seed_on_startup: bool = True

    whed_url: str = "https://whed.net/results_institutions.php"
    secp_search_url: str = "https://eservices.secp.gov.pk/eServices/NameSearch.jsp"

    app_secret: str = "change-me"

    @field_validator("database_url")
    @classmethod
    def _normalize_db_url(cls, value: str) -> str:
        return normalize_database_url(value)

    @field_validator("local_upload_dir")
    @classmethod
    def _anchor_uploads(cls, value: str) -> str:
        return _resolve_local_path(value)

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
        return origins or ["*"]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def llm_available(self) -> bool:
        return bool(self.gemini_api_key or self.groq_api_key)

    @property
    def web_research_available(self) -> bool:
        return bool(self.tavily_api_key or self.gemini_api_key)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


settings = Settings()
