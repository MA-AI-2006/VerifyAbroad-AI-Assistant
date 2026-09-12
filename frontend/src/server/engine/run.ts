import type { ChatMessage, DegreeLevel, FundingType, InvestigationResult, Language } from "@/types";
import { extractFacts } from "@/server/engine/extract";
import { messagesToCorpus, runAssessment } from "@/server/engine/assess";
import { t } from "@/server/engine/phrases";
import { maybeEnrichReply } from "@/server/llm";
import { loadVerificationData } from "@/server/repositories/verification";
import {
  appendMessage,
  getInvestigation,
  getInvestigationRow,
  updateInvestigation,
} from "@/server/repositories/investigations";

export interface TurnInput {
  investigationId: number;
  studentText: string;
  attachments?: ChatMessage["attachments"];
  explicitDegree?: DegreeLevel | null;
  explicitFunding?: FundingType | null;
}

export interface TurnOutput {
  assistantMessage: ChatMessage;
  result: InvestigationResult | null;
}

export async function runInvestigationTurn(input: TurnInput): Promise<TurnOutput> {
  const record = await getInvestigation(input.investigationId);
  if (!record) throw new Error("Investigation not found");

  const priorMessages = record.messages;

  const studentText = input.studentText.trim();
  const evidenceNotes = (input.attachments ?? [])
    .map((attachment) => `${attachment.label} ${attachment.note ?? ""}`)
    .join("\n");

  const corpus = [
    messagesToCorpus(priorMessages),
    studentText,
    evidenceNotes,
    [
      record.context.university,
      record.context.program,
      record.context.scholarship,
      record.context.agent,
      record.context.country,
      record.context.degree_level,
    ]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  const facts = extractFacts(corpus);
  const latestFacts = studentText ? extractFacts(studentText) : null;
  const language: Language =
    latestFacts && latestFacts.language !== "english" ? latestFacts.language : facts.language;

  const data = await loadVerificationData();

  const evidenceCount =
    (input.attachments?.length ?? 0) +
    priorMessages.reduce((total, message) => total + (message.attachments?.length ?? 0), 0);

  const assessment = runAssessment({
    facts,
    data,
    corpus,
    investigationId: record.id,
    language,
    explicitDegree: input.explicitDegree ?? record.context.degree_level ?? null,
    explicitFunding: input.explicitFunding ?? record.context.funding_type ?? null,
    evidenceCount,
  });

  const replyText = await maybeEnrichReply({
    systemGoal:
      "Reply as RaastaAI, the study-abroad safety investigator for Pakistani students. Never accuse anyone of fraud; present verified / unverifiable / conflicting information, warning signals and a next verification step. Keep the same language as the student (English, Urdu or Roman Urdu).",
    studentText,
    draft: assessment.replyText,
    structured: assessment.result,
  });

  await appendMessage({
    investigationId: input.investigationId,
    role: "student",
    text: studentText,
    attachments: input.attachments ?? [],
  });

  const assistantRow = await appendMessage({
    investigationId: input.investigationId,
    role: "assistant",
    text: replyText,
    result: assessment.phase === "assessed" ? assessment.result : null,
  });

  const titleParts = [
    assessment.extracted.country ?? record.context.country,
    assessment.extracted.degreeLevel ?? record.context.degree_level,
    assessment.extracted.program ?? record.context.program,
  ]
    .filter(Boolean)
    .join(" — ");

  await updateInvestigation(input.investigationId, {
    language,
    status: assessment.phase,
    country: assessment.extracted.country ?? record.context.country ?? null,
    degreeLevel: assessment.extracted.degreeLevel ?? record.context.degree_level ?? null,
    programName: assessment.extracted.program ?? record.context.program ?? null,
    universityName: assessment.extracted.university ?? record.context.university ?? null,
    scholarshipName: assessment.extracted.scholarship ?? record.context.scholarship ?? null,
    agentName: assessment.extracted.agent ?? record.context.agent ?? null,
    fundingType: assessment.extracted.fundingType ?? record.context.funding_type ?? null,
    overallRisk: assessment.result.overall_risk,
    summary: assessment.result.summary,
    latestResult: assessment.result,
    ...(titleParts.length > 0 ? { title: titleParts } : {}),
  });

  return {
    assistantMessage: {
      id: String(assistantRow.id),
      role: "assistant",
      text: replyText,
      created_at: assistantRow.createdAt.toISOString(),
      attachments: [],
      result: assessment.phase === "assessed" ? assessment.result : null,
      still_need: assessment.stillNeed,
    },
    result: assessment.phase === "assessed" ? assessment.result : null,
  };
}

export async function startNewInvestigation(input: {
  studentKey: string;
  language: Language;
  firstMessage?: string;
  attachments?: ChatMessage["attachments"];
}) {
  const { createInvestigation, getOrCreateStudent } = await import(
    "@/server/repositories/investigations"
  );
  await getOrCreateStudent(input.studentKey, {
    name: "",
    preferred_language: input.language,
    degree_level: null,
    target_countries: [],
    funding_preference: null,
  });
  const row = await createInvestigation({
    studentKey: input.studentKey,
    language: input.language,
    context: {},
  });

  const welcome = t("welcome", input.language);
  const welcomeRow = await appendMessage({
    investigationId: row.id,
    role: "assistant",
    text: welcome,
  });

  if (input.firstMessage && input.firstMessage.trim().length > 0) {
    const turn = await runInvestigationTurn({
      investigationId: row.id,
      studentText: input.firstMessage,
      attachments: input.attachments ?? [],
    });
    return {
      investigationId: row.id,
      welcomeMessage: {
        id: String(welcomeRow.id),
        role: "assistant" as const,
        text: welcome,
        created_at: welcomeRow.createdAt.toISOString(),
        attachments: [],
      },
      turn,
    };
  }

  return {
    investigationId: row.id,
    welcomeMessage: {
      id: String(welcomeRow.id),
      role: "assistant" as const,
      text: welcome,
      created_at: welcomeRow.createdAt.toISOString(),
      attachments: [],
    },
    turn: null,
  };
}

export type ContextField =
  | "country"
  | "degree_level"
  | "university"
  | "program"
  | "scholarship"
  | "agent"
  | "funding_type"
  | "payment_amount_pkr";

const FIELD_LABELS: Record<ContextField, string> = {
  country: "Country",
  degree_level: "Degree level",
  university: "University",
  program: "Program",
  scholarship: "Scholarship",
  agent: "Consultant",
  funding_type: "Funding",
  payment_amount_pkr: "Payment (PKR)",
};

/**
 * Student-driven profile update. The student can add, correct or remove any
 * detail the assistant extracted — extraction is never treated as final.
 * The investigation is then re-run with their values taking priority.
 */
export async function runContextUpdate(input: {
  investigationId: number;
  updates: Partial<Record<ContextField, string | number | null>>;
  note?: string;
}) {
  const record = await getInvestigation(input.investigationId);
  if (!record) throw new Error("Investigation not found");

  const merged: Record<ContextField, string | number | null> = {
    country: record.context.country ?? null,
    degree_level: record.context.degree_level ?? null,
    university: record.context.university ?? null,
    program: record.context.program ?? null,
    scholarship: record.context.scholarship ?? null,
    agent: record.context.agent ?? null,
    funding_type: record.context.funding_type ?? null,
    payment_amount_pkr: null,
  };
  for (const [key, value] of Object.entries(input.updates)) {
    merged[key as ContextField] = value ?? null;
  }

  const paymentValue =
    merged.payment_amount_pkr !== null && merged.payment_amount_pkr !== undefined
      ? `${merged.payment_amount_pkr} PKR`
      : null;

  const matchText = [
    merged.university,
    merged.scholarship,
    merged.agent,
    merged.program,
    merged.country,
    merged.degree_level,
    paymentValue,
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim().length > 0)
    .map((value) => String(value))
    .join("\n");

  const corpus = [
    messagesToCorpus(record.messages.filter((message) => message.role === "student")),
    matchText,
  ]
    .filter(Boolean)
    .join("\n");

  const facts = extractFacts(corpus);
  const language = record.language;
  const data = await loadVerificationData();

  const evidenceCount = record.messages.reduce(
    (total, message) => total + (message.attachments?.length ?? 0),
    0,
  );

  const assessment = runAssessment({
    facts,
    data,
    corpus,
    matchText,
    investigationId: record.id,
    language,
    explicitDegree: (merged.degree_level as DegreeLevel | null) ?? null,
    explicitFunding: (merged.funding_type as FundingType | null) ?? null,
    evidenceCount,
    suppliedNames: {
      university: (merged.university as string | null) ?? null,
      scholarship: (merged.scholarship as string | null) ?? null,
      agent: (merged.agent as string | null) ?? null,
      program: (merged.program as string | null) ?? null,
    },
  });

  const changed = Object.entries(input.updates)
    .filter(([key]) => key in FIELD_LABELS)
    .map(([key, value]) => {
      const label = FIELD_LABELS[key as ContextField];
      return value === null || value === "" ? `${label} removed` : `${label}: ${value}`;
    });

  const studentText = `[Investigation profile updated] ${changed.join(" · ")}${
    input.note ? ` — ${input.note}` : ""
  }`;

  const studentRow = await appendMessage({
    investigationId: input.investigationId,
    role: "student",
    text: studentText,
  });

  const replyText = await maybeEnrichReply({
    systemGoal:
      "You are RaastaAI, a study-abroad safety investigator for Pakistani students. The student just updated a detail in their investigation profile. Re-run the assessment and tell them concisely what changed, what is now verified, what still needs verification, and one safe next step. Never accuse anyone of fraud. Reply in the student's language.",
    studentText,
    draft: assessment.replyText,
    structured: assessment.result,
  });

  const assistantRow = await appendMessage({
    investigationId: input.investigationId,
    role: "assistant",
    text: replyText,
    result: assessment.phase === "assessed" ? assessment.result : null,
  });

  await updateInvestigation(input.investigationId, {
    country: (merged.country as string | null) ?? null,
    degreeLevel: (merged.degree_level as string | null) ?? null,
    programName: (merged.program as string | null) ?? null,
    universityName: (merged.university as string | null) ?? null,
    scholarshipName: (merged.scholarship as string | null) ?? null,
    agentName: (merged.agent as string | null) ?? null,
    fundingType: (merged.funding_type as string | null) ?? null,
    status: assessment.phase,
    overallRisk: assessment.result.overall_risk,
    summary: assessment.result.summary,
    latestResult: assessment.result,
  });

  return {
    studentMessage: {
      id: String(studentRow.id),
      role: "student" as const,
      text: studentText,
      created_at: studentRow.createdAt.toISOString(),
      attachments: [],
    },
    assistantMessage: {
      id: String(assistantRow.id),
      role: "assistant" as const,
      text: replyText,
      created_at: assistantRow.createdAt.toISOString(),
      attachments: [],
      result: assessment.phase === "assessed" ? assessment.result : null,
      still_need: assessment.stillNeed,
    },
    result: assessment.phase === "assessed" ? assessment.result : null,
  };
}

export async function loadInvestigationPayload(id: number) {
  const row = await getInvestigationRow(id);
  if (!row) return null;
  return getInvestigation(id);
}
