"""RAG retriever.

Vector search (Gemini embeddings + cosine similarity) is the primary path. When
there is no embedding key, or the table has not been ingested yet, retrieval
falls back to lexical scoring over the same seed file, so fraud-pattern signals
still appear in a report during a demo instead of silently vanishing.
"""
import json
import logging
import re
from functools import lru_cache
from pathlib import Path

import numpy as np
from sqlalchemy import select

from config import settings
from database.session import AsyncSessionLocal
from database.models import FraudPattern
from rag.embeddings import embed_text

logger = logging.getLogger(__name__)

SEED_FILE = Path(__file__).resolve().parent.parent / "data" / "fraud_patterns_seed.json"
_cache: list[dict] | None = None

_STOPWORDS = {
    "the", "and", "for", "that", "this", "with", "your", "you", "are", "was", "were",
    "have", "has", "not", "but", "can", "will", "from", "they", "their", "what", "which",
    "about", "into", "some", "any", "all", "our", "out", "who", "how", "why", "does", "did",
}


def _tokens(text: str) -> set[str]:
    return {
        token for token in re.findall(r"[a-z0-9']+", (text or "").lower())
        if len(token) > 3 and token not in _STOPWORDS
    }


@lru_cache(maxsize=1)
def _seed_patterns() -> list[dict]:
    try:
        with open(SEED_FILE, "r", encoding="utf-8") as handle:
            patterns = json.load(handle)
    except Exception:
        logger.warning("Fraud-pattern seed file unavailable at %s", SEED_FILE)
        return []
    return [
        {
            "pattern": item.get("pattern", ""),
            "category": item.get("category", ""),
            "severity": item.get("severity", "medium"),
            "text": item.get("text", ""),
        }
        for item in patterns
        if isinstance(item, dict) and item.get("text")
    ]


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
            for p in patterns if p.text
        ]
    except Exception:
        logger.exception("Failed to load RAG knowledge base from the database; using the seed file")
        _cache = [dict(item, embedding=None) for item in _seed_patterns()]
    return _cache


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.shape != b.shape:
        return 0.0
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


#: Callers keep evidence only when `similarity >= 0.70`, so the lexical score is
#: calibrated into the same band: 2+ shared tokens clear the bar, 1 does not.
LEXICAL_BASE = 0.55
LEXICAL_PER_TOKEN = 0.08
LEXICAL_MIN_TOKENS = 2


def _lexical_scores(query_tokens: set[str], entries: list[dict]) -> list[dict]:
    scored: list[dict] = []
    for entry in entries:
        entry_tokens = _tokens(f"{entry.get('pattern', '')} {entry.get('text', '')}")
        if not entry_tokens:
            continue
        overlap = len(query_tokens & entry_tokens)
        if overlap < LEXICAL_MIN_TOKENS:
            continue
        score = min(0.95, LEXICAL_BASE + LEXICAL_PER_TOKEN * overlap)
        if entry.get("severity") == "high":
            score = min(0.98, score + 0.02)
        scored.append({**entry, "id": entry.get("id", entry.get("pattern", "")), "similarity": round(score, 3)})
    scored.sort(key=lambda item: item["similarity"], reverse=True)
    return scored


async def search_fraud_patterns(query: str, top_k: int = 3) -> list[dict]:
    entries = await _load_cache()
    if not entries:
        return []

    vector_ready = settings.gemini_api_key and all(entry.get("embedding") is not None for entry in entries)
    if vector_ready:
        try:
            query_embedding = np.array(await embed_text(query), dtype=float)
            scored = [
                {**entry, "similarity": _cosine_similarity(query_embedding, entry["embedding"])}
                for entry in entries
            ]
            scored.sort(key=lambda item: item["similarity"], reverse=True)
            return scored[:top_k]
        except Exception:
            logger.warning("Embedding search unavailable; using lexical fraud-pattern matching", exc_info=True)

    return _lexical_scores(_tokens(query), entries)[:top_k]


def invalidate_cache():
    global _cache
    _cache = None
    _seed_patterns.cache_clear()
