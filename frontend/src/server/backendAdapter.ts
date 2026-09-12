/**
 * Translates FastAPI backend response shapes (backend/schemas/*.py) into the
 * frontend's InvestigationResult / ChatMessage / context types (src/types).
 *
 * The two systems model an "investigation" quite differently:
 *  - The internal engine (src/server/engine) produces a rich, per-domain
 *    finding structure (UniversityFinding, ScholarshipFinding, ...).
 *  - The Python backend produces a flatter risk report (risk_score,
 *    risk_level, domain summaries with raw evidence records).
 *
 * This adapter maps every field that has a real equivalent and leaves the
 * rest as null/empty rather than inventing data the backend didn't provide.
 * `data_notes` on the result always says the finding came from the external
 * backend so it's obvious in the UI which engine produced it.
 */
import type {
  ChatMessage,
  InvestigationContextSnapshot,
  InvestigationResult,
  Language,
  RiskLevel,
  RiskSignal,
  Severity,
  OfficialSource,
} from "@/types";
import type {
  BackendFinalReport,
  BackendStructuredCase,
} from "@/server/backendClient";

function nowIso(): string {
  return new Date().toISOString();
}

export function adaptContext(sc: BackendStructuredCase): InvestigationContextSnapshot {
  return {
    country: sc.country ?? null,
    degree_level: null, // backend does not track degree level
    university: sc.university ?? null,
    program: sc.program ?? null,
    funding_type: null, // backend does not track funding type
    scholarship: null, // backend does not track scholarship separately
    agent: sc.agent ?? null,
    payment_amount_pkr: sc.payment_amount ?? null,
  };
}

function mapRiskLevel(level: string): RiskLevel {
  const normalized = level.toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium") || normalized.includes("moderate")) return "medium";
  if (normalized.includes("low")) return "low";
  return "pending_more_info";
}

function mapSeverity(authority: string): Severity {
  if (authority === "high") return "high";
  if (authority === "medium") return "medium";
  return "low";
}

const DOMAIN_TO_CATEGORY: Record<string, RiskSignal["category"]> = {
  institution: "university",
  agent: "agent",
  payment: "payment",
  document: "documents",
};

/** Builds the InvestigationResult from a completed backend FinalReport. */
export function adaptReport(
  investigationId: string,
  language: Language,
  report: BackendFinalReport,
): InvestigationResult {
  const riskSignals: RiskSignal[] = report.domains.flatMap((domain) =>
    domain.evidence
      .filter((e) => e.result === "contradicted" || e.result === "not_found" || e.result === "unable_to_verify")
      .map((e) => ({
        category: DOMAIN_TO_CATEGORY[domain.domain] ?? "claims",
        severity: mapSeverity(e.authority),
        title: e.claim,
        explanation: e.detail ?? `${e.source} reported: ${e.result.replace(/_/g, " ")}`,
      })),
  );

  const officialSources: OfficialSource[] = report.manual_checks.map((check) => ({
    title: check.name,
    url: check.url,
    source: "government",
  }));

  return {
    investigation_id: investigationId,
    language,
    overall_risk: mapRiskLevel(report.risk_level),
    confidence: report.display_status,
    summary: report.recommendation,
    verification: {
      university: "needs_verification",
      program: "not_applicable",
      scholarship: "not_applicable",
      agent: "needs_verification",
      payment: "needs_verification",
    },
    university: null,
    program: null,
    scholarship: null,
    agent: null,
    payment: null,
    community_signals: null,
    risk_signals: riskSignals,
    claim_analysis: [],
    risk_factors: report.fraud_signals,
    recommended_action: report.safer_action,
    recommended_actions: report.manual_checks.map((c) => `${c.name}: ${c.reason}`),
    official_sources: officialSources,
    safer_alternatives: [],
    still_need: [],
    progress: [],
    data_notes: [
      `Produced by the external FastAPI verification backend (risk score ${report.risk_score}/100).`,
    ],
    generated_at: nowIso(),
  };
}

let messageCounter = 0;
function nextMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

export function adaptAssistantMessage(text: string, result: InvestigationResult | null): ChatMessage {
  return {
    id: nextMessageId("backend-assistant"),
    role: "assistant",
    text,
    created_at: nowIso(),
    result: result ?? null,
  };
}

export function adaptStudentMessage(text: string): ChatMessage {
  return {
    id: nextMessageId("backend-student"),
    role: "student",
    text,
    created_at: nowIso(),
  };
}
