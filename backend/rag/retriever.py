"""RAG retriever. Current implementation uses NumPy cosine similarity."""
import logging
import numpy as np
from sqlalchemy import select
from database.session import AsyncSessionLocal
from database.models import FraudPattern
from rag.embeddings import embed_text

logger = logging.getLogger(__name__)
_cache: list[dict] | None = None


async def _load_cache() -> list[dict]:
    global _cache
    if _cache is not None:
        return _cache
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(FraudPattern))
            patterns = result.scalars().all()
        _cache = [
            {"id": p.id, "pattern": p.pattern, "category": p.category, "severity": p.severity,
             "text": p.text, "embedding": np.array(p.embedding, dtype=float) if p.embedding else None}
            for p in patterns if p.embedding is not None
        ]
    except Exception:
        logger.exception("Failed to load RAG knowledge base")
        _cache = []
    return _cache


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.shape != b.shape:
        return 0.0
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


async def search_fraud_patterns(query: str, top_k: int = 3) -> list[dict]:
    cache = await _load_cache()
    if not cache:
        return []
    try:
        query_embedding = np.array(await embed_text(query), dtype=float)
        scored = [
            {**item, "similarity": _cosine_similarity(query_embedding, item["embedding"])}
            for item in cache
        ]
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]
    except Exception:
        logger.exception("RAG similarity search failed")
        return []


def invalidate_cache():
    global _cache
    _cache = None
