VerifyAbroad-AI backend — hardened production-ready MVP package

Included:
- FastAPI + SQLAlchemy 2 async backend
- Multi-turn one-question-at-a-time investigator
- Gemini primary + Groq fallback through one structured-output client
- Parallel Tavily + Gemini Google Search research preserved
- Hipo + OpenSanctions + RAG + deterministic payment/document checks
- Deterministic evidence normalization/aggregation/risk scoring
- Deterministic evidence-tree assembly with LLM narrative only
- Upload validation and extraction for text/image/PDF evidence
- Configurable per-call timeouts and structured logging
- Production-safe DB startup and Alembic initial migration
- Real dependency health endpoint
- Empty HEC/banned-agent placeholders preserved as empty
- Deterministic student-facing display status mapping
- Deterministic smoke test + mocked end-to-end API test

Deliberately excluded from release archive:
- .env / secrets
- local app.db
- generated uploads
- __pycache__ / pytest cache
