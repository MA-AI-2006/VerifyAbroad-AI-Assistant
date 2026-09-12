import type { Metadata } from "next";
import { BookOpenCheck } from "lucide-react";

import { GuidesExplorer } from "@/components/Guides/GuidesExplorer";

export const metadata: Metadata = {
  title: "Safety Guides — VerifyAbroad AI",
  description:
    "Concise study-abroad safety guides for Pakistani students: universities, scholarships, consultants, admission offers, payments, documents and WhatsApp claims.",
};

export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
          <BookOpenCheck className="size-4 text-brand-600" aria-hidden="true" />
          Safety magazine
        </span>
        <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight tracking-tight text-ink-900">
          Know what to verify before you proceed.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          The same checklists the assistant applies when it investigates something for you — filtered
          by your level and destination.
        </p>
      </header>

      <div className="mt-8">
        <GuidesExplorer />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        These guides are general safety guidance for students. They are not legal advice and not
        official university, embassy or government verification.
      </p>
    </div>
  );
}
