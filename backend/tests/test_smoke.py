"""Deterministic smoke tests; no external provider keys or live calls required."""
import sys
sys.path.insert(0, ".")

from schemas.evidence import Domain, AuthorityLevel, VerificationResult, EvidenceRecord
from risk.aggregator import aggregate_all
from risk.risk_engine import compute_risk_score, display_status_for_risk


def test_deterministic_core_rules():
    records = [
        EvidenceRecord(
            domain=Domain.institution,
            claim="University is recognized",
            source="Official test source",
            source_type="test",
            authority=AuthorityLevel.high,
            result=VerificationResult.verified,
            detail="Confirmed for smoke test.",
        ),
        EvidenceRecord(
            domain=Domain.agent,
            claim="Banned/reported-agent match found",
            source="Static test dataset",
            source_type="static_dataset",
            authority=AuthorityLevel.high,
            result=VerificationResult.contradicted,
            detail="Test-only banned status.",
        ),
        EvidenceRecord(
            domain=Domain.payment,
            claim="Personal account payment requested",
            source="Application rule logic",
            source_type="rule_logic",
            authority=AuthorityLevel.high,
            result=VerificationResult.contradicted,
            detail="Risky payment channel.",
        ),
        EvidenceRecord(
            domain=Domain.document,
            claim="100% visa guarantee — urgent payment",
            source="Fraud-pattern RAG",
            source_type="rag_pattern",
            authority=AuthorityLevel.medium,
            result=VerificationResult.claimed,
            detail="Known fraud-pattern match.",
        ),
    ]

    statuses = aggregate_all(records)
    score, level = compute_risk_score(records, statuses)

    assert statuses["institution"][0] == "VERIFIED"
    assert statuses["agent"][0] == "CONTRADICTED"
    assert statuses["payment"][0] == "CONTRADICTED"
    assert score == 100
    assert level == "VERY_HIGH"
    assert display_status_for_risk(level, statuses, score) == ("HIGH_RISK", "🔴")


def test_low_risk_is_not_automatically_verified():
    statuses = {
        "institution": ("VERIFIED", "ok"),
        "agent": ("UNVERIFIED", "not confirmed"),
        "payment": ("UNVERIFIED", "not confirmed"),
    }
    assert display_status_for_risk("LOW", statuses, 0) == ("NEEDS_VERIFICATION", "🟡")


def test_all_declared_rule_wirings():
    records = [
        EvidenceRecord(
            domain=Domain.document,
            claim="Evidence program matches the investigation case",
            source="Document-to-case consistency check",
            source_type="consistency_rule",
            authority=AuthorityLevel.high,
            result=VerificationResult.contradicted,
            detail="Mismatch.",
        ),
        EvidenceRecord(
            domain=Domain.payment,
            claim="Evidence payment method matches the investigation case",
            source="Document-to-case consistency check",
            source_type="consistency_rule",
            authority=AuthorityLevel.high,
            result=VerificationResult.contradicted,
            detail="Mismatch.",
        ),
    ]
    statuses = aggregate_all(records)
    score, _ = compute_risk_score(records, statuses)
    # 55 from the contradicted document/program/payment-rule wiring above, plus the
    # 30 payment_contradicted floor: a contradicted payment demand can never read
    # as low risk, even when nothing else about the case was checkable.
    assert score == 85, score


def main():
    test_deterministic_core_rules()
    test_all_declared_rule_wirings()
    print("[PASS] deterministic smoke tests")


if __name__ == "__main__":
    main()
