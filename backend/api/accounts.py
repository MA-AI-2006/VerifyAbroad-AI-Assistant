"""Accounts and profile endpoints.

The Next.js server calls these (never the browser), sets its own same-origin
session cookie from `student_key`, and forwards that key in `X-Student-Key`.
That keeps auth working across a Vercel frontend + Render backend split without
cross-site cookies, and means the frontend needs no database of its own.
"""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import hash_password, new_student_key, verify_password
from database.models import Student
from database.session import get_db
from schemas.case import AccountProfile, AuthRequest, AuthResponse, ProfileResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["accounts"])


def _profile(student: Student) -> AccountProfile:
    return AccountProfile(
        name=student.name,
        email=student.email,
        preferred_language=student.preferred_language or "roman_urdu",
        degree_level=student.degree_level,
        target_countries=list(student.target_countries or []),
        funding_preference=student.funding_preference,
    )


def _valid_email(email: str) -> bool:
    local, _, domain = email.partition("@")
    return bool(local and "." in domain and " " not in email)


async def _resolve_student(db: AsyncSession, key: str) -> Student | None:
    rows = await db.execute(select(Student).where(Student.key == key))
    return rows.scalar_one_or_none()


async def _get_or_create_student(db: AsyncSession, key: str) -> Student:
    student = await _resolve_student(db, key)
    if student:
        return student
    student = Student(key=key, name=None)
    db.add(student)
    await db.flush()
    return student


@router.post("/auth/signup", response_model=AuthResponse)
async def sign_up(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    name = (payload.name or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Please enter your name.")
    if not _valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    existing = await db.execute(select(Student).where(Student.email == email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Try signing in instead.",
        )

    student = Student(
        key=new_student_key(),
        name=name[:120],
        email=email,
        password_hash=hash_password(payload.password),
        preferred_language=payload.preferred_language,
        degree_level=payload.degree_level,
        target_countries=[country.strip() for country in payload.target_countries if country.strip()][:12],
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return AuthResponse(student_key=student.key, account=_profile(student))


@router.post("/auth/login", response_model=AuthResponse)
async def sign_in(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    identifier = email if _valid_email(email) else email  # email or a raw student key
    rows = await db.execute(
        select(Student).where(or_(Student.email == identifier, Student.key == identifier))
    )
    student = rows.scalars().first()
    if not student or not verify_password(payload.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return AuthResponse(student_key=student.key, account=_profile(student))


@router.get("/auth/me", response_model=AuthResponse)
async def who_am_i(
    db: AsyncSession = Depends(get_db),
    x_student_key: str | None = Header(default=None),
):
    key = (x_student_key or "").strip()
    if not key:
        raise HTTPException(status_code=401, detail="Not signed in.")
    student = await _resolve_student(db, key)
    if not student:
        raise HTTPException(status_code=401, detail="Not signed in.")
    return AuthResponse(student_key=student.key, account=_profile(student))


@router.get("/students/me/profile", response_model=ProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    x_student_key: str = Header(default="guest_student"),
):
    student = await _get_or_create_student(db, (x_student_key or "guest_student").strip()[:200])
    await db.commit()
    return ProfileResponse(profile=_profile(student))


@router.post("/students/me/profile", response_model=ProfileResponse)
async def save_profile(
    payload: AccountProfile,
    db: AsyncSession = Depends(get_db),
    x_student_key: str = Header(default="guest_student"),
):
    student = await _get_or_create_student(db, (x_student_key or "guest_student").strip()[:200])
    if payload.name is not None:
        student.name = payload.name.strip()[:120]
    if payload.preferred_language:
        student.preferred_language = payload.preferred_language[:20]
    student.degree_level = payload.degree_level
    student.target_countries = [country.strip() for country in payload.target_countries if country.strip()][:12]
    student.funding_preference = payload.funding_preference
    await db.commit()
    await db.refresh(student)
    return ProfileResponse(profile=_profile(student))
