import type { Metadata } from "next";
import { Award } from "lucide-react";

import { DirectoryExplorer, type DirectoryItem } from "@/components/Directory/DirectoryExplorer";
import { loadVerificationData } from "@/server/repositories/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scholarships — Study Abroad Safety Assistant",
  description:
    "Scholarships in the verification dataset: providers, eligible levels, funding type, application route and official sources.",
};

const FUNDING_LABEL: Record<string, string> = {
  fully_funded: "Fully Funded",
  partially_funded: "Partially Funded",
  university_funded: "University Funding",
  external_scholarship: "External Scholarship",
  self_funded: "Self Funded",
};

export default async function ScholarshipsPage() {
  const data = await loadVerificationData();

  const items: DirectoryItem[] = data.scholarships.map((row) => ({
    id: row.name,
    title: row.name,
    subtitle: row.fundedBy ?? "Provider on record",
    country: row.country && row.country !== "Various" ? row.country : null,
    levels: row.eligibleLevels ?? [],
    tags: [row.fundingType ? FUNDING_LABEL[row.fundingType] ?? row.fundingType : "Funding on record"],
    status: "verified",
    statusLabel: "Verified",
    meta: [
      { label: "Provider", value: row.fundedBy ?? "—" },
      { label: "Country", value: row.country ?? "—" },
      { label: "Levels", value: (row.eligibleLevels ?? []).join(", ") || "—" },
      { label: "Application", value: row.applicationRoute ?? "—" },
      { label: "Cost to apply", value: row.applicationFee ?? "—" },
    ],
    links: [
      ...(row.officialWebsite ? [{ label: "Official source", url: row.officialWebsite }] : []),
      ...(row.applicationPortal ? [{ label: "Apply officially", url: row.applicationPortal }] : []),
    ],
    note: row.notes,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
          <Award className="size-4 text-lilac-500" aria-hidden="true" />
          Verification dataset
        </span>
        <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight tracking-tight text-ink-900">
          Scholarships
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Every scholarship below is free to apply for directly. If someone charges a fee to get you
          one of these, that is worth investigating before you pay.
        </p>
      </header>

      <div className="mt-8">
        <DirectoryExplorer
          items={items}
          searchPlaceholder="Search a scholarship, e.g. DAAD, Chevening, Fulbright"
          emptyMessage="No scholarship in the dataset matches that name. Confirm the exact name with the provider before acting on any claim."
        />
      </div>
    </div>
  );
}
