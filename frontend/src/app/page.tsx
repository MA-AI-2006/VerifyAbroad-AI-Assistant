import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  GraduationCap,
  HeartHandshake,
  Languages,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { HeroVisual, WorldJourney } from "@/components/Landing/LandingArt";

export const dynamic = "force-dynamic";

const AI_SIGNALS = [
  { icon: "🔴", label: "Guaranteed visa claim" },
  { icon: "🔴", label: "Guaranteed admission" },
  { icon: "⚠️", label: "Urgency detected" },
  { icon: "⚠️", label: "Scholarship needs verification" },
  { icon: "🔴", label: "Payment requires verification" },
];

const STEPS = [
  { n: "01", title: "Tell", body: "Tell us what you received — in English, Urdu or Roman Urdu.", tone: "grad-mint" },
  { n: "02", title: "Show", body: "Upload the message, screenshot, offer letter or invoice.", tone: "grad-lilac" },
  { n: "03", title: "Verify", body: "Details are compared with the verification data available.", tone: "grad-sage" },
  { n: "04", title: "Understand", body: "See exactly what is verified, what is missing, and what conflicts.", tone: "grad-mint" },
  { n: "05", title: "Act", body: "Get safer next steps and the official channels to use instead.", tone: "grad-coral" },
];

const DEGREES = [
  {
    code: "BS",
    label: "Bachelor's",
    body: "Foundation admissions, UCAS-style portals, first-degree funding.",
    chips: ["Scholarships", "Admissions", "Consultants", "Offers"],
    tone: "grad-mint",
  },
  {
    code: "MS",
    label: "Master's",
    body: "The most targeted level for 'guaranteed admission' promises.",
    chips: ["Scholarships", "Funding", "Consultants", "Payment"],
    tone: "grad-lilac",
  },
  {
    code: "PhD",
    label: "Doctorate",
    body: "Supervisor match, funding letters, research programme claims.",
    chips: ["Funding", "Admissions", "Offers", "Documents"],
    tone: "grad-sage",
  },
];

const FUNDING = [
  { label: "Fully Funded", body: "100% tuition + stipend", tone: "grad-mint" },
  { label: "Partially Funded", body: "Tuition support", tone: "grad-lilac" },
  { label: "University Funded", body: "University-based funding", tone: "grad-sage" },
  { label: "External Scholarship", body: "Independent provider", tone: "grad-coral" },
  { label: "Self Funded", body: "Personal financing", tone: "grad-lilac" },
];

