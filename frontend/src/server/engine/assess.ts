import type {
  AgentFinding,
  ChatMessage,
  ClaimAnalysis,
  DegreeLevel,
  FundingType,
  InvestigationResult,
  Language,
  OfficialSource,
  PaymentFinding,
  ProgramFinding,
  ProgressStep,
  RiskLevel,
  RiskSignal,
  ScholarshipFinding,
  UniversityFinding,
  VerificationCheck,
  VerificationStatus,
} from "@/types";
import { formatPkr, type ExtractedFacts } from "@/server/engine/extract";
import { t } from "@/server/engine/phrases";
import {
  matchAgent,
  matchChannels,
  matchCommunity,
  matchProgram,
  matchScholarship,
  matchUniversity,
  type loadVerificationData,
} from "@/server/repositories/verification";

type VerificationData = Awaited<ReturnType<typeof loadVerificationData>>;

export interface AssessmentContext {
  facts: ExtractedFacts;
  data: VerificationData;
  /** Full text of student messages + evidence, used for dataset matching. */
  corpus: string;
  /**
   * Optional override for dataset matching. Used when the student edits a field
   * in the investigation profile: the backend should trust the student's value
   * over anything mentioned earlier in the conversation.
   */
  matchText?: string;
  /**
   * Names the student typed directly into the investigation profile. They are
   * shown even when no dataset record matches, so an unknown scholarship,
   * consultant or university still appears as "needs verification" instead of
   * silently disappearing from the result.
   */
  suppliedNames?: {
    university?: string | null;
    scholarship?: string | null;
    agent?: string | null;
    program?: string | null;
  };
  investigationId: string;
  language: Language;
  explicitDegree: DegreeLevel | null;
  explicitFunding: FundingType | null;
  evidenceCount: number;
}

export interface AssessmentOutput {
  result: InvestigationResult;
  replyText: string;
  stillNeed: string[];
  phase: "gathering" | "assessed";
  extracted: {
    country: string | null;
    degreeLevel: DegreeLevel | null;
    university: string | null;
    program: string | null;
    scholarship: string | null;
    agent: string | null;
    fundingType: FundingType | null;
  };
}

const ok = (label: string, detail?: string | null): VerificationCheck => ({
  label,
  status: "ok",
  detail: detail ?? undefined,
});
const warn = (label: string, detail?: string | null): VerificationCheck => ({
  label,
  status: "warn",
  detail: detail ?? undefined,
});
const fail = (label: string, detail?: string | null): VerificationCheck => ({
  label,
  status: "fail",
  detail: detail ?? undefined,
});
const unknown = (label: string, detail?: string | null): VerificationCheck => ({
  label,
  status: "unknown",
  detail: detail ?? undefined,
});

const verdictText = (status: VerificationStatus, language: Language): string => {
  if (status === "verified") return t("verified", language);
  if (status === "not_found") return t("not_found", language);
  if (status === "conflicts") return t("conflicts", language);
  if (status === "not_applicable") return "—";
  return t("needs_verification", language);
};

