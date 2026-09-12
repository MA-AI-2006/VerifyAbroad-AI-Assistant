import type { VerificationStatus } from "@/types";
import { cn } from "@/utils/ui";

export type JourneyStageState = "verified" | "needs_verification" | "not_checked";

export interface JourneyStage {
  key: string;
  label: string;
  hint?: string;
  state: JourneyStageState;
}

const stateMeta: Record<JourneyStageState, { marker: string; label: string; className: string }> = {
  verified: { marker: "✓", label: "Verified", className: "border-brand-200 bg-brand-50" },
  needs_verification: {
    marker: "⚠",
    label: "Needs verification",
    className: "border-amber-200 bg-amber-50",
  },
  not_checked: { marker: "○", label: "Not checked", className: "border-[color:var(--color-hairline)] bg-white" },
};

export function JourneyStages({
  stages,
  className,
  compact,
}: {
  stages: JourneyStage[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <ol className={cn("grid gap-2.5", compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4", className)}>
      {stages.map((stage) => {
        const meta = stateMeta[stage.state];
        return (
          <li
            key={stage.key}
            className={cn("rounded-xl border px-3.5 py-3", meta.className)}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy-900">{stage.label}</p>
              <span className="text-base leading-none" aria-hidden="true">
                {meta.marker}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
              {meta.label}
            </p>
            {stage.hint ? (
              <p className="mt-1 text-[11px] leading-relaxed text-navy-500">{stage.hint}</p>
            ) : null}
            <span className="sr-only">{`${stage.label}: ${meta.label}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function stageFromStatus(status: VerificationStatus | undefined): JourneyStageState {
  if (status === "verified") return "verified";
  if (status === "not_applicable" || status === undefined) return "not_checked";
  return "needs_verification";
}
