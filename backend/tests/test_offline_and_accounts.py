"""Keyless-operation and account tests.

These guard the two properties the deployment depends on:
  1. every chat/report path still produces a usable result with no provider key
     (Render must not 502 mid-demo because Gemini is rate-limited);
  2. signup/login/profile/history work, since the frontend is stateless.
"""
import asyncio
from pathlib import Path
import sys

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

pytest.importorskip("aiosqlite")

from agents import facts
from agents.investigator import offline_turn
from agents.final_analyst import deterministic_narrative
from agents.facts import extract_facts
from database.models import Base
from database.session import get_db
from main import app
from schemas.case import StructuredCase


def test_deterministic_extraction_from_roman_urdu():
    text = (
        "Sir mujhe University of Manchester ka admission chahiye, UK mein. "
        "EduWay Consultants bol rahe hain ke 100% visa guarantee hai. "
        "500000 PKR aaj hi Easypaisa par bhej dein, seat booking fee hai."
    )
    found = extract_facts(text)
    assert "Manchester" in (found.get("university") or "")
    assert found.get("country") == "United Kingdom"
    assert found.get("agent") == "EduWay Consultants"
    assert found.get("payment_amount") == 500000
    assert found.get("currency") == "PKR"
    assert "easypaisa" in (found.get("payment_method") or "").lower()
    assert "seat booking" in (found.get("payment_purpose") or "")
    assert any("guarantee" in claim.lower() for claim in found.get("claims", []))


def test_lakh_and_percentage_amounts():
    assert extract_facts("Unhon ne 5 lakh ki demand ki hai")["payment_amount"] == 500000
    assert extract_facts("fee is 25,000 USD")["payment_amount"] == 25000
    # A percentage must not be mistaken for an amount.
    assert extract_facts("100% scholarship milti hai")["payment_amount"] is None


def test_offline_turn_asks_exactly_one_question():
    case = StructuredCase()
    message, updated, ready = offline_turn(
        [{"role": "user", "content": "Meri admission ke liye 2 lakh mang rahe hain"}],
        case,
        "roman_urdu",
    )
    assert ready is False
    assert message.count("?") <= 1
    assert updated.payment_amount == 200000
    assert updated.university is None

    # Once university + payment exist, the case is verifiable and the model is
    # not the one deciding that.
    filled = StructuredCase(university="Example University", payment_amount=200000, currency="PKR")
    _, _, ready_after = offline_turn([{"role": "user", "content": "haan"}], filled, "english")
    assert ready_after is True


def test_deterministic_narrative_mentions_contradictions():
    from risk.aggregator import aggregate_all
    from schemas.evidence import AuthorityLevel, Domain, EvidenceRecord, VerificationResult

    records = [
        EvidenceRecord(
            domain=Domain.payment,
            claim="Payment method: personal Easypaisa account",
            source="Application rule logic",
            source_type="rule_logic",
            authority=AuthorityLevel.high,
            result=VerificationResult.contradicted,
            detail="A personal wallet is a strong payment-risk signal.",
        )
    ]
    statuses = aggregate_all(records)
    from schemas.verification import DomainSummary

    domains = [
        DomainSummary(
            domain="payment",
            status=statuses["payment"][0],
            summary=statuses["payment"][1],
            evidence=records,
        )
    ]
    narrative = deterministic_narrative(
        {"university": "Example University", "claims": ["100% visa guarantee"]},
        records,
        domains,
        40,
        "MEDIUM",
        statuses["payment"][0],
    )
    assert "40/100" in narrative.recommendation
    assert narrative.safer_action
    assert any("Easypaisa" in signal for signal in narrative.fraud_signals)
    assert any("guarantee" in signal.lower() for signal in narrative.fraud_signals)


def test_accounts_auth_profile_and_history(tmp_path, monkeypatch):
    async def run():
        engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'accounts.db'}", poolclass=NullPool)
        SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async def override_get_db():
            async with SessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                weak = await client.post("/auth/signup", json={"name": "A", "email": "x@y.co", "password": "short"})
                assert weak.status_code == 400

                signed_up = await client.post(
                    "/auth/signup",
                    json={
                        "name": "Ayesha Khan", "email": "ayesha@example.com", "password": "correct horse battery",
                        "degree_level": "MS", "target_countries": ["Germany", "UK"],
                    },
                )
                assert signed_up.status_code == 200, signed_up.text
                key = signed_up.json()["student_key"]
                headers = {"X-Student-Key": key}

                duplicate = await client.post(
                    "/auth/signup",
                    json={"name": "Ayesha", "email": "ayesha@example.com", "password": "correct horse battery"},
                )
                assert duplicate.status_code == 409

                bad_login = await client.post(
                    "/auth/login", json={"email": "ayesha@example.com", "password": "wrong password here"}
                )
                assert bad_login.status_code == 401

                login = await client.post(
                    "/auth/login", json={"email": "ayesha@example.com", "password": "correct horse battery"}
                )
                assert login.status_code == 200
                assert login.json()["student_key"] == key
                assert login.json()["account"]["name"] == "Ayesha Khan"

                me = await client.get("/auth/me", headers=headers)
                assert me.status_code == 200

                saved = await client.post(
                    "/students/me/profile",
                    json={"name": "Ayesha K", "preferred_language": "english", "degree_level": "MS",
                          "target_countries": ["Germany"], "funding_preference": "fully_funded"},
                    headers=headers,
                )
                assert saved.status_code == 200
                fetched = await client.get("/students/me/profile", headers=headers)
                assert fetched.json()["profile"]["name"] == "Ayesha K"
                assert fetched.json()["profile"]["funding_preference"] == "fully_funded"

                # Chat without any provider key must still work (no LLM configured here).
                started = await client.post(
                    "/investigations",
                    json={
                        "initial_message": "EduWay Consultants wants 500000 PKR today for a "
                                           "100% visa guarantee at University of Manchester in UK",
                        "language": "english",
                    },
                    headers=headers,
                )
                assert started.status_code == 200, started.text
                body = started.json()
                assert body["ready_for_verification"] is True
                assert body["structured_case"]["university"]
                investigation_id = body["investigation_id"]

                with_key = await client.get(f"/investigations/{investigation_id}", headers=headers)
                assert with_key.status_code == 200
                assert with_key.json()["context"]["country"] == "United Kingdom"
                assert len(with_key.json()["messages"]) == 2

                # Not ready yet -> verify refuses instead of inventing a verdict.
                partial = await client.post(
                    "/investigations", json={"initial_message": "Mujhe abroad jana hai", "language": "english"},
                    headers=headers,
                )
                assert partial.status_code == 200
                assert partial.json()["ready_for_verification"] is False
                refused = await client.post(f"/investigations/{partial.json()['investigation_id']}/verify", headers=headers)
                assert refused.status_code == 400
                assert "university" in refused.json()["detail"].lower()

                history = await client.get("/investigations", headers=headers)
                assert len(history.json()["investigations"]) == 2
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())
