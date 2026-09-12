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


class ReportResponse(BaseModel):
    investigation_id: str
    status: str
    structured_case: dict
    report: FinalReport | None = None
