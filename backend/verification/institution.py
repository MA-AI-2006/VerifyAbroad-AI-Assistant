import asyncio
from agents.normalizer import normalize_source_result
from research import hipo, tavily, gemini_search
from data.loader import lookup_hec_institution
from schemas.evidence import EvidenceRecord, Domain, AuthorityLevel

async def verify_institution(university: str | None, country: str | None) -> list[EvidenceRecord]:
    if not university:
        return []
    hipo_raw, tavily_raw, gemini_raw = await asyncio.gather(
        hipo.search_university(university, country),
        tavily.check_institution_recognition(university, country or "the relevant country"),
        gemini_search.check_institution_recognition(university, country or "the relevant country"),
    )
    records = await asyncio.gather(
        normalize_source_result(Domain.institution,
            f'"{university}" appears in the Hipo university directory',
            "Hipo Universities API", "hipo", AuthorityLevel.medium, hipo_raw),
        normalize_source_result(Domain.institution,
            f'"{university}" is officially recognized in {country or "its country"}',
            "Tavily live web research", "tavily_web", AuthorityLevel.high, tavily_raw),
        normalize_source_result(Domain.institution,
            f'"{university}" is officially recognized in {country or "its country"}',
            "Gemini Google Search grounding", "gemini_search", AuthorityLevel.high, gemini_raw),
    )
    match = lookup_hec_institution(university)
    hec = EvidenceRecord(
        domain=Domain.institution,
        claim=f'"{university}" appears in the HEC Pakistan recognized-institutions dataset',
        source="HEC Pakistan static dataset", source_type="static_dataset", authority=AuthorityLevel.high,
        result="verified" if match else "not_found",
        detail=(f"Matched HEC record with {match['match_confidence']:.0%} name similarity." if match
                else "No match in the local HEC reference; absence does not prove non-recognition outside Pakistan."),
        raw_response=match,
    )
    return [*records, hec]
