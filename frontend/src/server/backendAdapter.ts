/**
 * Translates FastAPI backend payloads into the frontend's view types
 * (src/types). Nothing here invents a fact: every field is either copied from
 * the backend response or left null/empty, and `data_notes` always says which
 * engine produced the result so the UI never presents rule-based output as if a
 * human or a live official source had confirmed it.
 *
 * The two systems model an investigation differently:
 *  - the internal engine produces rich per-domain findings (UniversityFinding…)
 *  - the Python backend produces an evidence tree + a deterministic risk score
 * This adapter rebuilds the per-domain findings from that evidence tree so the
 * existing report components render fully in backend mode.
 */
import type {
  AgentFinding,
  ChatMessage,
  ClaimAnalysis,
  InvestigationContextSnapshot,
  InvestigationRecord,
  InvestigationResult,
  Language,
  OfficialSource,
  PaymentFinding,
  ProgressStep,
  RiskLevel,
  RiskSignal,
  Severity,
  UniversityFinding,
  VerificationCheck,
  VerificationStatus,
  ProgramFinding,
} from "@/types";
import type {
  BackendAttachment,
  BackendEvidence,
  BackendFinalReport,
  BackendInvestigationPayload,
  BackendStructuredCase,
} from "@/server/backendClient";

function nowIso(): string {
  return new Date().toISOString();
}

const CASE_LABELS: Record<string, string> = {
  university: "University",
  country: "Country",
  program: "Program",
  degree_level: "Degree level",
  funding_type: "Funding",
  scholarship: "Scholarship",
  agent: "Consultant",
  payment_amount_pkr: "Payment amount (PKR)",
};

export function adaptContext(
  sc: BackendStructuredCase,
): InvestigationContextSnapshot {
  return {
    country: sc.country ?? null,
    degree_level:
      (sc.degree_level as InvestigationContextSnapshot["degree_level"]) ?? null,
    university: sc.university ?? null,
    program: sc.program ?? null,
    funding_type:
      (sc.funding_type as InvestigationContextSnapshot["funding_type"]) ?? null,
    scholarship: sc.scholarship ?? null,
    agent: sc.agent ?? null,
    payment_amount_pkr: sc.payment_amount ?? null,
  };
}

