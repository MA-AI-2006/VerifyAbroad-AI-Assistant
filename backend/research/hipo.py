import asyncio
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)
HIPO_URL = "http://universities.hipolabs.com/search"


async def search_university(name: str, country: str | None = None) -> dict:
    params = {"name": name}
    if country:
        params["country"] = country
    try:
        async with httpx.AsyncClient(timeout=settings.free_source_timeout_seconds) as client:
            response = await client.get(HIPO_URL, params=params)
            response.raise_for_status()
            payload = response.json()
            return {"query": name, "country": country, "matches": payload if isinstance(payload, list) else []}
    except Exception as exc:
        # A third-party registry being slow or unreachable is an expected
        # condition, not a bug: the domain is reported as unable_to_verify.
        logger.warning("Hipo lookup failed for university=%s: %s", name, exc)
        return {"error": str(exc), "query": name, "country": country, "matches": []}
