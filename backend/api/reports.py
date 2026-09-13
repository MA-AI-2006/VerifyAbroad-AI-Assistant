"""Results endpoints.

`GET /investigations/{id}/results` is the polling endpoint the frontend uses
after a verification run; `GET /investigations/{id}/evidence-records` exposes the
per-source evidence tree so the report screen can show *why* a verdict was given.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_student_key
from api.serialize import build_payload
from database.models import EvidenceRecord, Investigation
from database.session import get_db
from schemas.report import ReportResponse

router = APIRouter(prefix="/investigations", tags=["reports"])


@router.get("/{investigation_id}/results", response_model=ReportResponse)
async def get_results(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation or investigation.student_key != student_key:
        raise HTTPException(status_code=404, detail="Investigation not found")

    report = None
    if investigation.final_report:
        from schemas.report import FinalReport

        try:
            report = FinalReport.model_validate(investigation.final_report)
        except Exception:
            report = None

    payload = await build_payload(db, investigation)
    return ReportResponse(
        investigation_id=investigation.id,
        status=investigation.status,
        structured_case=investigation.structured_case or {},
        report=report,
        overall_risk=payload.overall_risk,
        risk_score=investigation.risk_score,
        needs_reverification=bool(investigation.needs_reverification),
        investigation=payload.model_dump(),
    )


@router.get("/{investigation_id}/evidence-records")
async def list_evidence_records(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation or investigation.student_key != student_key:
        raise HTTPException(status_code=404, detail="Investigation not found")

    rows = await db.execute(
        select(EvidenceRecord)
        .where(EvidenceRecord.investigation_id == investigation_id)
        .order_by(EvidenceRecord.created_at.asc())
    )
    return {
        "records": [
            {
                "id": record.id,
                "domain": record.domain,
                "claim": record.claim,
                "source": record.source,
                "source_type": record.source_type,
                "authority": record.authority,
                "result": record.result,
                "detail": record.detail,
            }
            for record in rows.scalars().all()
        ]
    }
