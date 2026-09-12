import { UserRoundSearch } from "lucide-react";

import type { AgentFinding } from "@/types";
import { Card, StatusPill } from "@/components/ui/primitives";
import { CardHeader, Fact, FactGrid, VerificationList } from "@/components/Verification/VerificationList";
import { CommunitySignals } from "@/components/Community/CommunitySignals";

export function AgentCard({
  agent,
  community,
}: {
  agent: AgentFinding;
  community?: React.ComponentProps<typeof CommunitySignals>["signals"];
}) {
  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        icon={<UserRoundSearch className="size-[18px]" aria-hidden="true" />}
        title={agent.company ?? agent.name ?? "Consultant name not provided"}
        subtitle={[agent.name && agent.company ? agent.name : null, agent.city].filter(Boolean).join(" · ") || "Consultant / agent"}
        action={<StatusPill status={agent.status} />}
      />

      <FactGrid className="mt-4">
        <Fact label="Consultant" value={agent.name ?? "Not provided"} />
        <Fact label="Company" value={agent.company ?? "Not provided"} />
        <Fact
          label="Claimed universities"
          value={
            agent.claimed_universities.length > 0 ? agent.claimed_universities.join(", ") : "None on record"
          }
        />
        <Fact label="Contact information" value={agent.contact_info ?? "Not provided"} />
        <Fact
          label="Claims official representation"
          value={
            agent.claims_official_representation === true
              ? "Yes — claim not confirmed here"
              : agent.claims_official_representation === false
                ? "No"
                : "Not stated"
          }
        />
        <Fact label="Verification date" value={agent.verification_date ?? "—"} />
      </FactGrid>

      <VerificationList checks={agent.checks} />

      {agent.notes ? (
        <p className="mt-3 rounded-xl bg-navy-50/70 px-3.5 py-3 text-xs leading-relaxed text-navy-700">
          {agent.notes}
        </p>
      ) : null}

      {community ? <CommunitySignals signals={community} className="mt-4" /> : null}
    </Card>
  );
}
