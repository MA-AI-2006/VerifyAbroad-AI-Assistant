import { GraduationCap } from "lucide-react";

import type { ProgramFinding } from "@/types";
import { Card, StatusPill } from "@/components/ui/primitives";
import { CardHeader, Fact, FactGrid, VerificationList } from "@/components/Verification/VerificationList";

export function ProgramCard({ program }: { program: ProgramFinding }) {
  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        icon={<GraduationCap className="size-[18px]" aria-hidden="true" />}
        title={program.name ?? "Program not specified"}
        subtitle={[program.degree_level, program.university].filter(Boolean).join(" · ") || "Program"}
        action={<StatusPill status={program.status} />}
      />

      <FactGrid className="mt-4">
        <Fact label="Degree level" value={program.degree_level ?? "Not specified"} />
        <Fact label="University" value={program.university ?? "Not specified"} />
        <Fact label="Program availability" value={program.availability ?? "Not on record"} />
        <Fact label="Application method" value={program.application_method ?? "Not on record"} />
      </FactGrid>

      <VerificationList checks={program.checks} />

      {program.notes ? (
        <p className="mt-3 text-xs leading-relaxed text-navy-600">{program.notes}</p>
      ) : null}
    </Card>
  );
}
