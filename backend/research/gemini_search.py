"""Secondary live-web research using Gemini Google Search grounding."""
from agents.llm_client import llm


async def check_institution_recognition(university: str, country: str) -> dict:
    return await llm.google_search(
        f'Investigate the current official recognition status of "{university}" in {country}. '
        'Prioritize government, higher-education authority and official university sources. State evidence and URLs.'
    )


async def check_agent_authorization(university: str, agent_name: str) -> dict:
    return await llm.google_search(
        f'Check whether the official website of "{university}" currently identifies "{agent_name}" '
        'as an authorized representative/agent/partner for students from Pakistan. Prioritize the university domain.'
    )


async def check_scam_warnings(agent_name: str) -> dict:
    return await llm.google_search(
        f'Search current public evidence for fraud/scam/regulatory warnings involving "{agent_name}" '
        'in study-abroad/education consultancy, especially Pakistan. Prefer official or reputable sources.'
    )


async def check_official_fee(university: str, program: str | None, country: str) -> dict:
    return await llm.google_search(
        f'Find current official fee/payment information for "{program or "the relevant program"}" at "{university}" '
        f'in {country}. Prioritize the official university website.'
    )
