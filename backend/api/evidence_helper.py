"""Helpers for evidence rows that come from chat metadata rather than uploads.

The chat composer can attach *described* evidence (a link the student pasted, or
an attachment whose file was already sent to POST /evidence). Those still need an
`EvidenceItem` row so the transcript and the evidence panel agree after a reload.
"""
import hashlib

from sqlalchemy.ext.asyncio import AsyncSession

from database.models import EvidenceItem, Investigation
from schemas.case import AttachmentIn


def _stable_id(investigation_id: str, attachment: AttachmentIn) -> str:
    seed = f"{investigation_id}:{attachment.kind}:{attachment.label}:{attachment.url or attachment.text or ''}"
    return hashlib.sha1(seed.encode()).hexdigest()[:32]


async def record_metadata_evidence(
    db: AsyncSession,
    investigation_id: str,
    attachment: AttachmentIn,
    *,
    commit: bool = False,
) -> EvidenceItem | None:
    """Store link/text attachment metadata as an evidence item (no file bytes)."""
    kind = (attachment.kind or "document").lower()
    if kind not in {"link", "pasted_text", "document", "screenshot"}:
        kind = "document"

    investigation = await db.get(Investigation, investigation_id)
    if investigation is not None:
        # Skip duplicates: the same link/label pair only needs one row.
        from sqlalchemy import select

        existing = await db.execute(
            select(EvidenceItem).where(
                EvidenceItem.investigation_id == investigation_id,
                EvidenceItem.id == _stable_id(investigation_id, attachment),
            )
        )
        found = existing.scalars().first()
        if found is not None:
            return found

    item = EvidenceItem(
        id=_stable_id(investigation_id, attachment),
        investigation_id=investigation_id,
        evidence_type=kind,
        label=attachment.label[:300],
        mime=attachment.mime,
        size_bytes=attachment.size_bytes,
        url=(attachment.url or "")[:2000] or None,
        note=(attachment.note or "")[:2000] or None,
        raw_text=(attachment.text or None),
        extracted_data={"source_type": "chat_attachment", "claims": []},
        analysis_status="not_analyzed" if kind == "link" else "analyzed",
    )
    db.add(item)
    if commit:
        await db.commit()
        await db.refresh(item)
    else:
        await db.flush()
    return item
