# VerifyAbroad-AI — frontend + backend, connected

## ⚠️ Do this first: rotate your API keys

Your uploaded backend zip had a `.env` file with **live** Gemini, Groq, Tavily,
and OpenSanctions API keys in it. I removed that file from this package (only
the placeholder `.env.example` is included), but since the real keys were
shared in this chat, treat them as compromised and **generate new ones** from
each provider before deploying anywhere.

## What changed

Your Python/FastAPI backend (`backend/`) and your Next.js frontend
(`frontend/`) speak completely different API contracts — the backend has no
auth, no university/scholarship lookup, and a different investigation
workflow (create → chat → **explicit verify step** → results) than the
frontend's built-in engine (which scores risk continuously on every message).
So this isn't a config toggle — it's a real adapter layer.

I added, on the **frontend** side only (the backend is untouched, just
cleaned of `__pycache__`/`app.db`/secrets):

- `frontend/src/server/backendClient.ts` — server-only HTTP client for the
  real backend routes (`/investigations`, `/investigations/{id}/messages`,
  `/investigations/{id}/evidence`, `/investigations/{id}/verify`,
  `/investigations/{id}/results`).
- `frontend/src/server/backendAdapter.ts` — maps the backend's flatter risk
  report (`risk_score`, `risk_level`, per-domain evidence) into the
  frontend's richer `InvestigationResult` shape. Fields the backend has no
  equivalent for (funding type, scholarship findings, community signals,
  progress steps) are left empty rather than invented.
- Updated route handlers — `/api/investigate`, `/api/investigation/[id]`,
  `/api/investigation/[id]/message`, `/api/evidence` — each now checks
  `backendEnabled()` first and proxies to the real backend when it's on,
  falling back to the untouched internal engine when it's off. **Nothing
  changes in internal-engine mode** — this is purely additive.
- Two new routes with no internal-engine equivalent:
  `/api/investigation/[id]/verify` (POST) and `/api/investigation/[id]/results`
  (GET), since the backend's risk scoring is a separate step, not part of
  every chat turn.
- `src/services/api.ts` gained `runVerification()` and `getExternalResults()`
  so UI code can trigger that step.

## Known gaps (be aware, not silently papered over)

- **No chat history from the backend.** `GET /investigations/{id}/results`
  only returns the structured case + report, not message history, so
  `investigation.messages` comes back empty when you reload a backend-mode
  investigation. Track the transcript client-side as messages arrive, or add
  a `GET /investigations/{id}` endpoint to the backend if you need reload
  support.
- **Auth, profile, emergency protocols, demo case, and university/
  scholarship/agent lookup still only exist in the internal engine** — the
  Python backend has no equivalent routes at all, so those `/api/*` routes
  were left exactly as they were.
- **The backend's own verification data is still placeholder-empty**
  (`data/hec_recognized.json`, `data/banned_agents.json` are empty lists) —
  connecting it doesn't add real fraud/sanctions data, just the machinery to
  use it once you populate those files.
- I could not run either server in this environment (no network egress here),
  so this is unverified end-to-end — see the checklist below.

## Running it

**Backend:**
```bash
cd backend
cp .env.example .env   # fill in fresh (rotated) API keys
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# set BACKEND_URL=http://localhost:8000 in .env to use the real backend,
# or leave it blank to keep using the internal engine
npm install
npm run dev
```

Visit `http://localhost:8000/health` first — it checks DB connectivity and
which provider keys are configured, which will tell you fast if the backend
itself is ready before you point the frontend at it.

## Checklist before you trust this in a demo

- [ ] Rotate the four leaked API keys (see top of this file)
- [ ] `backend/.env` has fresh keys and a real `DATABASE_URL` if not using SQLite
- [ ] `ALLOWED_ORIGINS` in backend `.env` includes your actual frontend URL
- [ ] `BACKEND_URL` in frontend `.env` points at the running backend
- [ ] Walk through: start investigation → send a message → upload evidence →
      call verify → check `/api/investigation/[id]/results` — watch the
      terminal running `uvicorn` for errors at each step
