"""Pydantic schemas for the evolving investigation case and chat API."""
from pydantic import BaseModel, Field, field_validator


class StructuredCase(BaseModel):
    university: str | None = Field(default=None, max_length=300)
    country: str | None = Field(default=None, max_length=120)
    program: str | None = Field(default=None, max_length=300)
    agent: str | None = Field(default=None, max_length=300)
    payment_amount: float | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str | None = Field(default=None, max_length=20)
    payment_purpose: str | None = Field(default=None, max_length=500)
    payment_method: str | None = Field(default=None, max_length=300)
    claims: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("claims")
    @classmethod
    def clean_claims(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        return cleaned[:50]

    def is_sufficient_for_verification(self) -> bool:
        return bool(self.university and (self.agent or self.payment_amount is not None))


class InvestigationCreateRequest(BaseModel):
    initial_message: str = Field(min_length=1, max_length=12000)

    @field_validator("initial_message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("initial_message must not be blank")
        return value


class InvestigationCreateResponse(BaseModel):
    investigation_id: str
    assistant_message: str
    structured_case: StructuredCase
    ready_for_verification: bool


class MessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


class MessageResponse(BaseModel):
    assistant_message: str
    structured_case: StructuredCase
    ready_for_verification: bool
