/**
 * Thin, server-only client for the VerifyAbroad-AI FastAPI backend.
 *
 * This is intentionally separate from `src/services/api.ts` (the browser-facing
 * seam). Every call here runs inside Next.js route handlers / server components
 * and talks to the Python service over plain HTTP using ITS real contract
 * (see backend/api/*.py). The backend URL, and any provider key it holds, never
 * reach the browser bundle — and the browser never needs to know the Render origin
 * exists, which is why no cross-origin cookies or CORS setup are required.
 *
 * Enable with:  BACKEND_URL=https://verifyabroad-api.onrender.com
 * Leave unset to fall back to the internal deterministic engine.
 */
import { getStudentKey } from "@/server/session";

const RAW_BACKEND_URL = process.env.BACKEND_URL?.trim();
const BACKEND_URL = RAW_BACKEND_URL ? RAW_BACKEND_URL.replace(/\/$/, "") : null;

/** "off" = fail loudly; "internal" = use the built-in engine if the backend is down. */
const FALLBACK = (process.env.BACKEND_FALLBACK ?? "off").trim().toLowerCase();

export type EngineMode = "external_backend" | "internal_engine";

export function backendConfigured(): boolean {
  return Boolean(BACKEND_URL);
}

/**
 * The mode this server will actually use. A configured backend plus no
 * BACKEND_FALLBACK=internal means every data feature goes through Render;
 * with fallback enabled, a dead backend downgrades to the internal engine
 * (which needs DATABASE_URL) instead of erroring.
 */
export async function resolveMode(): Promise<EngineMode> {
  if (!BACKEND_URL) return "internal_engine";
  if (FALLBACK !== "internal") return "external_backend";
  return (await backendHealthy()) ? "external_backend" : "internal_engine";
}

let healthCache: { ok: boolean; checkedAt: number } | null = null;

