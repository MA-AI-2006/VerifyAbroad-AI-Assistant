"""Evidence intake: uploaded files, pasted text, and submitted links.

Files are validated (magic bytes / image verify), parsed into structured claims,
then stored. The response carries an `attachment` object in the shape the
frontend chat UI renders, plus the extracted claims so the student can see what
was actually read out of their document.
"""
import io
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_student_key
from api.evidence_helper import record_metadata_evidence
from api.serialize import attachment_from_evidence
from config import settings
from database.models import Investigation, EvidenceItem
from database.session import get_db
from schemas.case import AttachmentIn
from schemas.evidence import EvidenceUploadResponse
from agents.document_parser import parse_file_evidence, parse_text_evidence
from storage.base import save_file, delete_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/investigations", tags=["evidence"])
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"}
TEXTUAL_MIME = {"text/plain", "text/markdown", "text/html", "message/rfc822", "text/csv", "application/json"}
CLOSED_STATUSES = {"verifying", "completed", "verification_failed"}


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
    if mime in TEXTUAL_MIME:
        return
    raise HTTPException(
        status_code=400,
        detail="Supported files: JPEG, PNG, WEBP, GIF, BMP, TIFF, PDF, and plain text",
    )


def _kind_for(mime: str, filename: str) -> str:
    if mime.startswith("image/"):
        return "image"
    if mime == "application/pdf" or mime in TEXTUAL_MIME:
        return "document"
    if filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic")):
        return "image"
    return "document"


async def _get_open_investigation(db: AsyncSession, investigation_id: str, student_key: str) -> Investigation:
    investigation = await db.get(Investigation, investigation_id)
    if not investigation or investigation.student_key != student_key:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if investigation.status in CLOSED_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Evidence cannot be added while status={investigation.status}",
        )
    return investigation


@router.post("/{investigation_id}/evidence", response_model=EvidenceUploadResponse)
async def upload_evidence(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    url: str | None = Form(default=None),
    label: str | None = Form(default=None),
    note: str | None = Form(default=None),
    student_key: str = Depends(get_student_key),
):
    investigation = await _get_open_investigation(db, investigation_id, student_key)
    provided = [bool(file), bool(text and text.strip()), bool(url and url.strip())]
    if sum(provided) == 0:
        raise HTTPException(status_code=400, detail="Provide a file, text or link evidence")
    if sum(provided) > 1:
        raise HTTPException(status_code=400, detail="Provide only one of file, text or link")

    try:
        if file:
            mime = (file.content_type or "").lower()
            contents = await file.read(settings.max_upload_bytes + 1)
            if len(contents) > settings.max_upload_bytes:
                raise HTTPException(status_code=413, detail="Evidence file is too large")
            _validate_file_bytes(contents, mime)
            extracted = await parse_file_evidence(contents, mime)
            path = await save_file(investigation_id, file.filename or "evidence", contents)
            evidence_type = _kind_for(mime, file.filename or "evidence")
            raw_text = None
            size_bytes = len(contents)
            file_mime = mime or None
            file_url = None
        elif url and url.strip():
            cleaned = url.strip()
            if not cleaned.lower().startswith(("http://", "https://")):
                raise HTTPException(status_code=400, detail="Link evidence must start with http:// or https://")
            attachment = await record_metadata_evidence(
                db,
                investigation_id,
                AttachmentIn(
                    kind="link",
                    label=(label or cleaned)[:300],
                    url=cleaned[:2000],
                    note=(note or "")[:2000] or None,
                ),
            )
            await db.commit()
            await db.refresh(attachment)
            return EvidenceUploadResponse(
                evidence_id=attachment.id,
                evidence_type="link",
                extracted_data={"source_type": "link", "url": cleaned, "claims": []},
                attachment=attachment_from_evidence(attachment),
                summary="Link recorded. It is queued for manual checking; it is not proof by itself.",
            )
        else:
            text = (text or "").strip()
            if not text:
                raise HTTPException(status_code=400, detail="text evidence must not be blank")
            if len(text) > settings.max_evidence_text_chars:
                raise HTTPException(status_code=413, detail="Text evidence is too long")
            extracted = await parse_text_evidence(text)
            path = None
            evidence_type = "text"
            raw_text = text[: settings.max_evidence_text_chars]
            size_bytes = len(text.encode())
            file_mime = "text/plain"
            file_url = None
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Evidence extraction/storage failed for investigation=%s", investigation_id)
        raise HTTPException(status_code=502, detail="Evidence processing is temporarily unavailable") from exc

    item = EvidenceItem(
        investigation_id=investigation_id,
        evidence_type=evidence_type,
        label=(label or (file.filename if file else "Pasted evidence") or "Evidence")[:300],
        mime=file_mime,
        size_bytes=size_bytes,
        url=file_url,
        note=(note or "")[:2000] or None,
        file_path=path,
        raw_text=raw_text,
        extracted_data=extracted.model_dump(),
        analysis_status="analyzed",
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
        attachment=attachment_from_evidence(item),
        summary=extracted.summary(),
    )


@router.get("/{investigation_id}/evidence")
async def list_evidence(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
    student_key: str = Depends(get_student_key),
):
    investigation = await db.get(Investigation, investigation_id)
    if not investigation or investigation.student_key != student_key:
        raise HTTPException(status_code=404, detail="Investigation not found")
    rows = await db.execute(
        select(EvidenceItem)
        .where(EvidenceItem.investigation_id == investigation_id)
        .order_by(EvidenceItem.created_at.asc(), EvidenceItem.id.asc())
    )
    return {"evidence": [attachment_from_evidence(item) for item in rows.scalars().all()]}
