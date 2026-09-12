import type {
  ChatAttachment,
  ChatMessage,
  DegreeLevel,
  EngineTurnResponse,
  InvestigationListItem,
  InvestigationRecord,
  InvestigationResult,
  Language,
  StudentProfile,
} from "@/types";
import { demoAttachmentFromCase, demoCase, demoFollowUps } from "@/data/mock/demoCase";

/**
 * Single API seam for the frontend.
 *
 * Set NEXT_PUBLIC_API_BASE_URL to point at the FastAPI backend. When it is not
 * set, the app talks to the built-in Next.js route handlers, which expose the
 * same contract and run the same investigation engine — this is what keeps the
 * product fully functional in demo mode.
 *
 * No LLM or provider API key is ever read here: those live server-side only.
 */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const API_BASE = RAW_BASE.replace(/\/$/, "");

export const backendMode: "external_backend" | "internal_engine" =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL !== "/api"
    ? "external_backend"
    : "internal_engine";

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
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
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
  startInvestigation(input: StartInvestigationInput) {
    return request<{
      investigation_id: string;
      investigation: InvestigationRecord;
      first_turn: { assistantMessage: ChatMessage; result: InvestigationResult | null } | null;
      mode: string;
    }>("/investigate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getInvestigation(id: string | number) {
    return request<{ investigation: InvestigationRecord }>(`/investigation/${id}`);
  },

  sendMessage(id: string | number, input: SendMessageInput) {
    return request<EngineTurnResponse & { mode: string }>(`/investigation/${id}/message`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listInvestigations() {
    return request<{ investigations: InvestigationListItem[] }>("/investigations");
  },

  /** The student edits / confirms / removes a detail in the investigation profile. */
  updateContext(
    id: string | number,
    updates: Record<string, string | number | null>,
    note?: string,
  ) {
    return request<{
      studentMessage: ChatMessage;
      assistantMessage: ChatMessage;
      result: InvestigationResult | null;
      mode: string;
    }>(`/investigation/${id}/context`, {
      method: "POST",
      body: JSON.stringify({ updates, note }),
    });
  },

  uploadEvidence(input: { investigationId: number; file: File; label?: string }) {
    const form = new FormData();
    form.append("investigation_id", String(input.investigationId));
    form.append("file", input.file);
    form.append("label", input.label?.trim() ? input.label.trim() : input.file.name);
    return request<{
      evidence_id: string;
      attachment: ChatAttachment;
      turn: { assistantMessage: ChatMessage; result: InvestigationResult | null };
    }>("/evidence", { method: "POST", body: form });
  },

  submitPastedEvidence(input: {
    investigationId: number;
    label: string;
    text: string;
  }) {
    return request<{
      evidence_id: string;
      attachment: ChatAttachment;
      turn: { assistantMessage: ChatMessage; result: InvestigationResult | null };
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

  submitLinkEvidence(input: { investigationId: number; url: string; label?: string }) {
    return request<{
      evidence_id: string;
      attachment: ChatAttachment;
      turn: { assistantMessage: ChatMessage; result: InvestigationResult | null };
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
    return request<Record<string, unknown>>(`/university/${encodeURIComponent(name)}`);
  },

  lookupScholarship(name: string) {
    return request<Record<string, unknown>>(`/scholarship/${encodeURIComponent(name)}`);
  },

  lookupAgent(name: string) {
    return request<Record<string, unknown>>(`/agent/${encodeURIComponent(name)}`);
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
  }) {
    return request<{ account: { name: string | null; email: string | null } }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  signIn(input: { email: string; password: string }) {
    return request<{ account: { name: string | null; email: string | null } }>("/auth/login", {
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
        contacts: { category: string; name: string; url: string; note: string }[];
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
  runVerification(id: string | number) {
    return request<{ status: string; result: InvestigationResult | null; mode: string }>(
      `/investigation/${id}/verify`,
      { method: "POST" },
    );
  },

  /** Polls the backend's stored risk report for an investigation. */
  getExternalResults(id: string | number) {
    return request<{ status: string; result: InvestigationResult | null; mode: string }>(
      `/investigation/${id}/results`,
    );
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
