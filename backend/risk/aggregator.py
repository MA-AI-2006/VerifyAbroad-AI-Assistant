"""
Evidence aggregator.

Takes all EvidenceRecords for a case and, per domain, determines an overall
domain status using authority-weighted logic - so a low-authority "claimed"
(e.g. agent's own website) never overrides a high-authority "not_found" or
"contradicted" from an official source.
"""
from collections import defaultdict
from schemas.evidence import EvidenceRecord

AUTHORITY_WEIGHT = {"high": 3, "medium": 2, "low": 1}

DOMAIN_STATUS_VERIFIED = "VERIFIED"
DOMAIN_STATUS_UNVERIFIED = "UNVERIFIED"
DOMAIN_STATUS_CONTRADICTED = "CONTRADICTED"
DOMAIN_STATUS_SUSPICIOUS = "SUSPICIOUS"
DOMAIN_STATUS_UNABLE = "UNABLE_TO_VERIFY"


def aggregate_domain(records: list[EvidenceRecord]) -> tuple[str, str]:
    """
    Returns (status, summary_text) for one domain, given all its evidence records.

    Logic:
    - Any high-authority "contradicted" -> CONTRADICTED (strongest negative signal)
    - Any high-authority "verified" AND no contradictions -> VERIFIED
    - Only low/medium-authority "claimed" with no independent confirmation -> SUSPICIOUS
    - Mixed / no strong signal either way -> UNVERIFIED
    - No usable evidence at all -> UNABLE_TO_VERIFY
    """
    if not records:
        return DOMAIN_STATUS_UNABLE, "No evidence was available to check this domain."

    high_contradicted = [r for r in records if r.authority == "high" and r.result == "contradicted"]
    high_verified = [r for r in records if r.authority == "high" and r.result == "verified"]
    any_claimed_only = all(r.result in ("claimed", "unable_to_verify", "not_found") for r in records)

    if high_contradicted:
        details = "; ".join(r.detail or r.claim for r in high_contradicted)
        return DOMAIN_STATUS_CONTRADICTED, details

    if high_verified and not any(r.result == "contradicted" for r in records):
        details = "; ".join(r.detail or r.claim for r in high_verified)
        return DOMAIN_STATUS_VERIFIED, details

    if any_claimed_only and any(r.result == "claimed" for r in records):
        details = "; ".join(r.detail or r.claim for r in records if r.result == "claimed")
        return DOMAIN_STATUS_SUSPICIOUS, f"Only unverified claims found: {details}"

    if all(r.result in ("not_found", "unable_to_verify") for r in records):
        return DOMAIN_STATUS_UNABLE, "Available sources could not confirm or deny this."

    return DOMAIN_STATUS_UNVERIFIED, "Evidence is mixed or inconclusive."


def aggregate_all(records: list[EvidenceRecord]) -> dict[str, tuple[str, str]]:
    """Groups records by domain and returns {domain: (status, summary)}."""
    by_domain: dict[str, list[EvidenceRecord]] = defaultdict(list)
    for r in records:
        domain_key = r.domain.value if hasattr(r.domain, "value") else str(r.domain)
        by_domain[domain_key].append(r)

    return {domain: aggregate_domain(recs) for domain, recs in by_domain.items()}
