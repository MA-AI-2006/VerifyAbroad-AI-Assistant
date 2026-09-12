import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  FileSearch,
  GraduationCap,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About — Why VerifyAbroad AI exists",
  description:
    "VerifyAbroad AI exists because Pakistani students are asked to trust consultants, scholarship claims and payment requests without any way to check them.",
};

const PROBLEMS = [
  {
    icon: "👤",
    title: "Consultants who cannot be checked",
    body: "Most families meet a consultant through a friend or a Facebook ad. There is no easy way to know whether that person is actually authorised by the university they name.",
  },
  {
    icon: "📱",
    title: "Decisions made over WhatsApp",
    body: "Admission, scholarships and deadlines are discussed in voice notes and forwarded screenshots. There is no paper trail until money has already moved.",
  },
  {
    icon: "🎁",
    title: "Scholarship claims that cannot be traced",
    body: "A real scholarship name is often used with invented details — '100% guaranteed', 'fully funded, no exam'. Students have no way to compare the claim with the provider's official information.",
  },
  {
    icon: "📄",
    title: "Fake or altered admission letters",
    body: "Lookalike email domains and copied letterheads make an offer look official. The difference is often a single character in the web address.",
  },
  {
    icon: "💳",
    title: "Urgent payments to personal accounts",
    body: "'Pay today or lose your seat' is the most common pressure pattern. Large transfers are requested before any invoice, offer letter or scholarship reference is provided.",
  },
  {
    icon: "❓",
    title: "Not knowing what to verify",
    body: "The hardest part is not the scam itself — it is that nobody tells students which five things to check before trusting an offer.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
          <HeartHandshake className="size-4 text-coral-500" aria-hidden="true" />
          Why this exists
        </span>
        <h1 className="mt-4 text-[clamp(1.9rem,4.4vw,2.8rem)] font-black leading-tight tracking-tight text-ink-900">
          Why does this exist?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Every year, thousands of Pakistani students and their families spend years of savings on an
          overseas education — BS, MS or PhD. The decision is usually made in a few WhatsApp
          conversations, with no independent way to check what they are being told.
        </p>
      </header>

      <section className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROBLEMS.map((problem, index) => (
          <article
            key={problem.title}
            className="card-lift rise rounded-[28px] border border-white bg-white/85 p-5"
            style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
          >
            <span className="grid size-11 place-items-center rounded-2xl grad-panel text-xl" aria-hidden="true">
              {problem.icon}
            </span>
            <h2 className="mt-3 text-sm font-black tracking-tight text-ink-900">{problem.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{problem.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 overflow-hidden rounded-[36px] border border-white bg-white/80 p-6 shadow-[0_40px_80px_-60px_rgba(34,48,74,0.7)] sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Our philosophy
            </p>
            <h2 className="mt-2 text-[clamp(1.5rem,3.4vw,2.2rem)] font-black leading-tight tracking-tight text-ink-900">
              We do not ask students to blindly trust AI.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-700">
              VerifyAbroad AI helps organise the investigation: it asks the right questions, reads the
              evidence, separates what was verified from what could not be confirmed, identifies
              warning signals, and guides the student toward safer verification.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-700">
              It will never tell you that a person is a scammer. It will tell you that an affiliation
              could not be independently confirmed, that a funding claim conflicts with available
              information, or that a payment request carries high-risk signals — and exactly what to
              check next.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Potential risk",
                "Warning signal",
                "Needs verification",
                "Could not be independently confirmed",
                "Conflicting information",
              ].map((phrase) => (
                <span
                  key={phrase}
                  className="rounded-full border border-white bg-white/85 px-3 py-1.5 text-xs font-bold text-ink-700"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {[
              {
                icon: GraduationCap,
                title: "Education only",
                body: "Overseas university study — BS, MS and PhD. Not jobs, not general immigration.",
              },
              {
                icon: MessageSquareText,
                title: "Built around how students actually communicate",
                body: "WhatsApp messages, screenshots, voice-note summaries, forwarded offers and PKR amounts.",
              },
              {
                icon: BadgeCheck,
                title: "Verification stays with the official source",
                body: "Final confirmation always comes from the university, scholarship provider or embassy — never from the AI.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="card-lift rounded-[26px] border border-white grad-panel p-5">
                  <span className="grid size-10 place-items-center rounded-2xl bg-white/85 text-brand-700">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-2.5 text-sm font-black tracking-tight text-ink-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mt-10 rounded-[36px] border border-white grad-hero p-6 text-center sm:p-10">
        <h2 className="text-[clamp(1.5rem,3.4vw,2.1rem)] font-black leading-tight tracking-tight text-ink-900">
          Verify Before You Trust, Pay, or Proceed.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
          If something you have been offered does not feel right, investigate it before money moves.
        </p>
        <Link
          href="/investigate"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_20px_36px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5"
        >
          <FileSearch className="size-4" aria-hidden="true" />
          Start Investigation
        </Link>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        VerifyAbroad AI is a student-safety tool. It is not a law-enforcement service, a legal adviser
        or an official verification body. Verification statements are limited to the dataset available
        to the assistant.
      </p>
    </div>
  );
}
