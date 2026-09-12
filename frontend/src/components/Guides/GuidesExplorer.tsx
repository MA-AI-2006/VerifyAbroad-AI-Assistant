"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/utils/ui";

interface Guide {
  id: string;
  icon: string;
  title: string;
  tone: string;
  summary: string;
  levels: string[];
  countries: string[];
  verify: string[];
  signs: string[];
  questions: string[];
  avoid: string[];
  officialSource: string;
}

const GUIDES: Guide[] = [
  {
    id: "university",
    icon: "🎓",
    title: "University",
    tone: "grad-mint",
    summary: "Confirm the institution is real, accredited and taking direct applications.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Germany", "United Kingdom", "United States", "Canada", "Australia", "Türkiye", "Singapore", "Saudi Arabia"],
    verify: [
      "Find the university website yourself instead of using a link someone sent you.",
      "Confirm the exact programme name on the official course page.",
      "Check the official application portal and the current intake dates.",
      "Email the admissions office and keep the written reply.",
    ],
    signs: [
      "The website domain is slightly different from the official one.",
      "The 'university' only appears in paid ads, not in official education listings.",
      "Admission is offered without transcripts, tests or an application.",
      "You are told not to contact the university directly.",
    ],
    questions: [
      "What is your official application portal and deadline for this intake?",
      "Is this exact programme name offered this year?",
      "Do you work with this consultant, and are they authorised?",
    ],
    avoid: [
      "Do not pay a 'seat booking' fee before an official offer exists.",
      "Do not rely only on the agent's screenshots of the website.",
    ],
    officialSource: "The university's own website and admissions office",
  },
  {
    id: "scholarship",
    icon: "🎁",
    title: "Scholarship",
    tone: "grad-lilac",
    summary: "Compare the funding claim with the provider's official information.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Germany", "United Kingdom", "United States", "Canada", "Australia", "Türkiye", "Pakistan"],
    verify: [
      "Get the scholarship's exact name and the provider's official website.",
      "Confirm the funding type: fully funded, partial, university-funded or external.",
      "Check the eligible degree levels and whether Pakistan is eligible.",
      "Apply through the provider's official route — most are free to apply for.",
    ],
    signs: [
      "'100% guaranteed scholarship' — no provider can guarantee an outcome.",
      "A fee is charged to apply for a scholarship that is free to apply for.",
      "The scholarship name does not exist on the provider's website.",
      "No reference number or award letter can be produced.",
    ],
    questions: [
      "What is the official name of this scholarship?",
      "Can you send the award letter with a reference number?",
      "Which organisation funds it, and can I apply directly?",
    ],
    avoid: [
      "Do not pay a 'scholarship processing' fee before confirming the scheme exists.",
      "Do not treat an agent's promise as the provider's decision.",
    ],
    officialSource: "The scholarship provider's official website (e.g. DAAD, Chevening, Fulbright/USEFP, Australia Awards, HEC)",
  },
  {
    id: "consultant",
    icon: "👤",
    title: "Consultant",
    tone: "grad-sage",
    summary: "Check whether the agent is actually authorised by the university.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Pakistan"],
    verify: [
      "Ask the university's admissions office in writing whether this person is authorised.",
      "Many universities publish their official recruitment partners on their website.",
      "Check whether the company is registered and has a physical office you can visit.",
      "Ask for an itemised service agreement before paying anything.",
    ],
    signs: [
      "Claims of official representation that cannot be confirmed anywhere.",
      "Pressure to avoid the university, embassy or official channels.",
      "No written invoice, or an invoice that only shows a lump sum.",
      "Community reports of payments to personal accounts.",
    ],
    questions: [
      "Which universities are you officially authorised to represent?",
      "Can you send that authorisation in writing?",
      "What exactly is included in your fee?",
    ],
    avoid: [
      "Do not hand over your passport or original documents as 'security'.",
      "Do not rely on community complaints alone as proof of anything.",
    ],
    officialSource: "The university's admissions office and its published partner list",
  },
  {
    id: "admission-offer",
    icon: "📄",
    title: "Admission Offer",
    tone: "grad-coral",
    summary: "Check that the offer letter really came from the university.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Germany", "United Kingdom", "United States", "Canada", "Australia", "Türkiye", "Singapore"],
    verify: [
      "Compare the sender's email domain with the university's official domain, character by character.",
      "Confirm the programme, intake and fee amounts on the official course page.",
      "Ask the university to confirm the offer reference number exists.",
      "Check that the letter is addressed to you with your correct details.",
    ],
    signs: [
      "A generic email address (Gmail, Outlook) for an official university letter.",
      "Inconsistent names, dates, logos or missing applicant details.",
      "An offer issued without any application or documents from you.",
      "Fees that do not match the university's published fee schedule.",
    ],
    questions: [
      "Can you confirm this offer reference number was issued by you?",
      "What is the official deadline to accept, and how do I pay the deposit?",
    ],
    avoid: [
      "Do not pay a deposit before the university confirms the offer.",
      "Do not accept a letter that only exists as a screenshot in WhatsApp.",
    ],
    officialSource: "The university's admissions office, using contact details from its official website",
  },
  {
    id: "payment",
    icon: "💳",
    title: "Payment",
    tone: "grad-mint",
    summary: "Make the payment request safer before any money leaves your account.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Pakistan"],
    verify: [
      "Ask for a written, itemised invoice on company or university letterhead.",
      "Check whether the account belongs to an organisation, not an individual.",
      "Confirm the payment route with the university or provider directly.",
      "Compare the amount with the university's published fee schedule.",
    ],
    signs: [
      "Payment requested to a personal bank, JazzCash or EasyPaisa account.",
      "'Pay today or lose your seat' — artificial urgency.",
      "A large upfront amount before any documentation is provided.",
      "No fee breakdown, or a breakdown that keeps changing.",
    ],
    questions: [
      "What exactly is this payment for, line by line?",
      "Whose account is this, and what is the account title?",
      "What happens if I pay after the deadline you mentioned?",
    ],
    avoid: [
      "Do not send money to a personal account for university fees.",
      "Do not rush because of a same-day deadline.",
    ],
    officialSource: "The university's official fee payment page and your bank's fraud department",
  },
  {
    id: "documents",
    icon: "📑",
    title: "Documents",
    tone: "grad-sage",
    summary: "Share only what is officially required — and keep copies of everything.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Pakistan"],
    verify: [
      "Confirm the document list on the university's official requirements page.",
      "Send documents only through the official application portal or official email.",
      "Keep a dated copy of every document you share, and with whom.",
      "Ask why a document is needed if it is not on the official list.",
    ],
    signs: [
      "Requests for passwords, OTPs, card numbers or full bank credentials.",
      "Requests for your original documents to be handed over 'for safekeeping'.",
      "Pressure to sign a blank or undated agreement.",
    ],
    questions: [
      "Why do you need this document, and where will it be submitted?",
      "Can I submit it myself through the official portal?",
    ],
    avoid: [
      "Never share passwords, OTPs or banking credentials with anyone.",
      "Do not hand over originals without a written receipt.",
    ],
    officialSource: "The university's official document requirements page",
  },
  {
    id: "whatsapp",
    icon: "📱",
    title: "WhatsApp / Social Media Claims",
    tone: "grad-lilac",
    summary: "Treat forwarded messages and voice notes as claims to be checked, not facts.",
    levels: ["BS", "MS", "PhD"],
    countries: ["Pakistan"],
    verify: [
      "Copy the exact text into the investigation so each claim can be checked.",
      "Ask for the original letter or email rather than a screenshot.",
      "Confirm names, numbers and deadlines on the official website.",
      "Save the message — it may be needed as evidence later.",
    ],
    signs: [
      "Guaranteed admission, visa or scholarship language.",
      "Forwarded screenshots with no sender, date or reference number.",
      "Urgent, informal payment instructions.",
      "Requests to keep the arrangement private.",
    ],
    questions: [
      "Can you send the original email or letter, not a screenshot?",
      "Can you confirm this in writing from your official email address?",
    ],
    avoid: [
      "Do not decide based on a voice note alone.",
      "Do not delete the chat, even if the conversation went badly.",
    ],
    officialSource: "The organisation the message claims to come from, contacted via its official website",
  },
];

