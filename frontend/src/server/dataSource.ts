/**
 * The single data seam for every stateful feature.
 *
 * Route handlers and server components call this module and never choose an
 * engine themselves: if `BACKEND_URL` is set the FastAPI service on Render owns
 * accounts, profile, history, chat, evidence and verification; otherwise the
 * internal deterministic engine (Postgres-backed) runs unchanged. When
 * `BACKEND_FALLBACK=internal` is set and the backend cannot be reached, calls
 * downgrade to the internal engine instead of failing — which keeps a demo alive
 * while the free instance wakes up.
 *
 * Both engines return the same shapes, so `src/services/api.ts` and every
 * component stay engine-agnostic.
 */
import { NextResponse } from "next/server";

import type {
  ChatAttachment,
  DegreeLevel,
  FundingType,
  InvestigationListItem,
  InvestigationRecord,
  InvestigationResult,
  Language,
  StudentProfile,
} from "@/types";
import {
  backendConfigured,
  BackendError,
  resolveMode,
  type EngineMode,
} from "@/server/backendClient";
import {
  adaptAssistantMessage,
  adaptReport,
  adaptScreen,
  toBackendAttachmentPayload,
  type BackendScreen,
} from "@/server/backendAdapter";
import * as api from "@/server/backendClient";
import {
  addEvidence,
  createAccount,
  findStudentByEmail,
  getInvestigation,
  getStudentProfile,
  listInvestigations,
  saveStudentProfile,
} from "@/server/repositories/investigations";
import { getStudentKey } from "@/server/session";
import {
  runContextUpdate,
  runInvestigationTurn,
  startNewInvestigation,
} from "@/server/engine/run";
import { hashSecret } from "@/server/crypto";

const EMPTY_PROFILE: StudentProfile = {
  name: "",
  preferred_language: "roman_urdu",
  degree_level: null,
  target_countries: [],
  funding_preference: null,
};

export class DataSourceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "DataSourceError";
    this.status = status;
  }
}

export function currentMode(): Promise<EngineMode> {
  return resolveMode();
}

/**
 * Maps any failure into a response the UI can show honestly. Backend 4xx
 * messages (validation, "not ready for verification yet") pass through as-is;
 * unreachable service and missing configuration get an actionable sentence.
 */
