"""Investigation chat endpoints - create and continue multi-turn cases."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database.session import get_db
from database.models import Investigation, Message
from schemas.case import (
    StructuredCase,
    InvestigationCreateRequest,
    InvestigationCreateResponse,
    MessageRequest,
    MessageResponse,
)
from agents.investigator import run_investigation_turn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/investigations", tags=["investigation"])


async def _run_turn_or_502(history, case):
    try:
        return await run_investigation_turn(history, case)
    except Exception as exc:
        logger.exception("Investigator LLM pipeline failed")
        raise HTTPException(status_code=502, detail="Investigation assistant is temporarily unavailable") from exc


@router.post("", response_model=InvestigationCreateResponse)
async def create_investigation(payload: InvestigationCreateRequest, db: AsyncSession = Depends(get_db)):
    investigation = Investigation(structured_case={})
    db.add(investigation)
    await db.flush()

    history = [{"role": "user", "content": payload.initial_message}]
    assistant_message, updated_case, ready = await _run_turn_or_502(history, StructuredCase())

    db.add(Message(investigation_id=investigation.id, role="user", content=payload.initial_message))
    db.add(Message(investigation_id=investigation.id, role="assistant", content=assistant_message))
    investigation.structured_case = updated_case.model_dump()
    investigation.status = "ready_for_verification" if ready else "in_progress"

    await db.commit()
    return InvestigationCreateResponse(
        investigation_id=investigation.id,
        assistant_message=assistant_message,
        structured_case=updated_case,
        ready_for_verification=ready,
    )


@router.post("/{investigation_id}/messages", response_model=MessageResponse)
async def continue_investigation(investigation_id: str, payload: MessageRequest, db: AsyncSession = Depends(get_db)):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if investigation.status in {"verifying", "completed", "verification_failed"}:
        raise HTTPException(status_code=409, detail=f"Investigation cannot accept new chat messages while status={investigation.status}")

    result = await db.execute(
        select(Message)
        .where(Message.investigation_id == investigation_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in messages]
    history.append({"role": "user", "content": payload.message})
    history = history[-settings.max_chat_messages:]

    current_case = StructuredCase.model_validate(investigation.structured_case or {})
    assistant_message, updated_case, ready = await _run_turn_or_502(history, current_case)

    db.add(Message(investigation_id=investigation_id, role="user", content=payload.message))
    db.add(Message(investigation_id=investigation_id, role="assistant", content=assistant_message))
    investigation.structured_case = updated_case.model_dump()
    investigation.status = "ready_for_verification" if ready else "in_progress"
    await db.commit()

    return MessageResponse(
        assistant_message=assistant_message,
        structured_case=updated_case,
        ready_for_verification=ready,
    )
