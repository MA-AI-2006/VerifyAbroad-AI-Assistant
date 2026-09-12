import { Check, Loader2 } from "lucide-react";

import type { ProgressStep } from "@/types";
import { cn } from "@/utils/ui";

const stateStyles: Record<ProgressStep["state"], string> = {
  done: "text-brand-700",
  active: "text-navy-800",
  pending: "text-navy-400",
  skipped: "text-navy-300",
};

const markers: Record<ProgressStep["state"], string> = {
  done: "✓",
  active: "⏳",
  pending: "○",
  skipped: "–",
};

/**
 * Renders the investigation trace returned by the backend. Steps are reported
 * per check, so nothing here pretends a check happened when it did not.
 */
export function ProgressTrace({
  steps,
  pending,
  className,
}: {
  steps: ProgressStep[];
  pending?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      aria-label="Investigation progress"
      className={cn(
        "rounded-2xl border border-[color:var(--color-hairline)] bg-navy-50/50 px-3.5 py-3",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-navy-600">
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Investigating…" : "Investigation trace"}
      </p>
      <ul className="mt-2 space-y-1">
        {steps.map((step) => (
          <li
            key={step.key}
            className={cn("flex items-start gap-2 text-xs leading-relaxed", stateStyles[step.state])}
          >
            <span className="w-4 shrink-0 text-center font-bold" aria-hidden="true">
              {markers[step.state]}
            </span>
            <span className="min-w-0">
              <span className={cn("font-medium", step.state === "active" && "step-active")}>
                {step.label}
              </span>
              {step.detail ? (
                <span className="block text-[11px] text-navy-500">{step.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fallback steps shown only while a request is genuinely in flight. */
export const pendingSteps: ProgressStep[] = [
  { key: "understand", label: "Reading your message", state: "done" },
  { key: "extract", label: "Extracting claims from what you shared", state: "active" },
  { key: "university", label: "Checking university records", state: "pending" },
  { key: "scholarship", label: "Checking scholarship records", state: "pending" },
  { key: "agent", label: "Checking agent / consultancy records", state: "pending" },
  { key: "payment", label: "Analysing the payment request", state: "pending" },
  { key: "recommendations", label: "Preparing recommendations", state: "pending" },
];
