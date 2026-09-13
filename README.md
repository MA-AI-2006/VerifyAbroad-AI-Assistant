# VerifyAbroad-AI

An investigation assistant for students who are about to pay a "consultant" or
sign an offer letter they cannot verify. You describe the situation (English,
Roman Urdu or اردو), attach the evidence — offer letter, WhatsApp screenshot,
payment demand, agent website — and the app cross-checks every claim against
independent sources, then produces an evidence tree plus a conservative risk
report.

Two deployables, one contract between them:

| Piece | Stack | Deploy to | Owns |
| --- | --- | --- | --- |
| `frontend/` | Next.js 16 (App Router), React 19 | **Vercel** | UI, session cookie, reference directory pages |
| `backend/` | FastAPI + async SQLAlchemy | **Render** | chat agent, evidence parsing, verification, risk scoring, accounts, profile, history |

```
browser ──▶ Vercel (Next.js) ──▶ Render (FastAPI) ──▶ Supabase / Neon Postgres
             /api/*  route handlers   BACKEND_URL          DATABASE_URL
             httpOnly cookie ──▶ X-Student-Key
```

The browser **never** talks to Render. Every request goes to the Next.js
`/api` handlers, which forward it server-to-server with the student key in
`X-Student-Key`. That is why no CORS allowlist, no cross-site cookie and no
public API key are needed anywhere — and why the same code runs unchanged with
the backend switched off.

---

## Deploy in ~15 minutes

### 1. Backend → Render

`render.yaml` at the repo root is the whole blueprint (Python runtime,
`rootDir: backend`, `uvicorn main:app`, health check on `/ping`, free tier,
`singapore` region).

1. Push this repo to GitHub and choose **New → Blueprint** in Render.
2. Open the new service's **Environment** tab and fill in the secrets marked
   `sync: false` in `render.yaml` (they are never stored in git):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Postgres URI from Supabase or Neon (`postgresql://…?sslmode=require`) |
   | `GEMINI_API_KEY` | enables live narratives + multimodal PDF/image reading |
   | `GROQ_API_KEY` | structured-output fallback when Gemini fails |
   | `TAVILY_API_KEY` | optional — enables live web research |
   | `ALLOWED_ORIGINS` | optional — the Next.js server calls this API server-to-server, so CORS is not used. Set it (comma-separated) only if a browser will ever call Render directly. |

3. Deploy, then open `https://<service>.onrender.com/health?detailed=true`.
   `{"status":"ok"}` with `checks.database.status == "ok"` means it is ready.
   `GET /` also reports `"mode": "live_providers"` vs `"deterministic_fallback"`.

**No keys, no Postgres? It still deploys.** SQLite is used when `DATABASE_URL`
is unset, and every LLM step falls back to the deterministic extractor — the
risk score, evidence tree and fraud signals are computed by rules either way,
never by a model's guess. (Render's free tier has no persistent disk, so
uploaded *file bytes* are not kept; the extracted claims are stored in
Postgres, which is what the report uses. Set `SUPABASE_URL` +
`SUPABASE_SERVICE_KEY` (+ `SUPABASE_BUCKET`) to store the originals in a bucket
instead.)

### 2. Frontend → Vercel

1. **Import the repo**, then set **Root Directory = `frontend/`**. (This is a
   Vercel project *setting*, not something `vercel.json` can choose.)
2. Environment variables:

   | Variable | Value |
   | --- | --- |
   | `BACKEND_URL` | `https://<service>.onrender.com` |
   | `BACKEND_FALLBACK` | `internal` (optional — see below) |
   | `DATABASE_URL` | only if you want the built-in engine as the fallback |

3. Deploy. With `BACKEND_URL` set, the frontend needs no database of its own.

`BACKEND_FALLBACK=internal` makes a dead/unreachable backend downgrade to the
bundled engine instead of erroring — useful on a demo day, because Render's free
instances sleep after 15 idle minutes. Without it the user sees
"the service is waking up, try again in ~30 seconds", which is honest and costs
nothing. The frontend still needs `DATABASE_URL` for that path to hold data.

---

## Local development

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional: keys / DATABASE_URL
uvicorn main:app --port 8000
pytest -q                     # 10 passed, no keys required

# frontend (separate terminal)
cd frontend
cp .env.example .env          # BACKEND_URL=http://localhost:8000
npm install
npm run dev
```

Leave `BACKEND_URL` empty to run the frontend alone on its internal engine; set
it to hand every stateful feature to FastAPI. Both modes expose the same
`/api` contract, so no UI code knows the difference.

---

## Where each feature lives

| Feature | Backend mode (`BACKEND_URL` set) | Internal mode |
| --- | --- | --- |
| Chat / case building | `POST /investigations`, `POST /investigations/{id}/messages` | `src/server/engine/*` |
| Evidence (file, pasted text, link) | `POST /investigations/{id}/evidence` (+ PyMuPDF/LLM parsing) | metadata + deterministic re-score |
| Verification + risk report | `POST /investigations/{id}/verify` → `GET …/results` | scored on every turn |
| History | `GET /investigations` | `src/server/repositories` |
| Accounts, profile | `/auth/signup`, `/auth/login`, `/students/me/profile` | same repositories |
| University / scholarship / consultant directories | `src/server/referenceData.ts` (bundled) | same |
| Guides, demo case, emergency contacts | static data in the frontend | static data |

Directory browsing is deliberately *not* routed through the backend: the
reference dataset ships with the frontend, so `/universities`,
`/scholarships` and `/consultants` work with zero provisioning.

### Verification UI

In backend mode the header gains a **Run verification** button
(`components/Chat/ChatView.tsx`). It calls `/api/investigation/{id}/verify`,
and after a profile edit the button becomes **Re-run verification** because the
backend marks the old report stale (`needs_reverification`). Verification is
idempotent: calling it again returns the stored report unless `force` is set.

---

## Honest limitations

- **Nothing is ever reported as "safe".** A university not found in the
  backend's data means *no source could be consulted*, not *fake* — the report
  says so in its data notes, and the manual checks (WHED, SECP) stay in the
  report for that reason.
- `data/hec_recognized.json` and `data/banned_agents.json` in `backend/` are
  empty placeholders, so no HEC or banned-agent match can ever be asserted.
  Populate them (or set `TAVILY_API_KEY` for live research) for real coverage.
- `narrative_source` in every report says whether the prose was written by a
  model or composed from rule output. Scores never depend on it.
- Long verifications are capped at 58 s of frontend budget to stay inside
  Vercel's 60 s function limit; if that cuts the request, the backend finishes
  anyway and the next page load reads the stored report.
- A `backend/.env` with live keys was present in the original upload. It is not
  in this repo — and those keys should still be rotated at each provider.
