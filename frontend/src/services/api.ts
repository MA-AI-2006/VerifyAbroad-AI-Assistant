import type {
  ChatAttachment,
  ChatMessage,
  DegreeLevel,
  EngineTurnResponse,
  FundingType,
  InvestigationListItem,
  InvestigationRecord,
  InvestigationResult,
  Language,
  StudentProfile,
} from "@/types";
import {
  demoAttachmentFromCase,
  demoCase,
  demoFollowUps,
} from "@/data/mock/demoCase";

/**
 * Single API seam for the browser.
 *
 * It always points at this app's own `/api` route handlers — never directly at
 * the FastAPI service. That is deliberate: the session cookie is same-origin and
 * httpOnly, and the Next server (not the browser) holds the backend URL, so no
 * credential or cross-origin CORS assumption ever reaches the client. Which
 * engine answers — the deployed backend or the internal fallback — is decided
 * server-side in src/server/dataSource.ts and reported back on each response.
 *
 * No LLM or provider API key is ever read here: those live server-side only.
 */
const API_BASE = "/api";

export interface HealthSnapshot {
  ok: boolean;
  mode: "external_backend" | "internal_engine";
  backend_configured: boolean;
  backend: {
    reachable: boolean;
    status: string | null;
    detail: string | null;
  } | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as {
        error?: string;
        detail?: string;
        message?: string;
      };
      message = payload.error ?? payload.detail ?? payload.message ?? message;
    } catch {
      /* ignore body parse errors */
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export interface StartInvestigationInput {
  message?: string;
  language?: Language;
  attachments?: ChatAttachment[];
}

export interface SendMessageInput {
  message: string;
  attachments?: ChatAttachment[];
  degree_level?: DegreeLevel | null;
  funding_type?: InvestigationRecord["context"]["funding_type"] | null;
}

export const api = {
  startInvestigation(
    input: StartInvestigationInput & {
      degree_level?: DegreeLevel | null;
      funding_type?: FundingType | null;
    },
  ) {
    return request<{
      investigation_id: string;
      investigation: InvestigationRecord;
      first_turn: {
        assistantMessage: ChatMessage;
        result: InvestigationResult | null;
      } | null;
      mode: string;
    }>("/investigate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getInvestigation(id: string) {
    return request<{ investigation: InvestigationRecord }>(
      `/investigation/${id}`,
    );
  },

  sendMessage(id: string, input: SendMessageInput) {
    return request<
      EngineTurnResponse & {
        mode: string;
        investigation: InvestigationRecord | null;
      }
    >(`/investigation/${id}/message`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listInvestigations() {
    return request<{ investigations: InvestigationListItem[] }>(
      "/investigations",
    );
  },

  /** The student edits / confirms / removes a detail in the investigation profile. */
  updateContext(
    id: string,
    updates: Record<string, string | number | null>,
    note?: string,
  ) {
    return request<{
      studentMessage: ChatMessage;
      assistantMessage: ChatMessage;
      result: InvestigationResult | null;
      needs_verification: boolean;
      mode: string;
    }>(`/investigation/${id}/context`, {
      method: "POST",
      body: JSON.stringify({ updates, note }),
    });
  },

  uploadEvidence(input: {
    investigationId: string;
    file: File;
    label?: string;
  }) {
    const form = new FormData();
    form.append("investigation_id", String(input.investigationId));
    form.append("file", input.file);
    form.append(
      "label",
      input.label?.trim() ? input.label.trim() : input.file.name,
    );
    return request<{
      evidence_id: string;
      attachment: ChatAttachment;
      turn: {
        assistantMessage: ChatMessage;
        result: InvestigationResult | null;
      };
    }>("/evidence", { method: "POST", body: form });
  },

  submitPastedEvidence(input: {
    investigationId: string;
    label: string;
    text: string;
  }) {
    return request<{
      evidence_id: string;
      attachment: ChatAttachment;
      turn: {
        assistantMessage: ChatMessage;
        result: InvestigationResult | null;
      };
    }>("/evidence", {
      method: "POST",
      body: JSON.stringify({
        investigation_id: input.investigationId,
        kind: "pasted_text",
        label: input.label,
        text: input.text,
      }),
    });
  },

  submitLinkEvidence(input: {
    investigationId: string;
    url: string;
    label?: string;
  }) {
    return request<{
      evidence_id: string;
      attachment: ChatAttachment;
      turn: {
        assistantMessage: ChatMessage;
        result: InvestigationResult | null;
      };
    }>("/evidence", {
      method: "POST",
      body: JSON.stringify({
        investigation_id: input.investigationId,
        kind: "link",
        url: input.url,
        label: input.label?.trim() ? input.label.trim() : undefined,
      }),
    });
  },

  lookupUniversity(name: string) {
    return request<Record<string, unknown>>(
      `/university/${encodeURIComponent(name)}`,
    );
  },

  lookupScholarship(name: string) {
    return request<Record<string, unknown>>(
      `/scholarship/${encodeURIComponent(name)}`,
    );
  },

  lookupAgent(name: string) {
    return request<Record<string, unknown>>(
      `/agent/${encodeURIComponent(name)}`,
    );
  },

  getProfile() {
    return request<{ profile: StudentProfile }>("/profile");
  },

  /** Account access. Passwords are hashed server-side; no keys reach the client. */
  signUp(input: {
    name: string;
    email: string;
    password: string;
    preferred_language?: Language;
    degree_level?: DegreeLevel | null;
    target_countries?: string[];
    funding_preference?: FundingType | null;
  }) {
    return request<{
      account: {
        name: string | null;
        email: string | null;
        preferred_language: Language;
        degree_level: DegreeLevel | null;
        target_countries: string[];
        funding_preference: FundingType | null;
      };
    }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  signIn(input: { email: string; password: string }) {
    return request<{
      account: {
        name: string | null;
        email: string | null;
        preferred_language: Language;
        degree_level: DegreeLevel | null;
        target_countries: string[];
        funding_preference: FundingType | null;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  signOut() {
    return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
  },

  getEmergencyProtocols() {
    return request<{
      emergency: {
        title: string;
        subtitle: string;
        reassurance: { heading: string; body: string };
        sections: {
          id: string;
          title: string;
          icon: string;
          intro: string;
          actions: { title: string; detail: string }[];
          caution?: string;
        }[];
        contacts: {
          category: string;
          name: string;
          url: string;
          note: string;
        }[];
        disclaimer: string;
        data_label: string;
      };
    }>("/emergency");
  },

  saveProfile(profile: StudentProfile) {
    return request<{ profile: StudentProfile }>("/profile", {
      method: "POST",
      body: JSON.stringify(profile),
    });
  },

  getDemoCase() {
    return request<{ demo: typeof demoCase; follow_ups: string[] }>("/demo");
  },

  /**
   * Runs the full verification pipeline on the external FastAPI backend.
   * Only meaningful when BACKEND_URL is configured server-side — returns a
   * 501 otherwise (the internal engine scores risk on every chat turn
   * instead of needing a separate verification step).
   */
  runVerification(id: string, force = false) {
    return request<{
      status: string;
      result: InvestigationResult | null;
      investigation: InvestigationRecord | null;
      run: {
        risk_score: number;
        risk_level: string;
        display_status: string;
        display_emoji: string;
        evidence_count: number;
      } | null;
      mode: string;
    }>(`/investigation/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ force }),
    });
  },

  /** Polls the backend's stored risk report for an investigation. */
  getExternalResults(id: string) {
    return request<{
      status: string;
      result: InvestigationResult | null;
      needs_reverification: boolean;
      mode: string;
    }>(`/investigation/${id}/results`);
  },

  /** Which engine this deployment is using, and whether the backend answers. */
  health() {
    return request<HealthSnapshot>("/health");
  },
};

/**
 * Demo-mode helpers. These only shape the scripted sample case — every verdict,
 * warning signal and risk level is still produced by the backend engine.
 */
export const demo = {
  case: demoCase,
  followUps: demoFollowUps,
  attachment: demoAttachmentFromCase,
};

export { starterPrompts } from "@/data/mock/demoCase";

export type ApiClient = typeof api;
