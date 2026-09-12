import type { Metadata } from "next";
import { UserRoundSearch } from "lucide-react";

import { DirectoryExplorer, type DirectoryItem } from "@/components/Directory/DirectoryExplorer";
import { loadVerificationData } from "@/server/repositories/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Consultants — Study Abroad Safety Assistant",
  description:
    "Consultant verification directory: claimed universities, verification status and community signals.",
};

const STATUS_LABEL: Record<string, { label: string; status: DirectoryItem["status"] }> = {
  verified: { label: "Officially listed", status: "verified" },
  needs_verification: { label: "Needs verification", status: "needs_verification" },
  not_found: { label: "Not found in our data", status: "not_found" },
};

export default async function ConsultantsPage() {
  const data = await loadVerificationData();

  const items: DirectoryItem[] = data.agents.map((row) => {
    const community = data.community.find((entry) => entry.agentName === row.agentName);
    const status = STATUS_LABEL[row.status] ?? STATUS_LABEL.needs_verification;
    return {
      id: `${row.agentName}-${row.companyName ?? ""}`,
      title: row.companyName ?? row.agentName,
      subtitle: [row.agentName, row.city].filter(Boolean).join(" · "),
      country: null,
      levels: [],
      tags: row.claimedUniversities ?? [],
      status: status.status,
      statusLabel: status.label,
      meta: [
        { label: "Consultant", value: row.agentName },
        { label: "City", value: row.city ?? "—" },
        { label: "Claimed universities", value: (row.claimedUniversities ?? []).join(", ") || "—" },
        { label: "Contact", value: row.contactInfo ?? "—" },
        { label: "Checked", value: row.verificationDate ?? "—" },
      ],
      links: [],
      note: row.notes,
      community: community
        ? {
            rating: community.rating,
            report_count: community.reportCount,
            complaints: community.commonComplaints ?? [],
            label: community.dataLabel,
          }
        : undefined,
    };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
          <UserRoundSearch className="size-4 text-coral-500" aria-hidden="true" />
          Verification directory
        </span>
        <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight tracking-tight text-ink-900">
          Consultants &amp; agents
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Many consultants do genuine, useful work. This directory only shows what could and could not
          be verified — it never labels a person a fraudster. Community reports are supporting
          signals, not proof.
        </p>
      </header>

      <div className="mt-8">
        <DirectoryExplorer
          items={items}
          searchPlaceholder="Search a consultant or company, e.g. Fatima Sheikh, EduWay"
          emptyMessage="No matching consultant or company record. That means affiliation could not be verified here — ask the university's admissions office in writing."
        />
      </div>
    </div>
  );
}
