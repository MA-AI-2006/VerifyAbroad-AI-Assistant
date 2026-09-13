from datetime import datetime, timedelta
from dateutil import parser as date_parser
from schemas.evidence import EvidenceRecord, Domain, AuthorityLevel, VerificationResult

URGENCY_KEYWORDS = ["today", "aj", "abhi", "immediately", "within 24 hours", "warna seat", "jaldi"]


def check_payment_deadline_urgency(deadline: str | None) -> EvidenceRecord:
    if not deadline:
        return EvidenceRecord(domain=Domain.document, claim="Payment deadline stated", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.unable_to_verify, detail="No payment deadline was mentioned.")
    lower = deadline.lower()
    flagged = any(x in lower for x in URGENCY_KEYWORDS)
    try:
        flagged = flagged or date_parser.parse(deadline, fuzzy=True) <= datetime.now() + timedelta(hours=48)
    except (ValueError, OverflowError, TypeError):
        pass
    return EvidenceRecord(domain=Domain.document, claim=f"Payment deadline: {deadline}", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.contradicted if flagged else VerificationResult.verified, detail=("Short/urgent payment deadline detected as a risk signal." if flagged else "No built-in artificial-urgency signal detected."))


def check_intake_date_validity(intake: str | None) -> EvidenceRecord:
    if not intake:
        return EvidenceRecord(domain=Domain.document, claim="Intake date provided", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.unable_to_verify, detail="No intake date was extracted.")
    try:
        parsed = date_parser.parse(intake, fuzzy=True, default=datetime(datetime.now().year, 1, 1))
    except (ValueError, OverflowError, TypeError):
        return EvidenceRecord(domain=Domain.document, claim=f"Intake date: {intake}", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.unable_to_verify, detail="Could not parse intake date.")
    if parsed < datetime.now() - timedelta(days=30):
        return EvidenceRecord(domain=Domain.document, claim=f"Intake date: {intake}", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.contradicted, detail="The stated intake appears to have already passed.")
    return EvidenceRecord(domain=Domain.document, claim=f"Intake date: {intake}", source="Application rule logic", source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.verified, detail="The stated intake is not obviously expired by this simple rule.")


def cross_check_extracted_claims(extracted: dict, case, domain_statuses: dict | None = None) -> list[EvidenceRecord]:
    out = []
    for field, case_field, domain in [
        ("university", "university", Domain.document),
        ("agent_name", "agent", Domain.document),
        ("program", "program", Domain.document),
        ("payment_method", "payment_method", Domain.payment),
    ]:
        a, b = extracted.get(field), getattr(case, case_field, None)
        if a and b:
            left, right = str(a).strip().lower(), str(b).strip().lower()
            same = left == right
            # Reference codes and letterheads often surround the same name, so a
            # containment match counts as consistent rather than a contradiction.
            contained = (not same) and (right in left or left in right)
            out.append(EvidenceRecord(
                domain=domain,
                claim=f"Evidence {field} matches the investigation case",
                source="Document-to-case consistency check",
                source_type="consistency_rule",
                authority=AuthorityLevel.high,
                result=VerificationResult.contradicted if not (same or contained) else VerificationResult.verified,
                detail=(
                    f"Evidence={a!r}; case={b!r}."
                    if same
                    else f"Evidence={a!r} contains the case value {b!r}; treated as consistent."
                    if contained
                    else f"Evidence={a!r}; case={b!r}. These do not match."
                ),
            ))
    a, b = extracted.get("payment_amount"), getattr(case, "payment_amount", None)
    if a is not None and b is not None:
        same = abs(float(a) - float(b)) < 0.01
        out.append(EvidenceRecord(domain=Domain.payment, claim="Evidence payment amount matches the investigation case", source="Document-to-case consistency check", source_type="consistency_rule", authority=AuthorityLevel.high, result=VerificationResult.verified if same else VerificationResult.contradicted, detail=f"Evidence={a}; case={b}."))

    if domain_statuses:
        institution_status = domain_statuses.get("institution", (None, ""))[0]
        if extracted.get("university") and institution_status == "CONTRADICTED":
            out.append(EvidenceRecord(
                domain=Domain.document,
                claim="Document university claim conflicts with institution verification",
                source="Document-to-verification cross-check",
                source_type="consistency_rule",
                authority=AuthorityLevel.high,
                result=VerificationResult.contradicted,
                detail=f"The document names {extracted.get('university')!r}, while the institution verification returned CONTRADICTED.",
            ))

        agent_status = domain_statuses.get("agent", (None, ""))[0]
        if extracted.get("agent_name") and agent_status == "CONTRADICTED":
            out.append(EvidenceRecord(
                domain=Domain.document,
                claim="Document agent claim conflicts with agent verification",
                source="Document-to-verification cross-check",
                source_type="consistency_rule",
                authority=AuthorityLevel.high,
                result=VerificationResult.contradicted,
                detail=f"The document names {extracted.get('agent_name')!r}, while the agent verification returned CONTRADICTED.",
            ))

    return out
