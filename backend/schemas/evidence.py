"""Pydantic schemas for extracted evidence and normalized verification records."""
from enum import Enum
from pydantic import BaseModel, Field


class AuthorityLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class VerificationResult(str, Enum):
    verified = "verified"
    not_found = "not_found"
    claimed = "claimed"
    contradicted = "contradicted"
    unable_to_verify = "unable_to_verify"


class Domain(str, Enum):
    institution = "institution"
    agent = "agent"
    payment = "payment"
    document = "document"


class EvidenceRecord(BaseModel):
    domain: Domain
    claim: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=300)
    source_type: str = Field(min_length=1, max_length=100)
    authority: AuthorityLevel
    result: VerificationResult
    detail: str | None = Field(default=None, max_length=5000)
    raw_response: dict | None = None


class EvidenceUploadResponse(BaseModel):
    evidence_id: str
    evidence_type: str
    extracted_data: dict


class ExtractedDocumentClaims(BaseModel):
    source_type: str | None = Field(default=None, max_length=100)
    university: str | None = Field(default=None, max_length=300)
    agent_name: str | None = Field(default=None, max_length=300)
    program: str | None = Field(default=None, max_length=300)
    student_name: str | None = Field(default=None, max_length=300)
    application_id: str | None = Field(default=None, max_length=200)
    claims: list[str] = Field(default_factory=list, max_length=50)
    payment_amount: float | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str | None = Field(default=None, max_length=20)
    payment_deadline: str | None = Field(default=None, max_length=200)
    payment_method: str | None = Field(default=None, max_length=300)
    payment_url: str | None = Field(default=None, max_length=2000)
    intake: str | None = Field(default=None, max_length=200)
    issue_date: str | None = Field(default=None, max_length=200)
