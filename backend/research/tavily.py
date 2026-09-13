"""Primary live-web research using Tavily."""
import asyncio
import logging
from tavily import AsyncTavilyClient
from config import settings

logger = logging.getLogger(__name__)
client = AsyncTavilyClient(api_key=settings.tavily_api_key) if settings.tavily_api_key else None


async def search_web(query: str, max_results: int | None = None) -> dict:
    if not client:
        return {"error": "TAVILY_API_KEY is not configured", "query": query, "results": []}
    try:
        return await asyncio.wait_for(
            client.search(
                query=query,
                search_depth=settings.tavily_search_depth,
                max_results=max_results or settings.tavily_max_results,
                include_raw_content=True,
                include_answer=False,
            ),
            timeout=settings.web_timeout_seconds,
        )
    except Exception as exc:
        # A slow or unreachable external source is expected sometimes; the domain
        # is reported as unable_to_verify instead of raising.
        logger.warning("Tavily research failed for query=%s: %s", query, exc)
        return {"error": str(exc), "query": query, "results": []}


async def check_institution_recognition(university: str, country: str) -> dict:
    return await search_web(f'"{university}" officially recognized higher education institution {country}')


async def check_agent_authorization(university: str, agent_name: str) -> dict:
    return await search_web(f'"{university}" "{agent_name}" authorized representative agent admissions Pakistan')


async def check_scam_warnings(agent_name: str) -> dict:
    return await search_web(f'"{agent_name}" fraud scam warning study abroad Pakistan consultant')


async def check_official_fee(university: str, program: str | None, country: str) -> dict:
    return await search_web(f'"{university}" "{program or "tuition"}" official fee payment {country}')
