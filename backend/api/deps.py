"""Shared FastAPI dependencies: student identity + password hashing.

The Next.js server owns the browser session cookie and forwards the account key
on every request as `X-Student-Key`. The browser itself never talks to this
service, so no cookie or credential has to survive a cross-origin hop.
"""
import hashlib
import hmac
import os
import secrets

from fastapi import Header

from database.session import AsyncSessionLocal

PBKDF2_ROUNDS = 240_000
GUEST_KEY = "guest_student"


def new_student_key() -> str:
    return f"user_{secrets.token_hex(12)}"


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ROUNDS).hex()
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt}${digest}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        algorithm, rounds, salt, digest = stored.split("$")
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds)).hex()
    return hmac.compare_digest(candidate, digest)


async def get_student_key(x_student_key: str | None = Header(default=None)) -> str:
    """Anonymous browser sessions and signed-in accounts share one identifier."""
    key = (x_student_key or "").strip()
    return key[:200] if key else GUEST_KEY


async def get_db_session():
    """Dependency variant used by routers that manage their own commit order."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
