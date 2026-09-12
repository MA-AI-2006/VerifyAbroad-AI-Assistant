from agents.llm_client import llm

async def embed_text(text: str) -> list[float]:
    return await llm.embed(text)

async def embed_texts(texts: list[str]) -> list[list[float]]:
    return await llm.embed_many(texts)