export function runAssessment(ctx: AssessmentContext): AssessmentOutput {
  const { facts, data, corpus } = ctx;
  const language = ctx.facts.language ?? ctx.language;

  // When the student edits a field in the profile, the backend matches against
  // their value first instead of the whole conversation history.
  const matchText = ctx.matchText ?? corpus;
  const uniMatch = matchUniversity(data, matchText);
  const schMatch = matchScholarship(data, matchText);
  const agentMatch = matchAgent(data, matchText);
  const progMatch = matchProgram(data, matchText, uniMatch?.row.name ?? null);
  const community = agentMatch
    ? matchCommunity(data, agentMatch.row.agentName, agentMatch.row.companyName)
    : null;

  const degreeLevel: DegreeLevel | null = ctx.explicitDegree ?? facts.degreeLevel;
  const country = facts.country ?? uniMatch?.row.country ?? null;
  const channelRow = matchChannels(data, country);

  /* ---------------------------------------------------------------- university */
  let university: UniversityFinding | null = null;
  if (uniMatch) {
    const row = uniMatch.row;
    const hasSite = Boolean(row.officialWebsite);
    const agentClaimUnconfirmed =
      facts.claimsOfficialRepresentation === true && agentMatch?.row.status !== "verified";

    university = {
      name: row.name,
      country: row.country,
      status: hasSite ? "verified" : "not_found",
      official_website: row.officialWebsite,
      application_portal: row.applicationPortal,
      program_types: row.programTypes ?? [],
      accepts_direct_applications: row.acceptsDirectApplications,
      notes: row.notes,
      checks: hasSite
        ? [
            ok("University record found in our verification dataset"),
            ok("Official website identified", row.officialWebsite ?? undefined),
            row.applicationPortal
              ? ok("Official application portal identified", row.applicationPortal)
              : unknown("No application portal on record"),
            row.acceptsDirectApplications
              ? ok("Direct application is possible — an agent is not required")
              : unknown("Application route needs confirmation"),
            agentClaimUnconfirmed
              ? warn("Agent relationship with this university could not be confirmed")
              : unknown("Agent relationship with this university not checked"),
          ]
        : [
            fail("No official website could be matched to this name in our data"),
            unknown("No application portal on record"),
            warn("Any claim tied to this institution needs independent verification"),
          ],
    };
  }

  /* ------------------------------------------------------------------- program */
  let program: ProgramFinding | null = null;
  const programTouched =
    Boolean(progMatch) || Boolean(facts.programName) || Boolean(facts.degreeLevel) || Boolean(facts.programHint);
  if (programTouched) {
    const sameUni = Boolean(uniMatch && progMatch && progMatch.row.universityName === uniMatch.row.name);
    if (progMatch && (sameUni || !uniMatch)) {
      const listed = progMatch.row.availability === "listed";
      program = {
        name: progMatch.row.name,
        degree_level: progMatch.row.degreeLevel as DegreeLevel,
        status: listed ? "verified" : "needs_verification",
        university: progMatch.row.universityName,
        availability: listed ? "Program listed in our dataset" : "Programme availability needs confirmation",
        application_method: progMatch.row.applicationMethod,
        notes: progMatch.row.notes,
        checks: [
          listed
            ? ok("Program found in our dataset for this university")
            : warn("Program listed with 'needs confirmation' status"),
          ok("Application method on record", progMatch.row.applicationMethod),
          facts.mentionsVisa ? warn("Visa outcomes are never guaranteed by a program offer") : unknown("No visa claim made"),
        ],
      };
    } else if (progMatch && uniMatch && !sameUni) {
      program = {
        name: progMatch.row.name,
        degree_level: progMatch.row.degreeLevel as DegreeLevel,
        status: "needs_verification",
        university: uniMatch.row.name,
        availability: `A program with this name is on record at ${progMatch.row.universityName} — confirm it is offered at ${uniMatch.row.name}`,
        application_method: progMatch.row.applicationMethod,
        notes: progMatch.row.notes,
        checks: [
          warn(`This program name matched a record at ${progMatch.row.universityName}, not ${uniMatch.row.name}`),
          warn("Confirm the exact program name on the university's official course page"),
        ],
      };
    } else {
      program = {
        name: facts.programName,
        degree_level: degreeLevel,
        status: "needs_verification",
        university: uniMatch?.row.name ?? null,
        availability: null,
        application_method: null,
        notes: "No program record matched the details provided.",
        checks: [
          unknown("Program name not confirmed against our dataset"),
          warn("Confirm the program exists on the university's official website"),
        ],
      };
    }
  }

  /* --------------------------------------------------------------- scholarship */
  let scholarship: ScholarshipFinding | null = null;
  const paymentIsForScholarship =
    Boolean(facts.paymentPurpose && facts.paymentPurpose.toLowerCase().includes("scholarship")) ||
    (facts.mentionsScholarship && facts.paymentAmountPkr !== null);
  if (facts.mentionsScholarship || schMatch) {
    if (schMatch) {
      const row = schMatch.row;
      scholarship = {
        name: row.name,
        provider: row.fundedBy,
        country: row.country,
        eligible_levels: row.eligibleLevels ?? [],
        funding_type: (row.fundingType as FundingType) ?? facts.fundingType,
        application_route: row.applicationRoute,
        official_website: row.officialWebsite,
        application_portal: row.applicationPortal,
        status: paymentIsForScholarship ? "conflicts" : "verified",
        notes: row.notes,
        checks: [
          ok("Scholarship found in our verification dataset"),
          ok("Official scholarship source identified", row.officialWebsite),
          ok("Application route on record", row.applicationRoute),
          paymentIsForScholarship
            ? fail("A fee is being charged for a scholarship that our data records as free to apply for")
            : ok("Funding description is broadly consistent with our record"),
          facts.guarantees.scholarship
            ? fail("A guaranteed scholarship outcome was claimed — no provider can guarantee this")
            : unknown("No guarantee claim made"),
        ],
      };
    } else {
      const suppliedScholarship = ctx.suppliedNames?.scholarship ?? null;
      scholarship = {
        name: suppliedScholarship,
        provider: null,
        country,
        eligible_levels: degreeLevel ? [degreeLevel] : [],
        funding_type: facts.fundingType ?? ctx.explicitFunding,
        application_route: null,
        official_website: null,
        application_portal: null,
        status: "needs_verification",
        notes: suppliedScholarship
          ? "This scholarship name is not in our verification dataset. It may still be genuine — confirm it directly with the provider."
          : "No scholarship name was provided, so it could not be matched against our dataset.",
        checks: [
          suppliedScholarship
            ? warn(`No record found for the scholarship named "${suppliedScholarship}"`)
            : unknown("Scholarship name not provided"),
          warn("No official scholarship reference supplied"),
          facts.guarantees.scholarship
            ? fail("A guaranteed scholarship outcome was claimed — no provider can guarantee this")
            : unknown("No guarantee claim made"),
        ],
      };
    }
  }

  /* --------------------------------------------------------------------- agent */
  let agent: AgentFinding | null = null;
  if (agentMatch || facts.agentInvolved) {
    if (agentMatch) {
      const row = agentMatch.row;
      const status: VerificationStatus =
        row.status === "verified" ? "verified" : row.status === "not_found" ? "not_found" : "needs_verification";
      agent = {
        name: row.agentName,
        company: row.companyName,
        city: row.city,
        claimed_universities: row.claimedUniversities ?? [],
        contact_info: row.contactInfo,
        status,
        claims_official_representation: facts.claimsOfficialRepresentation,
        verification_date: row.verificationDate,
        notes: row.notes,
        checks: [
          status === "verified"
            ? ok("Listed as an official recruitment partner in our dataset")
            : status === "not_found"
              ? fail("No matching agent or company record found in our dataset")
              : warn("Company details found, but official partner status is unconfirmed"),
          facts.claimsOfficialRepresentation === true
            ? status === "verified"
              ? ok("Claim of official representation is consistent with our record")
              : fail("Claim of official representation could not be confirmed")
            : unknown("No claim of official representation made"),
          (row.claimedUniversities ?? []).length > 0
            ? unknown(
                "Claimed universities on record",
                (row.claimedUniversities ?? []).join(", "),
              )
            : unknown("No claimed university list on record"),
        ],
      };
    } else {
      const suppliedAgent = ctx.suppliedNames?.agent ?? null;
      agent = {
        name: suppliedAgent,
        company: null,
        city: null,
        claimed_universities: [],
        contact_info: null,
        status: "needs_verification",
        claims_official_representation: facts.claimsOfficialRepresentation,
        verification_date: null,
        notes: suppliedAgent
          ? "No matching consultant or company record was found in our dataset. This is not an accusation — it means the affiliation could not be verified here."
          : "A consultant or agent was mentioned, but no name or company was provided.",
        checks: [
          suppliedAgent
            ? warn(`No matching record for "${suppliedAgent}" in our dataset`)
            : unknown("Consultant name and company not provided"),
          warn("Affiliation could not be checked without a name"),
          facts.claimsOfficialRepresentation === true
            ? fail("Claim of official representation could not be confirmed")
            : unknown("No claim of official representation made"),
        ],
      };
    }
  }

  /* ------------------------------------------------------------------- payment */
  const paymentTouched =
    facts.paymentAmountPkr !== null ||
    facts.mentionsPayment ||
    facts.paymentPurpose !== null ||
    facts.recipientType !== "unknown";

  let payment: PaymentFinding | null = null;
  const paymentReasons: string[] = [];
  let paymentRisk: RiskLevel = "pending_more_info";

  if (paymentTouched) {
    const amount = facts.paymentAmountPkr;
    if (amount !== null && amount >= 400_000) {
      paymentReasons.push(`Large upfront amount requested (PKR ${formatPkr(amount)})`);
    } else if (amount !== null && amount >= 150_000) {
      paymentReasons.push(`Substantial upfront amount requested (PKR ${formatPkr(amount)})`);
    }
    if (facts.recipientType === "personal") {
      paymentReasons.push("Payment requested to a personal account rather than an organisation");
    }
    if (facts.urgency) paymentReasons.push("Urgency detected — pressure to pay quickly");
    if (!facts.hasInvoice) paymentReasons.push("No written itemised invoice provided");
    if (facts.paymentPurpose) paymentReasons.push(`Stated purpose: ${facts.paymentPurpose}`);
    if (amount === null) paymentReasons.push("Amount not clearly stated");

    paymentRisk =
      facts.recipientType === "personal"
        ? "high"
        : amount !== null && amount >= 400_000 && facts.urgency
          ? "high"
          : paymentReasons.length > 0
            ? "medium"
            : "low";

    payment = {
      amount_pkr: amount,
      amount_display: facts.paymentAmountDisplay,
      purpose: facts.paymentPurpose ?? "Purpose not clearly stated",
      recipient:
        facts.recipientType === "personal"
          ? "Personal bank / mobile account"
          : facts.recipientType === "institutional"
            ? "Institutional / company account (as described)"
            : "Recipient not clearly identified",
      recipient_type: facts.recipientType,
      invoice: facts.hasInvoice ? "provided" : "not_provided",
      urgency: facts.urgency,
      risk: paymentRisk,
      reasons: paymentReasons,
      recommendation: t("a_do_not_pay_yet", language),
    };
  }

  /* ---------------------------------------------------------- fraud patterns */
  const signals: RiskSignal[] = [];
  const push = (signal: RiskSignal) => signals.push(signal);

  if (facts.guarantees.admission) {
    push({
      category: "claims",
      severity: "high",
      title: "Guaranteed admission claim",
      explanation:
        "No university or agent can guarantee admission before an application is assessed. This is one of the most common study-abroad fraud patterns reported by Pakistani students.",
    });
  }
  if (facts.guarantees.visa) {
    push({
      category: "claims",
      severity: "high",
      title: "Guaranteed visa claim",
      explanation:
        "Visa decisions are made only by the embassy or immigration authority of the destination country. A guaranteed visa claim is not possible and is a strong warning signal.",
    });
  }
  if (facts.guarantees.scholarship) {
    push({
      category: "scholarship",
      severity: "high",
      title: "Guaranteed / 100% scholarship claim",
      explanation:
        "Scholarships are competitive and decided by the provider after assessment. A '100% guaranteed scholarship' claim cannot be true, even when a real scholarship name is used.",
    });
  }
  if (scholarship?.status === "conflicts") {
    push({
      category: "scholarship",
      severity: "high",
      title: "Funding claim conflicts with our scholarship record",
      explanation: `Our dataset records ${scholarship.name} as: ${scholarship.application_route ?? "direct application"}, at no cost. A payment being requested in connection with it conflicts with that record — this is not proof of fraud, but it must be resolved with the provider directly.`,
    });
  }
  if (facts.recipientType === "personal") {
    push({
      category: "payment",
      severity: "high",
      title: "Personal account payment requested",
      explanation:
        "Legitimate universities and registered consultancies normally receive fees in an organisational account with an invoice. A personal bank, JazzCash or EasyPaisa request for a large study-abroad payment is a major warning signal.",
    });
  }
  if (facts.urgency && facts.paymentAmountPkr !== null) {
    push({
      category: "payment",
      severity: "medium",
      title: "Urgent payment pressure",
      explanation:
        "Artificial deadlines ('pay today', 'offer expires tonight') are used to stop students from verifying. Real admission and scholarship deadlines are published officially.",
    });
  }
  if (facts.paymentAmountPkr !== null && facts.paymentAmountPkr >= 400_000 && !facts.hasInvoice) {
    push({
      category: "payment",
      severity: "medium",
      title: "Large payment requested without documentation",
      explanation:
        "A large amount is being requested before an itemised invoice, offer letter or scholarship letter has been provided.",
    });
  }
  if (facts.claimsOfficialRepresentation === true && agentMatch?.row.status !== "verified") {
    push({
      category: "agent",
      severity: "high",
      title: "Claim of official university representation could not be confirmed",
      explanation:
        "The claim that this consultant officially represents the university could not be confirmed in our dataset. Universities publish their authorised representatives — confirm directly with the admissions office.",
    });
  }
  if (agentMatch?.row.status === "not_found") {
    push({
      category: "agent",
      severity: "medium",
      title: "No matching agent record found",
      explanation:
        "We could not find a matching agent or company record in our dataset. This is not proof of fraud, but it means affiliation and registration are unverified.",
    });
  }
  if (facts.agentInvolved && !agentMatch) {
    push({
      category: "agent",
      severity: "medium",
      title: "Consultant identity unknown",
      explanation:
        "A consultant is involved but their name and company were not provided, so nothing about them could be checked.",
    });
  }
  if (university?.status === "not_found") {
    push({
      category: "university",
      severity: "medium",
      title: "University could not be matched in our data",
      explanation:
        "We could not match this institution to a verified record. Confirm it exists as an accredited, degree-awarding institution using the official channel for that country.",
    });
  }
  if (facts.mentionsUniversity && !uniMatch) {
    push({
      category: "university",
      severity: "medium",
      title: "University name not provided or unclear",
      explanation:
        "A university was mentioned, but the name could not be matched to our dataset. Verification is not possible without the exact name.",
    });
  }
  if (facts.avoidOfficialChannels) {
    push({
      category: "claims",
      severity: "high",
      title: "Being steered away from official channels",
      explanation:
        "Students are advised to keep the university, embassy and scholarship provider in the loop. Requests to avoid official channels are a known fraud pattern.",
    });
  }
  if (program && program.status === "needs_verification") {
    push({
      category: "program",
      severity: "low",
      title: "Program details not confirmed",
      explanation:
        "The program name or availability could not be confirmed against our dataset. Check the official course page before paying anything.",
    });
  }
  if (ctx.evidenceCount === 0) {
    push({
      category: "documents",
      severity: "low",
      title: "No evidence reviewed yet",
      explanation:
        "No message, offer letter or invoice has been shared yet, so claims are being assessed only from your description.",
    });
  }
  if (facts.links.length > 0 && university?.official_website) {
    const officialHost = new URL(university.official_website).hostname.replace(/^www\./, "");
    const brandToken = officialHost.split(".")[0];
    const suspicious = facts.links.filter((link) => {
      try {
        const host = new URL(link.startsWith("http") ? link : `https://${link}`)
          .hostname.replace(/^www\./, "");
        if (host === officialHost || host.endsWith(`.${officialHost}`)) return false;
        // Lookalike pattern: same brand name, different domain (e.g. tum-admissions-apply.online)
        return brandToken.length >= 4 && host.includes(brandToken);
      } catch {
        return false;
      }
    });
    if (suspicious.length > 0) {
      push({
        category: "documents",
        severity: "medium",
        title: "Link domain looks similar to the official one",
      explanation:
        "A link you shared uses a domain that contains the university's name but is not the official domain we have on record. Lookalike domains are a common pattern in fake offer and scholarship messages — open the official website yourself instead of using a link that was sent to you.",
      });
    }
  }

  /* ------------------------------------------------------------ claim analysis */
  const claimAnalysis: ClaimAnalysis[] = [];
  if (facts.guarantees.admission) {
    claimAnalysis.push({
      claim: "Admission is guaranteed",
      verdict: "conflicts",
      explanation: "Admission decisions are made by the university's admissions committee after assessment.",
    });
  }
  if (facts.guarantees.visa) {
    claimAnalysis.push({
      claim: "Visa is guaranteed",
      verdict: "conflicts",
      explanation: "Only the destination country's embassy or immigration authority decides visa outcomes.",
    });
  }
  if (facts.guarantees.scholarship) {
    claimAnalysis.push({
      claim: "Scholarship is 100% guaranteed",
      verdict: "conflicts",
      explanation: "Scholarship providers select candidates competitively; guarantees are not possible.",
    });
  }
  if (paymentIsForScholarship && schMatch) {
    claimAnalysis.push({
      claim: `A fee is required to get ${schMatch.row.name}`,
      verdict: "conflicts",
      explanation: `Our record shows this scholarship is applied for directly and free of charge.`,
    });
  }
  if (facts.claimsOfficialRepresentation === true && agentMatch?.row.status !== "verified") {
    claimAnalysis.push({
      claim: "The consultant officially represents the university",
      verdict: "needs_verification",
      explanation: "This claim could not be confirmed in our dataset. Verify with the university's admissions office in writing.",
    });
  }
  if (schMatch && facts.fundingType && facts.fundingType !== schMatch.row.fundingType) {
    claimAnalysis.push({
      claim: `Funding described as ${facts.fundingType.replace(/_/g, " ")}`,
      verdict: "needs_verification",
      explanation: `Our record lists this scholarship as ${String(schMatch.row.fundingType).replace(/_/g, " ")}. Confirm the funding details on the official page.`,
    });
  }
  if (facts.paymentAmountPkr !== null) {
    claimAnalysis.push({
      claim: `Payment of ${facts.paymentAmountDisplay ?? `PKR ${formatPkr(facts.paymentAmountPkr)}`} is required`,
      verdict: facts.recipientType === "personal" ? "conflicts" : "needs_verification",
      explanation:
        facts.recipientType === "personal"
          ? "The money is requested in a personal account, which is not how universities or registered companies normally collect fees."
          : "The purpose and recipient of this payment still need to be confirmed in writing before any transfer.",
    });
  }

  /* ---------------------------------------------------------------- risk level */
  const anchors = [
    Boolean(uniMatch),
    Boolean(agentMatch),
    facts.paymentAmountPkr !== null,
    Boolean(schMatch),
    facts.agentInvolved,
    facts.mentionsScholarship,
    facts.mentionsUniversity,
  ].filter(Boolean).length;

  const hasGuarantee =
    facts.guarantees.admission || facts.guarantees.visa || facts.guarantees.scholarship;
  const canAssess = anchors >= 2 || (anchors >= 1 && (hasGuarantee || facts.paymentAmountPkr !== null));

  const highCount = signals.filter((s) => s.severity === "high").length;
  const mediumCount = signals.filter((s) => s.severity === "medium").length;

  let overallRisk: RiskLevel;
  if (!canAssess) {
    overallRisk = "pending_more_info";
  } else if (highCount > 0) {
    overallRisk = "high";
  } else if (mediumCount > 0) {
    overallRisk = "medium";
  } else {
    overallRisk = "low";
  }

  /* -------------------------------------------------------------- still needed */
  const stillNeed: string[] = [];
  if (!uniMatch && !facts.mentionsUniversity) stillNeed.push(t("q_university", language));
  if (!uniMatch && facts.mentionsUniversity) stillNeed.push(t("q_university", language));
  if (facts.agentInvolved && !agentMatch) stillNeed.push(t("q_agent", language));
  if (facts.mentionsScholarship && !schMatch) stillNeed.push(t("q_scholarship", language));
  if (paymentTouched && !facts.paymentPurpose) stillNeed.push(t("q_payment_purpose", language));
  if (paymentTouched && facts.recipientType === "unknown") stillNeed.push(t("q_recipient", language));
  if (!degreeLevel) stillNeed.push(t("q_degree", language));
  if (ctx.evidenceCount === 0) stillNeed.push(t("q_evidence", language));

  /* ------------------------------------------------------------- official links */
  const officialSources: OfficialSource[] = [];
  if (university?.official_website) {
    officialSources.push({
      title: `${university.name} — official website`,
      url: university.official_website,
      source: "university",
    });
  }
  if (university?.application_portal) {
    officialSources.push({
      title: `${university.name} — official application portal`,
      url: university.application_portal,
      source: "university",
    });
  }
  if (scholarship?.official_website) {
    officialSources.push({
      title: `${scholarship.name} — official scholarship source`,
      url: scholarship.official_website,
      source: "scholarship",
    });
  }
  if (schMatch?.row.applicationPortal) {
    officialSources.push({
      title: `${schMatch.row.name} — official application portal`,
      url: schMatch.row.applicationPortal,
      source: "scholarship",
    });
  }
  for (const channel of channelRow?.channels ?? []) {
    officialSources.push({ title: `${channelRow?.country}: ${channel.name}`, url: channel.url, source: "country" });
  }

  /* ------------------------------------------------------------------ progress */
  const progress: ProgressStep[] = [
    { key: "understand", label: "Understanding your situation", state: "done" },
    { key: "extract", label: "Extracting claims from what you shared", state: "done" },
    {
      key: "university",
      label: "Checking university records",
      state: uniMatch ? "done" : facts.mentionsUniversity ? "pending" : "skipped",
      detail: uniMatch ? `Matched: ${uniMatch.row.name}` : "No match found in our dataset",
    },
    {
      key: "program",
      label: "Checking program records",
      state: progMatch ? "done" : programTouched ? "pending" : "skipped",
      detail: progMatch ? `Matched: ${progMatch.row.name}` : "Program not matched",
    },
    {
      key: "scholarship",
      label: "Checking scholarship records",
      state: schMatch ? "done" : facts.mentionsScholarship ? "pending" : "skipped",
      detail: schMatch ? `Matched: ${schMatch.row.name}` : "No scholarship name to match",
    },
    {
      key: "agent",
      label: "Checking agent / consultancy records",
      state: agentMatch ? "done" : facts.agentInvolved ? "pending" : "skipped",
      detail: agentMatch ? `Matched: ${agentMatch.row.agentName}` : "No agent name to match",
    },
    {
      key: "payment",
      label: "Analysing the payment request",
      state: paymentTouched ? "done" : "skipped",
      detail: payment ? payment.amount_display ?? payment.purpose ?? undefined : "No payment mentioned",
    },
    {
      key: "recommendations",
      label: "Preparing recommendations",
      state: canAssess ? "done" : "pending",
    },
  ];

  /* --------------------------------------------------------------- recommended */
  const recommendedActions: string[] = [];
  if (university?.official_website) recommendedActions.push(t("a_verify_university", language));
  if (program) recommendedActions.push(t("a_confirm_program", language));
  if (scholarship) {
    recommendedActions.push(t("a_confirm_scholarship", language));
    if (schMatch && paymentIsForScholarship) recommendedActions.push(t("a_free_scholarship", language));
  }
  if (agent) recommendedActions.push(t("a_verify_agent", language));
  if (payment && !facts.hasInvoice) recommendedActions.push(t("a_request_invoice", language));
  if (hasGuarantee) recommendedActions.push(t("a_no_guarantees", language));
  if (payment && (facts.recipientType === "personal" || paymentRisk === "high")) {
    recommendedActions.push(t("a_do_not_pay_yet", language));
  }
  if (university?.application_portal) recommendedActions.push(t("a_use_official_portal", language));
  if (facts.links.length > 0) recommendedActions.push(t("a_check_domain", language));
  if (ctx.evidenceCount === 0) recommendedActions.push(t("a_send_evidence", language));

  const riskFactors = signals
    .filter((s) => s.severity !== "low")
    .map((s) => `${s.title} — ${s.explanation}`);

  const confidence =
    overallRisk === "pending_more_info"
      ? "Not enough information yet"
      : stillNeed.length > 0
        ? "Needs further verification"
        : highCount + mediumCount > 0
          ? "Moderate — based on the verification data available to us"
          : "Good — key claims matched our verification dataset";

  const summary =
    overallRisk === "high"
      ? t("summary_high", language)
      : overallRisk === "medium"
        ? t("summary_medium", language)
        : overallRisk === "low"
          ? t("summary_low", language)
          : t("summary_pending", language);

  const result: InvestigationResult = {
    investigation_id: ctx.investigationId,
    language,
    overall_risk: overallRisk,
    confidence,
    summary,
    verification: {
      university: university?.status ?? "not_applicable",
      program: program?.status ?? "not_applicable",
      scholarship: scholarship?.status ?? "not_applicable",
      agent: agent?.status ?? "not_applicable",
      payment: !payment
        ? "not_applicable"
        : payment.risk === "high"
          ? "high_risk_signal"
          : payment.risk === "medium"
            ? "needs_verification"
            : "consistent",
    },
    university,
    program,
    scholarship,
    agent,
    payment,
    community_signals: community
      ? {
          rating: community.rating,
          report_count: community.reportCount,
          common_complaints: community.commonComplaints ?? [],
          data_label: community.dataLabel,
        }
      : null,
    risk_signals: signals,
    claim_analysis: claimAnalysis,
    risk_factors: riskFactors.length > 0 ? riskFactors : signals.map((s) => `${s.title} — ${s.explanation}`),
    recommended_action:
      payment && (facts.recipientType === "personal" || paymentRisk === "high")
        ? t("a_do_not_pay_yet", language)
        : agent && facts.claimsOfficialRepresentation === true
          ? t("a_verify_agent", language)
          : scholarship
            ? t("a_confirm_scholarship", language)
            : university
              ? t("a_verify_university", language)
              : null,
    recommended_actions: recommendedActions.length > 0 ? recommendedActions : [t("a_send_evidence", language)],
    official_sources: officialSources,
    safer_alternatives: officialSources.map((source) => `${source.title} — ${source.url}`),
    still_need: stillNeed.slice(0, 4),
    progress,
    data_notes: [
      "Verification statements are limited to the curated dataset available to this assistant — it is not a complete global database.",
      "AI analysis is not official university, embassy or government verification.",
    ],
    generated_at: new Date().toISOString(),
  };

  const replyText = canAssess
    ? buildAssessedReply({
        language,
        result,
        university,
        program,
        scholarship,
        agent,
        payment,
        community: community
          ? { rating: community.rating, report_count: community.reportCount }
          : null,
      })
    : buildGatheringReply({ language, facts, stillNeed, university });

  return {
    result,
    replyText,
    stillNeed: canAssess ? result.still_need : stillNeed.slice(0, 4),
    phase: canAssess ? "assessed" : "gathering",
    extracted: {
      country,
      degreeLevel,
      university: university?.name ?? null,
      program: program?.name ?? facts.programName,
      scholarship: scholarship?.name ?? null,
      agent: agent?.company ?? agent?.name ?? null,
      fundingType: scholarship?.funding_type ?? facts.fundingType ?? ctx.explicitFunding,
    },
  };
}

