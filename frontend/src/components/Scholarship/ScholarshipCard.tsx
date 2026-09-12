import { Award, ExternalLink } from "lucide-react";

import type { ScholarshipFinding } from "@/types";
import { Card, StatusPill } from "@/components/ui/primitives";
import { CardHeader, Fact, FactGrid, VerificationList } from "@/components/Verification/VerificationList";

const FUNDING_LABEL: Record<string, string> = {
  fully_funded: "Fully Funded",
  partially_funded: "Partially Funded",
  university_funded: "University Funding",
  external_scholarship: "External Scholarship",
  self_funded: "Self Funded",
  unsure: "Not Sure",
};

export function ScholarshipCard({ scholarship }: { scholarship: ScholarshipFinding }) {
  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        icon={<Award className="size-[18px]" aria-hidden="true" />}
        title={scholarship.name ?? "Scholarship name not provided"}
        subtitle={scholarship.provider ?? "Provider unknown"}
        action={<StatusPill status={scholarship.status} />}
      />

      <FactGrid className="mt-4">
        <Fact label="Provider" value={scholarship.provider ?? "Not identified"} />
        <Fact label="Country" value={scholarship.country ?? "Not specified"} />
        <Fact
          label="Eligible degree levels"
          value={scholarship.eligible_levels.length > 0 ? scholarship.eligible_levels.join(", ") : "Not on record"}
        />
        <Fact
          label="Funding type"
          value={scholarship.funding_type ? FUNDING_LABEL[scholarship.funding_type] ?? scholarship.funding_type : "Not specified"}
        />
        <Fact label="Application route" value={scholarship.application_route ?? "Not on record"} />
        <Fact label="Official website" value={scholarship.official_website ?? "Not on record"} />
      </FactGrid>

      <VerificationList checks={scholarship.checks} />

      {scholarship.notes ? (
        <p className="mt-3 rounded-xl bg-navy-50/70 px-3.5 py-3 text-xs leading-relaxed text-navy-700">
          {scholarship.notes}
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Compare this offer with the official scholarship information
        </p>
        <div className="flex flex-wrap gap-2">
          {scholarship.official_website ? (
            <a
              href={scholarship.official_website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-hairline)] bg-white px-3.5 py-2 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-50"
            >
              Official Scholarship Source
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-xs text-navy-600">
              No official scholarship source is on record — get the provider&apos;s website directly from
              the university or an official education body before paying anything.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
