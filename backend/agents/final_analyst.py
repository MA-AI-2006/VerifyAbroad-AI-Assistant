"""Final report assembly.

The evidence tree, domain statuses, score and level are deterministic and are
never rewritten here. Only the narrative (fraud signals, recommendation, safer
next action) is LLM-generated — and if the LLM is unavailable we compose the same
three fields from the evidence itself, so verification still returns a complete,
honest report instead of failing.
"""
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

_STATUS_HEADLINE = {
    "VERIFIED": "The checks we could run agree with what you were told. That is not a guarantee that your specific offer is genuine.",
    "NEEDS_VERIFICATION": "Some of this could not be confirmed from the sources available. Do not pay or sign until the open items are answered.",
    "UNABLE_TO_VERIFY": "No usable source could confirm or deny the main claims, so treat this as unverified rather than safe.",
    "SUSPICIOUS": "Several claims could not be supported by any independent source. Treat this as a warning sign.",
    "HIGH_RISK": "Multiple high-authority checks contradicted what you were told. Do not pay before verifying independently.",
    "CONTRADICTED": "Independent sources contradict parts of this offer.",
    "UNVERIFIED": "The evidence is mixed or inconclusive; verify the open points directly with the university.",
}


def assemble_domains(evidence_records: list[EvidenceRecord], domain_statuses: dict[str, tuple[str, str]]) -> list[DomainSummary]:
    grouped = defaultdict(list)
    for record in evidence_records:
        grouped[record.domain.value].append(record)

    domains: list[DomainSummary] = []
    for domain in ("institution", "agent", "payment", "document"):
        status, summary = domain_statuses.get(domain, ("UNABLE_TO_VERIFY", "No evidence was available to check this domain."))
        domains.append(DomainSummary(domain=domain, status=status, summary=summary, evidence=grouped[domain]))
    return domains


def _unavailable_sources(records: list[EvidenceRecord]) -> list[str]:
    """Sources that returned nothing usable, so the report does not look complete."""
    names: list[str] = []
    for record in records:
        error = (record.raw_response or {}).get("error") if isinstance(record.raw_response, dict) else None
        if record.result.value == "unable_to_verify" and error:
            label = record.source
            if label not in names:
                names.append(label)
    return names[:12]


def deterministic_narrative(
    case: dict,
    records: list[EvidenceRecord],
    domains: list[DomainSummary],
    risk_score: int,
    risk_level: str,
    display_status: str,
) -> FinalNarrative:
    """Evidence-grounded narrative built from rule output alone (no LLM)."""
    signals: list[str] = []
    for domain in domains:
        if domain.status in {"CONTRADICTED", "SUSPICIOUS"}:
            signals.append(f"{domain.domain.capitalize()}: {domain.summary[:400]}")
    for record in records:
        if record.result.value == "contradicted" and record.detail:
            line = f"{record.claim[:160]} — {record.detail[:240]}"
            if line not in signals:
                signals.append(line)
    for claim in (case.get("claims") or [])[:6]:
        signals.append(f"Claimed to you, not independently supported: “{str(claim)[:200]}”")
    if not signals:
        signals.append("No source returned a hard contradiction, but nothing high-authority confirmed the offer either.")

    still_open = [d.domain for d in domains if d.status in {"UNABLE_TO_VERIFY", "UNVERIFIED"}]
    contradicted = [d.domain for d in domains if d.status == "CONTRADICTED"]
    university = case.get("university") or "the university"
    action = (
        f"Contact {university} directly through the contact details on its official website and ask them to "
        "confirm (a) that your admission/program exists, (b) that the consultant is authorised, and (c) the exact "
        "official fee and payment channel. Do not pay a personal wallet or account, and do not pay any "
        "'seat booking', 'guarantee' or 'release' fee."
    )
    recommendation = (
        f"Risk indicator {risk_score}/100 ({risk_level.replace('_', ' ').title()}). "
        f"{_STATUS_HEADLINE.get(display_status, _STATUS_HEADLINE['NEEDS_VERIFICATION'])} "
        + (f" Contradicted: {', '.join(contradicted)}." if contradicted else "")
        + (f" Not yet verifiable: {', '.join(still_open)}." if still_open else "")
    )
    return FinalNarrative(
        fraud_signals=signals[:20],
        recommendation=recommendation[:3000],
        safer_action=action[:1500],
    )


async def generate_final_report(structured_case, evidence_records, domain_statuses, risk_score, risk_level) -> FinalReport:
    domains = assemble_domains(evidence_records, domain_statuses)
    display_status, display_emoji = display_status_for_risk(risk_level, domain_statuses, risk_score)
    unavailable = _unavailable_sources(evidence_records)
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

    narrative: FinalNarrative | None = None
    narrative_source = "deterministic"
    if settings.llm_available:
        try:
            narrative = await llm.generate_json(PROMPT, json.dumps(payload, default=str), FinalNarrative)
            narrative_source = "llm"
        except Exception as exc:
            logger.warning("Final LLM narrative failed (%s); composing it from the evidence directly", exc)
            if not settings.offline_fallbacks:
                raise

    if narrative is None:
        narrative = deterministic_narrative(
            structured_case or {}, evidence_records, domains, risk_score, risk_level, display_status
        )

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
        narrative_source=narrative_source,
        unavailable_sources=unavailable,
    )
