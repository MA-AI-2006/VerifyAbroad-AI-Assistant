"""Mocked end-to-end API test: chat -> evidence -> verification -> report."""
import asyncio
from pathlib import Path
import sys

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

pytest.importorskip("aiosqlite")
pytest.importorskip("google.genai")
pytest.importorskip("groq")
pytest.importorskip("tavily")

from api import evidence as evidence_api
from api import investigation as investigation_api
from api import verification as verification_api
from database.models import Base
from database.session import get_db
from main import app
from schemas.case import StructuredCase
from schemas.evidence import Domain, AuthorityLevel, EvidenceRecord, ExtractedDocumentClaims, VerificationResult
from schemas.report import FinalReport, ManualCheck


def test_full_mocked_pipeline(tmp_path, monkeypatch):
    async def run():
        db_url = f"sqlite+aiosqlite:///{tmp_path / 'e2e.db'}"
        engine = create_async_engine(db_url, poolclass=NullPool)
        SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async def override_get_db():
            async with SessionLocal() as session:
                yield session

        async def fake_investigator(history, current_case, *, language="roman_urdu"):
            user_messages = [m["content"] for m in history if m["role"] == "user"]
            if len(user_messages) == 1:
                case = current_case.model_copy(update={"country": "United Kingdom"})
                return "Which university are you applying to?", case, False
            case = StructuredCase(
                university="Example University", country="United Kingdom", program="MSc Computer Science",
                agent="ABC Education Consultants", payment_amount=500000, currency="PKR",
                payment_purpose="visa guarantee fee", payment_method="personal Easypaisa account",
                claims=["100% visa guarantee"],
            )
            return "Thanks. Please upload the offer/payment evidence so I can check it against the case.", case, True

        async def fake_parse_text(text):
            return ExtractedDocumentClaims(
                source_type="whatsapp_message", university="Example University",
                agent_name="ABC Education Consultants", program="MSc Computer Science",
                payment_amount=500000, currency="PKR", payment_deadline="within 24 hours",
                payment_method="personal Easypaisa account", claims=["100% visa guarantee"],
            )

        async def fake_verify_institution(university, country):
            return [EvidenceRecord(
                domain=Domain.institution, claim="Institution is recognized", source="Official test source",
                source_type="official_university", authority=AuthorityLevel.high, result=VerificationResult.verified,
                detail="Mock official confirmation.",
            )]

        async def fake_verify_agent(agent, university, country):
            return [EvidenceRecord(
                domain=Domain.agent, claim="Agent is an authorized representative", source="Official test source",
                source_type="official_university", authority=AuthorityLevel.high, result=VerificationResult.contradicted,
                detail="Mock university source does not list the agent.",
            )]

        async def fake_verify_payment(university, program, country, method, purpose):
            return [
                EvidenceRecord(
                    domain=Domain.payment, claim="Payment method: personal Easypaisa account", source="Application rule logic",
                    source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.contradicted,
                    detail="Personal wallet used.",
                ),
                EvidenceRecord(
                    domain=Domain.payment, claim="Payment purpose: visa guarantee fee", source="Application rule logic",
                    source_type="rule_logic", authority=AuthorityLevel.high, result=VerificationResult.contradicted,
                    detail="Matches a suspicious purpose pattern.",
                ),
            ]

        async def make_final_report(structured_case, evidence_records, domain_statuses, risk_score, risk_level):
            from agents.final_analyst import assemble_domains
            return FinalReport(
                risk_level=risk_level, risk_score=risk_score,
                display_status="HIGH_RISK" if risk_level == "VERY_HIGH" else "SUSPICIOUS",
                display_emoji="🔴" if risk_level == "VERY_HIGH" else "🟠",
                domains=assemble_domains(evidence_records, domain_statuses),
                fraud_signals=["Mocked high-risk payment and agent-authorization signals."],
                recommendation="Do not pay until independently confirmed.",
                safer_action="Verify the university and agent through official channels.",
                manual_checks=[
                    ManualCheck(name="WHED", url="https://whed.net/results_institutions.php", reason="Manual check"),
                    ManualCheck(name="SECP", url="https://eservices.secp.gov.pk/eServices/NameSearch.jsp", reason="Manual check"),
                ],
            )

        monkeypatch.setattr(investigation_api, "run_investigation_turn", fake_investigator)
        monkeypatch.setattr(evidence_api, "parse_text_evidence", fake_parse_text)
        monkeypatch.setattr(verification_api, "verify_institution", fake_verify_institution)
        monkeypatch.setattr(verification_api, "verify_agent", fake_verify_agent)
        monkeypatch.setattr(verification_api, "verify_payment", fake_verify_payment)
        monkeypatch.setattr(verification_api, "generate_final_report", make_final_report)
        app.dependency_overrides[get_db] = override_get_db

        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                headers = {"X-Student-Key": "test_student"}
                first = await client.post(
                    "/investigations",
                    json={"initial_message": "I have an agent for studying abroad."},
                    headers=headers,
                )
                assert first.status_code == 200
                assert first.json()["ready_for_verification"] is False
                assert first.json()["assistant_message"] == "Which university are you applying to?"
                # The create response must carry a renderable screen payload.
                created = first.json()["investigation"]
                assert created["frontend_status"] == "gathering"
                assert [m["role"] for m in created["messages"]] == ["user", "assistant"]

                investigation_id = first.json()["investigation_id"]
                second = await client.post(
                    f"/investigations/{investigation_id}/messages",
                    json={"message": "Example University in UK, ABC Education Consultants asks for 500000 PKR."},
                    headers=headers,
                )
                assert second.status_code == 200
                assert second.json()["ready_for_verification"] is True

                evidence = await client.post(
                    f"/investigations/{investigation_id}/evidence",
                    data={"text": "Send 500000 PKR on Easypaisa today for 100% visa guarantee.", "label": "WhatsApp demand"},
                    headers=headers,
                )
                assert evidence.status_code == 200
                assert evidence.json()["evidence_type"] == "text"
                assert evidence.json()["attachment"]["label"] == "WhatsApp demand"
                assert evidence.json()["summary"]

                verify = await client.post(f"/investigations/{investigation_id}/verify", headers=headers)
                assert verify.status_code == 200
                verify_data = verify.json()
                assert verify_data["status"] == "completed"
                assert verify_data["evidence_count"] >= 5
                assert verify_data["risk_score"] >= 60
                assert verify_data["risk_level"] in {"HIGH", "VERY_HIGH"}
                assert verify_data["display_status"] in {"SUSPICIOUS", "HIGH_RISK"}
                assert verify_data["display_emoji"] in {"🟠", "🔴"}

                report = await client.get(f"/investigations/{investigation_id}/results", headers=headers)
                assert report.status_code == 200
                report_data = report.json()
                assert report_data["status"] == "completed"
                assert len(report_data["report"]["domains"]) == 4
                assert all("evidence" in d for d in report_data["report"]["domains"])
                assert all(isinstance(item, dict) for item in report_data["report"]["manual_checks"])
                # results doubles as the reload payload for the frontend screen
                assert report_data["investigation"]["frontend_status"] == "assessed"
                assert report_data["investigation"]["overall_risk"] == "high"
                assert len(report_data["investigation"]["evidence"]) == 1

                listed = await client.get("/investigations", headers=headers)
                assert listed.status_code == 200
                items = listed.json()["investigations"]
                assert len(items) == 1
                assert items[0]["status"] == "assessed"
                assert items[0]["message_count"] == 4

                other_student = await client.get("/investigations", headers={"X-Student-Key": "someone_else"})
                assert other_student.json()["investigations"] == []
                forbidden = await client.get(f"/investigations/{investigation_id}", headers={"X-Student-Key": "someone_else"})
                assert forbidden.status_code == 404

                edited = await client.post(
                    f"/investigations/{investigation_id}/context",
                    json={"updates": {"program": "MSc Data Science", "degree_level": "MS"}},
                    headers=headers,
                )
                assert edited.status_code == 200
                assert edited.json()["needs_verification"] is True
                assert edited.json()["investigation"]["needs_reverification"] is True
                assert "MSc Data Science" in edited.json()["student_message"]["text"]

                records = await client.get(f"/investigations/{investigation_id}/evidence-records", headers=headers)
                assert records.status_code == 200
                assert len(records.json()["records"]) >= 5

                closed_chat = await client.post(
                    f"/investigations/{investigation_id}/messages",
                    json={"message": "one more thing"},
                    headers=headers,
                )
                assert closed_chat.status_code == 409

                idempotent = await client.post(f"/investigations/{investigation_id}/verify", headers=headers)
                assert idempotent.status_code == 200
                assert idempotent.json()["evidence_count"] == verify_data["evidence_count"]
        finally:
            app.dependency_overrides.clear()
            await engine.dispose()

    asyncio.run(run())
