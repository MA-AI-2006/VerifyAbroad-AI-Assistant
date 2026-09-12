import { Building2, ExternalLink } from "lucide-react";

import type { UniversityFinding } from "@/types";
import { Card } from "@/components/ui/primitives";
import { CardHeader, Fact, FactGrid, VerificationList } from "@/components/Verification/VerificationList";
import { StatusPill } from "@/components/ui/primitives";

export function UniversityCard({ university }: { university: UniversityFinding }) {
  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        icon={<Building2 className="size-[18px]" aria-hidden="true" />}
        title={university.name}
        subtitle={[university.country, ...university.program_types].filter(Boolean).join(" · ")}
        action={<StatusPill status={university.status} />}
      />

      <FactGrid className="mt-4">
        <Fact label="Country" value={university.country ?? "Unknown"} />
        <Fact label="Programs on record" value={university.program_types.join(", ") || "No record"} />
        <Fact
          label="Application method"
          value={
            university.accepts_direct_applications
              ? "Direct application possible (no agent required)"
              : university.accepts_direct_applications === false
                ? "Application route requires confirmation"
                : "No record"
          }
        />
        <Fact
          label="Program availability"
          value={university.program_types.length > 0 ? "Listed for this institution" : "Not on record"}
        />
      </FactGrid>

      <VerificationList checks={university.checks} />

      {university.notes ? (
        <p className="mt-3 rounded-xl bg-navy-50/70 px-3.5 py-3 text-xs leading-relaxed text-navy-700">
          {university.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {university.official_website ? (
          <a
            href={university.official_website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-white px-3.5 py-2 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-50"
          >
            Open Official Website
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
        {university.application_portal ? (
          <a
            href={university.application_portal}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-white px-3.5 py-2 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-50"
          >
            Open Application Portal
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </Card>
  );
}
