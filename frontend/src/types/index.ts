/**
 * Shared data contract between the frontend and the verification backend.
 *
 * The frontend ONLY renders these shapes. It never decides verification
 * outcomes, risk levels or conclusions on its own — those always arrive from
 * the backend (Next.js route handlers today, FastAPI later).
 */

export type Language = "english" | "urdu" | "roman_urdu";

export type DegreeLevel = "BS" | "MS" | "PhD";

export type FundingType =
  | "fully_funded"
  | "partially_funded"
  | "university_funded"
  | "external_scholarship"
  | "self_funded"
  | "unsure";

/** Verdict for a looked-up entity. Never "safe"/"unsafe". */
export type VerificationStatus =
  | "verified"
  | "needs_verification"
  | "not_found"
  | "conflicts"
  | "not_applicable";

/** Payment-specific verdict. */
export type PaymentVerdict =
  | "consistent"
  | "needs_verification"
  | "high_risk_signal"
  | "not_applicable";

export type RiskLevel = "low" | "medium" | "high" | "pending_more_info";

export type Severity = "high" | "medium" | "low";

export type ProgressState = "done" | "active" | "pending" | "skipped";

export interface ProgressStep {
  key: string;
  label: string;
  state: ProgressState;
  detail?: string;
}

export interface OfficialSource {
  title: string;
  url: string;
  source: "university" | "scholarship" | "country" | "government";
}

export interface UniversityFinding {
  name: string;
  country: string | null;
  status: VerificationStatus;
  official_website: string | null;
  application_portal: string | null;
  program_types: string[];
  accepts_direct_applications: boolean | null;
  notes: string | null;
  checks: VerificationCheck[];
}

export interface VerificationCheck {
  label: string;
  status: "ok" | "warn" | "fail" | "unknown";
  detail?: string;
}

export interface ProgramFinding {
  name: string | null;
  degree_level: DegreeLevel | null;
  status: VerificationStatus;
  university: string | null;
  availability: string | null;
  application_method: string | null;
  notes: string | null;
  checks: VerificationCheck[];
}

export interface ScholarshipFinding {
  name: string | null;
  provider: string | null;
  country: string | null;
  eligible_levels: string[];
  funding_type: FundingType | null;
  application_route: string | null;
  official_website: string | null;
  application_portal: string | null;
  status: VerificationStatus;
  notes: string | null;
  checks: VerificationCheck[];
}

export interface AgentFinding {
  name: string | null;
  company: string | null;
  city: string | null;
  claimed_universities: string[];
  contact_info: string | null;
  status: VerificationStatus;
  claims_official_representation: boolean | null;
  verification_date: string | null;
  notes: string | null;
  checks: VerificationCheck[];
}

export interface PaymentFinding {
  amount_pkr: number | null;
  amount_display: string | null;
  purpose: string | null;
  recipient: string | null;
  recipient_type: "personal" | "institutional" | "unknown";
  invoice: "provided" | "not_provided" | "mentioned";
  urgency: boolean;
  risk: RiskLevel;
  reasons: string[];
  recommendation: string | null;
}

export interface CommunitySignals {
  rating: number | null;
  report_count: number | null;
  common_complaints: string[];
  data_label: string | null;
}

export interface RiskSignal {
  category:
    | "university"
    | "program"
    | "scholarship"
    | "agent"
    | "payment"
    | "documents"
    | "claims";
  severity: Severity;
  title: string;
  explanation: string;
}

export interface ClaimAnalysis {
  claim: string;
  verdict: "conflicts" | "needs_verification" | "supported";
  explanation: string;
}

export interface VerificationSummary {
  university: VerificationStatus;
  program: VerificationStatus;
  scholarship: VerificationStatus;
  agent: VerificationStatus;
  payment: PaymentVerdict;
}

/** Full structured investigation result returned by the backend. */
export interface InvestigationResult {
  investigation_id: string;
  language: Language;
  overall_risk: RiskLevel;
  confidence: string;
  summary: string;
  verification: VerificationSummary;
  university: UniversityFinding | null;
  program: ProgramFinding | null;
  scholarship: ScholarshipFinding | null;
  agent: AgentFinding | null;
  payment: PaymentFinding | null;
  community_signals: CommunitySignals | null;
  risk_signals: RiskSignal[];
  claim_analysis: ClaimAnalysis[];
  risk_factors: string[];
  recommended_action: string | null;
  recommended_actions: string[];
  official_sources: OfficialSource[];
  safer_alternatives: string[];
  still_need: string[];
  progress: ProgressStep[];
  data_notes: string[];
  generated_at: string;
}

export interface ChatAttachment {
  id: string;
  kind: "screenshot" | "document" | "link" | "pasted_text";
  label: string;
  mime?: string | null;
  size_bytes?: number | null;
  url?: string | null;
  preview?: string | null;
  analysis_status?: "analyzed" | "pending" | "not_analyzed";
  note?: string | null;
}

export type MessageRole = "student" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  created_at: string;
  attachments?: ChatAttachment[];
  result?: InvestigationResult | null;
  still_need?: string[];
}

export interface InvestigationContextSnapshot {
  country?: string | null;
  degree_level?: DegreeLevel | null;
  university?: string | null;
  program?: string | null;
  funding_type?: FundingType | null;
  scholarship?: string | null;
  agent?: string | null;
  payment_amount_pkr?: number | null;
}

export interface InvestigationListItem {
  id: string;
  title: string;
  country: string | null;
  degree_level: DegreeLevel | null;
  program: string | null;
  university_name: string | null;
  overall_risk: RiskLevel;
  summary: string | null;
  status: "gathering" | "assessed";
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface InvestigationRecord {
  id: string;
  title: string;
  language: Language;
  status: "gathering" | "assessed";
  overall_risk: RiskLevel;
  context: InvestigationContextSnapshot;
  messages: ChatMessage[];
  latest_result: InvestigationResult | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  name: string;
  preferred_language: Language;
  degree_level: DegreeLevel | null;
  target_countries: string[];
  funding_preference: FundingType | null;
}

/** Response shape of POST /api/investigation/{id}/message and POST /api/evidence. */
export interface EngineTurnResponse {
  assistantMessage: ChatMessage;
  result: InvestigationResult | null;
  mode: "internal_engine" | "external_backend" | "mock_demo";
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  pending_more_info: "Needs More Info",
};

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  needs_verification: "Needs Verification",
  not_found: "Not Found in Our Data",
  conflicts: "Conflicts With Known Information",
  not_applicable: "Not Applicable",
};
