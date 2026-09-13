"""Serializers that turn ORM rows into the frontend-friendly payloads.

Kept in one place so `GET /investigations/{id}`, `POST .../messages`,
`POST .../verify` and the history list all describe a case identically.
"""
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import EvidenceItem, Investigation, Message
from schemas.case import (
    EvidencePayload,
    InvestigationListItem,
    InvestigationPayload,
    MessagePayload,
)
from schemas.report import FinalReport

#: backend status -> frontend status ("gathering" | "assessed")
FRONTEND_STATUS = {
    "in_progress": "gathering",
    "ready_for_verification": "gathering",
    "verifying": "gathering",
    "completed": "assessed",
    "verification_failed": "gathering",
}

RISK_LEVEL_TO_FRONTEND = {
    "LOW": "low",
    "MEDIUM": "medium",
    "HIGH": "high",
    "VERY_HIGH": "high",
}


def _iso(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        return value.isoformat() + "Z"
    return value.isoformat()


def risk_to_frontend(risk_level: str | None) -> str:
    return RISK_LEVEL_TO_FRONTEND.get((risk_level or "").upper(), "pending_more_info")


def case_context(case: dict | None) -> dict:
    """The flat context snapshot the frontend investigation profile renders."""
    case = case or {}
    return {
        "country": case.get("country"),
        "degree_level": case.get("degree_level"),
        "university": case.get("university"),
        "program": case.get("program"),
        "funding_type": case.get("funding_type"),
        "scholarship": case.get("scholarship"),
        "agent": case.get("agent"),
        "payment_amount_pkr": case.get("payment_amount"),
    }


def apply_case_to_investigation(investigation: Investigation, case: dict) -> None:
    """Mirror the case fields the history/list UI sorts and renders on."""
    investigation.structured_case = case
    investigation.country = case.get("country")
    investigation.degree_level = case.get("degree_level")
    investigation.program_name = case.get("program")
    investigation.university_name = case.get("university")
    investigation.scholarship_name = case.get("scholarship")
    investigation.agent_name = case.get("agent")
    investigation.funding_type = case.get("funding_type")
    amount = case.get("payment_amount")
    investigation.payment_amount = float(amount) if isinstance(amount, (int, float)) else None


def derive_title(investigation: Investigation) -> str:
    if investigation.title:
        return investigation.title
    parts = [
        investigation.university_name or "New investigation",
        investigation.country,
        investigation.degree_level,
    ]
    return " — ".join(part for part in parts if part)


async def build_payload(
    db: AsyncSession,
    investigation: Investigation,
    *,
    include_report: bool = True,
) -> InvestigationPayload:
    from schemas.case import StructuredCase

    case = StructuredCase.model_validate(investigation.structured_case or {})

    message_rows = (
        await db.execute(
            select(Message)
            .where(Message.investigation_id == investigation.id)
            .order_by(Message.created_at.asc(), Message.id.asc())
        )
    ).scalars().all()

    evidence_rows = (
        await db.execute(
            select(EvidenceItem)
            .where(EvidenceItem.investigation_id == investigation.id)
            .order_by(EvidenceItem.created_at.asc(), EvidenceItem.id.asc())
        )
    ).scalars().all()

    report: FinalReport | None = None
    if include_report and investigation.final_report:
        try:
            report = FinalReport.model_validate(investigation.final_report)
        except Exception:  # a stored report from an older schema must not break the screen
            report = None

    return InvestigationPayload(
        id=investigation.id,
        title=derive_title(investigation),
        language=investigation.language or "roman_urdu",
        status=investigation.status,
        frontend_status=FRONTEND_STATUS.get(investigation.status, "gathering"),
        overall_risk=investigation.overall_risk or risk_to_frontend(investigation.risk_level),
        risk_score=investigation.risk_score,
        ready_for_verification=case.is_sufficient_for_verification(),
        needs_reverification=bool(investigation.needs_reverification),
        structured_case=case,
        context=case_context(investigation.structured_case),
        messages=[
            MessagePayload(
                id=message.id,
                role=message.role,
                text=message.content,
                created_at=_iso(message.created_at),
                attachments=list(message.attachments or []),
            )
            for message in message_rows
        ],
        evidence=[
            EvidencePayload(
                id=item.id,
                kind=item.evidence_type,
                label=item.label or item.evidence_type.title(),
                mime=item.mime,
                size_bytes=item.size_bytes,
                url=item.url,
                note=item.note,
                analysis_status=item.analysis_status or "analyzed",
                extracted_data=item.extracted_data,
                created_at=_iso(item.created_at),
            )
            for item in evidence_rows
        ],
        report=report,
        created_at=_iso(investigation.created_at),
        updated_at=_iso(investigation.updated_at),
    )


async def build_list_items(
    db: AsyncSession, student_key: str, limit: int = 50
) -> list[InvestigationListItem]:
    rows = (
        await db.execute(
            select(Investigation)
            .where(Investigation.student_key == student_key)
            .order_by(Investigation.updated_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    if not rows:
        return []

    counts = dict(
        (
            await db.execute(
                select(Message.investigation_id, func.count(Message.id))
                .where(Message.investigation_id.in_([row.id for row in rows]))
                .group_by(Message.investigation_id)
            )
        ).all()
    )

    items: list[InvestigationListItem] = []
    for row in rows:
        items.append(
            InvestigationListItem(
                id=row.id,
                title=derive_title(row),
                country=row.country,
                degree_level=row.degree_level,
                program=row.program_name,
                university_name=row.university_name,
                overall_risk=row.overall_risk or risk_to_frontend(row.risk_level),
                summary=row.summary,
                status=FRONTEND_STATUS.get(row.status, "gathering"),
                created_at=_iso(row.created_at),
                updated_at=_iso(row.updated_at),
                message_count=int(counts.get(row.id, 0)),
            )
        )
    return items


def attachment_from_evidence(item: EvidenceItem) -> dict:
    return {
        "id": item.id,
        "kind": item.evidence_type,
        "label": item.label or item.evidence_type.title(),
        "mime": item.mime,
        "size_bytes": item.size_bytes,
        "url": item.url,
        "analysis_status": item.analysis_status or "analyzed",
        "note": item.note,
    }
