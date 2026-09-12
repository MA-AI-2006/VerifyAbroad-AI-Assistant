"""Storage abstraction for local development and Supabase Storage production."""
import asyncio
import logging
import uuid
from pathlib import Path
from config import settings

logger = logging.getLogger(__name__)


async def save_file(investigation_id: str, filename: str, contents: bytes) -> str:
    if settings.storage_backend == "supabase":
        return await asyncio.wait_for(
            _save_to_supabase(investigation_id, filename, contents),
            timeout=settings.storage_timeout_seconds,
        )
    return _save_to_local(investigation_id, filename, contents)


def _save_to_local(investigation_id: str, filename: str, contents: bytes) -> str:
    upload_dir = Path(settings.local_upload_dir) / investigation_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_name
    with open(file_path, "wb") as f:
        f.write(contents)
    return str(file_path)


async def _save_to_supabase(investigation_id: str, filename: str, contents: bytes) -> str:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Supabase Storage")
    from supabase import create_client
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    ext = Path(filename).suffix.lower()
    unique_name = f"{investigation_id}/{uuid.uuid4()}{ext}"
    await asyncio.to_thread(
        supabase.storage.from_(settings.supabase_bucket).upload,
        unique_name,
        contents,
    )
    return unique_name


async def delete_file(path: str) -> None:
    """Best-effort cleanup for a file saved before a database commit failed."""
    if not path:
        return
    if settings.storage_backend == "supabase":
        await asyncio.wait_for(_delete_from_supabase(path), timeout=settings.storage_timeout_seconds)
        return
    try:
        Path(path).unlink(missing_ok=True)
    except Exception:
        logger.exception("Local evidence cleanup failed for path=%s", path)


async def _delete_from_supabase(path: str) -> None:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Supabase Storage")
    from supabase import create_client
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    await asyncio.to_thread(supabase.storage.from_(settings.supabase_bucket).remove, [path])
