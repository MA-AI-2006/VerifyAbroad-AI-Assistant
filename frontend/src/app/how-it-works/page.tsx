import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  FileSearch,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works — VerifyAbroad AI",
  description:
    "How VerifyAbroad AI investigates a study-abroad claim: conversation, evidence, verification, warning signals, risk level and safer next steps.",
};

const STEPS = [
  {
    n: "01",
    title: "Tell the assistant your situation",
    body: "Describe what you were offered in English, Urdu or Roman Urdu — a WhatsApp message, a scholarship claim, a consultant's promise, an offer letter or a payment demand.",
    icon: MessageSquareText,
    tone: "grad-mint",
  },
  {
    n: "02",
    title: "Answer only the questions that matter",
    body: "The assistant asks only for what is genuinely missing — one small batch at a time. It never turns the investigation into a long questionnaire.",
    icon: Compass,
    tone: "grad-lilac",
  },
  {
    n: "03",
    title: "Upload or paste evidence",
    body: "Add a screenshot, a PDF, a link, or simply paste the text of the message. Evidence is attached to the investigation so every claim inside it can be checked.",
    icon: Upload,
    tone: "grad-sage",
  },
  {
    n: "04",
    title: "Compare claims with available verification data",
    body: "Universities, programs, scholarships, consultants and official channels are checked against the verification dataset. Anything that cannot be matched is labelled as needing verification — never as a verdict.",
    icon: Search,
    tone: "grad-mint",
  },
  {
    n: "05",
    title: "Identify warning signals",
    body: "Claims are checked against known study-abroad fraud patterns: guaranteed admission, guaranteed visa, guaranteed scholarships, urgent payments, personal accounts and lookalike domains.",
    icon: ShieldCheck,
    tone: "grad-coral",
  },
  {
    n: "06",
    title: "Receive practical next steps",
    body: "You get a risk level with the reasons behind it, a payment safety analysis, and a short list of what to verify next — with official links where the backend holds them.",
    icon: Sparkles,
    tone: "grad-lilac",
  },
];

const EXAMPLE = [
  {
    stage: "Initial claim",
    body: "“Germany ki university mein MS admission guaranteed hai. Scholarship bhi 100% hai. Visa bhi guaranteed hai. Aaj hi 5 lakh PKR processing fee deni hogi.”",
    tone: "grad-lilac",
  },
  {
    stage: "Evidence",
    body: "The student pastes the WhatsApp message and uploads the screenshot. The assistant extracts the concrete claims: guarantees, the amount, the deadline and the payment instruction.",
    tone: "grad-sage",
  },
  {
    stage: "Verification",
    body: "The university, program, scholarship and consultant are looked up in the verification dataset. Anything unmatched is reported as “could not be independently confirmed” — not as proof of fraud.",
    tone: "grad-mint",
  },
  {
    stage: "Risk",
    body: "🔴 HIGH RISK — guaranteed admission, guaranteed visa and a guaranteed scholarship were claimed, a large urgent payment was requested, and no scholarship reference was supplied.",
    tone: "grad-coral",
  },
  {
    stage: "Recommendation",
    body: "Do not pay yet. Ask for a written itemised invoice, confirm the scholarship directly with the provider, and verify whether the consultant is officially authorised by the university.",
    tone: "grad-mint",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
          <Compass className="size-4 text-brand-600" aria-hidden="true" />
          How it works
        </span>
        <h1 className="mt-4 text-[clamp(1.9rem,4.4vw,2.8rem)] font-black leading-tight tracking-tight text-ink-900">
          Your study-abroad decision deserves more than a guess.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          VerifyAbroad AI runs one conversational investigation. It asks what is missing, reads your
          evidence, compares claims with the verification data available, and explains what still
          needs to be confirmed — before you trust, pay or proceed.
        </p>
      </header>

      {/* Timeline */}
      <ol className="relative mt-10 space-y-5">
        <span
          aria-hidden="true"
          className="absolute left-[26px] top-4 bottom-4 hidden w-0.5 bg-gradient-to-b from-brand-300 via-powder-300 to-lilac-300 sm:block"
        />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.n} className="rise relative flex gap-4" style={{ animationDelay: `${index * 70}ms` }}>
              <span
                className={`relative z-10 grid size-[54px] shrink-0 place-items-center rounded-[22px] border border-white ${step.tone} shadow-[0_14px_30px_-22px_rgba(34,48,74,0.7)]`}
              >
                <Icon className="size-5 text-ink-700" aria-hidden="true" />
              </span>
              <div className="card-lift min-w-0 flex-1 rounded-[26px] border border-white bg-white/85 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-400">
                  Step {step.n}
                </p>
                <h2 className="mt-1 text-base font-black tracking-tight text-ink-900 sm:text-lg">
                  {step.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Example investigation */}
      <section className="mt-12">
        <h2 className="text-[clamp(1.4rem,3.2vw,2rem)] font-black leading-tight tracking-tight text-ink-900">
          One example, start to finish
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          From an unverified promise to a clear set of next steps.
        </p>
        <ol className="mt-5 grid gap-4 md:grid-cols-2">
          {EXAMPLE.map((item, index) => (
            <li
              key={item.stage}
              className={`card-lift rise rounded-[28px] border border-white p-5 ${item.tone}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-500">
                {String(index + 1).padStart(2, "0")} · {item.stage}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-800">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/investigate"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_20px_36px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5"
        >
          <FileSearch className="size-4" aria-hidden="true" />
          Start Investigation
        </Link>
        <Link
          href="/guides"
          className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-6 py-3.5 text-sm font-bold text-ink-800 transition-transform hover:-translate-y-0.5"
        >
          Read the safety guides
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        AI analysis is not official legal, university, embassy or government verification. Do not
        blindly trust the AI — use it to understand what needs to be verified.
      </p>
    </div>
  );
}
