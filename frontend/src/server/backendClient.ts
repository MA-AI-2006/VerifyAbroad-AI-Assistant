/**
 * Thin client for the VerifyAbroad-AI FastAPI backend.
 *
 * This is intentionally separate from `src/services/api.ts` (the browser-facing
 * seam). This module runs ONLY on the server, inside Next.js route handlers,
 * and talks to the Python backend over plain HTTP using ITS real contract
 * (see backend/api/*.py). Nothing here is exposed to the client bundle.
 *
 * Enable it by setting BACKEND_URL in the Next.js server environment, e.g.
 *   BACKEND_URL=http://localhost:8000
 *
 * When BACKEND_URL is not set, callers should fall back to the internal
 * deterministic engine (src/server/engine/*) exactly as before — nothing
 * about existing behavior changes until this is configured.
 */

const RAW_BACKEND_URL = process.env.BACKEND_URL?.trim();
const BACKEND_URL = RAW_BACKEND_URL ? RAW_BACKEND_URL.replace(/\/$/, "") : null;

export function backendEnabled(): boolean {
  return Boolean(BACKEND_URL);
}

export class BackendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BACKEND_URL) {
    throw new BackendError("BACKEND_URL is not configured", 500);
  }
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Backend request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      /* ignore body parse errors */
    }
    throw new BackendError(message, response.status);
  }
  return (await response.json()) as T;
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
  claims: string[];
}

export interface BackendCreateResponse {
  investigation_id: string;
  assistant_message: string;
  structured_case: BackendStructuredCase;
  ready_for_verification: boolean;
}

export interface BackendMessageResponse {
  assistant_message: string;
  structured_case: BackendStructuredCase;
  ready_for_verification: boolean;
}

export interface BackendEvidenceRecord {
  domain: "institution" | "agent" | "payment" | "document";
  claim: string;
  source: string;
  source_type: string;
  authority: "high" | "medium" | "low";
  result: "verified" | "not_found" | "claimed" | "contradicted" | "unable_to_verify";
  detail: string | null;
}

export interface BackendDomainSummary {
  domain: string;
  status: string;
  summary: string;
  evidence: BackendEvidenceRecord[];
}

export interface BackendManualCheck {
  name: string;
  url: string;
  reason: string;
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
  manual_checks: BackendManualCheck[];
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
}

export interface BackendEvidenceUploadResponse {
  evidence_id: string;
  evidence_type: string;
  extracted_data: Record<string, unknown>;
}

/* ---------------------------------------------------------------------- */
/* Calls, one per backend/api/*.py route                                   */
/* ---------------------------------------------------------------------- */

export function backendCreateInvestigation(initialMessage: string) {
  return backendFetch<BackendCreateResponse>("/investigations", {
    method: "POST",
    body: JSON.stringify({ initial_message: initialMessage }),
  });
}

export function backendContinueInvestigation(id: string, message: string) {
  return backendFetch<BackendMessageResponse>(`/investigations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function backendRunVerification(id: string) {
  return backendFetch<BackendVerificationRunResponse>(`/investigations/${encodeURIComponent(id)}/verify`, {
    method: "POST",
  });
}

export function backendGetResults(id: string) {
  return backendFetch<BackendReportResponse>(`/investigations/${encodeURIComponent(id)}/results`, {
    method: "GET",
  });
}

export async function backendUploadFileEvidence(id: string, file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return backendFetch<BackendEvidenceUploadResponse>(`/investigations/${encodeURIComponent(id)}/evidence`, {
    method: "POST",
    body: form,
  });
}

export async function backendUploadTextEvidence(id: string, text: string) {
  const form = new FormData();
  form.append("text", text);
  return backendFetch<BackendEvidenceUploadResponse>(`/investigations/${encodeURIComponent(id)}/evidence`, {
    method: "POST",
    body: form,
  });
}

export async function backendHealth(): Promise<boolean> {
  if (!BACKEND_URL) return false;
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
