import type { DegreeLevel, FundingType, Language } from "@/types";

/** Facts the engine was able to pull out of the student's own words + evidence. */
export interface ExtractedFacts {
  language: Language;
  country: string | null;
  degreeLevel: DegreeLevel | null;
  programName: string | null;
  programHint: string | null;
  universityHint: string | null;
  scholarshipHint: string | null;
  agentHint: string | null;
  agentInvolved: boolean;
  claimsOfficialRepresentation: boolean | null;
  fundingType: FundingType | null;
  mentionsScholarship: boolean;
  mentionsUniversity: boolean;
  mentionsPayment: boolean;
  mentionsVisa: boolean;
  hasOfferLetter: boolean;
  hasScholarshipLetter: boolean;
  hasInvoice: boolean;
  paymentAmountPkr: number | null;
  paymentAmountDisplay: string | null;
  paymentPurpose: string | null;
  recipientType: "personal" | "institutional" | "unknown";
  urgency: boolean;
  guarantees: {
    admission: boolean;
    visa: boolean;
    scholarship: boolean;
    generic: boolean;
  };
  avoidOfficialChannels: boolean;
  links: string[];
  wordCount: number;
}

const URDU_SCRIPT = /[\u0600-\u06FF]/;

const ROMAN_URDU_MARKERS = [
  "hai",
  "hain",
  "hoga",
  "hogi",
  "ka",
  "ki",
  "ke",
  "ko",
  "se",
  "mein",
  "main",
  "karna",
  "karni",
  "karne",
  "chahiye",
  "paise",
  "lakh",
  "lac",
  "nahi",
  "haan",
  "aap",
  "maine",
  "mujhe",
  "kya",
  "kyun",
  "kyo",
  "bhai",
  "sab",
  "dena",
  "deni",
  "raha",
  "rahi",
  "wallah",
  "yaar",
  "matlab",
  "acha",
  "theek",
  "abhi",
  "pehle",
  "baad",
  "zaroori",
  "bheja",
  "maang",
  "university",
  "visa",
];

