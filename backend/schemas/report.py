from pydantic import BaseModel, Field
from schemas.verification import DomainSummary


class ManualCheck(BaseModel):
    name: str
    url: str
    reason: str


class FinalReport(BaseModel):
    risk_level: str
    risk_score: int
    display_status: str = "NEEDS_VERIFICATION"
    display_emoji: str = "🟡"
    domains: list[DomainSummary]
    fraud_signals: list[str] = Field(default_factory=list)
    recommendation: str
    safer_action: str
    manual_checks: list[ManualCheck] = Field(default_factory=list)
    #: True when the narrative was produced by the deterministic fallback
    #: (no LLM key configured, or every provider failed). Surfaced in the UI as
    #: an honest "rule-based summary" label rather than pretending it was LLM text.
    narrative_source: str = "llm"
    #: Sources that could not be consulted (no key / network failure), so the
    #: report never reads as "everything checked out".
    unavailable_sources: list[str] = Field(default_factory=list)


class ReportResponse(BaseModel):
    investigation_id: str
    status: str
    structured_case: dict
    report: FinalReport | None = None
    overall_risk: str = "pending_more_info"
    risk_score: int | None = None
    needs_reverification: bool = False
    #: Full InvestigationPayload (transcript, evidence, context) as a plain dict,
    #: so one call is enough to re-render the whole screen.
    investigation: dict | None = None
