"""Evidence parsing for uploads and pasted text.

The LLM does the reading when a key is configured; when it is not (or the call
fails), a PDF is read with PyMuPDF and both PDF and text go through the
deterministic extractor. Images without a vision-capable provider produce an
honest "could not read this" result instead of invented fields.
"""
from __future__ import annotations

import io
import logging

from config import settings
from agents import facts
from agents.llm_client import llm
from schemas.evidence import ExtractedDocumentClaims

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Extract structured information from study-abroad evidence for a Pakistani student.
The evidence may be a WhatsApp screenshot, email, offer/admission letter, invoice, scholarship notice, or other image/PDF.
Extraction only: DO NOT decide whether the document or message is genuine.
Extract ONLY what is clearly present. Do not guess. Use null for unknown values.
Preserve important claims/promises in the claims list, preferably verbatim.
"""


def from_text(text: str, *, source_type: str) -> ExtractedDocumentClaims:
    """Deterministic extraction from whatever text we can read out of the evidence."""
    found = facts.extract_facts(text or "")
    urls = found.get("urls") or []
    return ExtractedDocumentClaims(
        source_type=source_type,
        university=found.get("university"),
        agent_name=found.get("agent"),
        program=found.get("program"),
        claims=found.get("claims", [])[:50],
        payment_amount=found.get("payment_amount"),
        currency=found.get("currency"),
        payment_method=found.get("payment_method"),
        payment_deadline=found.get("payment_deadline"),
        intake=found.get("intake"),
        payment_url=urls[0] if urls else None,
    )


def _pdf_text(data: bytes) -> tuple[str, int]:
    """Extracted text plus page count; empty string when there is no text layer."""
    try:
        import fitz  # PyMuPDF
    except Exception:  # pragma: no cover - dependency present in requirements
        return "", 0
    try:
        with fitz.open(stream=data, filetype="pdf") as document:
            pages = len(document)
            text = "\n\n".join(page.get_text() for page in document)
        return text[: settings.max_evidence_text_chars], pages
    except Exception:
        logger.exception("PDF text extraction failed")
        return "", 0


async def parse_file_evidence(file_bytes: bytes, mime_type: str) -> ExtractedDocumentClaims:
    mime = (mime_type or "").lower()
    if settings.llm_available:
        try:
            return await llm.generate_multimodal_json(
                EXTRACTION_PROMPT,
                "Extract university, country, agent, program, student, application, payment, URL, date and claim fields.",
                file_bytes,
                mime or "application/octet-stream",
                ExtractedDocumentClaims,
            )
        except Exception as exc:
            logger.warning("LLM evidence extraction failed (%s); falling back to local parsing", exc)
            if not settings.offline_fallbacks:
                raise
    if mime == "application/pdf":
        text, pages = _pdf_text(file_bytes)
        parsed = from_text(text, source_type="pdf_text_layer" if text else "pdf_no_text_layer")
        if not text:
            parsed.claims = [
                f"PDF of {pages or 'unknown'} page(s) has no readable text layer, so its contents could not be checked automatically."
            ]
        return parsed
    if mime.startswith("text/"):
        try:
            return from_text(file_bytes.decode("utf-8", errors="replace"), source_type="text_file")
        except Exception:
            return from_text("", source_type="text_file")
    # Image without a working vision model.
    claims = ["The uploaded image could not be read automatically (no vision provider available), so nothing was confirmed from it."]
    return ExtractedDocumentClaims(source_type="image_unreadable", claims=claims)


async def parse_image_evidence(image_bytes: bytes, mime_type: str = "image/jpeg") -> ExtractedDocumentClaims:
    return await parse_file_evidence(image_bytes, mime_type)


async def parse_text_evidence(text: str) -> ExtractedDocumentClaims:
    text = (text or "")[: settings.max_evidence_text_chars]
    if settings.llm_available:
        try:
            return await llm.generate_json(EXTRACTION_PROMPT, f"Evidence text:\n{text}", ExtractedDocumentClaims)
        except Exception as exc:
            logger.warning("LLM text extraction failed (%s); using deterministic parsing", exc)
            if not settings.offline_fallbacks:
                raise
    parsed = from_text(text, source_type="pasted_text")
    return parsed
