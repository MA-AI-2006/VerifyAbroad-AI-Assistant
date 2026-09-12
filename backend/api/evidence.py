import io
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database.session import get_db
from database.models import Investigation, EvidenceItem
from schemas.evidence import EvidenceUploadResponse
from agents.document_parser import parse_file_evidence, parse_text_evidence
from storage.base import save_file, delete_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/investigations", tags=["evidence"])
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"}


def _validate_file_bytes(contents: bytes, mime: str) -> None:
    if mime == "application/pdf":
        if not contents.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Invalid PDF file")
        return
    if mime in ALLOWED_IMAGE_MIME:
        try:
            with Image.open(io.BytesIO(contents)) as image:
                image.verify()
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid image file") from exc
        return
    raise HTTPException(status_code=400, detail="Supported files: JPEG, PNG, WEBP, GIF, BMP, TIFF, and PDF")


@router.post("/{investigation_id}/evidence", response_model=EvidenceUploadResponse)
async def upload_evidence(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if investigation.status in {"verifying", "completed", "verification_failed"}:
        raise HTTPException(status_code=409, detail=f"Evidence cannot be added while status={investigation.status}")
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide either file or text evidence")
    if file and text:
        raise HTTPException(status_code=400, detail="Provide either file or text, not both")

    try:
        if file:
            mime = (file.content_type or "").lower()
            contents = await file.read(settings.max_upload_bytes + 1)
            if len(contents) > settings.max_upload_bytes:
                raise HTTPException(status_code=413, detail="Evidence file is too large")
            _validate_file_bytes(contents, mime)
            extracted = await parse_file_evidence(contents, mime)
            path = await save_file(investigation_id, file.filename or "evidence", contents)
            evidence_type = "document" if mime == "application/pdf" else "image"
            raw_text = None
        else:
            text = (text or "").strip()
            if not text:
                raise HTTPException(status_code=400, detail="text evidence must not be blank")
            if len(text) > settings.max_evidence_text_chars:
                raise HTTPException(status_code=413, detail="Text evidence is too long")
            extracted = await parse_text_evidence(text)
            path = None
            evidence_type = "text"
            raw_text = text
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Evidence extraction/storage failed for investigation=%s", investigation_id)
        raise HTTPException(status_code=502, detail="Evidence processing is temporarily unavailable") from exc

    item = EvidenceItem(
        investigation_id=investigation_id,
        evidence_type=evidence_type,
        file_path=path,
        raw_text=raw_text,
        extracted_data=extracted.model_dump(),
    )
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
    except Exception as exc:
        await db.rollback()
        if path:
            try:
                await delete_file(path)
            except Exception:
                logger.exception("Evidence cleanup after DB failure also failed: path=%s", path)
        logger.exception("Evidence database commit failed for investigation=%s", investigation_id)
        raise HTTPException(status_code=503, detail="Evidence could not be saved") from exc
    return EvidenceUploadResponse(
        evidence_id=item.id,
        evidence_type=evidence_type,
        extracted_data=extracted.model_dump(),
    )
