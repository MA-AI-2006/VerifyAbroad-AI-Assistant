"""Pydantic schemas for the evolving investigation case, chat API and accounts.

The chat/case shapes are the backend's own contract. The `*Payload` models below
exist so the Next.js frontend can render a full screen from one response
(history list, transcript with attachments, verification report) instead of
stitching several calls together — that is what makes the deployed app work
without a database of its own.
"""
from pydantic import BaseModel, Field, field_validator

from schemas.report import FinalReport


class StructuredCase(BaseModel):
    university: str | None = Field(default=None, max_length=300)
    country: str | None = Field(default=None, max_length=120)
    program: str | None = Field(default=None, max_length=300)
    agent: str | None = Field(default=None, max_length=300)
    payment_amount: float | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str | None = Field(default=None, max_length=20)
    payment_purpose: str | None = Field(default=None, max_length=500)
    payment_method: str | None = Field(default=None, max_length=300)
    # Fields the frontend tracks but the verification pipeline does not score.
    degree_level: str | None = Field(default=None, max_length=20)
    funding_type: str | None = Field(default=None, max_length=40)
    scholarship: str | None = Field(default=None, max_length=300)
    claims: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("claims")
    @classmethod
    def clean_claims(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        return cleaned[:50]

    def is_sufficient_for_verification(self) -> bool:
        return bool(self.university and (self.agent or self.payment_amount is not None))


class AttachmentIn(BaseModel):
    """Attachment metadata sent with a chat message (files go to /evidence)."""

    kind: str = Field(default="document", max_length=40)
    label: str = Field(default="Evidence", max_length=300)
    url: str | None = Field(default=None, max_length=2000)
    mime: str | None = Field(default=None, max_length=120)
    size_bytes: int | None = Field(default=None, ge=0)
    text: str | None = Field(default=None, max_length=20000)
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("label")
    @classmethod
    def _label(cls, value: str) -> str:
        return (value or "Evidence").strip()[:300] or "Evidence"


class InvestigationCreateRequest(BaseModel):
    initial_message: str = Field(min_length=1, max_length=12000)
    language: str = Field(default="roman_urdu", max_length=20)
    title: str | None = Field(default=None, max_length=300)
    degree_level: str | None = Field(default=None, max_length=20)
    funding_type: str | None = Field(default=None, max_length=40)
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=20)

    @field_validator("initial_message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("initial_message must not be blank")
        return value


class MessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=20)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


class ContextUpdateRequest(BaseModel):
    """The student edits the investigation profile directly (authoritative)."""

    updates: dict[str, str | float | int | None] = Field(default_factory=dict)
    note: str | None = Field(default=None, max_length=2000)


class MessagePayload(BaseModel):
    id: str
    role: str  # "user" | "assistant" | "system"
    text: str
    created_at: str
    attachments: list[dict] = Field(default_factory=list)


class EvidencePayload(BaseModel):
    id: str
    kind: str
    label: str | None = None
    mime: str | None = None
    size_bytes: int | None = None
    url: str | None = None
    note: str | None = None
    analysis_status: str = "analyzed"
    extracted_data: dict | None = None
    created_at: str | None = None


class InvestigationPayload(BaseModel):
    """Everything the UI needs for one investigation screen."""

    id: str
    title: str
    language: str
    status: str
    frontend_status: str
    overall_risk: str
    risk_score: int | None = None
    ready_for_verification: bool
    needs_reverification: bool = False
    structured_case: StructuredCase
    context: dict
    messages: list[MessagePayload] = Field(default_factory=list)
    evidence: list[EvidencePayload] = Field(default_factory=list)
    report: FinalReport | None = None
    created_at: str
    updated_at: str


class InvestigationListItem(BaseModel):
    id: str
    title: str
    country: str | None = None
    degree_level: str | None = None
    program: str | None = None
    university_name: str | None = None
    overall_risk: str = "pending_more_info"
    summary: str | None = None
    status: str = "gathering"
    created_at: str
    updated_at: str
    message_count: int = 0


class InvestigationListResponse(BaseModel):
    investigations: list[InvestigationListItem] = Field(default_factory=list)


class InvestigationCreateResponse(BaseModel):
    investigation_id: str
    assistant_message: str
    structured_case: StructuredCase
    ready_for_verification: bool
    student_message: str = ""
    investigation: InvestigationPayload | None = None


class MessageResponse(BaseModel):
    assistant_message: str
    structured_case: StructuredCase
    ready_for_verification: bool
    investigation: InvestigationPayload | None = None


class ContextUpdateResponse(BaseModel):
    student_message: MessagePayload
    assistant_message: MessagePayload
    result: dict | None = None
    needs_verification: bool = True
    investigation: InvestigationPayload | None = None


class AccountProfile(BaseModel):
    name: str | None = None
    email: str | None = None
    preferred_language: str = "roman_urdu"
    degree_level: str | None = None
    target_countries: list[str] = Field(default_factory=list)
    funding_preference: str | None = None


class AuthRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)
    preferred_language: str = "roman_urdu"
    degree_level: str | None = None
    target_countries: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        return value.strip().lower()


class AuthResponse(BaseModel):
    student_key: str
    account: AccountProfile


class ProfileResponse(BaseModel):
    profile: AccountProfile
