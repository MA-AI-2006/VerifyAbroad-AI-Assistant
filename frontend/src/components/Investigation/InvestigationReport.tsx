import { ClipboardCheck, ExternalLink, Info, ListChecks } from "lucide-react";

import type { InvestigationResult } from "@/types";
import { Card } from "@/components/ui/primitives";
import { RiskSummary, ClaimAnalysisSection, StillNeeded, WarningSignals } from "@/components/Risk/RiskSummary";
import { UniversityCard } from "@/components/University/UniversityCard";
import { ProgramCard } from "@/components/Investigation/ProgramCard";
import { ScholarshipCard } from "@/components/Scholarship/ScholarshipCard";
import { AgentCard } from "@/components/Agent/AgentCard";
import { PaymentCard } from "@/components/Payment/PaymentCard";
import { CommunitySignals } from "@/components/Community/CommunitySignals";

export function InvestigationReport({ result }: { result: InvestigationResult }) {
  return (
    <section aria-label="Structured investigation result" className="space-y-4">
      <RiskSummary result={result} />

      {result.university || result.program || result.scholarship || result.agent || result.payment ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {result.university ? <UniversityCard university={result.university} /> : null}
          {result.program ? <ProgramCard program={result.program} /> : null}
          {result.scholarship ? <ScholarshipCard scholarship={result.scholarship} /> : null}
          {result.agent ? <AgentCard agent={result.agent} /> : null}
          {result.payment ? <PaymentCard payment={result.payment} /> : null}
        </div>
      ) : null}

      {result.community_signals &&
      !result.agent &&
      (result.community_signals.report_count !== null || result.community_signals.rating !== null) ? (
        <CommunitySignals signals={result.community_signals} />
      ) : null}

      <ClaimAnalysisSection claims={result.claim_analysis} />
      <WarningSignals signals={result.risk_signals} />
      <StillNeeded items={result.still_need} />

      <RecommendedActions result={result} />

      <Card className="p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy-600">
          <Info className="size-4 text-navy-500" aria-hidden="true" />
          Important limitations
        </h3>
        <ul className="mt-2 space-y-1.5">
          {result.data_notes.map((note) => (
            <li key={note} className="flex gap-2 text-xs leading-relaxed text-navy-600">
              <span aria-hidden="true">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function RecommendedActions({ result }: { result: InvestigationResult }) {
  if (result.recommended_actions.length === 0 && result.official_sources.length === 0) return null;

  return (
    <Card className="border-brand-200 bg-brand-50/40 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-brand-900 sm:text-base">
        <ListChecks className="size-[18px] text-brand-700" aria-hidden="true" />
        Before You Proceed
      </h3>

      {result.recommended_action ? (
        <p className="mt-2.5 rounded-xl border border-brand-200 bg-white px-3.5 py-3 text-sm font-semibold leading-relaxed text-navy-900">
          <span className="mr-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
            Start here:
          </span>
          {result.recommended_action}
        </p>
      ) : null}

      <ol className="mt-3 space-y-2">
        {result.recommended_actions.map((action, index) => (
          <li key={action} className="flex gap-3 text-sm leading-relaxed text-navy-800">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <span>{action}</span>
          </li>
        ))}
      </ol>

      {result.official_sources.length > 0 ? (
        <div className="mt-4 border-t border-brand-200 pt-3.5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand-800">
            <ClipboardCheck className="size-3.5" aria-hidden="true" />
            Official sources from our verification data
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {result.official_sources.map((source) => (
              <a
                key={`${source.title}-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex max-w-full items-center gap-2 rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-xs font-semibold text-navy-800 transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="truncate">{source.title}</span>
                <ExternalLink className="size-3.5 shrink-0 text-brand-700" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-brand-200 pt-3.5 text-xs leading-relaxed text-navy-700">
          No official source is on record for this case in our dataset. Get the university or
          scholarship provider&apos;s official website from an official education body (HEC, British
          Council, EducationUSA, DAAD) rather than from the agent.
        </p>
      )}
    </Card>
  );
}
