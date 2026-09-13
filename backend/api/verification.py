"""The explicit verification step.

This is the only place a risk score is produced. Chat turns never score anything;
this endpoint runs the institution/agent/payment/document sources, aggregates them
deterministically, and stores the report on the investigation.
"""
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_student_key
from api.serialize import build_payload, risk_to_frontend
from database.models import Investigation, EvidenceRecord as EvidenceRecordModel, EvidenceItem
from database.session import get_db
from schemas.case import StructuredCase
from schemas.report import FinalReport
from schemas.verification import VerificationRunResponse
from verification.institution import verify_institution
from verification.agent import verify_agent
from verification.payment import verify_payment
from verification.document import (
    check_payment_deadline_urgency,
    check_intake_date_validity,
    cross_check_extracted_claims,
)
from risk.aggregator import aggregate_all
from risk.risk_engine import compute_risk_score, display_status_for_risk
from agents.final_analyst import generate_final_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/investigations", tags=["verification"])


def _completed_response(investigation: Investigation, stored: FinalReport, evidence_count: int) -> VerificationRunResponse:
    domain_statuses = {
        domain["domain"]: (domain["status"], domain.get("summary", ""))
        for domain in [entry.model_dump() for entry in stored.domains]
    }
    display_status, display_emoji = stored.display_status, stored.display_emoji
    if not display_status:
        display_status, display_emoji = display_status_for_risk(stored.risk_level, domain_statuses, stored.risk_score)
    return VerificationRunResponse(
        investigation_id=investigation.id,
        status="completed",
        evidence_count=evidence_count,
        risk_score=stored.risk_score,
        risk_level=stored.risk_level,
        display_status=display_status,
        display_emoji=display_emoji,
    )


async def _stored_report(db: AsyncSession, investigation: Investigation) -> VerificationRunResponse | None:
    if investigation.status != "completed" or not investigation.final_report:
        return None
    stored = FinalReport.model_validate(investigation.final_report)
    count = await db.scalar(
        select(func.count(EvidenceRecordModel.id)).where(
            EvidenceRecordModel.investigation_id == investigation.id
        )
    )
    return _completed_response(investigation, stored, int(count or 0))


@router.post("/{investigation_id}/verify", response_model=VerificationRunResponse)
async def run_verification(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
    force: bool = False,
):
    """Run (or re-run) verification. A completed run returns the stored report
    unless `force=true`, which is what the UI uses after a profile edit."""
    investigation = await db.get(Investigation, investigation_id)
    if not investigation or investigation.student_key != student_key:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if not force:
        cached = await _stored_report(db, investigation)
        if cached is not None:
            return cached

    if investigation.status == "verifying":
        raise HTTPException(status_code=409, detail="Verification is already running")

    case = StructuredCase.model_validate(investigation.structured_case or {})
    if not case.is_sufficient_for_verification():
        raise HTTPException(
            status_code=400,
            detail=(
                "Not ready for verification yet: I need the university plus either the consultant "
                "or a payment amount before running the checks."
            ),
        )

    # Serialize concurrent runs of the same case on Postgres. SQLite ignores
    # FOR UPDATE but the status check above still protects sequential requests.
    locked = await db.execute(
        select(Investigation).where(Investigation.id == investigation_id).with_for_update()
    )
    investigation = locked.scalar_one()
    if not force:
        cached = await _stored_report(db, investigation)
        if cached is not None:
            return cached
    if investigation.status == "verifying":
        raise HTTPException(status_code=409, detail="Verification is already running")

    investigation.status = "verifying"
    await db.commit()

    try:
        rows = await db.execute(
            select(EvidenceItem)
            .where(EvidenceItem.investigation_id == investigation_id)
            .order_by(EvidenceItem.created_at.asc(), EvidenceItem.id.asc())
        )
        evidence_items = list(rows.scalars().all())
        extracted_documents = [item.extracted_data for item in evidence_items if item.extracted_data]

        institution_records, agent_records, payment_records = await asyncio.gather(
            verify_institution(case.university, case.country),
            verify_agent(case.agent, case.university, case.country),
            verify_payment(case.university, case.program, case.country, case.payment_method, case.payment_purpose),
        )

        domain_precheck = aggregate_all([*institution_records, *agent_records, *payment_records])
        document_records: list = []
        for extracted in extracted_documents:
            document_records.extend([
                check_payment_deadline_urgency(extracted.get("payment_deadline")),
                check_intake_date_validity(extracted.get("intake")),
                *cross_check_extracted_claims(extracted, case, domain_precheck),
            ])

        all_records = [*institution_records, *agent_records, *payment_records, *document_records]
        domain_statuses = aggregate_all(all_records)
        risk_score, risk_level = compute_risk_score(all_records, domain_statuses)
        final_report = await generate_final_report(
            case.model_dump(), all_records, domain_statuses, risk_score, risk_level
        )

        # Replace any previous run's records so a re-run does not double-count.
        await db.execute(
            EvidenceRecordModel.__table__.delete().where(
                EvidenceRecordModel.investigation_id == investigation_id
            )
        )
        for record in all_records:
            db.add(EvidenceRecordModel(
                investigation_id=investigation_id,
                domain=record.domain.value,
                claim=record.claim,
                source=record.source,
                source_type=record.source_type,
                authority=record.authority.value,
                result=record.result.value,
                detail=record.detail,
                raw_response=record.raw_response,
            ))

        display_status, display_emoji = display_status_for_risk(risk_level, domain_statuses, risk_score)
        final_report.display_status = display_status
        final_report.display_emoji = display_emoji

        investigation.risk_score = risk_score
        investigation.risk_level = risk_level
        investigation.overall_risk = risk_to_frontend(risk_level)
        investigation.final_report = final_report.model_dump()
        investigation.summary = final_report.recommendation[:2000]
        investigation.status = "completed"
        investigation.needs_reverification = False
        await db.commit()

    except Exception as exc:
        logger.exception("Verification pipeline failed for investigation=%s", investigation_id)
        await db.rollback()
        investigation = await db.get(Investigation, investigation_id)
        if investigation:
            investigation.status = "verification_failed"
            await db.commit()
        raise HTTPException(
            status_code=502,
            detail="Verification could not be completed; no partial result was saved. You can run it again.",
        ) from exc

    return VerificationRunResponse(
        investigation_id=investigation_id,
        status="completed",
        evidence_count=len(all_records),
        risk_score=risk_score,
        risk_level=risk_level,
        display_status=display_status,
        display_emoji=display_emoji,
    )
