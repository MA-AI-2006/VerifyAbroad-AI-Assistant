import asyncio
import re
from agents.normalizer import normalize_source_result
from research import tavily, gemini_search
from rag.retriever import search_fraud_patterns
from schemas.evidence import EvidenceRecord, Domain, AuthorityLevel, VerificationResult

RISKY_PAYMENT_METHODS = ["jazzcash", "easypaisa", "sadapay", "nayapay", "upaisa", "personal bank account", "personal account", "cash", "western union"]
SUSPICIOUS_PAYMENT_PURPOSES = ["visa guarantee", "visa confirmation fee", "seat booking fee", "processing fee to agent", "advance guarantee", "embassy fee", "scholarship release fee", "unlock scholarship"]
PK_IBAN_PATTERN = re.compile(r"\bPK\d{2}[A-Z]{4}\d{16}\b", re.IGNORECASE)


def check_payment_method(method: str | None) -> EvidenceRecord:
    if not method:
        return EvidenceRecord(domain=Domain.payment, claim="Payment method provided", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.unable_to_verify, detail="No payment method was specified.")
    lower = method.lower()
    wallet_or_personal = any(x in lower for x in RISKY_PAYMENT_METHODS)
    personal_iban = bool(PK_IBAN_PATTERN.search(method)) and any(x in lower for x in ("personal", "my account", "own account"))
    flagged = wallet_or_personal or personal_iban
    return EvidenceRecord(domain=Domain.payment, claim=f"Payment method: {method}", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.contradicted if flagged else VerificationResult.unable_to_verify, detail=("A personal wallet/account or similar channel is a strong payment-risk signal." if flagged else "No built-in risky payment pattern matched; official channel still needs independent confirmation."))


def check_payment_purpose(purpose: str | None) -> EvidenceRecord:
    if not purpose:
        return EvidenceRecord(domain=Domain.payment, claim="Payment purpose provided", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.unable_to_verify, detail="No payment purpose was specified.")
    flagged = any(x in purpose.lower() for x in SUSPICIOUS_PAYMENT_PURPOSES)
    return EvidenceRecord(domain=Domain.payment, claim=f"Payment purpose: {purpose}", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.contradicted if flagged else VerificationResult.unable_to_verify, detail=("This payment purpose matches a known study-abroad scam pattern." if flagged else "Payment purpose did not match the built-in suspicious-purpose list."))


async def verify_payment(university: str | None, program: str | None, country: str | None, method: str | None, purpose: str | None) -> list[EvidenceRecord]:
    basic = [check_payment_method(method), check_payment_purpose(purpose)]
    if not university:
        return basic
    tavily_raw, gemini_raw = await asyncio.gather(
        tavily.check_official_fee(university, program, country or "the relevant country"),
        gemini_search.check_official_fee(university, program, country or "the relevant country"),
    )
    web_records = await asyncio.gather(
        normalize_source_result(Domain.payment, f'Official fee/payment information for "{university}" and "{program or "the relevant program"}" can be identified', "Tavily live web research", "tavily_web", AuthorityLevel.high, tavily_raw),
        normalize_source_result(Domain.payment, f'Official fee/payment information for "{university}" and "{program or "the relevant program"}" can be identified', "Gemini Google Search grounding", "gemini_search", AuthorityLevel.high, gemini_raw),
    )
    rag = await search_fraud_patterns(f"Payment investigation: {method or ''} {purpose or ''}", top_k=3)
    rag_records = [EvidenceRecord(domain=Domain.payment, claim=f'Known payment-fraud pattern relevant: {m["pattern"]}', source="VerifyAbroad-AI fraud-pattern RAG", source_type="rag_pattern", authority=AuthorityLevel.medium, result=VerificationResult.claimed, detail=m["text"][:300], raw_response={"pattern":m["pattern"],"similarity":m["similarity"]}) for m in rag if m["similarity"] >= 0.70]
    return [*basic, *web_records, *rag_records]
