# VerifyAbroad-AI — Production-Ready FastAPI Backend

VerifyAbroad-AI is a study-abroad fraud-verification assistant for Pakistani students. Its core behavior is **multi-turn investigation**: the assistant gathers one missing fact at a time, preserves the evolving case, accepts evidence, researches multiple independent sources, normalizes every source into a common evidence schema, aggregates evidence deterministically, scores risk with Python rules, and uses an LLM only to explain the evidence-backed result.

## Locked product behavior

The investigator must not collapse the flow into a single-shot form. It asks **one missing question at a time**, in the student’s language/style, and the API marks the case ready for verification only when a university plus an agent or payment information is present.

```text
Student chat
  ↓
Structured case (multi-turn)
  ↓
Evidence upload: image / PDF / text
  ↓
Gemini multimodal extraction (claims only)
  ↓
Parallel verification
  ├─ Institution: Hipo + HEC static + Tavily + Gemini Search
  ├─ Agent: OpenSanctions + Tavily + Gemini Search + banned list + RAG
  └─ Payment: Python rules + Tavily + Gemini Search + RAG
  ↓
Document ↔ case / verification cross-checks
  ↓
Common EvidenceRecord normalization
  ↓
Authority-weighted aggregation
  ↓
Deterministic risk engine (no LLM scoring)
  ↓
Final narrative LLM (evidence tree remains deterministic)
  ↓
Final report + WHED / SECP manual-check links
```

### Verification research pattern

For live web research, **Tavily and Gemini Google Search are independent sources and run in parallel**. Neither is a fallback for the other. Provider failures are normalized to `UNABLE_TO_VERIFY`/source errors and logged so one external failure does not silently erase the investigation.

## Current models

Default production model settings are:

- Gemini: `gemini-3.8-flash`
- Gemini embeddings: `gemini-embedding-2`
- Groq fallback: `qwen/qwen3.8-27b`

These defaults were checked against current provider documentation during the hardening pass.

## Requirements

Python 3.11+ is recommended. Install into a **fresh virtual environment**:

```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

The dependency ranges were refreshed for the current September 2026 package versions while keeping the architecture on FastAPI + SQLAlchemy 2 + Pydantic 2.

## Configuration

Copy `.env.example` to `.env` and add your provider credentials. **Never commit or distribute `.env`.** The final source package intentionally excludes the working `.env` and local database.

Important settings include:

```env
ENVIRONMENT=development
AUTO_CREATE_DB=true
ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite+aiosqlite:///./app.db
STORAGE_BACKEND=local
RAG_BACKEND=memory

GEMINI_API_KEY=
GROQ_API_KEY=
TAVILY_API_KEY=
OPENSANCTIONS_API_KEY=

GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GROQ_MODEL=qwen/qwen3.8-27b
```

For production:

```env
ENVIRONMENT=production
AUTO_CREATE_DB=false
DATABASE_URL=<your Supabase Postgres asyncpg URL>
STORAGE_BACKEND=supabase
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=evidence-files
ALLOWED_ORIGINS=https://your-frontend.example
```

Production startup does not create tables automatically; use Alembic.

## Database migrations

Initial schema migration:

```bash
alembic upgrade head
```

For development, `AUTO_CREATE_DB=true` can create tables automatically. For deployment, keep it false and run migrations explicitly.

## Seed the RAG knowledge base

`data/fraud_patterns_seed.json` contains the supplied fraud-pattern seed. Build embeddings after your Gemini key is configured:

```bash
python -m rag.knowledge_base
```

The current retriever uses NumPy cosine similarity behind the `rag/retriever.py` interface. The interface is intentionally isolated so a future pgvector implementation can replace only the internals.

## API

### Create investigation

`POST /investigations`

```json
{"initial_message":"Agent keh raha hai 100% visa guarantee hai aur aaj 5 lakh personal Easypaisa mein bhejo."}
```

### Continue investigation

`POST /investigations/{investigation_id}/messages`

### Upload evidence

`POST /investigations/{investigation_id}/evidence`

Multipart form: exactly one of `file` or `text`. Supported files: JPEG, PNG, WEBP, GIF, BMP, TIFF, PDF.

### Run verification

`POST /investigations/{investigation_id}/verify`

### Read final report

`GET /investigations/{investigation_id}/results`

### Health

`GET /health` checks the database and Hipo network dependency and reports which provider credentials are configured. It returns HTTP 503 when the required DB/Hipo checks are degraded.

## Student-facing display status

The verification response includes both the raw deterministic `risk_level` and a centralized display mapping:

| Risk level | Display status | Emoji |
|---|---|---|
| LOW | VERIFIED | 🟢 |
| MEDIUM | NEEDS_VERIFICATION | 🟡 |
| HIGH | SUSPICIOUS | 🟠 |
| VERY_HIGH | HIGH_RISK | 🔴 |
| no evidence / only unable-to-verify results | UNABLE_TO_VERIFY | ⚪ |

The first four mappings are the backend’s current conservative UI policy; change them in `risk/risk_engine.py` if product decisions require different semantics.

## Static datasets — intentionally empty

These are **not fabricated**:

- `data/hec_recognized.json` — empty placeholder; real HEC-sourced content still needs to be supplied.
- `data/banned_agents.json` — empty placeholder; real sourced banned/warned/reported-agent content still needs to be supplied.

The loader handles an empty list safely and logs a warning. An empty list cannot prove that an institution or agent is legitimate.

## Manual verification links

Final reports surface:

- WHED: https://whed.net/results_institutions.php
- SECP company-name search: https://eservices.secp.gov.pk/eServices/NameSearch.jsp

These are **manual checks**, not automated verdict sources.

## Tests

Deterministic smoke test (no provider keys):

```bash
python tests/test_smoke.py
```

Full mocked API pipeline (requires installed dependencies but no provider keys):

```bash
pytest -q
```

The end-to-end test covers: multi-turn chat → evidence submission → parallel verification boundaries (mocked) → deterministic risk → final report → idempotent re-verification.

## Deployment checklist

1. Create a fresh venv and install `requirements.txt`.
2. Copy `.env.example` to a private `.env`.
3. Populate real provider keys.
4. Supply the real HEC and banned-agent datasets.
5. Run `alembic upgrade head` against production Postgres.
6. Seed the RAG knowledge base.
7. Set `ALLOWED_ORIGINS` to the real frontend origin(s).
8. Deploy with a process manager/container and run:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The remaining application work is primarily frontend integration, deployment configuration, real provider credentials, and the real curated static datasets.
