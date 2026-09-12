import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { DirectoryExplorer, type DirectoryItem } from "@/components/Directory/DirectoryExplorer";
import { loadVerificationData } from "@/server/repositories/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Universities — Study Abroad Safety Assistant",
  description:
    "Browse the verification dataset: universities, countries, degree levels, application routes and official sources.",
};

export default async function UniversitiesPage() {
  const data = await loadVerificationData();

  const items: DirectoryItem[] = data.universities.map((row) => ({
    id: row.name,
    title: row.name,
    subtitle: [row.country, row.programTypes?.join(" · ")].filter(Boolean).join(" · ") || "Details on record",
    country: row.country && row.country !== "Unknown" ? row.country : null,
    levels: (row.programTypes ?? []).map((level) =>
      level === "Undergraduate" ? "BS" : level === "Postgraduate" ? "MS" : level,
    ),
    tags: [row.acceptsDirectApplications ? "Direct application" : "Route needs confirmation"],
    status: row.officialWebsite ? "verified" : "not_found",
    statusLabel: row.officialWebsite ? "Verified" : "Not in our data",
    meta: [
      { label: "Country", value: row.country ?? "Unknown" },
      {
        label: "Application",
        value: row.acceptsDirectApplications ? "Direct application possible" : "Confirm the route",
      },
      { label: "Levels", value: row.programTypes?.join(", ") || "No record" },
    ],
    links: [
      ...(row.officialWebsite ? [{ label: "Official website", url: row.officialWebsite }] : []),
      ...(row.applicationPortal ? [{ label: "Application portal", url: row.applicationPortal }] : []),
    ],
    note: row.notes,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
          <GraduationCap className="size-4 text-brand-600" aria-hidden="true" />
          Verification dataset
        </span>
        <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight tracking-tight text-ink-900">
          Universities
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Search the institutions currently in the verification dataset. &ldquo;Verified&rdquo; means
          we hold an official website and application route for it — not that your offer is genuine.
        </p>
      </header>

      <div className="mt-8">
        <DirectoryExplorer
          items={items}
          searchPlaceholder="Search a university, e.g. Munich, Toronto, Manchester"
          emptyMessage="No university in the dataset matches that search. That is not a verdict — bring it to the investigator and we will check what we can."
        />
      </div>
    </div>
  );
}