async function backendHealthy(): Promise<boolean> {
  if (!BACKEND_URL) return false;
  if (healthCache && Date.now() - healthCache.checkedAt < 15_000)
    return healthCache.ok;
  try {
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/ping`,
      { method: "GET" },
      4_000,
    );
    const ok = response.ok;
    healthCache = { ok, checkedAt: Date.now() };
    return ok;
  } catch {
    healthCache = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

export class BackendError extends Error {
  status: number;
  /** True when the service could not be reached at all (sleeping Render instance, DNS, TLS). */
  unavailable: boolean;

  constructor(message: string, status: number, unavailable = false) {
    super(message);
    this.name = "BackendError";
    this.status = status;
    this.unavailable = unavailable;
  }
}

export class BackendUnavailableError extends BackendError {
  constructor(message: string) {
    super(message, 503, true);
    this.name = "BackendUnavailableError";
  }
}

const STILL_RUNNING_MESSAGE =
  "The verification service is still working on this case. Send nothing new — open " +
  "the investigation again in a few seconds and the report will be there.";

const SLEEPING_BACKEND_MESSAGE =
  "The verification service is waking up (free hosted instances sleep after 15 idle minutes). " +
  "Try again in about 30 seconds — the first request starts it up.";

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Per-call budgets. Verification fans out to several research providers and can
 * legitimately take half a minute; everything else should be fast, but a
 * sleeping Render instance needs a couple of patient retries before we call it down.
 */
/**
 * Time budgets. Vercel kills a serverless function at 60s on the Hobby plan, so
 * each call — retries included — finishes inside one whole deadline and returns a
 * readable error instead of a platform timeout. The backend keeps working on a
 * long verification regardless; `GET /results` then serves the finished report.
 */
const TIMEOUT_MS = { quick: 15_000, turn: 50_000, verify: 55_000 };
const DEADLINE_MS = { quick: 20_000, turn: 55_000, verify: 58_000 };

async function backendFetch<T>(
  path: string,
  init: RequestInit = {},
  budget: keyof typeof TIMEOUT_MS = "quick",
  studentKeyOverride?: string | null,
): Promise<T> {
  if (!BACKEND_URL) {
    throw new BackendError("BACKEND_URL is not configured", 500);
  }
  // Normally the identity comes from this request's session cookie. It is
  // overridden only for a key that does not exist in a cookie yet — the account
  // created by signup, whose profile must be written before login.
  const identity = studentKeyOverride
    ? { "X-Student-Key": studentKeyOverride }
    : await identityHeaders();
  const attempts = 3;
  const deadline = Date.now() + DEADLINE_MS[budget];
  /** Set once any HTTP response arrives, to tell a cold start from a slow run. */
  let connected = false;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const remaining = deadline - Date.now();
    if (attempt > 0 && remaining < 2_000) break;
    const attemptTimeout = Math.max(1_500, Math.min(TIMEOUT_MS[budget], remaining));
    try {
      const response = await fetchWithTimeout(
        `${BACKEND_URL}${path}`,
        {
          ...init,
          headers: {
            ...identity,
            ...(init.body && !(init.body instanceof FormData)
              ? { "Content-Type": "application/json" }
              : {}),
            ...(init.headers ?? {}),
          },
        },
        attemptTimeout,
      );
      connected = true;

      if (!response.ok) {
        let message = `Backend request failed (${response.status})`;
        try {
          const payload = (await response.json()) as {
            detail?: string;
            error?: string;
          };
          if (payload.detail) message = payload.detail;
          else if (payload.error) message = payload.error;
        } catch {
          /* keep the generic message when the body is not JSON */
        }
        // 5xx from the platform itself (cold start, gateway timeout) is retryable;
        // a 4xx is a real answer from the API and must reach the user verbatim.
        if (response.status >= 500 && attempt < attempts - 1) {
          lastError = new BackendError(message, response.status);
          await wait(1_200 * (attempt + 1));
          continue;
        }
        throw new BackendError(message, response.status);
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof BackendError) throw error;
      lastError = error;
      const aborted = error instanceof Error && error.name === "AbortError";
      if (attempt < attempts - 1 && deadline - Date.now() > 2_500) {
        await wait(aborted ? 1_500 : 800 * (attempt + 1));
        continue;
      }
      if (aborted && connected) {
        // The service is up but this operation outlived the function's budget.
        throw new BackendError(STILL_RUNNING_MESSAGE, 504);
      }
    }
  }

  void lastError;
  throw new BackendUnavailableError(SLEEPING_BACKEND_MESSAGE);
}

/* ---------------------------------------------------------------------- */
/* Types mirroring backend/schemas/*.py                                    */
/* ---------------------------------------------------------------------- */

export interface BackendStructuredCase {
  university: string | null;
  country: string | null;
  program: string | null;
  agent: string | null;
  payment_amount: number | null;
  currency: string | null;
  payment_purpose: string | null;
  payment_method: string | null;
  degree_level: string | null;
  funding_type: string | null;
  scholarship: string | null;
  claims: string[];
}

export interface BackendAttachment {
  id: string;
  kind: string;
  label: string;
  mime?: string | null;
  size_bytes?: number | null;
  url?: string | null;
  analysis_status?: string;
  note?: string | null;
}

export interface BackendMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  created_at: string;
  attachments: BackendAttachment[];
}

export interface BackendEvidence extends BackendAttachment {
  extracted_data?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface BackendDomainSummary {
  domain: string;
  status: string;
  summary: string;
  evidence: {
    domain: string;
    claim: string;
    source: string;
    source_type: string;
    authority: "high" | "medium" | "low";
    result: string;
    detail: string | null;
  }[];
}

export interface BackendFinalReport {
  risk_level: string;
  risk_score: number;
  display_status: string;
  display_emoji: string;
  domains: BackendDomainSummary[];
  fraud_signals: string[];
  recommendation: string;
  safer_action: string;
  manual_checks: { name: string; url: string; reason: string }[];
  narrative_source?: string;
  unavailable_sources?: string[];
}

/** InvestigationPayload — the backend's single "render this screen" object. */
export interface BackendInvestigationPayload {
  id: string;
  title: string;
  language: string;
  status: string;
  frontend_status: string;
  overall_risk: string;
  risk_score: number | null;
  ready_for_verification: boolean;
  needs_reverification: boolean;
  structured_case: BackendStructuredCase;
  context: Record<string, string | number | null>;
  messages: BackendMessage[];
  evidence: BackendEvidence[];
  report: BackendFinalReport | null;
  created_at: string;
  updated_at: string;
}

export interface BackendCreateResponse {
  investigation_id: string;
  assistant_message: string;
  student_message?: string;
  structured_case: BackendStructuredCase;
  ready_for_verification: boolean;
  investigation?: BackendInvestigationPayload;
}

export interface BackendMessageResponse {
  assistant_message: string;
  structured_case: BackendStructuredCase;
  ready_for_verification: boolean;
  investigation?: BackendInvestigationPayload;
}

export interface BackendContextResponse {
  student_message: BackendMessage;
  assistant_message: BackendMessage;
  result: unknown;
  needs_verification: boolean;
  investigation?: BackendInvestigationPayload;
}

export interface BackendVerificationRunResponse {
  investigation_id: string;
  status: string;
  evidence_count: number;
  risk_score: number;
  risk_level: string;
  display_status: string;
  display_emoji: string;
}

export interface BackendReportResponse {
  investigation_id: string;
  status: string;
  structured_case: BackendStructuredCase;
  report: BackendFinalReport | null;
  overall_risk: string;
  risk_score: number | null;
  needs_reverification: boolean;
  investigation?: BackendInvestigationPayload;
}

export interface BackendEvidenceUploadResponse {
  evidence_id: string;
  evidence_type: string;
  extracted_data: Record<string, unknown>;
  attachment?: BackendAttachment;
  summary?: string | null;
}

export interface BackendListItem {
  id: string;
  title: string;
  country: string | null;
  degree_level: string | null;
  program: string | null;
  university_name: string | null;
  overall_risk: string;
  summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface BackendAccount {
  name: string | null;
  email: string | null;
  preferred_language: string;
  degree_level: string | null;
  target_countries: string[];
  funding_preference: string | null;
}

export interface BackendAuthResponse {
  student_key: string;
  account: BackendAccount;
}

export interface BackendStatusResponse {
  status: string;
  environment?: string;
  checks?: Record<string, unknown>;
  mode?: string;
}

/* ---------------------------------------------------------------------- */
/* Calls — one per backend route                                           */
/* ---------------------------------------------------------------------- */

/**
 * The student identifier travels as a header on server->server calls only; the
 * browser cookie never leaves the Next.js origin.
 */
async function identityHeaders(): Promise<Record<string, string>> {
  try {
    return { "X-Student-Key": await getStudentKey() };
  } catch {
    // Outside a request scope (e.g. a build-time probe) there is no session.
    return {};
  }
}

export function backendCreateInvestigation(input: {
  message: string;
  language?: string;
  title?: string | null;
  degree_level?: string | null;
  funding_type?: string | null;
  attachments?: Record<string, unknown>[];
}) {
  return backendFetch<BackendCreateResponse>(
    "/investigations",
    {
      method: "POST",
      body: JSON.stringify({
        initial_message: input.message,
        language: input.language ?? "roman_urdu",
        title: input.title ?? null,
        degree_level: input.degree_level ?? null,
        funding_type: input.funding_type ?? null,
        attachments: input.attachments ?? [],
      }),
    },
    "turn",
  );
}

export function backendContinueInvestigation(
  id: string,
  input: { message: string; attachments?: Record<string, unknown>[] },
) {
  return backendFetch<BackendMessageResponse>(
    `/investigations/${encodeURIComponent(id)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        message: input.message,
        attachments: input.attachments ?? [],
      }),
    },
    "turn",
  );
}