export function detectLanguage(text: string): Language {
  const sample = text.trim();
  if (!sample) return "english";
  if (URDU_SCRIPT.test(sample)) return "urdu";

  const words = normalize(sample).split(" ").filter(Boolean);
  if (words.length === 0) return "english";
  const hits = words.filter((w) => ROMAN_URDU_MARKERS.includes(w)).length;
  return hits / words.length >= 0.12 || hits >= 3 ? "roman_urdu" : "english";
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTRY_PATTERNS: { country: string; tokens: string[] }[] = [
  { country: "Germany", tokens: ["germany", "germany", "german", "almaniya", "jamani", "jermani", "deutschland", "german"] },
  { country: "United Kingdom", tokens: ["uk", "united kingdom", "britain", "england", "london", "scotland", "wales"] },
  { country: "United States", tokens: ["usa", "us", "united states", "america", "amrica", "usa"] },
  { country: "Canada", tokens: ["canada"] },
  { country: "Australia", tokens: ["australia"] },
  { country: "Türkiye", tokens: ["turkey", "turkiye", "turkey", "turkiya"] },
  { country: "Singapore", tokens: ["singapore"] },
  { country: "Saudi Arabia", tokens: ["saudi arabia", "saudi", "ksa"] },
  { country: "Malaysia", tokens: ["malaysia"] },
  { country: "Sweden", tokens: ["sweden"] },
  { country: "Netherlands", tokens: ["netherlands", "holland"] },
  { country: "Ireland", tokens: ["ireland"] },
  { country: "Italy", tokens: ["italy", "italy"] },
  { country: "China", tokens: ["china", "china"] },
  { country: "Hungary", tokens: ["hungary"] },
  { country: "South Korea", tokens: ["south korea", "korea"] },
  { country: "Japan", tokens: ["japan"] },
  { country: "New Zealand", tokens: ["new zealand"] },
  { country: "United Arab Emirates", tokens: ["uae", "dubai", "emirates"] },
];

function detectCountry(norm: string): string | null {
  for (const entry of COUNTRY_PATTERNS) {
    for (const token of entry.tokens) {
      const pattern = new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
      if (pattern.test(norm)) return entry.country;
    }
  }
  return null;
}

function detectDegreeLevel(norm: string): DegreeLevel | null {
  if (/(^|\s)(phd|ph d|ph\.d|doctorate|doctoral)(\s|$)/.test(norm)) return "PhD";
  if (/(^|\s)(ms|msc|m sc|m s|mphil|m phil|masters|master|postgraduate|msc)(\s|$)/.test(norm)) {
    return "MS";
  }
  if (/(^|\s)(bs|bsc|b sc|bachelors|bachelor|undergraduate|bba|bscs|be)(\s|$)/.test(norm)) {
    return "BS";
  }
  return null;
}

const PROGRAM_KEYWORDS = [
  "computer science",
  "software engineering",
  "data science",
  "artificial intelligence",
  "machine learning",
  "cyber security",
  "cybersecurity",
  "information technology",
  "informatics",
  "electrical engineering",
  "mechanical engineering",
  "civil engineering",
  "business administration",
  "mba",
  "finance",
  "accounting",
  "economics",
  "medicine",
  "mbbs",
  "nursing",
  "public health",
  "biotechnology",
  "chemical engineering",
  "pharmacy",
  "law",
  "international relations",
  "supply chain",
  "project management",
  "human resource",
  "marketing",
  "media studies",
  "architecture",
  "mathematics",
  "statistics",
  "physics",
  "chemistry",
  "biology",
  "agriculture",
  "aviation",
  "hospitality",
  "culinary",
];

function detectProgram(norm: string): { name: string | null; hint: string | null } {
  for (const keyword of PROGRAM_KEYWORDS) {
    if (norm.includes(keyword)) return { name: titleCase(keyword), hint: keyword };
  }
  return { name: null, hint: null };
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const FUNDING_PATTERNS: { type: FundingType; tokens: string[] }[] = [
  {
    type: "fully_funded",
    tokens: ["fully funded", "full scholarship", "100 scholarship", "100% scholarship", "full funding", "fully fund"],
  },
  { type: "partially_funded", tokens: ["partially funded", "partial scholarship", "partial funding", "some scholarship"] },
  { type: "university_funded", tokens: ["university funded", "university scholarship", "funded by university"] },
  { type: "external_scholarship", tokens: ["external scholarship", "government scholarship", "third party scholarship"] },
  { type: "self_funded", tokens: ["self funded", "self finance", "self funded", "khud pay", "apni jeb se"] },
];

function detectFundingType(norm: string): FundingType | null {
  if (/(^|\s)(not sure|unsure|pata nahi|pata nahin|confused)(\s|$)/.test(norm) && norm.includes("fund")) {
    return "unsure";
  }
  for (const entry of FUNDING_PATTERNS) {
    if (entry.tokens.some((token) => norm.includes(token))) return entry.type;
  }
  return null;
}

const MONEY_CONTEXT = [
  "fee",
  "fees",
  "payment",
  "pay",
  "advance",
  "deposit",
  "charge",
  "charges",
  "paise",
  "paisay",
  "amount",
  "cost",
  "rupees",
  "pkr",
  "rs",
  "processing",
  "consultancy",
];

interface MoneyCandidate {
  pkr: number;
  display: string;
  explicit: boolean;
}

const USD_TO_PKR = 280;
const EUR_TO_PKR = 300;
const GBP_TO_PKR = 355;

function parseMoney(rawText: string, norm: string): MoneyCandidate | null {
  const candidates: MoneyCandidate[] = [];
  const push = (pkr: number, display: string, explicit: boolean) => {
    if (Number.isFinite(pkr) && pkr > 0) candidates.push({ pkr, display, explicit });
  };

  const lakh = norm.matchAll(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|lacs)/g);
  for (const m of lakh) {
    const value = parseFloat(m[1]) * 100_000;
    push(value, `PKR ${formatPkr(value)} (${m[1]} ${m[2]})`, true);
  }
  const crore = norm.matchAll(/(\d+(?:\.\d+)?)\s*(crore|crores|karor|karor)/g);
  for (const m of crore) {
    const value = parseFloat(m[1]) * 10_000_000;
    push(value, `PKR ${formatPkr(value)} (${m[1]} crore)`, true);
  }
  const million = norm.matchAll(/(\d+(?:\.\d+)?)\s*(million|mn)\s*(usd|dollars|dollar|us)?/g);
  for (const m of million) {
    const value = parseFloat(m[1]) * (m[3] ? USD_TO_PKR : 10_000_000);
    push(value, m[3] ? `USD ${m[1]} million (~PKR ${formatPkr(value)})` : `PKR ${formatPkr(value)}`, true);
  }
  const thousands = norm.matchAll(/(\d+(?:\.\d+)?)\s*(k|thousand|hazaar|hazar)\b/g);
  for (const m of thousands) {
    const value = parseFloat(m[1]) * 1_000;
    push(value, `PKR ${formatPkr(value)}`, true);
  }
  const pkr = norm.matchAll(/pkr\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*pkr/g);
  for (const m of pkr) {
    const value = parseFloat((m[1] ?? m[2]).replace(/,/g, ""));
    push(value, `PKR ${formatPkr(value)}`, true);
  }
  const rupees = norm.matchAll(/(?:rs\.?|rupees|rupay|rupee)\s*([\d,]+(?:\.\d+)?)/g);
  for (const m of rupees) {
    const value = parseFloat(m[1].replace(/,/g, ""));
    push(value, `PKR ${formatPkr(value)} (stated as rupees)`, true);
  }
  const foreign = norm.matchAll(/([\d,]+(?:\.\d+)?)\s*(usd|dollars|dollar|euros|euro|pounds|gbp|€|\$)/g);
  for (const m of foreign) {
    const amount = parseFloat(m[1].replace(/,/g, ""));
    const currency = m[2];
    const rate = currency.includes("euro") || currency === "€" ? EUR_TO_PKR : currency.includes("pound") || currency === "gbp" ? GBP_TO_PKR : USD_TO_PKR;
    const label = currency.includes("euro") || currency === "€" ? "EUR" : currency.includes("pound") || currency === "gbp" ? "GBP" : "USD";
    push(amount * rate, `${label} ${m[1]} (~PKR ${formatPkr(amount * rate)} at an approximate rate)`, true);
  }

  // Bare large numbers only count when money words appear nearby.
  const bare = norm.matchAll(/(?:^|\s)([\d]{5,7})(?:\s|$)/g);
  for (const m of bare) {
    const value = parseFloat(m[1]);
    const start = m.index ?? 0;
    const window = norm.slice(Math.max(0, start - 40), start + 40);
    if (MONEY_CONTEXT.some((word) => window.includes(word))) {
      push(value, `PKR ${formatPkr(value)}`, false);
    }
  }

  const explicit = candidates.filter((c) => c.explicit);
  const pool = explicit.length > 0 ? explicit : candidates;
  if (pool.length === 0) return null;
  return pool.reduce((max, item) => (item.pkr > max.pkr ? item : max), pool[0]);
}

export function formatPkr(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

const PAYMENT_PURPOSES: { purpose: string; tokens: string[] }[] = [
  { purpose: "Scholarship processing / scholarship fee", tokens: ["scholarship fee", "scholarship processing", "scholarship ka fee"] },
  { purpose: "Application / admission processing fee", tokens: ["application fee", "processing fee", "admission fee", "processing", "apply karne"] },
  { purpose: "Consultancy / agent service fee", tokens: ["consultancy fee", "consultant fee", "service fee", "service charges", "agent fee", "consultancy"] },
  { purpose: "Tuition fee (advance)", tokens: ["tuition fee", "tuition", "semester fee"] },
  { purpose: "Visa / visa-file processing", tokens: ["visa fee", "visa file", "visa processing"] },
  { purpose: "Offer letter / confirmation charges", tokens: ["offer letter fee", "confirmation fee", "confirmation charges", "booking amount", "seat booking"] },
  { purpose: "Documentation / courier charges", tokens: ["document fee", "documentation", "courier", "attestation"] },
];

const PERSONAL_ACCOUNT_TOKENS = [
  "personal account",
  "personal bank account",
  "personal account",
  "jazzcash",
  "jazz cash",
  "easypaisa",
  "easy paisa",
  "personal bank",
  "personal account number",
  "personal account",
  "individual account",
  "family account",
  "account number personal",
  "self account",
  "apna account",
];

const INSTITUTIONAL_TOKENS = [
  "university account",
  "university bank account",
  "official account",
  "institution",
  "institutional",
  "university ke account",
  "company account",
  "organizational account",
];

const URL_PATTERN = /https?:\/\/[^\s<>"']+|(?:^|\s)(?:www\.)[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>"']*/gi;

export function extractFacts(...texts: string[]): ExtractedFacts {
  const raw = texts.filter(Boolean).join("\n").trim();
  const norm = normalize(raw);
  const words = norm.split(" ").filter(Boolean);

  // Re-join thousands separators ("400 000" -> "400000") so comma-formatted
  // amounts such as "PKR 400,000" are not read as PKR 400.
  const moneyText = norm.replace(/(\d) (\d{3})\b/g, "$1$2");
  const money = parseMoney(raw, moneyText);

  const guarantees = {
    admission:
      /guarantee[sd]?[\s\S]{0,20}(admission|seat|admit)|(admission|seat|admit)[\s\S]{0,20}(guarantee[sd]?|pakka|confirm hai)|100[\s\S]{0,6}admission/.test(
        norm,
      ),
    visa:
      /guarantee[sd]?[\s\S]{0,20}visa|visa[\s\S]{0,20}(guarantee[sd]?|pakka)|100[\s\S]{0,6}visa/.test(
        norm,
      ),
    scholarship:
      /100[\s\S]{0,6}(scholarship|funded)|guarantee[sd]?[\s\S]{0,25}(scholarship|funding)|scholarship[\s\S]{0,25}(guarantee[sd]?|100|hundred percent|pakka)/.test(
        norm,
      ),
    generic: /guaranteed|guarantee|pakka|bilkul\s*pakka|hundred\s*percent|hundred\s*%/.test(norm),
  };

  const invoiceMention = /(invoice|fee breakdown|itemized|itemised|receipt)/.test(norm);
  const invoiceNegated =
    /(no invoice|without invoice|invoice (nahi|nahin|not|missing)|invoice nahi diya|receipt (nahi|nahin|not))/i.test(
      norm,
    );

  const mentionsPayment = MONEY_CONTEXT.some((token) => norm.includes(token)) || money !== null;

  const agentTokens = [
    "agent",
    "consultant",
    "consultancy",
    "agency",
    "counselor",
    "counsellor",
    "advisor",
    "education consultant",
    "overseas consultant",
    "immigration consultant",
    "representative",
  ];
  const agentInvolved = agentTokens.some((token) => norm.includes(token));

  return {
    language: detectLanguage(raw),
    country: detectCountry(norm),
    degreeLevel: detectDegreeLevel(norm),
    programName: detectProgram(norm).name,
    programHint: detectProgram(norm).hint,
    universityHint: null,
    scholarshipHint: null,
    agentHint: null,
    agentInvolved,
    claimsOfficialRepresentation:
      /(official|authorised|authorized|approved)\s*(representative|agent|partner|recruiter)|represent(s)?\s*(the|our)\s*university|university\s*(ka|ki)\s*(official\s*)?agent|authorized\s*to\s*(recruit|admit)/.test(
        norm,
      )
        ? true
        : null,
    fundingType: detectFundingType(norm),
    mentionsScholarship: /scholarship|scholarship|funding|funded|stipend|bursary|grant/.test(norm),
    mentionsUniversity: /university|university|campus|institute|college|hochschule|uni\b/.test(norm),
    mentionsVisa: /visa|visa|study permit|study permit/.test(norm),
    hasOfferLetter: /(offer letter|admission letter|offer letter|acceptance letter|conditional offer|cas letter)/.test(norm),
    hasScholarshipLetter: /(scholarship letter|scholarship award|scholarship letter|funding letter)/.test(norm),
    hasInvoice: invoiceMention && !invoiceNegated,
    paymentAmountPkr: money?.pkr ?? null,
    paymentAmountDisplay: money?.display ?? null,
    paymentPurpose:
      PAYMENT_PURPOSES.find((entry) => entry.tokens.some((token) => norm.includes(token)))?.purpose ?? null,
    recipientType: INSTITUTIONAL_TOKENS.some((token) => norm.includes(token))
      ? "institutional"
      : PERSONAL_ACCOUNT_TOKENS.some((token) => norm.includes(token))
        ? "personal"
        : "unknown",
    urgency:
      /(today|right now|immediately|abhi|turant|jaldi|urgent|urgently|last date|deadline|tonight|kal tak| expires|expiring|only today|aaj hi)/.test(
        norm,
      ),
    guarantees,
    avoidOfficialChannels:
      /(no need to (contact|call)|don ?t contact|do not contact|university se (contact|baat)|bypass|no need for uni|directly to us|only through us|sirf hum se|humare through|university ko mat)/.test(
        norm,
      ),
    links: raw.match(URL_PATTERN) ?? [],
    mentionsPayment,
    wordCount: words.length,
  };
}
