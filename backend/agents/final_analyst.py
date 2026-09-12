import json
import logging
from collections import defaultdict

from pydantic import BaseModel, Field
from agents.llm_client import llm
from config import settings
from schemas.evidence import EvidenceRecord
from schemas.report import FinalReport, ManualCheck
from schemas.verification import DomainSummary
from risk.risk_engine import display_status_for_risk

logger = logging.getLogger(__name__)

PROMPT = """You are the final safety analyst for VerifyAbroad-AI, a study-abroad safety assistant for Pakistani students.
Use ONLY the supplied structured case, deterministic domain statuses, risk score/level, and evidence summaries.
Never invent sources, facts, or verification outcomes.
Do not regenerate or reproduce the evidence tree.
Do not change the risk score or risk level.
Do not call a person/company a scammer solely from weak evidence. Be explicit about uncertainty and contradictions.
The risk score is a risk indicator, not a probability.
Write concise evidence-grounded fraud signals, a direct recommendation, and one safer next action.
"""


class FinalNarrative(BaseModel):
    fraud_signals: list[str] = Field(default_factory=list, max_length=20)
    recommendation: str = Field(min_length=1, max_length=3000)
    safer_action: str = Field(min_length=1, max_length=1500)


MANUAL_CHECKS = [
    ManualCheck(
        name="WHED - World Higher Education Database",
        url=settings.whed_url,
        reason="Search the university independently as an additional manual institution check.",
    ),
    ManualCheck(
        name="SECP Pakistan - Company Name Search",
        url=settings.secp_search_url,
        reason="Check the agent/company name where relevant. Company registration does not prove university authorization.",
    ),
]


def assemble_domains(evidence_records: list[EvidenceRecord], domain_statuses: dict[str, tuple[str, str]]) -> list[DomainSummary]:
    grouped = defaultdict(list)
    for record in evidence_records:
        grouped[record.domain.value].append(record)

    domains: list[DomainSummary] = []
    for domain in ("institution", "agent", "payment", "document"):
        status, summary = domain_statuses.get(domain, ("UNABLE_TO_VERIFY", "No evidence was available to check this domain."))
        domains.append(DomainSummary(domain=domain, status=status, summary=summary, evidence=grouped[domain]))
    return domains


async def generate_final_report(structured_case, evidence_records, domain_statuses, risk_score, risk_level):
    domains = assemble_domains(evidence_records, domain_statuses)
    display_status, display_emoji = display_status_for_risk(risk_level, domain_statuses, risk_score)
    payload = {
        "structured_case": structured_case,
        "domain_statuses": {k: {"status": v[0], "notes": v[1]} for k, v in domain_statuses.items()},
        "evidence_summaries": [
            {"domain": d.domain, "status": d.status, "summary": d.summary} for d in domains
        ],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "display_status": display_status,
    }

    try:
        narrative = await llm.generate_json(PROMPT, json.dumps(payload, default=str), FinalNarrative)
    except Exception:
        logger.exception("Final LLM narrative failed")
        raise

    return FinalReport(
        risk_level=risk_level,
        risk_score=risk_score,
        display_status=display_status,
        display_emoji=display_emoji,
        domains=domains,
        fraud_signals=narrative.fraud_signals,
        recommendation=narrative.recommendation,
        safer_action=narrative.safer_action,
        manual_checks=list(MANUAL_CHECKS),
    )
