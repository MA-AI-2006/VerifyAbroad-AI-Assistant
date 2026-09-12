from agents.llm_client import llm
from schemas.evidence import ExtractedDocumentClaims

EXTRACTION_PROMPT = """Extract structured information from study-abroad evidence for a Pakistani student.
The evidence may be a WhatsApp screenshot, email, offer/admission letter, invoice, scholarship notice, or other image/PDF.
Extraction only: DO NOT decide whether the document or message is genuine.
Extract ONLY what is clearly present. Do not guess. Use null for unknown values.
Preserve important claims/promises in the claims list, preferably verbatim.
"""

async def parse_file_evidence(file_bytes: bytes, mime_type: str) -> ExtractedDocumentClaims:
    return await llm.generate_multimodal_json(
        EXTRACTION_PROMPT,
        "Extract university, country, agent, program, student, application, payment, URL, date and claim fields.",
        file_bytes,
        mime_type,
        ExtractedDocumentClaims,
    )

async def parse_image_evidence(image_bytes: bytes, mime_type: str = "image/jpeg") -> ExtractedDocumentClaims:
    return await parse_file_evidence(image_bytes, mime_type)

async def parse_text_evidence(text: str) -> ExtractedDocumentClaims:
    return await llm.generate_json(EXTRACTION_PROMPT, f"Evidence text:\n{text}", ExtractedDocumentClaims)