const ALL_LEVELS = ["BS", "MS", "PhD"];
const ALL_COUNTRIES = Array.from(new Set(GUIDES.flatMap((guide) => guide.countries))).sort();

export function GuidesExplorer() {
  const [level, setLevel] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(GUIDES[0].id);

  const filtered = useMemo(
    () =>
      GUIDES.filter((guide) => {
        if (level && !guide.levels.includes(level)) return false;
        if (country && !guide.countries.includes(country)) return false;
        return true;
      }),
    [level, country],
  );

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
      active
        ? "border-brand-300 bg-white text-ink-900 shadow-[0_10px_22px_-18px_rgba(34,48,74,0.6)]"
        : "border-white bg-white/70 text-ink-600 hover:bg-white",
    );

  return (
    <div>
      <div className="rounded-[28px] border border-white bg-white/75 p-4 shadow-[0_24px_50px_-44px_rgba(34,48,74,0.8)] sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Level
            </span>
            <button type="button" onClick={() => setLevel(null)} className={chip(!level)}>
              All levels
            </button>
            {ALL_LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLevel(level === value ? null : value)}
                className={chip(level === value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Destination
            </span>
            <button type="button" onClick={() => setCountry(null)} className={chip(!country)}>
              All
            </button>
            {ALL_COUNTRIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCountry(country === value ? null : value)}
                className={chip(country === value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-[28px] border border-dashed border-ink-200 bg-white/60 px-5 py-8 text-center text-sm font-semibold text-ink-500">
          No guide matches that combination — try clearing a filter.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {filtered.map((guide, index) => {
            const isOpen = open === guide.id;
            return (
              <article
                key={guide.id}
                className={`card-lift rise overflow-hidden rounded-[30px] border border-white shadow-[0_24px_50px_-46px_rgba(34,48,74,0.8)] ${guide.tone}`}
                style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : guide.id)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-start gap-4 px-5 py-5 text-left"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/90 text-xl"
                    aria-hidden="true"
                  >
                    {guide.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black tracking-tight text-ink-900">
                      {guide.title}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-600">
                      {guide.summary}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {guide.levels.map((value) => (
                        <span
                          key={value}
                          className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-ink-600"
                        >
                          {value}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="mt-1 shrink-0 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-600">
                    {isOpen ? "Close" : "Open"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="pop-in space-y-4 border-t border-white/70 bg-white/70 px-5 py-4">
                    <GuideBlock heading="What to verify" items={guide.verify} tone="brand" />
                    <GuideBlock heading="Common warning signs" items={guide.signs} tone="coral" />
                    <GuideBlock heading="Questions to ask" items={guide.questions} tone="powder" />
                    <GuideBlock heading="What not to do" items={guide.avoid} tone="amber" />

                    <div className="rounded-2xl border border-white grad-panel px-3.5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                        Official source to check
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-snug text-ink-800">
                        {guide.officialSource}
                      </p>
                    </div>

                    <Link
                      href="/investigate"
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-4 py-2.5 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
                    >
                      Investigate this now
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GuideBlock({
  heading,
  items,
  tone,
}: {
  heading: string;
  items: string[];
  tone: "brand" | "coral" | "powder" | "amber";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-800",
    coral: "bg-coral-50 text-coral-700",
    powder: "bg-powder-50 text-powder-800",
    amber: "bg-coral-50 text-coral-700",
  };
  const marker: Record<string, string> = {
    brand: "✓",
    coral: "⚠",
    powder: "?",
    amber: "✕",
  };
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wide text-ink-500">{heading}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-700">
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${tones[tone]}`}
              aria-hidden="true"
            >
              {marker[tone]}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