export function backendUpdateContext(
  id: string,
  updates: Record<string, string | number | null>,
  note?: string | null,
) {
  return backendFetch<BackendContextResponse>(
    `/investigations/${encodeURIComponent(id)}/context`,
    {
      method: "POST",
      body: JSON.stringify({ updates, note: note ?? null }),
    },
  );
}

export function backendRunVerification(id: string, force = false) {
  return backendFetch<BackendVerificationRunResponse>(
    `/investigations/${encodeURIComponent(id)}/verify${force ? "?force=true" : ""}`,
    { method: "POST" },
    "verify",
  );
}

export function backendGetResults(id: string) {
  return backendFetch<BackendReportResponse>(
    `/investigations/${encodeURIComponent(id)}/results`,
    { method: "GET" },
    "turn",
  );
}

export function backendGetInvestigation(id: string) {
  return backendFetch<BackendInvestigationPayload>(
    `/investigations/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
}

export function backendListInvestigations(limit = 50) {
  return backendFetch<{ investigations: BackendListItem[] }>(
    `/investigations?limit=${limit}`,
    { method: "GET" },
  );
}

export function backendListEvidenceRecords(id: string) {
  return backendFetch<{ records: Record<string, unknown>[] }>(
    `/investigations/${encodeURIComponent(id)}/evidence-records`,
    { method: "GET" },
  );
}

export async function backendUploadFileEvidence(
  id: string,
  file: File,
  label?: string,
) {
  const form = new FormData();
  form.append("file", file, file.name);
  if (label) form.append("label", label);
  return backendFetch<BackendEvidenceUploadResponse>(
    `/investigations/${encodeURIComponent(id)}/evidence`,
    { method: "POST", body: form },
    "turn",
  );
}

export async function backendUploadTextEvidence(
  id: string,
  text: string,
  label?: string,
) {
  const form = new FormData();
  form.append("text", text);
  if (label) form.append("label", label);
  return backendFetch<BackendEvidenceUploadResponse>(
    `/investigations/${encodeURIComponent(id)}/evidence`,
    { method: "POST", body: form },
    "turn",
  );
}

export async function backendSubmitLinkEvidence(
  id: string,
  url: string,
  label?: string,
) {
  const form = new FormData();
  form.append("url", url);
  if (label) form.append("label", label);
  return backendFetch<BackendEvidenceUploadResponse>(
    `/investigations/${encodeURIComponent(id)}/evidence`,
    { method: "POST", body: form },
  );
}

export function backendSignUp(input: {
  name: string;
  email: string;
  password: string;
  preferred_language?: string;
  degree_level?: string | null;
  target_countries?: string[];
}) {
  return backendFetch<BackendAuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function backendSignIn(input: { email: string; password: string }) {
  return backendFetch<BackendAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function backendGetProfile() {
  return backendFetch<{ profile: BackendAccount }>("/students/me/profile", {
    method: "GET",
  });
}

export function backendSaveProfile(
  profile: Record<string, unknown>,
  studentKey?: string | null,
) {
  return backendFetch<{ profile: BackendAccount }>(
    "/students/me/profile",
    { method: "POST", body: JSON.stringify(profile) },
    "quick",
    studentKey,
  );
}

export interface BackendStatus {
  reachable: boolean;
  status: string;
  detail: Record<string, unknown> | null;
}

/** Used by /api/health so the UI can say which engine is live and whether it is up. */
export async function backendStatus(): Promise<BackendStatus> {
  if (!BACKEND_URL) {
    return { reachable: false, status: "not_configured", detail: null };
  }
  try {
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/health`,
      { method: "GET" },
      12_000,
    );
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return {
      reachable: response.ok || response.status === 503,
      status: response.ok ? "ok" : "degraded",
      detail: payload,
    };
  } catch (error) {
    return {
      reachable: false,
      status: "unreachable",
      detail: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export function backendOrigin(): string | null {
  return BACKEND_URL;
}
