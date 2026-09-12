import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from database.models import Investigation, EvidenceRecord as EvidenceRecordModel, EvidenceItem
from schemas.case import StructuredCase
from schemas.verification import VerificationRunResponse
from verification.institution import verify_institution
from verification.agent import verify_agent
from verification.payment import verify_payment
from verification.document import check_payment_deadline_urgency, check_intake_date_validity, cross_check_extracted_claims
from risk.aggregator import aggregate_all
from risk.risk_engine import compute_risk_score, display_status_for_risk
from agents.final_analyst import generate_final_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/investigations", tags=["verification"])


@router.post("/{investigation_id}/verify", response_model=VerificationRunResponse)
async def run_verification(investigation_id: str, db: AsyncSession = Depends(get_db)):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if investigation.status == "completed" and investigation.final_report:
        from schemas.report import FinalReport
        stored_report = FinalReport.model_validate(investigation.final_report)
        evidence_result = await db.execute(
            select(EvidenceRecordModel.id).where(EvidenceRecordModel.investigation_id == investigation_id)
        )
        return VerificationRunResponse(
            investigation_id=investigation_id,
            status="completed",
            evidence_count=len(evidence_result.scalars().all()),
            risk_score=stored_report.risk_score,
            risk_level=stored_report.risk_level,
            display_status=stored_report.display_status,
            display_emoji=stored_report.display_emoji,
        )
    if investigation.status == "verifying":
        raise HTTPException(status_code=409, detail="Verification is already running")
    if investigation.status == "verification_failed":
        # Allow a clean retry from the last saved case/evidence.
        logger.info("Retrying failed verification investigation=%s", investigation_id)

    case = StructuredCase.model_validate(investigation.structured_case or {})
    if not case.is_sufficient_for_verification():
        raise HTTPException(status_code=400, detail="Investigation is not ready for verification; gather university plus agent or payment information first")

    # Serialize verification runs for the same case on production Postgres. SQLite ignores
    # FOR UPDATE but the status check still protects ordinary sequential requests.
    locked_result = await db.execute(
        select(Investigation).where(Investigation.id == investigation_id).with_for_update()
    )
    investigation = locked_result.scalar_one()
    if investigation.status == "completed" and investigation.final_report:
        from schemas.report import FinalReport
        stored_report = FinalReport.model_validate(investigation.final_report)
        evidence_result = await db.execute(
            select(EvidenceRecordModel.id).where(EvidenceRecordModel.investigation_id == investigation_id)
        )
        return VerificationRunResponse(
            investigation_id=investigation_id, status="completed",
            evidence_count=len(evidence_result.scalars().all()),
            risk_score=stored_report.risk_score, risk_level=stored_report.risk_level,
            display_status=stored_report.display_status, display_emoji=stored_report.display_emoji,
        )
    if investigation.status == "verifying":
        raise HTTPException(status_code=409, detail="Verification is already running")

    investigation.status = "verifying"
    await db.commit()

    try:
        result = await db.execute(
            select(EvidenceItem)
            .where(EvidenceItem.investigation_id == investigation_id)
            .order_by(EvidenceItem.created_at.asc())
        )
        evidence_items = list(result.scalars().all())
        extracted_documents = [item.extracted_data for item in evidence_items if item.extracted_data]

        institution_records, agent_records, payment_records = await asyncio.gather(
            verify_institution(case.university, case.country),
            verify_agent(case.agent, case.university, case.country),
            verify_payment(case.university, case.program, case.country, case.payment_method, case.payment_purpose),
        )

        domain_precheck = aggregate_all([*institution_records, *agent_records, *payment_records])
        document_records = []
        for extracted in extracted_documents:
            document_records.extend([
                check_payment_deadline_urgency(extracted.get("payment_deadline")),
                check_intake_date_validity(extracted.get("intake")),
                *cross_check_extracted_claims(extracted, case, domain_precheck),
            ])

        all_records = [*institution_records, *agent_records, *payment_records, *document_records]
        domain_statuses = aggregate_all(all_records)
        risk_score, risk_level = compute_risk_score(all_records, domain_statuses)
        final_report = await generate_final_report(case.model_dump(), all_records, domain_statuses, risk_score, risk_level)

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

        investigation.risk_score = risk_score
        investigation.risk_level = risk_level
        investigation.final_report = final_report.model_dump()
        investigation.status = "completed"
        await db.commit()

    except Exception as exc:
        logger.exception("Verification pipeline failed for investigation=%s", investigation_id)
        await db.rollback()
        investigation = await db.get(Investigation, investigation_id)
        if investigation:
            investigation.status = "verification_failed"
            await db.commit()
        raise HTTPException(status_code=502, detail="Verification pipeline failed; no partial verification result was committed") from exc

    display_status, display_emoji = display_status_for_risk(risk_level, domain_statuses, risk_score)
    return VerificationRunResponse(
        investigation_id=investigation_id,
        status="completed",
        evidence_count=len(all_records),
        risk_score=risk_score,
        risk_level=risk_level,
        display_status=display_status,
        display_emoji=display_emoji,
    )