function buildAssessedReply(input: {
  language: Language;
  result: InvestigationResult;
  university: UniversityFinding | null;
  program: ProgramFinding | null;
  scholarship: ScholarshipFinding | null;
  agent: AgentFinding | null;
  payment: PaymentFinding | null;
  community: { rating: number | null; report_count: number | null } | null;
}): string {
  const { language, result } = input;
  const lines: string[] = [];
  lines.push(t("ack", language));
  lines.push("");
  lines.push(`${t("checked", language)}:`);
  if (input.university) {
    lines.push(`• University — ${input.university.name}: ${verdictText(input.university.status, language)}`);
  }
  if (input.program) {
    lines.push(
      `• Program — ${input.program.name ?? "not specified"}: ${verdictText(input.program.status, language)}`,
    );
  }
  if (input.scholarship) {
    lines.push(
      `• Scholarship — ${input.scholarship.name ?? "name not provided"}: ${verdictText(input.scholarship.status, language)}`,
    );
  }
  if (input.agent) {
    lines.push(
      `• Agent — ${input.agent.company ?? input.agent.name ?? "name not provided"}: ${verdictText(input.agent.status, language)}`,
    );
  }
  if (input.payment) {
    lines.push(
      `• Payment — ${input.payment.amount_display ?? "amount unclear"}: ${input.payment.risk === "high" ? "HIGH RISK" : input.payment.risk === "medium" ? "needs verification" : "no strong signal"}`,
    );
  }
  if (input.community && input.community.report_count) {
    lines.push(
      `• Community signals — ⭐ ${input.community.rating ?? "—"}/5 from ${input.community.report_count} user reports (unverified, supporting signal only)`,
    );
  }
  lines.push("");
  lines.push(
    `${t("risk_heading", language)}: ${result.overall_risk === "high" ? "🔴 HIGH" : result.overall_risk === "medium" ? "🟡 MEDIUM" : result.overall_risk === "low" ? "🟢 LOW" : "🟠 MORE INFO NEEDED"}`,
  );
  if (result.risk_factors.length > 0) {
    lines.push("");
    lines.push(`${t("why_flagged", language)}:`);
    for (const factor of result.risk_factors.slice(0, 5)) lines.push(`• ${factor}`);
  }
  if (result.recommended_action) {
    lines.push("");
    lines.push(`${t("next_step", language)}: ${result.recommended_action}`);
  }
  lines.push("");
  lines.push(t("continue_note", language));
  lines.push("");
  lines.push(t("ai_note", language));
  return lines.join("\n");
}

