import json
import logging
from pydantic import BaseModel
from schemas.evidence import EvidenceRecord, VerificationResult, Domain, AuthorityLevel
from agents.llm_client import llm

logger = logging.getLogger(__name__)


class NormalizedResult(BaseModel):
    result: VerificationResult
    detail: str


PROMPT = """Normalize the raw source result into a conservative verification result.
Use exactly one result: verified, contradicted, claimed, not_found, unable_to_verify.
Never infer fraud from absence alone. Never invent facts.
"""


async def normalize_source_result(domain: Domain, claim: str, source: str, source_type: str,
                                  authority: AuthorityLevel, raw_data) -> EvidenceRecord:
    raw = raw_data if isinstance(raw_data, str) else json.dumps(raw_data, default=str)
    try:
        result = await llm.generate_json(
            PROMPT,
            f"Claim: {claim}\nSource: {source} ({source_type})\nRaw result:\n{raw}",
            NormalizedResult,
        )
        return EvidenceRecord(
            domain=domain,
            claim=claim,
            source=source,
            source_type=source_type,
            authority=authority,
            result=result.result,
            detail=result.detail,
            raw_response=raw_data if isinstance(raw_data, dict) else {"raw_text": raw_data},
        )
    except Exception as exc:
        logger.error("Evidence normalization failed for source=%s claim=%s: %s", source, claim, exc, exc_info=True)
        return EvidenceRecord(
            domain=domain,
            claim=claim,
            source=source,
            source_type=source_type,
            authority=authority,
            result=VerificationResult.unable_to_verify,
            detail="The source result could not be normalized reliably.",
            raw_response={"normalization_error": str(exc), "raw": raw_data if isinstance(raw_data, dict) else {"raw_text": raw_data}},
        )
