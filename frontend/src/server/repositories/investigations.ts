import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { ensureSeeded } from "@/db/seed";
import {
  evidenceItems,
  investigationMessages,
  investigations,
  students,
  type ChatAttachmentRow,
} from "@/db/schema";
import type {
  ChatAttachment,
  ChatMessage,
  DegreeLevel,
  InvestigationContextSnapshot,
  InvestigationListItem,
  InvestigationRecord,
  InvestigationResult,
  Language,
  RiskLevel,
  StudentProfile,
} from "@/types";

export async function getOrCreateStudent(key: string, fallback: StudentProfile) {
  await ensureSeeded();
  const existing = await db.select().from(students).where(eq(students.key, key)).limit(1);
  if (existing.length > 0) return existing[0];
  const inserted = await db
    .insert(students)
    .values({
      key,
      name: fallback.name,
      preferredLanguage: fallback.preferred_language,
      degreeLevel: fallback.degree_level,
      targetCountries: fallback.target_countries,
      fundingPreference: fallback.funding_preference,
    })
    .returning();
  return inserted[0];
}

export async function getStudentProfile(key: string): Promise<StudentProfile> {
  await ensureSeeded();
  const rows = await db.select().from(students).where(eq(students.key, key)).limit(1);
  if (rows.length === 0) {
    return {
      name: "",
      preferred_language: "roman_urdu",
      degree_level: null,
      target_countries: [],
      funding_preference: null,
    };
  }
  const row = rows[0];
  return {
    name: row.name ?? "",
    preferred_language: (row.preferredLanguage as Language) ?? "roman_urdu",
    degree_level: (row.degreeLevel as DegreeLevel | null) ?? null,
    target_countries: row.targetCountries ?? [],
    funding_preference: (row.fundingPreference as StudentProfile["funding_preference"]) ?? null,
  };
}

