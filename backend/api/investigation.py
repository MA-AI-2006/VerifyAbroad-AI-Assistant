"""Investigation endpoints — create, continue, list, reload and edit the case.

Contract notes for the Next.js frontend:
  * ids are opaque UUID strings, not the numeric ids the internal engine uses;
  * every mutating response also carries a full `investigation` payload, so the
    client can render a screen without extra round-trips;
  * the student's identity arrives as `X-Student-Key` (set by the Next server).
"""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_student_key
from api.serialize import apply_case_to_investigation, build_list_items, build_payload
from config import settings
from database.models import Investigation, Message
from database.session import get_db
from schemas.case import (
    ContextUpdateRequest,
    ContextUpdateResponse,
    InvestigationCreateRequest,
    InvestigationCreateResponse,
    InvestigationListResponse,
    InvestigationPayload,
    MessagePayload,
    MessageRequest,
    MessageResponse,
    StructuredCase,
)
from agents.investigator import run_investigation_turn
from api.evidence_helper import record_metadata_evidence
from api.context_edit import summarize_context_change

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/investigations", tags=["investigation"])

CLOSED_STATUSES = {"verifying", "completed", "verification_failed"}

#: frontend context field name -> StructuredCase field name
CONTEXT_FIELD_MAP = {
    "country": "country",
    "degree_level": "degree_level",
    "university": "university",
    "program": "program",
    "scholarship": "scholarship",
    "agent": "agent",
    "funding_type": "funding_type",
    "payment_amount_pkr": "payment_amount",
}


async def _run_turn_or_502(history, case, language="roman_urdu"):
    try:
        return await run_investigation_turn(history, case, language=language)
    except Exception as exc:
        logger.exception("Investigator turn failed")
        raise HTTPException(
            status_code=502,
            detail="Investigation assistant is temporarily unavailable",
        ) from exc


async def _load(db: AsyncSession, investigation_id: str, student_key: str) -> Investigation:
    investigation = await db.get(Investigation, investigation_id)
    if not investigation or investigation.student_key != student_key:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@router.post("", response_model=InvestigationCreateResponse)
