"""
One-time ingestion script: reads data/fraud_patterns_seed.json, embeds each
entry, and stores in the FraudPattern table. Run this once after DB setup,
and again whenever the seed file is updated.

Usage: python -m rag.knowledge_base
"""
import asyncio
import json
from pathlib import Path

from sqlalchemy import select
from database.session import AsyncSessionLocal, init_db
from database.models import FraudPattern
from rag.embeddings import embed_texts
from rag.retriever import invalidate_cache

SEED_FILE = Path(__file__).parent.parent / "data" / "fraud_patterns_seed.json"


async def ingest():
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        patterns = json.load(f)

    texts = [p["text"] for p in patterns]
    embeddings = await embed_texts(texts)

    async with AsyncSessionLocal() as session:
        # Clear existing entries to avoid duplicates on re-run
        existing = await session.execute(select(FraudPattern))
        for row in existing.scalars().all():
            await session.delete(row)
        await session.commit()

        for pattern, embedding in zip(patterns, embeddings):
            row = FraudPattern(
                category=pattern["category"],
                country=pattern.get("country", "Pakistan"),
                pattern=pattern["pattern"],
                severity=pattern["severity"],
                text=pattern["text"],
                language=pattern.get("language", "English"),
                source=pattern.get("source"),
                source_url=pattern.get("source_url"),
                embedding=embedding,
            )
            session.add(row)
        await session.commit()

    invalidate_cache()
    print(f"Ingested {len(patterns)} fraud patterns into the knowledge base.")


if __name__ == "__main__":
    async def main():
        await init_db()
        await ingest()
    asyncio.run(main())