function buildGatheringReply(input: {
  language: Language;
  facts: ExtractedFacts;
  stillNeed: string[];
  university: UniversityFinding | null;
}): string {
  const { language, facts, stillNeed } = input;
  const lines: string[] = [];
  const understood: string[] = [];
  if (facts.country) understood.push(facts.country);
  if (facts.degreeLevel) understood.push(facts.degreeLevel);
  if (input.university) understood.push(input.university.name);
  else if (facts.programName) understood.push(facts.programName);
  if (facts.agentInvolved) understood.push("consultant involved");
  if (facts.paymentAmountDisplay) understood.push(facts.paymentAmountDisplay);
  if (facts.mentionsScholarship) understood.push("scholarship claimed");

  if (understood.length > 0) {
    lines.push(`Noted: ${understood.join(" · ")}.`);
  }
  lines.push(t("summary_pending", language));
  lines.push("");
  if (stillNeed.length > 0) {
    lines.push(t("ask_heading", language));
    stillNeed.forEach((question, index) => lines.push(`${index + 1}. ${question}`));
    lines.push("");
  }
  lines.push(t("send_more", language));
  return lines.join("\n");
}

/**
 * Only the student's own words (and their evidence) drive extraction — the
 * assistant's own replies must never create new "facts" about the case.
 */
export function messagesToCorpus(messages: ChatMessage[]): string {
  return messages
    .filter((message) => message.role === "student")
    .map((message) => {
      const attachmentNotes = (message.attachments ?? [])
        .map((a) => [a.label, a.note].filter(Boolean).join(" "))
        .join(" ");
      return `${message.text} ${attachmentNotes}`;
    })
    .join("\n");
}
