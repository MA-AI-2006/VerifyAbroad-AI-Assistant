"""VerifyAbroad-AI FastAPI application entrypoint.

Deployment notes (Render / any container platform):
  * bind to 0.0.0.0 and honor $PORT — see `start.sh` and the Dockerfile;
  * `/ping` is a dependency-free liveness probe (never fails on a flaky third
    party), `/health` reports DB + provider readiness;
  * AUTO_CREATE_DB creates any missing tables on boot, so a fresh Supabase/Neon
    database works without a manual migration step. Alembic stays available for
    schema changes you do want versioned.
"""
import logging
import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config import settings
from database.session import init_db, engine, check_database
from api import investigation, evidence, verification, reports, accounts
from research.hipo import HIPO_URL

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


async def _ingest_seed_patterns() -> None:
    """Best-effort RAG ingestion so fraud-pattern evidence exists on a fresh DB.

    Without an embedding key the retriever falls back to lexical matching over the
    same seed file, so a failure here is logged and never blocks startup.
    """
    if not settings.ingest_seed_on_startup or not settings.gemini_api_key:
        return
    try:
        from rag.knowledge_base import ingest

        await ingest()
        logger.info("RAG fraud-pattern knowledge base ingested")
    except Exception:
        logger.warning("RAG seed ingestion skipped (embedding provider unavailable)", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_create_db:
        try:
            await init_db()
            logger.info("Database schema ensured (create_all is idempotent)")
        except Exception:
            logger.exception("Startup schema creation failed; check DATABASE_URL and SSL settings")
            if settings.is_production:
                raise
    else:
        logger.info("AUTO_CREATE_DB is false; expecting migrations to have run")
    await _ingest_seed_patterns()
    yield
    await engine.dispose()


app = FastAPI(title="VerifyAbroad-AI", version="1.1.0", lifespan=lifespan)

_origins = settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=None if "*" not in _origins else r".*",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(investigation.router)
app.include_router(evidence.router)
app.include_router(verification.router)
app.include_router(reports.router)
app.include_router(accounts.router)


@app.get("/", tags=["health"])
async def root():
    """Service banner, so opening the Render URL in a browser is not a 404."""
    return {
        "service": "VerifyAbroad-AI backend",
        "version": "1.1.0",
        "docs": "/docs",
        "health": "/health",
        "mode": "live_providers" if settings.llm_available else "deterministic_fallback",
        "hint": "This API is consumed by the Next.js server. Point the frontend's BACKEND_URL at this origin.",
    }


@app.get("/ping", tags=["health"])
async def ping():
    """Liveness probe with zero external dependencies (for platform health checks)."""
    return {"ok": True}


@app.get("/health", tags=["health"])
async def health(detailed: bool = False):
    """Readiness: the database must be up; providers and Hipo are reported, not fatal.

    A third-party timeout must never make the platform restart a healthy service,
    so only a dead database downgrades this to 503.
    """
    checks: dict[str, dict] = {}
    checks["database"] = await check_database()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        pass  # already captured by check_database

    checks["providers"] = {
        "status": "configured" if settings.llm_available else "not_configured",
        "keys": {
            "gemini": bool(settings.gemini_api_key),
            "groq": bool(settings.groq_api_key),
            "tavily": bool(settings.tavily_api_key),
            "opensanctions": bool(settings.opensanctions_api_key),
            "supabase_storage": bool(
                settings.storage_backend == "supabase" and settings.supabase_url and settings.supabase_service_key
            ),
        },
        "note": (
            "No LLM key: chat and report narratives use the deterministic extractor."
            if not settings.llm_available
            else "LLM providers configured; deterministic fallback stays available if a call fails."
        ),
    }

    if detailed:
        try:
            async with httpx.AsyncClient(timeout=settings.free_source_timeout_seconds) as client:
                response = await client.get(HIPO_URL, params={"name": "University of Oxford"})
                response.raise_for_status()
            checks["hipo"] = {"status": "ok"}
        except Exception as exc:
            checks["hipo"] = {"status": "error", "detail": str(exc)}
    else:
        checks["hipo"] = {"status": "not_probed", "note": "pass ?detailed=true to test the live source"}

    database_ok = checks["database"]["status"] == "ok"
    body = {
        "status": "ok" if database_ok else "degraded",
        "environment": settings.environment,
        "checks": checks,
    }
    return JSONResponse(status_code=200 if database_ok else 503, content=body)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", settings.port)),
        reload=not settings.is_production,
    )
