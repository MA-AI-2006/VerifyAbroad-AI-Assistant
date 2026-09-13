"""Deterministic risk scoring. No LLM participates in score calculation."""
import re
from schemas.evidence import EvidenceRecord, VerificationResult

RULES = {
    "visa_guarantee_claim": 30,
    "unverified_agent": 25,
    "urgent_payment": 20,
    "personal_payment_account": 20,
    "institution_not_recognized": 25,
    "payment_process_mismatch": 25,
    # A contradicted payment demand is the highest-stakes finding in this whole
    # product, so it floors the score at MEDIUM even when nothing else was
    # checkable yet (no documents, no registry hit) — the student must never see
    # "Low risk" while an official source contradicts what they were told to pay.
    "payment_contradicted": 30,
    "contradicted_program": 30,
    "contradictory_document": 20,
    "agent_banned_or_sanctioned": 35,
}

RISK_DISPLAY = {
    "HIGH": ("SUSPICIOUS", "🟠"),
    "VERY_HIGH": ("HIGH_RISK", "🔴"),
}

# Claim phrases. The student writes in English, Roman Urdu or Urdu, so both word
# orders and the transliterated spellings have to be covered: "visa guaranteed
# hai" and "guaranteed visa" are the same promise, and "aaj hi … warna seat chali
# jayegi" is the same pressure as "pay today or lose your seat".
_VISA_GUARANTEE_RE = re.compile(
    r"visa[^.\n]{0,24}guarante|guarante[^.\n]{0,24}visa|100\s*%\s*visa|visa\s*100\s*%"
    r"|visa\s*(?:pakka|confirm|sure)",
    re.IGNORECASE,
)
_URGENCY_RE = re.compile(
    r"urgent|urgency|within\s*24|24\s*hours?|by\s*today|today\s*hi|aaj\s*hi|abhi\s*bhej"
    r"|jaldi|last\s*(?:seat|batch)|limited\s*seats?|seat\s*(?:chali|cancel)|expiry|deadline",
    re.IGNORECASE,
)

_PAYMENT_ACCOUNT_PATTERNS = (
    "jazzcash", "easypaisa", "sadapay", "nayapay", "upaisa", "personal account",
    "personal wallet", "my account", "own account", "personal iban"
)


def _contains(text: str, phrases: tuple[str, ...]) -> bool:
    return any(phrase in text for phrase in phrases)


def compute_risk_score(records: list[EvidenceRecord], domain_statuses: dict[str, tuple[str, str]]) -> tuple[int, str]:
    score = 0

    if domain_statuses.get("institution", (None,))[0] == "CONTRADICTED":
        score += RULES["institution_not_recognized"]

    agent_status = domain_statuses.get("agent", (None,))[0]
    if agent_status in {"SUSPICIOUS", "UNVERIFIED"}:
        score += RULES["unverified_agent"]

    payment_status = domain_statuses.get("payment", (None,))[0]
    if payment_status == "CONTRADICTED":
        score += RULES["payment_contradicted"]
    if payment_status == "CONTRADICTED" and any(
        _contains((r.claim + " " + (r.detail or "")).lower(), _PAYMENT_ACCOUNT_PATTERNS)
        for r in records if r.domain.value == "payment"
    ):
        score += RULES["personal_payment_account"]

    claim_texts = " ".join(r.claim.lower() + " " + (r.detail or "").lower() for r in records)
    if _VISA_GUARANTEE_RE.search(claim_texts):
        score += RULES["visa_guarantee_claim"]
    if _URGENCY_RE.search(claim_texts) or _contains(
        claim_texts, ("artificial urgency", "short/urgent payment deadline")
    ):
        score += RULES["urgent_payment"]

    if any(
        r.result == VerificationResult.contradicted
        and "Evidence program matches the investigation case" in r.claim
        for r in records
    ):
        score += RULES["contradicted_program"]

    if any(
        r.result == VerificationResult.contradicted
        and "Evidence payment method matches the investigation case" in r.claim
        for r in records
    ):
        score += RULES["payment_process_mismatch"]

    if any(
        r.result == VerificationResult.contradicted
        and r.domain.value == "document"
        and "Document-to-verification cross-check" not in r.source
        and "program matches" not in r.claim
        for r in records
    ):
        score += RULES["contradictory_document"]

    if any(
        r.result == VerificationResult.contradicted
        and (
            "banned/reported-agent" in r.claim.lower()
            or "regulatory/watchlist" in r.claim.lower()
        )
        for r in records
    ):
        score += RULES["agent_banned_or_sanctioned"]

    score = min(score, 100)
    if score < 30:
        level = "LOW"
    elif score < 60:
        level = "MEDIUM"
    elif score < 80:
        level = "HIGH"
    else:
        level = "VERY_HIGH"
    return score, level


def display_status_for_risk(risk_level: str, domain_statuses: dict[str, tuple[str, str]], risk_score: int) -> tuple[str, str]:
    """Conservative student-facing display mapping.

    Green VERIFIED is reserved for a case whose core verification domains are
    all explicitly verified. A low risk score alone is not treated as proof
    of legitimacy.
    """
    if not domain_statuses or (risk_score == 0 and all(
        status in {"UNABLE_TO_VERIFY", "UNVERIFIED"}
        for status, _ in domain_statuses.values()
    )):
        return "UNABLE_TO_VERIFY", "⚪"

    if risk_level in RISK_DISPLAY:
        return RISK_DISPLAY[risk_level]

    core_statuses = [
        domain_statuses.get("institution", ("UNABLE_TO_VERIFY", ""))[0],
        domain_statuses.get("agent", ("UNABLE_TO_VERIFY", ""))[0],
        domain_statuses.get("payment", ("UNABLE_TO_VERIFY", ""))[0],
    ]
    if all(status == "VERIFIED" for status in core_statuses):
        return "VERIFIED", "🟢"
    return "NEEDS_VERIFICATION", "🟡"