const LANGUAGES = [
  { title: "English", body: "Full investigation vocabulary, official-source labels.", tone: "grad-mint" },
  { title: "اردو", body: "آپ پوری تحقیق اردو میں کر سکتے ہیں۔", tone: "grad-lilac" },
  { title: "Roman Urdu", body: "Jaise aap WhatsApp par baat karte hain — waise hi.", tone: "grad-coral" },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ------------------------------------------------------------ hero */}
      <section className="grad-hero relative px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700 shadow-[0_10px_24px_-18px_rgba(34,48,74,0.6)]">
              <span aria-hidden="true">🇵🇰</span>
              Built for Pakistani students
            </span>

            <h1 className="mt-5 text-[clamp(2.1rem,5.6vw,3.9rem)] font-black leading-[1.04] tracking-tight text-ink-900">
              Before you trust, pay, or proceed —{" "}
              <span className="underline-marker grad-text font-black">verify it</span>.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
              An AI-powered study-abroad safety assistant that helps Pakistani students investigate
              universities, scholarships, consultants, offers and payment requests before making
              important decisions.
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
              Verify Before You Trust, Pay, or Proceed.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/investigate"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_20px_36px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5"
              >
                <Search className="size-4" aria-hidden="true" />
                Start Investigation
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-6 py-3.5 text-sm font-bold text-ink-800 shadow-[0_14px_30px_-22px_rgba(34,48,74,0.6)] transition-transform hover:-translate-y-0.5"
              >
                Explore How It Works
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
              {[
                { k: "3", v: "languages supported" },
                { k: "BS·MS·PhD", v: "all levels" },
                { k: "6", v: "check categories" },
              ].map((stat) => (
                <div key={stat.v} className="rounded-2xl border border-white bg-white/70 px-3.5 py-3">
                  <dt className="text-base font-black tracking-tight grad-text">{stat.k}</dt>
                  <dd className="mt-0.5 text-[11px] font-semibold leading-snug text-ink-500">
                    {stat.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="pop-in">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- journey */}
      <section id="journey" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-powder-700">
              The journey
            </p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.6vw,2.5rem)] font-black leading-tight tracking-tight text-ink-900">
              Your study-abroad journey starts with a question.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-600">
              Different destinations, different promises — the same need to check the facts before
              money moves.
            </p>
          </div>
          <div className="mt-8">
            <WorldJourney />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- problem */}
      <section id="problem" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">The problem</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.6vw,2.5rem)] font-black leading-tight tracking-tight text-ink-900">
              Some promises sound too good to be true.
            </h2>
          </div>

          <div className="mt-8 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* WhatsApp-style message */}
            <div className="rounded-[32px] border border-white bg-[#eef7f0] p-5 shadow-[0_30px_60px_-45px_rgba(34,48,74,0.7)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-brand-700">
                  A
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-800">Agent (unknown number)</p>
                  <p className="text-[11px] text-ink-500">WhatsApp · today</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  "Sir 100% scholarship hai.",
                  "Admission guaranteed hai.",
                  "Visa bhi guaranteed hai.",
                  "Aaj 5 lakh payment kar dein.",
                ].map((line) => (
                  <p
                    key={line}
                    className="w-fit max-w-full rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-sm font-medium text-ink-800 shadow-[0_6px_14px_-10px_rgba(34,48,74,0.6)]"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {/* connector */}
            <div className="relative mx-auto h-40 w-full max-w-[220px] lg:h-52" aria-hidden="true">
              <svg viewBox="0 0 220 200" className="size-full">
                {[24, 62, 100, 138, 176].map((y, index) => (
                  <path
                    key={y}
                    d={`M0 ${y} C 70 ${y - 10}, 120 ${y + 12}, 218 ${y}`}
                    fill="none"
                    stroke={index % 2 === 0 ? "#ff8a68" : "#f0a03c"}
                    strokeWidth="2"
                    strokeDasharray="5 6"
                    className="dash-run"
                    opacity="0.8"
                  />
                ))}
              </svg>
              <span className="glass absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[11px] font-bold text-ink-700">
                AI investigation
              </span>
            </div>

            {/* signals */}
            <div className="space-y-2.5">
              <p className="flex items-center gap-2 text-sm font-bold text-ink-800">
                <Sparkles className="size-4 text-lilac-500" aria-hidden="true" />
                What the assistant notices
              </p>
              {AI_SIGNALS.map((signal) => (
                <div
                  key={signal.label}
                  className="card-lift flex items-center gap-3 rounded-2xl border border-white bg-white/85 px-4 py-3"
                >
                  <span className="text-base" aria-hidden="true">
                    {signal.icon}
                  </span>
                  <p className="text-sm font-semibold text-ink-800">{signal.label}</p>
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-relaxed text-ink-500">
                Warning signals are patterns — never a verdict about a person.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- how */}
      <section id="how" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">How it works</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.6vw,2.5rem)] font-black leading-tight tracking-tight text-ink-900">
              One conversation, five steps.
            </h2>
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li
                key={step.n}
                className={`card-lift rise rounded-[28px] border border-white p-5 ${step.tone} delay-${index + 1}`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="text-2xl font-black tracking-tight text-white/90 mix-blend-luminosity">
                  {step.n}
                </span>
                <h3 className="mt-2 text-base font-black tracking-tight text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- degrees */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lilac-600">Levels</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.6vw,2.5rem)] font-black leading-tight tracking-tight text-ink-900">
              Every level gets the same scrutiny.
            </h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {DEGREES.map((degree) => (
              <article
                key={degree.code}
                className={`card-lift group rounded-[32px] border border-white p-6 ${degree.tone}`}
              >
                <span className="inline-flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-1.5 text-sm font-black tracking-tight text-ink-900">
                  <GraduationCap className="size-4 text-brand-600" aria-hidden="true" />
                  {degree.code}
                </span>
                <h3 className="mt-3 text-xl font-black tracking-tight text-ink-900">{degree.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{degree.body}</p>
                <div className="mt-4 flex flex-wrap gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                  {degree.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- funding */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">Funding</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.6vw,2.5rem)] font-black leading-tight tracking-tight text-ink-900">
              Whether it&apos;s funded or you&apos;re paying yourself, verify the claim.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              These are the funding categories the assistant understands — they are not claims about
              any specific programme.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FUNDING.map((item, index) => (
              <article
                key={item.label}
                className={`card-lift rounded-[28px] border border-white p-5 ${item.tone} ${index % 2 ? "floaty-alt" : "floaty"}`}
              >
                <h3 className="text-xs font-black uppercase tracking-wide text-ink-700">{item.label}</h3>
                <p className="mt-2 text-sm font-semibold leading-snug text-ink-800">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- pakistan first */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-white bg-white/75 p-6 shadow-[0_40px_80px_-60px_rgba(34,48,74,0.7)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                <HeartHandshake className="size-4" aria-hidden="true" />
                Pakistan first
              </p>
              <h2 className="mt-2 text-[clamp(1.6rem,3.6vw,2.4rem)] font-black leading-tight tracking-tight text-ink-900">
                Not translated for Pakistan. Designed for Pakistan.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-600">
                PKR amounts and lakh phrasing. WhatsApp screenshots as first-class evidence.
                Consultants and agents treated as a normal part of the journey — not as a
                suspicion. University documents, embassies and HEC referenced where they matter.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["PKR payments", "WhatsApp evidence", "HEC & embassies", "Consultants", "Offer letters"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white bg-white/85 px-3 py-1.5 text-xs font-bold text-ink-700"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {LANGUAGES.map((language) => (
                <article
                  key={language.title}
                  className={`card-lift rounded-[28px] border border-white p-5 ${language.tone}`}
                >
                  <Languages className="size-5 text-ink-600" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-black tracking-tight text-ink-900">
                    {language.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{language.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- final CTA */}
      <section className="px-4 pb-16 pt-6 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[44px] border border-white p-8 text-center shadow-[0_50px_90px_-60px_rgba(34,48,74,0.8)] sm:p-14 grad-hero">
          <span aria-hidden="true" className="blob absolute -left-8 -top-8 size-40 bg-brand-300" />
          <span aria-hidden="true" className="blob absolute -right-6 top-10 size-40 bg-lilac-300" />
          <span aria-hidden="true" className="blob absolute -bottom-10 left-1/3 size-40 bg-coral-200" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3.5 py-1.5 text-xs font-bold text-ink-700">
              <ShieldCheck className="size-3.5 text-brand-600" aria-hidden="true" />
              AI analysis · never a final verdict
            </span>
            <h2 className="mt-5 text-[clamp(1.9rem,4.6vw,3rem)] font-black leading-tight tracking-tight text-ink-900">
              Something doesn&apos;t feel right?
            </h2>
            <p className="mt-2 text-[clamp(1.1rem,2.6vw,1.6rem)] font-black leading-tight grad-text">
              Let&apos;s investigate it.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-600">
              Paste the message, upload the screenshot, or describe the call. You will leave knowing
              exactly what to verify — and what to say no to for now.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/investigate"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-7 py-4 text-sm font-bold text-white shadow-[0_22px_40px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5"
              >
                <MessageSquareText className="size-4" aria-hidden="true" />
                Start Investigation
              </Link>
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white/85 px-7 py-4 text-sm font-bold text-ink-800 transition-transform hover:-translate-y-0.5"
              >
                <Compass className="size-4" aria-hidden="true" />
                Read the safety guides
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-white/80 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-ink-800">
              <BadgeCheck className="size-4 text-brand-600" aria-hidden="true" />
              Study Abroad Safety Assistant
            </p>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-ink-500">
              Verify Before You Trust, Pay, or Proceed. AI analysis is not official university,
              embassy or government verification. Verification is limited to the dataset available to
              this assistant.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-4 text-xs font-bold text-ink-600">
            <Link href="/investigate" className="hover:text-brand-700">Investigate</Link>
            <Link href="/universities" className="hover:text-brand-700">Universities</Link>
            <Link href="/scholarships" className="hover:text-brand-700">Scholarships</Link>
            <Link href="/consultants" className="hover:text-brand-700">Consultants</Link>
            <Link href="/guides" className="hover:text-brand-700">Safety guides</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