async def create_investigation(
    payload: InvestigationCreateRequest,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    case = StructuredCase(
        degree_level=payload.degree_level,
        funding_type=payload.funding_type,
    )
    history = [{"role": "user", "content": payload.initial_message}]
    assistant_message, updated_case, ready = await _run_turn_or_502(
        history, case, language=payload.language
    )

    investigation = Investigation(
        student_key=student_key,
        structured_case=updated_case.model_dump(),
        language=payload.language or "roman_urdu",
        status="ready_for_verification" if ready else "in_progress",
    )
    investigation.title = (payload.title or "").strip()[:300] or None
    db.add(investigation)
    await db.flush()
    apply_case_to_investigation(investigation, updated_case.model_dump())

    user_attachments = []
    for attachment in payload.attachments:
        item = await record_metadata_evidence(
            db, investigation.id, attachment, commit=False
        )
        if item is not None:
            user_attachments.append({
                "id": item.id,
                "kind": item.evidence_type,
                "label": item.label,
                "mime": item.mime,
                "size_bytes": item.size_bytes,
                "url": item.url,
                "analysis_status": item.analysis_status,
                "note": item.note,
            })

    db.add(Message(investigation_id=investigation.id, role="user", content=payload.initial_message,
                   attachments=user_attachments))
    db.add(Message(investigation_id=investigation.id, role="assistant", content=assistant_message))
    await db.commit()

    return InvestigationCreateResponse(
        investigation_id=investigation.id,
        assistant_message=assistant_message,
        structured_case=updated_case,
        ready_for_verification=ready,
        student_message=payload.initial_message,
        investigation=await build_payload(db, investigation),
    )


@router.get("", response_model=InvestigationListResponse)
async def list_investigations(
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
    limit: int = Query(default=50, ge=1, le=200),
):
    return InvestigationListResponse(
        investigations=await build_list_items(db, student_key, limit=limit)
    )


@router.get("/{investigation_id}", response_model=InvestigationPayload)
async def get_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    investigation = await _load(db, investigation_id, student_key)
    return await build_payload(db, investigation)


@router.post("/{investigation_id}/messages", response_model=MessageResponse)
async def continue_investigation(
    investigation_id: str,
    payload: MessageRequest,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    investigation = await _load(db, investigation_id, student_key)
    if investigation.status in CLOSED_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Chat is closed while status={investigation.status}. Start a new investigation or re-run verification.",
        )

    rows = await db.execute(
        select(Message)
        .where(Message.investigation_id == investigation_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
    )
    history = [{"role": m.role, "content": m.content} for m in rows.scalars().all()]
    if history and history[-1]["content"].strip() == payload.message.strip():
        history = history[:-1]
    history.append({"role": "user", "content": payload.message})
    history = history[-settings.max_chat_messages:]

    current_case = StructuredCase.model_validate(investigation.structured_case or {})
    assistant_message, updated_case, ready = await _run_turn_or_502(
        history, current_case, language=investigation.language
    )

    attachments = []
    for attachment in payload.attachments:
        item = await record_metadata_evidence(db, investigation_id, attachment, commit=False)
        if item is not None:
            attachments.append({
                "id": item.id,
                "kind": item.evidence_type,
                "label": item.label,
                "mime": item.mime,
                "size_bytes": item.size_bytes,
                "url": item.url,
                "analysis_status": item.analysis_status,
                "note": item.note,
            })

    db.add(Message(investigation_id=investigation_id, role="user", content=payload.message,
                   attachments=attachments))
    db.add(Message(investigation_id=investigation_id, role="assistant", content=assistant_message))
    apply_case_to_investigation(investigation, updated_case.model_dump())
    investigation.status = "ready_for_verification" if ready else "in_progress"
    await db.commit()

    return MessageResponse(
        assistant_message=assistant_message,
        structured_case=updated_case,
        ready_for_verification=ready,
        investigation=await build_payload(db, investigation),
    )


@router.post("/{investigation_id}/context", response_model=ContextUpdateResponse)
async def update_context(
    investigation_id: str,
    payload: ContextUpdateRequest,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    """Manual edits to the investigation profile always win over the chat."""
    investigation = await _load(db, investigation_id, student_key)
    if not payload.updates:
        raise HTTPException(status_code=400, detail="No updates supplied")

    current_case = StructuredCase.model_validate(investigation.structured_case or {})
    changes: dict[str, tuple[object, object]] = {}
    updates = {}
    for raw_field, value in payload.updates.items():
        field = CONTEXT_FIELD_MAP.get(raw_field)
        if field is None:
            continue
        if field == "payment_amount":
            try:
                value = float(value) if value not in (None, "") else None
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="Payment amount must be a number")
        elif value is not None:
            value = str(value).strip()[:300] or None
        previous = getattr(current_case, field)
        if previous != value:
            changes[raw_field] = (previous, value)
        updates[field] = value

    updated_case = current_case.model_copy(update=updates)
    ready = updated_case.is_sufficient_for_verification()
    # A completed case keeps its stored report but is flagged as stale, so the UI
    # can show "details changed — re-run verification" instead of losing the verdict.
    was_completed = investigation.status == "completed"
    if not was_completed:
        investigation.status = "ready_for_verification" if ready else "in_progress"
    apply_case_to_investigation(investigation, updated_case.model_dump())
    if was_completed and changes:
        investigation.needs_reverification = True

    note = (payload.note or "").strip()
    student_text = note or summarize_context_change(changes)
    assistant_text = (
        "Thanks — I have updated your investigation profile. "
        + ("Run verification again so the report matches these details."
           if changes and investigation.status == "completed"
           else ("You have enough for a full check: run verification when ready."
                 if ready else "I still need a few details before we can verify."))
    )

    student_message = Message(investigation_id=investigation_id, role="user", content=student_text)
    assistant_message_row = Message(investigation_id=investigation_id, role="assistant",
                                    content=assistant_text)
    db.add_all([student_message, assistant_message_row])
    await db.commit()

    return ContextUpdateResponse(
        student_message=MessagePayload(
            id=student_message.id, role="user", text=student_text,
            created_at=student_message.created_at.isoformat(),
        ),
        assistant_message=MessagePayload(
            id=assistant_message_row.id, role="assistant", text=assistant_text,
            created_at=assistant_message_row.created_at.isoformat(),
        ),
        result=None,
        needs_verification=bool(changes),
        investigation=await build_payload(db, investigation),
    )