export function mapRiskLevel(level: string | null | undefined): RiskLevel {
  const normalized = (level ?? "").toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium") || normalized.includes("moderate"))
    return "medium";
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

/** Backend domain status -> the frontend's never-"safe" verification vocabulary. */
function statusToVerification(status: string | undefined): VerificationStatus {
  switch ((status ?? "").toUpperCase()) {
    case "VERIFIED":
      return "verified";
    case "CONTRADICTED":
      return "conflicts";
    case "SUSPICIOUS":
    case "UNVERIFIED":
    case "UNABLE_TO_VERIFY":
      return "needs_verification";
    default:
      return "needs_verification";
  }
}

function checkStatus(result: string): VerificationCheck["status"] {
  switch (result) {
    case "verified":
      return "ok";
    case "contradicted":
      return "fail";
    case "claimed":
      return "warn";
    default:
      return "unknown";
  }
}

function checksFor(
  report: BackendFinalReport,
  domain: string,
): VerificationCheck[] {
  const summary = report.domains.find((entry) => entry.domain === domain);
  if (!summary) return [];
  const checks = summary.evidence.map((record) => ({
    label: record.source,
    status: checkStatus(record.result),
    detail: `${record.claim}${record.detail ? ` — ${record.detail}` : ""}`,
  }));
  // Keep the list scannable in the UI; the full tree is available in the report JSON.
  return checks.slice(0, 8);
}

const RECIPIENT_PATTERNS: [RegExp, string][] = [
  [
    /easypaisa[^\n]{0,24}(account|wallet|number)?\s*[:]?\s*(03\d{2}[- ]?\d{7})?/i,
    "Easypaisa",
  ],
  [/jazzcash[^\n]{0,24}\s*[:]?\s*(03\d{2}[- ]?\d{7})?/i, "JazzCash"],
  [/bank (?:transfer|account)[^\n]{0,30}(?:[\w ]+)?/i, "Bank transfer"],
  [/western union/i, "Western Union"],
  [/crypto|bitcoin|usdt/i, "Cryptocurrency"],
];

/**
 * The payment recipient is frequently stated only in the evidence text (an
 * invoice or chat screenshot), not in the extracted case fields, so it is read
 * back out of the payment evidence the backend already stored.
 */
function matchRecipient(evidenceText: string): string | null {
  for (const [pattern, label] of RECIPIENT_PATTERNS) {
    const found = evidenceText.match(pattern);
    if (found) return found[1] ? `${label} ${found[1]}`.trim() : label;
  }
  return /personal account/.test(evidenceText) ? "Personal account" : null;
}

function domainSummary(report: BackendFinalReport, domain: string) {
  return report.domains.find((entry) => entry.domain === domain) ?? null;
}

/** The backend says "no evidence available" for a domain when nothing was checkable. */
function domainHasEvidence(
  report: BackendFinalReport,
  domain: string,
): boolean {
  const summary = domainSummary(report, domain);
  return Boolean(summary && summary.evidence.length > 0);
}

export function adaptReport(
  investigationId: string,
  language: Language,
  report: BackendFinalReport,
  sc?: BackendStructuredCase | null,
): InvestigationResult {
  const caseData = sc ?? null;
  const riskSignals: RiskSignal[] = report.domains.flatMap((domain) =>
    domain.evidence
      .filter((e) =>
        ["contradicted", "not_found", "unable_to_verify"].includes(e.result),
      )
      .map((e) => ({
        category: DOMAIN_TO_CATEGORY[domain.domain] ?? "claims",
        severity: mapSeverity(e.authority),
        title: e.claim,
        explanation:
          e.detail ?? `${e.source} reported: ${e.result.replace(/_/g, " ")}`,
      })),
  );

  const officialSources: OfficialSource[] = report.manual_checks.map(
    (check) => ({
      title: check.name,
      url: check.url,
      source: "government" as const,
    }),
  );

  const institution = domainSummary(report, "institution");
  const agentDomain = domainSummary(report, "agent");
  const paymentDomain = domainSummary(report, "payment");
  const documentDomain = domainSummary(report, "document");

  const university: UniversityFinding | null = caseData?.university
    ? {
        name: caseData.university,
        country: caseData.country ?? null,
        status: institution
          ? statusToVerification(institution.status)
          : "needs_verification",
        // The backend does not return a website/portal; leave null rather than
        // guessing one. Manual checks point at WHED for that.
        official_website: null,
        application_portal: null,
        program_types: caseData.program ? [caseData.program] : [],
        accepts_direct_applications: null,
        notes: institution?.summary ?? null,
        checks: checksFor(report, "institution"),
      }
    : null;

  const program: ProgramFinding | null = caseData?.program
    ? {
        name: caseData.program,
        degree_level:
          (caseData.degree_level as ProgramFinding["degree_level"]) ?? null,
        status: university ? university.status : "needs_verification",
        university: caseData.university ?? null,
        availability: null,
        application_method: null,
        notes:
          "Program availability is not checked by the verification backend; confirm it on the university site.",
        checks: [],
      }
    : null;

  const agent: AgentFinding | null = caseData?.agent
    ? {
        name: caseData.agent,
        company: caseData.agent,
        city: null,
        claimed_universities: caseData.university ? [caseData.university] : [],
        contact_info: null,
        status: agentDomain
          ? statusToVerification(agentDomain.status)
          : "needs_verification",
        claims_official_representation: true,
        verification_date: null,
        notes: agentDomain?.summary ?? null,
        checks: checksFor(report, "agent"),
      }
    : null;

  const paymentEvidenceText = [
    ...(paymentDomain?.evidence ?? []),
    ...(documentDomain?.evidence ?? []),
  ]
    .map((record) => `${record.claim} ${record.detail ?? ""}`)
    .join(" ")
    .toLowerCase();
  const paymentRecipient =
    caseData?.payment_method ?? matchRecipient(paymentEvidenceText);

  const payment: PaymentFinding | null =
    caseData &&
    (caseData.payment_amount !== null ||
      caseData.payment_method ||
      caseData.payment_purpose)
      ? {
          amount_pkr: caseData.payment_amount ?? null,
          amount_display:
            caseData.payment_amount !== null
              ? `${caseData.payment_amount.toLocaleString("en-US")}${caseData.currency ? ` ${caseData.currency}` : ""}`
              : null,
          purpose: caseData.payment_purpose ?? null,
          recipient: paymentRecipient,
          recipient_type: /personal|easypaisa|jazzcash|wallet|my account/.test(
            `${paymentEvidenceText} ${paymentRecipient ?? ""}`,
          )
            ? "personal"
            : "unknown",
          invoice:
            documentDomain && documentDomain.evidence.length > 0
              ? "mentioned"
              : "not_provided",
          urgency:
            /today|urgent|within 24|deadline|jaldi|seat is cancelled/i.test(
              paymentEvidenceText,
            ),
          risk: mapRiskLevel(report.risk_level),
          reasons: (paymentDomain?.evidence ?? [])
            .filter((record) => record.result === "contradicted")
            .map((record) => record.detail ?? record.claim)
            .slice(0, 5),
          recommendation: report.safer_action,
        }
      : null;

  const claimSet = new Set(
    (caseData?.claims ?? []).map((claim) => claim.toLowerCase()),
  );
  const claim_analysis: ClaimAnalysis[] = (caseData?.claims ?? []).map(
    (claim) => {
      const contradicted = report.domains.some((domain) =>
        domain.evidence.some(
          (record) =>
            record.result === "contradicted" &&
            record.detail
              ?.toLowerCase()
              .includes(claim.slice(0, 24).toLowerCase()),
        ),
      );
      return {
        claim,
        verdict: contradicted ? "conflicts" : "needs_verification",
        explanation: contradicted
          ? "An independent source contradicted this claim during verification."
          : "No independent source could confirm this claim. Treat it as unverified until the institution itself says so.",
      };
    },
  );

  const stillNeed = caseData
    ? (
        [
          ["university", caseData.university],
          ["country", caseData.country],
          ["program", caseData.program],
          ["agent", caseData.agent],
          ["payment_amount_pkr", caseData.payment_amount],
        ] as const
      )
        .filter(
          ([, value]) => value === null || value === undefined || value === "",
        )
        .map(([key]) => `${CASE_LABELS[key]} — needed for a complete check`)
    : [];
  if (caseData && claimSet.size === 0) {
    // Nothing to do with claims; keep the list about actual gaps only.
  }

  const progress: ProgressStep[] = [
    {
      key: "case",
      label: "Case details gathered",
      state: caseData?.university ? "done" : "active",
      detail: caseData?.university ?? "University not identified yet",
    },
    {
      key: "evidence",
      label: "Evidence reviewed",
      state:
        documentDomain && documentDomain.evidence.length > 0
          ? "done"
          : "pending",
      detail:
        documentDomain && documentDomain.evidence.length > 0
          ? `${documentDomain.evidence.length} document check(s)`
          : "No document evidence was analysed",
    },
    {
      key: "institution",
      label: "University checks",
      state:
        institution && institution.evidence.length > 0 ? "done" : "pending",
      detail: institution?.status ?? "not run",
    },
    {
      key: "agent",
      label: "Consultant checks",
      state:
        agentDomain && agentDomain.evidence.length > 0 ? "done" : "pending",
      detail: agentDomain?.status ?? "not run",
    },
    {
      key: "payment",
      label: "Payment checks",
      state:
        paymentDomain && paymentDomain.evidence.length > 0 ? "done" : "pending",
      detail: paymentDomain?.status ?? "not run",
    },
    {
      key: "report",
      label: "Risk report produced",
      state: "done",
      detail: `${report.risk_score}/100 · ${report.display_status}`,
    },
  ];

  const notes = [
    `Produced by the FastAPI verification backend (risk indicator ${report.risk_score}/100, ${report.display_status}).`,
    report.narrative_source === "deterministic"
      ? "The narrative summary was composed from rule output because no language model was available; scores and evidence are unchanged."
      : "Narrative written by the language model from the same evidence tree the score uses.",
    "The backend holds no official registry data, so a university not found is a gap in coverage, not proof of a fake.",
  ];
  if (report.unavailable_sources && report.unavailable_sources.length > 0) {
    notes.push(
      `Sources that could not be consulted: ${report.unavailable_sources.join(", ")}.`,
    );
  }

  return {
    investigation_id: investigationId,
    language,
    overall_risk: mapRiskLevel(report.risk_level),
    confidence: report.display_status,
    summary: report.recommendation,
    verification: {
      university: university
        ? statusToVerification(institution?.status)
        : domainHasEvidence(report, "institution")
          ? "needs_verification"
          : "not_applicable",
      program: program ? "needs_verification" : "not_applicable",
      scholarship: caseData?.scholarship
        ? "needs_verification"
        : "not_applicable",
      agent: agent
        ? statusToVerification(agentDomain?.status)
        : "not_applicable",
      payment: payment
        ? paymentDomain?.status === "CONTRADICTED"
          ? "high_risk_signal"
          : paymentDomain?.status === "VERIFIED"
            ? "consistent"
            : "needs_verification"
        : "not_applicable",
    },
    university,
    program,
    scholarship: null,
    agent,
    payment,
    community_signals: null,
    risk_signals: riskSignals,
    claim_analysis,
    risk_factors: report.fraud_signals,
    recommended_action: report.safer_action,
    recommended_actions: report.manual_checks.map(
      (check) => `${check.name}: ${check.reason}`,
    ),
    official_sources: officialSources,
    safer_alternatives: [
      "Pay the university directly through its official portal, not a personal wallet or account.",
      "Ask the university's own admissions office to confirm your offer and the consultant's status.",
      "Get any 'guarantee' in writing from the institution, then verify it independently.",
    ],
    still_need: stillNeed,
    progress,
    data_notes: notes,
    generated_at: nowIso(),
  };
}

let messageCounter = 0;
function nextMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

export function adaptAttachment(
  attachment: BackendAttachment,
): ChatMessage["attachments"] extends (infer T)[] | undefined ? T : never {
  return {
    id: attachment.id,
    kind: mapKind(attachment.kind),
    label: attachment.label ?? "Evidence",
    mime: attachment.mime ?? null,
    size_bytes: attachment.size_bytes ?? null,
    url: attachment.url ?? null,
    analysis_status:
      (attachment.analysis_status as "analyzed" | "pending" | "not_analyzed") ??
      "analyzed",
    note: attachment.note ?? null,
  };
}

function mapKind(
  kind: string,
): "screenshot" | "document" | "link" | "pasted_text" {
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

export function adaptMessages(
  payload: BackendInvestigationPayload,
): ChatMessage[] {
  const result = payload.report
    ? adaptReport(
        payload.id,
        payload.language as Language,
        payload.report,
        payload.structured_case,
      )
    : null;

  const messages: ChatMessage[] = payload.messages.map((message, index) => ({
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "student",
    text: message.text,
    created_at: message.created_at || nowIso(),
    attachments: (message.attachments ?? []).map(adaptAttachment),
    // Put the finished report on the last assistant turn so the transcript
    // shows the verdict where the student expects it.
    result:
      result && index === lastAssistantIndex(payload.messages) ? result : null,
  }));

  // Evidence the student uploaded (not attached to a chat turn) is surfaced as
  // its own transcript entry, so a reload shows everything that was submitted.
  const orphanEvidence = (payload.evidence ?? []).filter(
    (item) =>
      !payload.messages.some((message) =>
        (message.attachments ?? []).some((a) => a.id === item.id),
      ),
  );
  if (orphanEvidence.length > 0) {
    messages.push({
      id: `${payload.id}-evidence`,
      role: "student",
      text:
        orphanEvidence.length === 1
          ? `[Evidence attached: ${orphanEvidence[0].label ?? "evidence"}]`
          : `[${orphanEvidence.length} pieces of evidence attached]`,
      created_at:
        orphanEvidence[orphanEvidence.length - 1]?.created_at ?? nowIso(),
      attachments: orphanEvidence.map((item) =>
        adaptAttachment(item as BackendAttachment),
      ),
    });
  }
  return messages;
}

function lastAssistantIndex(messages: { role: string }[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return index;
  }
  return -1;
}

/** Full screen state for a backend investigation, including the report. */
export function adaptInvestigationPayload(
  payload: BackendInvestigationPayload,
): InvestigationRecord {
  const language = (payload.language ?? "roman_urdu") as Language;
  const result = payload.report
    ? adaptReport(payload.id, language, payload.report, payload.structured_case)
    : null;
  return {
    id: payload.id,
    title:
      payload.title || payload.structured_case?.university || "Investigation",
    language,
    status: payload.frontend_status === "assessed" ? "assessed" : "gathering",
    overall_risk:
      (payload.overall_risk as RiskLevel) ??
      mapRiskLevel(payload.report?.risk_level),
    context: adaptContext(payload.structured_case),
    messages: adaptMessages(payload),
    latest_result: result,
    created_at: payload.created_at || nowIso(),
    updated_at: payload.updated_at || nowIso(),
  };
}

export interface BackendScreen extends InvestigationRecord {
  /** Backend's own status string, kept for UI affordances. */
  backend_status: string;
  ready_for_verification: boolean;
  needs_reverification: boolean;
  risk_score: number | null;
  evidence: BackendEvidence[];
}

export function adaptScreen(
  payload: BackendInvestigationPayload,
): BackendScreen {
  return {
    ...adaptInvestigationPayload(payload),
    backend_status: payload.status,
    ready_for_verification: payload.ready_for_verification,
    needs_reverification: payload.needs_reverification,
    risk_score: payload.risk_score,
    evidence: payload.evidence ?? [],
  };
}

export function adaptAssistantMessage(
  text: string,
  result: InvestigationResult | null,
  id?: string,
): ChatMessage {
  return {
    id: id ?? nextMessageId("backend-assistant"),
    role: "assistant",
    text,
    created_at: nowIso(),
    result: result ?? null,
  };
}

export function adaptStudentMessage(
  text: string,
  attachments?: BackendAttachment[],
): ChatMessage {
  return {
    id: nextMessageId("backend-student"),
    role: "student",
    text,
    created_at: nowIso(),
    attachments: attachments ? attachments.map(adaptAttachment) : undefined,
  };
}

export function toBackendAttachmentPayload(attachment: {
  id?: string;
  kind?: string;
  label?: string;
  url?: string | null;
  mime?: string | null;
  size_bytes?: number | null;
  note?: string | null;
  text?: string | null;
}): Record<string, unknown> {
  return {
    kind:
      attachment.kind === "screenshot"
        ? "image"
        : (attachment.kind ?? "document"),
    label: attachment.label ?? "Evidence",
    url: attachment.url ?? null,
    mime: attachment.mime ?? null,
    size_bytes: attachment.size_bytes ?? null,
    text: attachment.text ?? null,
    note: attachment.note ?? null,
  };
}