export async function findStudentByEmail(email: string) {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(students)
    .where(eq(students.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
  preferredLanguage: string;
  degreeLevel: string | null;
  targetCountries: string[];
  fundingPreference: string | null;
}) {
  await ensureSeeded();
  const inserted = await db
    .insert(students)
    .values({
      key: `user_${crypto.randomUUID()}`,
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      preferredLanguage: input.preferredLanguage,
      degreeLevel: input.degreeLevel,
      targetCountries: input.targetCountries,
      fundingPreference: input.fundingPreference,
    })
    .returning();
  return inserted[0];
}

export async function getAccountByKey(key: string) {
  await ensureSeeded();
  const rows = await db.select().from(students).where(eq(students.key, key)).limit(1);
  return rows[0] ?? null;
}

export async function saveStudentProfile(key: string, profile: StudentProfile) {
  await getOrCreateStudent(key, profile);
  await db
    .update(students)
    .set({
      name: profile.name,
      preferredLanguage: profile.preferred_language,
      degreeLevel: profile.degree_level,
      targetCountries: profile.target_countries,
      fundingPreference: profile.funding_preference,
      updatedAt: new Date(),
    })
    .where(eq(students.key, key));
  return getStudentProfile(key);
}

export interface CreateInvestigationInput {
  studentKey: string;
  title?: string;
  language?: Language;
  context?: InvestigationContextSnapshot;
}

export async function createInvestigation(input: CreateInvestigationInput) {
  await ensureSeeded();
  const ctx = input.context ?? {};
  const derivedTitle = [ctx.country ?? "Study abroad", ctx.degree_level ?? "", ctx.program ?? ""]
    .filter(Boolean)
    .join(" — ")
    .replace(/—\s*$/, "");
  const title = input.title ?? (derivedTitle.length > 0 ? derivedTitle : "New investigation");

  const inserted = await db
    .insert(investigations)
    .values({
      studentKey: input.studentKey,
      title: title.trim().length > 0 ? title.trim() : "New investigation",
      language: input.language ?? "roman_urdu",
      country: ctx.country ?? null,
      degreeLevel: ctx.degree_level ?? null,
      programName: ctx.program ?? null,
      universityName: ctx.university ?? null,
      scholarshipName: ctx.scholarship ?? null,
      agentName: ctx.agent ?? null,
      fundingType: ctx.funding_type ?? null,
    })
    .returning();
  return inserted[0];
}

export async function getInvestigationRow(id: number) {
  const rows = await db.select().from(investigations).where(eq(investigations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getInvestigation(id: number): Promise<InvestigationRecord | null> {
  const row = await getInvestigationRow(id);
  if (!row) return null;
  const [messageRows, evidenceRows] = await Promise.all([
    db
      .select()
      .from(investigationMessages)
      .where(eq(investigationMessages.investigationId, id))
      .orderBy(investigationMessages.id),
    db.select().from(evidenceItems).where(eq(evidenceItems.investigationId, id)),
  ]);

  const evidenceAttachments: ChatAttachment[] = evidenceRows.map((item) => ({
    id: String(item.id),
    kind: item.kind as ChatAttachment["kind"],
    label: item.label,
    mime: item.mime,
    size_bytes: item.sizeBytes,
    url: item.url,
    analysis_status: item.analysisStatus as ChatAttachment["analysis_status"],
    note: item.note,
  }));

  const messages: ChatMessage[] = messageRows.map((message) => ({
    id: String(message.id),
    role: message.role as ChatMessage["role"],
    text: message.text,
    created_at: message.createdAt.toISOString(),
    attachments:
      ((message.attachments ?? []) as ChatAttachmentRow[]).map((a) => ({
        id: a.id,
        kind: a.kind as ChatAttachment["kind"],
        label: a.label,
        mime: a.mime ?? null,
        size_bytes: a.size_bytes ?? null,
        url: a.url ?? null,
        analysis_status: (a.analysis_status as ChatAttachment["analysis_status"]) ?? "not_analyzed",
        note: a.note ?? null,
      })) ?? [],
    result: (message.result as InvestigationResult | null) ?? null,
  }));

  // Attachments already live on the message they were sent with, so evidence is
  // never duplicated onto the latest student message.

  return {
    id: String(row.id),
    title: row.title,
    language: row.language as Language,
    status: row.status as InvestigationRecord["status"],
    overall_risk: row.overallRisk as RiskLevel,
    context: {
      country: row.country,
      degree_level: (row.degreeLevel as DegreeLevel | null) ?? null,
      university: row.universityName,
      program: row.programName,
      scholarship: row.scholarshipName,
      agent: row.agentName,
      funding_type: (row.fundingType as InvestigationContextSnapshot["funding_type"]) ?? null,
      payment_amount_pkr: null,
    },
    messages,
    latest_result: (row.latestResult as InvestigationResult | null) ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listInvestigations(
  studentKey: string,
): Promise<InvestigationListItem[]> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(investigations)
    .where(eq(investigations.studentKey, studentKey))
    .orderBy(desc(investigations.updatedAt));

  const counts = await Promise.all(
    rows.map(async (row) => {
      const messages = await db
        .select({ id: investigationMessages.id })
        .from(investigationMessages)
        .where(eq(investigationMessages.investigationId, row.id));
      return messages.length;
    }),
  );

  return rows.map((row, index) => ({
    id: String(row.id),
    title: row.title,
    country: row.country,
    degree_level: (row.degreeLevel as DegreeLevel | null) ?? null,
    program: row.programName,
    university_name: row.universityName,
    overall_risk: row.overallRisk as RiskLevel,
    summary: row.summary,
    status: row.status as InvestigationListItem["status"],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    message_count: counts[index] ?? 0,
  }));
}

export async function appendMessage(input: {
  investigationId: number;
  role: "student" | "assistant";
  text: string;
  attachments?: ChatAttachment[];
  result?: InvestigationResult | null;
}) {
  const inserted = await db
    .insert(investigationMessages)
    .values({
      investigationId: input.investigationId,
      role: input.role,
      text: input.text,
      attachments: (input.attachments ?? []).map((a) => ({
        id: a.id,
        kind: a.kind,
        label: a.label,
        mime: a.mime ?? null,
        size_bytes: a.size_bytes ?? null,
        url: a.url ?? null,
        analysis_status: a.analysis_status ?? "not_analyzed",
        note: a.note ?? null,
      })),
      result: input.result ?? null,
    })
    .returning();
  return inserted[0];
}

export async function updateInvestigation(
  id: number,
  values: Partial<{
    title: string;
    language: string;
    status: string;
    country: string | null;
    degreeLevel: string | null;
    programName: string | null;
    universityName: string | null;
    scholarshipName: string | null;
    agentName: string | null;
    fundingType: string | null;
    overallRisk: string;
    summary: string | null;
    latestResult: unknown;
  }>,
) {
  await db
    .update(investigations)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(investigations.id, id));
}

export async function addEvidence(input: {
  investigationId: number;
  kind: string;
  label: string;
  mime?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
  extractedText?: string | null;
  analysisStatus?: string;
  note?: string | null;
}) {
  const inserted = await db
    .insert(evidenceItems)
    .values({
      investigationId: input.investigationId,
      kind: input.kind,
      label: input.label,
      mime: input.mime ?? null,
      sizeBytes: input.sizeBytes ?? null,
      url: input.url ?? null,
      extractedText: input.extractedText ?? null,
      analysisStatus: input.analysisStatus ?? "not_analyzed",
      note: input.note ?? null,
    })
    .returning();
  return inserted[0];
}

export async function findEvidenceForInvestigation(investigationId: number, label: string) {
  const rows = await db
    .select()
    .from(evidenceItems)
    .where(and(eq(evidenceItems.investigationId, investigationId), eq(evidenceItems.label, label)))
    .limit(1);
  return rows[0] ?? null;
}
