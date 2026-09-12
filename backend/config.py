from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    auto_create_db: bool = False
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    database_url: str = "sqlite+aiosqlite:///./app.db"
    storage_backend: str = "local"
    local_upload_dir: str = "./uploads"
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_bucket: str = "evidence-files"
    storage_timeout_seconds: float = Field(default=20.0, gt=0, le=120)
    rag_backend: str = "memory"

    gemini_api_key: str = ""
    groq_api_key: str = ""
    tavily_api_key: str = ""
    opensanctions_api_key: str = ""

    gemini_model: str = "gemini-3.8-flash"
    gemini_embedding_model: str = "gemini-embedding-2"
    groq_model: str = "qwen/qwen3.8-27b"
    tavily_search_depth: str = "basic"
    tavily_max_results: int = Field(default=5, gt=0, le=10)

    llm_timeout_seconds: float = Field(default=45.0, gt=0, le=180)
    web_timeout_seconds: float = Field(default=20.0, gt=0, le=120)
    free_source_timeout_seconds: float = Field(default=10.0, gt=0, le=60)
    max_chat_messages: int = Field(default=40, gt=1, le=200)
    max_chat_chars: int = Field(default=60000, gt=1000, le=250000)
    max_evidence_text_chars: int = Field(default=50000, gt=100, le=200000)
    max_upload_bytes: int = Field(default=15 * 1024 * 1024, gt=1024, le=50 * 1024 * 1024)

    whed_url: str = "https://whed.net/results_institutions.php"
    secp_search_url: str = "https://eservices.secp.gov.pk/eServices/NameSearch.jsp"

    app_secret: str = "change-me"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}


settings = Settings()
