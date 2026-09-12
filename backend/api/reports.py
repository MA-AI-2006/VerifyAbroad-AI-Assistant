"""Results endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from database.models import Investigation
from schemas.report import ReportResponse, FinalReport

router = APIRouter(prefix="/investigations", tags=["reports"])


@router.get("/{investigation_id}/results", response_model=ReportResponse)
async def get_results(investigation_id: str, db: AsyncSession = Depends(get_db)):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    report = FinalReport.model_validate(investigation.final_report) if investigation.final_report else None
    return ReportResponse(
        investigation_id=investigation.id,
        status=investigation.status,
        structured_case=investigation.structured_case or {},
        report=report,
    )
