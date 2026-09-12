import asyncio
from agents.normalizer import normalize_source_result
from research import opensanctions, tavily, gemini_search
from data.loader import lookup_banned_agent
from rag.retriever import search_fraud_patterns
from schemas.evidence import EvidenceRecord, Domain, AuthorityLevel

async def verify_agent(agent_name: str | None, university: str | None, country: str | None = None) -> list[EvidenceRecord]:
    if not agent_name:
        return []
    tasks = [
        opensanctions.screen_entity(agent_name, country),
        tavily.check_scam_warnings(agent_name),
        gemini_search.check_scam_warnings(agent_name),
    ]
    if university:
        tasks += [
            tavily.check_agent_authorization(university, agent_name),
            gemini_search.check_agent_authorization(university, agent_name),
        ]
    results = await asyncio.gather(*tasks)
    sanction, tavily_scam, gemini_scam = results[:3]
    tavily_auth = results[3] if university else None
    gemini_auth = results[4] if university else None
    norm = [
        normalize_source_result(Domain.agent, f'"{agent_name}" has a relevant regulatory/watchlist match', "OpenSanctions API", "opensanctions", AuthorityLevel.high, sanction),
        normalize_source_result(Domain.agent, f'"{agent_name}" has public fraud/scam warnings', "Tavily live web research", "tavily_web", AuthorityLevel.medium, tavily_scam),
        normalize_source_result(Domain.agent, f'"{agent_name}" has public fraud/scam warnings', "Gemini Google Search grounding", "gemini_search", AuthorityLevel.medium, gemini_scam),
    ]
    if university:
        norm += [
            normalize_source_result(Domain.agent, f'"{agent_name}" is listed by "{university}" as an authorized representative', "Tavily university-site research", "tavily_web", AuthorityLevel.high, tavily_auth),
            normalize_source_result(Domain.agent, f'"{agent_name}" is listed by "{university}" as an authorized representative', "Gemini Google Search grounding", "gemini_search", AuthorityLevel.high, gemini_auth),
        ]
    records = await asyncio.gather(*norm)
    banned = lookup_banned_agent(agent_name)
    banned_record = EvidenceRecord(
        domain=Domain.agent,
        claim=f'"{agent_name}" appears in the local banned/reported-agent reference list',
        source="Banned/reported agent static dataset", source_type="static_dataset", authority=AuthorityLevel.high,
        result=("contradicted" if banned and banned.get("status") == "banned" else "claimed" if banned else "not_found"),
        detail=(f"Matched entry: {banned.get('status')} — {banned.get('reason', '')}" if banned
                else "No match in the local reference file; absence does not prove legitimacy."),
        raw_response=banned,
    )
    rag = await search_fraud_patterns(f"Agent/consultant investigation for {agent_name}.", top_k=3)
    rag_records = [EvidenceRecord(domain=Domain.agent, claim=f'Known fraud pattern relevant to agent investigation: {m["pattern"]}', source="VerifyAbroad-AI fraud-pattern RAG", source_type="rag_pattern", authority=AuthorityLevel.medium, result="claimed", detail=m["text"][:300], raw_response={"pattern":m["pattern"],"similarity":m["similarity"]}) for m in rag if m["similarity"] >= 0.70]
    return [*records, banned_record, *rag_records]