export function toResponse(
  error: unknown,
  fallbackMessage: string,
): NextResponse {
  if (error instanceof BackendError) {
    const status =
      error.status >= 400 && error.status < 600 ? error.status : 502;
    return NextResponse.json(
      {
        error: error.message,
        mode: "external_backend",
        unavailable: error.unavailable,
      },
      { status },
    );
  }
  if (error instanceof DataSourceError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  const message =
    error instanceof Error &&
    /DATABASE_URL|DatabaseNotConfigured/i.test(error.message)
      ? "No data source is configured. Set BACKEND_URL to the deployed FastAPI service (recommended), or DATABASE_URL to use the built-in engine."
      : fallbackMessage;
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

async function backendActive(): Promise<boolean> {
  if (!backendConfigured()) return false;
  return (await resolveMode()) === "external_backend";
}

/* ---------------------------------------------------------------------- */
/* Investigations                                                          */
/* ---------------------------------------------------------------------- */

export interface StartInput {
  message: string;
  language: Language;
  degreeLevel?: DegreeLevel | null;
  fundingType?: FundingType | null;
  attachments?: ChatAttachment[];
}

export interface TurnPayload {
  assistantMessage: ChatMessageLike;
  result: InvestigationResult | null;
}

type ChatMessageLike = InvestigationRecord["messages"][number];

export interface StartResult extends TurnPayload {
  investigationId: string;
  investigation: InvestigationRecord;
}

export async function startInvestigation(
  input: StartInput,
): Promise<StartResult> {
  const message =
    input.message?.trim() || "I need help verifying a study abroad offer.";

  if (await backendActive()) {
    const created = await api.backendCreateInvestigation({
      message: input.message?.trim() ? input.message : message,
      language: input.language,
      degree_level: input.degreeLevel ?? null,
      funding_type: input.fundingType ?? null,
      attachments: (input.attachments ?? []).map(toBackendAttachmentPayload),
    });
    const payload = created.investigation;
    const assistantMessage = adaptAssistantMessage(
      created.assistant_message,
      null,
    );
    if (payload) {
      return {
        investigationId: payload.id,
        investigation: adaptScreen(payload),
        assistantMessage,
        result: payload.report
          ? adaptReport(
              payload.id,
              input.language,
              payload.report,
              payload.structured_case,
            )
          : null,
      };
    }
    const now = new Date().toISOString();
    const investigation: BackendScreen = {
      id: created.investigation_id,
      title:
        created.structured_case.university ||
        message.slice(0, 80) ||
        "New investigation",
      language: input.language,
      status: created.ready_for_verification ? "assessed" : "gathering",
      overall_risk: "pending_more_info",
      context: {
        country: created.structured_case.country ?? null,
        university: created.structured_case.university ?? null,
        program: created.structured_case.program ?? null,
        agent: created.structured_case.agent ?? null,
        scholarship: created.structured_case.scholarship ?? null,
        degree_level: created.structured_case
          .degree_level as DegreeLevel | null,
        funding_type: created.structured_case
          .funding_type as FundingType | null,
        payment_amount_pkr: created.structured_case.payment_amount ?? null,
      },
      messages: [],
      latest_result: null,
      created_at: now,
      updated_at: now,
      backend_status: created.ready_for_verification
        ? "ready_for_verification"
        : "in_progress",
      ready_for_verification: created.ready_for_verification,
      needs_reverification: false,
      risk_score: null,
      evidence: [],
    };
    return {
      investigationId: created.investigation_id,
      investigation,
      assistantMessage,
      result: null,
    };
  }

  const studentKey = await getStudentKey();
  const started = await startNewInvestigation({
    studentKey,
    language: input.language,
    firstMessage: message,
    attachments: input.attachments ?? [],
  });
  const record = await getInvestigation(started.investigationId);
  if (!record)
    throw new DataSourceError(
      "Could not load the investigation that was just created",
      500,
    );
  return {
    investigationId: String(started.investigationId),
    investigation: record,
    assistantMessage:
      started.turn?.assistantMessage ??
      adaptAssistantMessage(
        "Case created. Send me the offer, the message or the invoice and I will start checking it.",
        null,
      ),
    result: started.turn?.result ?? null,
  };
}

export interface SendInput {
  message: string;
  attachments?: ChatAttachment[];
  degreeLevel?: DegreeLevel | null;
  fundingType?: FundingType | null;
}

export async function sendTurn(
  id: string,
  input: SendInput,
): Promise<TurnPayload & { investigation: InvestigationRecord | null }> {
  if (await backendActive()) {
    const result = await api.backendContinueInvestigation(id, {
      message: input.message,
      attachments: (input.attachments ?? []).map(toBackendAttachmentPayload),
    });
    const payload = result.investigation;
    const report = payload?.report
      ? adaptReport(
          id,
          (payload.language ?? "roman_urdu") as Language,
          payload.report,
          payload.structured_case,
        )
      : null;
    return {
      assistantMessage: adaptAssistantMessage(result.assistant_message, report),
      result: report,
      investigation: payload ? adaptScreen(payload) : null,
    };
  }

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new DataSourceError(
      "Investigation ids from the built-in engine are numeric. This id came from somewhere else — check BACKEND_URL.",
      400,
    );
  }
  const turn = await runInvestigationTurn({
    investigationId: numericId,
    studentText: input.message,
    attachments: input.attachments ?? [],
    explicitDegree: input.degreeLevel ?? null,
    explicitFunding: input.fundingType ?? null,
  });
  return { ...turn, investigation: await getInvestigation(numericId) };
}

export async function updateContext(
  id: string,
  updates: Record<string, string | number | null>,
  note?: string | null,
): Promise<{
  studentMessage: ChatMessageLike;
  assistantMessage: ChatMessageLike;
  result: InvestigationResult | null;
  needs_verification: boolean;
}> {
  if (await backendActive()) {
    const response = await api.backendUpdateContext(id, updates, note);
    return {
      studentMessage: {
        id: response.student_message.id,
        role: "student",
        text: response.student_message.text,
        created_at: response.student_message.created_at,
      },
      assistantMessage: {
        id: response.assistant_message.id,
        role: "assistant",
        text: response.assistant_message.text,
        created_at: response.assistant_message.created_at,
        result: null,
      },
      result: null,
      needs_verification: response.needs_verification,
    };
  }

  const numericId = Number(id);
  if (!Number.isFinite(numericId))
    throw new DataSourceError("Invalid investigation id", 400);
  const turn = await runContextUpdate({
    investigationId: numericId,
    updates: updates as Parameters<typeof runContextUpdate>[0]["updates"],
    note: note ?? undefined,
  });
  return { ...turn, needs_verification: false };
}

/* ---------------------------------------------------------------------- */
/* Evidence                                                                */
/* ---------------------------------------------------------------------- */

export interface EvidenceInput {
  investigationId: string;
  file?: File | null;
  label?: string | null;
  text?: string | null;
  url?: string | null;
  kind?: "link" | "pasted_text" | "file";
}

export interface EvidenceResult {
  evidence_id: string;
  attachment: ChatAttachment;
  turn: TurnPayload;
}

export async function submitEvidence(
  input: EvidenceInput,
): Promise<EvidenceResult> {
  if (await backendActive()) {
    const upload = input.file
      ? await api.backendUploadFileEvidence(
          input.investigationId,
          input.file,
          input.label ?? undefined,
        )
      : input.url
        ? await api.backendSubmitLinkEvidence(
            input.investigationId,
            input.url,
            input.label ?? undefined,
          )
        : await api.backendUploadTextEvidence(
            input.investigationId,
            (input.text ?? "").trim(),
            input.label ?? undefined,
          );

    const attachment: ChatAttachment = {
      id: upload.attachment?.id ?? upload.evidence_id,
      kind: mapKind(upload.evidence_type),
      label:
        upload.attachment?.label ??
        input.label ??
        input.file?.name ??
        "Evidence",
      mime: upload.attachment?.mime ?? input.file?.type ?? null,
      size_bytes: upload.attachment?.size_bytes ?? input.file?.size ?? null,
      url: upload.attachment?.url ?? input.url ?? null,
      analysis_status: "analyzed",
      note: upload.summary ?? null,
    };
    const assistantMessage = adaptAssistantMessage(
      upload.summary
        ? `${upload.summary} Add more evidence or run verification when you are ready for the full risk report.`
        : "Evidence received and processed by the verification backend. Run verification when you are ready for the full risk report.",
      null,
    );
    return {
      evidence_id: upload.evidence_id,
      attachment,
      turn: { assistantMessage, result: null },
    };
  }

  // Internal engine: store metadata, then re-run the turn so the deterministic
  // score reflects the new evidence.
  const numericId = Number(input.investigationId);
  if (!Number.isFinite(numericId))
    throw new DataSourceError("Invalid investigation id", 400);
  const isLink = input.kind === "link" && Boolean(input.url);
  const kind: ChatAttachment["kind"] = isLink
    ? "link"
    : input.file
      ? attachmentKind(input.file)
      : "pasted_text";
  const label =
    input.label?.trim() ||
    input.file?.name ||
    (isLink ? (input.url as string) : "Pasted message");
  const extractedText = isLink
    ? (input.url as string)
    : input.file
      ? (await input.file.text().catch(() => "")).slice(0, 8000)
      : (input.text ?? "").slice(0, 8000);

  const saved = await addEvidence({
    investigationId: numericId,
    kind,
    label,
    mime: input.file?.type ?? null,
    sizeBytes: input.file?.size ?? null,
    url: isLink ? (input.url as string) : null,
    extractedText: extractedText || null,
    analysisStatus: extractedText ? "analyzed" : "pending",
    note: extractedText
      ? null
      : "Attached for review; paste the text of the message to have every claim checked.",
  });

  const attachment: ChatAttachment = {
    id: String(saved.id),
    kind,
    label,
    mime: input.file?.type ?? null,
    size_bytes: input.file?.size ?? null,
    url: isLink ? (input.url as string) : null,
    analysis_status: extractedText ? "analyzed" : "pending",
    note: saved.note ?? null,
  };
  const turn = await runInvestigationTurn({
    investigationId: numericId,
    studentText: isLink ? `Link submitted: ${input.url}` : extractedText,
    attachments: [attachment],
  });
  return { evidence_id: String(saved.id), attachment, turn };
}

function attachmentKind(file: File): ChatAttachment["kind"] {
  if (file.type.startsWith("image/")) return "screenshot";
  return "document";
}

function mapKind(kind: string): ChatAttachment["kind"] {
  switch ((kind ?? "").toLowerCase()) {
    case "image":
    case "screenshot":
      return "screenshot";
    case "text":
    case "pasted_text":
      return "pasted_text";
    case "link":
      return "link";
    default:
      return "document";
  }
}

/* ---------------------------------------------------------------------- */
/* Verification                                                            */
/* ---------------------------------------------------------------------- */

export async function runVerification(
  id: string,
  force = false,
): Promise<{
  status: string;
  result: InvestigationResult | null;
  run: api.BackendVerificationRunResponse | null;
  investigation: BackendScreen | null;
}> {
  if (await backendActive()) {
    let run: api.BackendVerificationRunResponse | null = null;
    try {
      run = await api.backendRunVerification(id, force);
    } catch (error) {
      if (error instanceof BackendError && error.status === 400) throw error;
      if (!(error instanceof BackendError) || error.unavailable) throw error;
      if (error.status === 504) {
        // The backend may well have finished right after our budget ran out, and
        // it stores the report — so read it back instead of failing the user.
        const late = await api.backendGetResults(id);
        if (late.report) {
          return {
            status: late.status,
            result: adaptReport(
              id,
              (late.investigation?.language ?? "roman_urdu") as Language,
              late.report,
              late.investigation?.structured_case ?? late.structured_case,
            ),
            run: null,
            investigation: late.investigation ? adaptScreen(late.investigation) : null,
          };
        }
      }
      // Anything else (already verifying, or a re-run answered from storage) still
      // falls through to fetch whatever report exists.
    }
    const results = await api.backendGetResults(id);
    const screen = results.investigation
      ? adaptScreen(results.investigation)
      : null;
    const result = results.report
      ? adaptReport(
          id,
          (screen?.language ??
            results.investigation?.language ??
            "roman_urdu") as Language,
          results.report,
          results.investigation?.structured_case ?? results.structured_case,
        )
      : null;
    return { status: results.status, result, run, investigation: screen };
  }

  const numericId = Number(id);
  if (!Number.isFinite(numericId))
    throw new DataSourceError("Invalid investigation id", 400);
  const record = await getInvestigation(numericId);
  throw new DataSourceError(
    record?.latest_result
      ? "The built-in engine scores risk on every message; a separate verification step needs the FastAPI backend (set BACKEND_URL)."
      : "The built-in engine scores risk as you chat, so there is nothing to verify separately. It has not produced a result yet.",
    501,
  );
}

/* ---------------------------------------------------------------------- */
/* Reading state                                                           */
/* ---------------------------------------------------------------------- */

export async function loadScreen(
  id: string,
): Promise<InvestigationRecord | null> {
  if (await backendActive()) {
    try {
      const payload = await api.backendGetInvestigation(id);
      return adaptScreen(payload);
    } catch (error) {
      if (error instanceof BackendError && error.status === 404) return null;
      throw error;
    }
  }
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  return getInvestigation(numericId);
}

export async function loadResults(
  id: string,
): Promise<{
  status: string;
  result: InvestigationResult | null;
  needs_reverification: boolean;
}> {
  if (await backendActive()) {
    const response = await api.backendGetResults(id);
    const result = response.report
      ? adaptReport(
          id,
          (response.investigation?.language ?? "roman_urdu") as Language,
          response.report,
          response.investigation?.structured_case ?? response.structured_case,
        )
      : null;
    return {
      status: response.status,
      result,
      needs_reverification: response.needs_reverification,
    };
  }
  const numericId = Number(id);
  const record = Number.isFinite(numericId)
    ? await getInvestigation(numericId)
    : null;
  return {
    status: record?.status === "assessed" ? "completed" : "in_progress",
    result: record?.latest_result ?? null,
    needs_reverification: false,
  };
}

export async function loadHistory(): Promise<InvestigationListItem[]> {
  if (await backendActive()) {
    const response = await api.backendListInvestigations(50);
    return response.investigations.map((item) => ({
      id: item.id,
      title: item.title,
      country: item.country,
      degree_level: item.degree_level as DegreeLevel | null,
      program: item.program,
      university_name: item.university_name,
      overall_risk:
        (item.overall_risk as InvestigationListItem["overall_risk"]) ??
        "pending_more_info",
      summary: item.summary,
      status: item.status === "assessed" ? "assessed" : "gathering",
      created_at: item.created_at,
      updated_at: item.updated_at,
      message_count: item.message_count,
    }));
  }
  const studentKey = await getStudentKey();
  return listInvestigations(studentKey);
}

/* ---------------------------------------------------------------------- */
/* Accounts and profile                                                      */
/* ---------------------------------------------------------------------- */

export interface AccountResult {
  account: {
    name: string | null;
    email: string | null;
    preferred_language: Language;
    degree_level: DegreeLevel | null;
    target_countries: string[];
    funding_preference: FundingType | null;
  };
}

export async function loadProfile(): Promise<StudentProfile> {
  if (await backendActive()) {
    try {
      const { profile } = await api.backendGetProfile();
      return {
        name: profile.name ?? "",
        preferred_language:
          (profile.preferred_language as Language) ?? "roman_urdu",
        degree_level: (profile.degree_level as DegreeLevel | null) ?? null,
        target_countries: profile.target_countries ?? [],
        funding_preference:
          (profile.funding_preference as FundingType | null) ?? null,
      };
    } catch (error) {
      if (error instanceof BackendError && error.unavailable) throw error;
      return EMPTY_PROFILE;
    }
  }
  const studentKey = await getStudentKey();
  try {
    return await getStudentProfile(studentKey);
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function storeProfile(
  profile: StudentProfile,
): Promise<StudentProfile> {
  if (await backendActive()) {
    const { profile: saved } = await api.backendSaveProfile({
      name: profile.name,
      preferred_language: profile.preferred_language,
      degree_level: profile.degree_level,
      target_countries: profile.target_countries,
      funding_preference: profile.funding_preference,
    });
    return {
      name: saved.name ?? "",
      preferred_language:
        (saved.preferred_language as Language) ?? "roman_urdu",
      degree_level: (saved.degree_level as DegreeLevel | null) ?? null,
      target_countries: saved.target_countries ?? [],
      funding_preference:
        (saved.funding_preference as FundingType | null) ?? null,
    };
  }
  const studentKey = await getStudentKey();
  return saveStudentProfile(studentKey, profile);
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  preferred_language?: Language;
  degree_level?: DegreeLevel | null;
  target_countries?: string[];
  funding_preference?: FundingType | null;
}): Promise<AccountResult & { studentKey: string }> {
  if (await backendActive()) {
    const response = await api.backendSignUp({
      name: input.name,
      email: input.email,
      password: input.password,
      preferred_language: input.preferred_language ?? "roman_urdu",
      degree_level: input.degree_level ?? null,
      target_countries: input.target_countries ?? [],
    });
    const account = {
      name: response.account.name,
      email: response.account.email,
      preferred_language:
        (response.account.preferred_language as Language) ?? "roman_urdu",
      degree_level:
        (response.account.degree_level as DegreeLevel | null) ?? null,
      target_countries: response.account.target_countries ?? [],
      funding_preference:
        (response.account.funding_preference as FundingType | null) ?? null,
    };
    // The signup endpoint has no funding field, so a funding preference chosen
    // at signup is saved through the profile endpoint right afterwards.
    if (input.funding_preference) {
      const { profile } = await api.backendSaveProfile(
        {
          name: response.account.name,
          email: response.account.email,
          preferred_language: account.preferred_language,
          degree_level: account.degree_level,
          target_countries: account.target_countries,
          funding_preference: input.funding_preference,
        },
        response.student_key,
      );
      account.funding_preference =
        (profile.funding_preference as FundingType | null) ??
        input.funding_preference;
    }
    return { studentKey: response.student_key, account };
  }

  const existing = await findStudentByEmail(input.email);
  if (existing)
    throw new DataSourceError(
      "An account with this email already exists. Try signing in instead.",
      409,
    );
  const created = await createAccount({
    name: input.name,
    email: input.email,
    passwordHash: hashSecret(input.password),
    preferredLanguage: input.preferred_language ?? "roman_urdu",
    degreeLevel: input.degree_level ?? null,
    targetCountries: input.target_countries ?? [],
    fundingPreference: null,
  });
  return {
    studentKey: created.key,
    account: {
      name: created.name,
      email: created.email,
      preferred_language:
        (created.preferredLanguage as Language) ?? "roman_urdu",
      degree_level: (created.degreeLevel as DegreeLevel | null) ?? null,
      target_countries: created.targetCountries ?? [],
      funding_preference:
        (created.fundingPreference as FundingType | null) ?? null,
    },
  };
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AccountResult & { studentKey: string }> {
  if (await backendActive()) {
    const response = await api.backendSignIn(input);
    return {
      studentKey: response.student_key,
      account: {
        name: response.account.name,
        email: response.account.email,
        preferred_language:
          (response.account.preferred_language as Language) ?? "roman_urdu",
        degree_level:
          (response.account.degree_level as DegreeLevel | null) ?? null,
        target_countries: response.account.target_countries ?? [],
        funding_preference:
          (response.account.funding_preference as FundingType | null) ?? null,
      },
    };
  }

  const { verifySecret } = await import("@/server/crypto");
  const { getAccountByKey } =
    await import("@/server/repositories/investigations");
  const account = await findStudentByEmail(input.email);
  if (
    !account?.passwordHash ||
    !verifySecret(input.password, account.passwordHash)
  ) {
    throw new DataSourceError("Email or password is incorrect.", 401);
  }
  const key = account.key;
  const fresh = await getAccountByKey(key);
  return {
    studentKey: key,
    account: {
      name: fresh?.name ?? null,
      email: fresh?.email ?? null,
      preferred_language:
        (fresh?.preferredLanguage as Language) ?? "roman_urdu",
      degree_level: (fresh?.degreeLevel as DegreeLevel | null) ?? null,
      target_countries: fresh?.targetCountries ?? [],
      funding_preference:
        (fresh?.fundingPreference as FundingType | null) ?? null,
    },
  };
}

/* ---------------------------------------------------------------------- */
/* Diagnostics                                                             */
/* ---------------------------------------------------------------------- */

export async function healthSnapshot() {
  const mode = await currentMode();
  const backend = backendConfigured() ? await api.backendStatus() : null;
  return {
    ok: mode === "internal_engine" || Boolean(backend?.reachable),
    mode,
    backend_configured: backendConfigured(),
    backend: backend
      ? {
          reachable: backend.reachable,
          status: backend.status,
          detail: backend.detail,
        }
      : null,
  };
}
