import { AlertTriangle, Check, HelpCircle, X } from "lucide-react";

import type { ClaimAnalysis, InvestigationResult, RiskLevel, RiskSignal } from "@/types";
import { Card, RiskPill } from "@/components/ui/primitives";
import { RiskGauge, riskScore } from "@/components/Risk/RiskGauge";
import { cn, riskTone } from "@/utils/ui";

const severityTone: Record<RiskSignal["severity"], string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-navy-50 text-navy-700 border-navy-200",
};

const severityLabel: Record<RiskSignal["severity"], string> = {
  high: "Strong warning signal",
  medium: "Warning signal",
  low: "Minor note",
};

const verdictTone: Record<ClaimAnalysis["verdict"], { icon: typeof X; label: string; className: string }> = {
  conflicts: { icon: X, label: "Conflicts with known information", className: "text-red-700" },
  needs_verification: { icon: AlertTriangle, label: "Needs verification", className: "text-amber-700" },
  supported: { icon: Check, label: "Consistent with our data", className: "text-brand-700" },
};

export function RiskSummary({ result }: { result: InvestigationResult }) {
  const tone = riskTone[result.overall_risk];
  const meterPosition =
    result.overall_risk === "high" ? 92 : result.overall_risk === "medium" ? 58 : result.overall_risk === "low" ? 20 : 38;

  return (
    <Card className="overflow-hidden">
      <div className={cn("border-b px-4 pt-4 pb-4 sm:px-5", tone.badge)}>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
              Investigation Result
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span className="text-2xl" aria-hidden="true">
                {tone.icon}
              </span>
              <h3 className="text-2xl font-black tracking-tight sm:text-3xl">{tone.label}</h3>
            </div>
            <div
              className="mt-3 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-white/60"
              role="img"
              aria-label={`Risk indicator: ${tone.label}`}
            >
              <div
                className={cn("h-full rounded-full", tone.bar)}
                style={{ width: `${meterPosition}%` }}
              />
            </div>
            <div className="mt-2.5">
              <RiskPill level={result.overall_risk as RiskLevel} className="bg-white/85" />
            </div>
          </div>
          <RiskGauge
            level={result.overall_risk}
            score={riskScore(
              result.overall_risk,
              result.risk_signals.filter((signal) => signal.severity === "high").length,
              result.risk_signals.filter((signal) => signal.severity === "medium").length,
            )}
            className="rounded-3xl bg-white/80 px-3 py-2"
          />
        </div>

        <p className="mt-3 text-sm font-medium leading-relaxed">{result.summary}</p>
        <p className="mt-1.5 text-xs font-semibold opacity-90">Confidence: {result.confidence}</p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
          Verification snapshot
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "University", value: result.verification.university },
            { label: "Program", value: result.verification.program },
            { label: "Scholarship", value: result.verification.scholarship },
            { label: "Agent", value: result.verification.agent },
            { label: "Payment", value: result.verification.payment },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[color:var(--color-hairline)] bg-white px-3 py-2.5"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                {item.label}
              </dt>
              <dd className="mt-1 text-xs font-semibold text-navy-800">{formatVerdict(item.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

function formatVerdict(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function WarningSignals({ signals }: { signals: RiskSignal[] }) {
  if (signals.length === 0) {
    return (
      <Card className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold tracking-tight text-navy-900">Warning signals detected</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-navy-700">
          <Check className="size-4 text-brand-600" aria-hidden="true" />
          No known fraud patterns were detected in what you shared. Keep verifying independently.
        </p>
      </Card>
    );
  }

  const ordered = [...signals].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-navy-900 sm:text-base">
        <AlertTriangle className="size-[18px] text-amber-500" aria-hidden="true" />
        Why this was flagged — warning signals
      </h3>
      <ul className="mt-3 space-y-2.5">
        {ordered.map((signal) => (
          <li
            key={signal.title}
            className={cn("rounded-xl border p-3.5", severityTone[signal.severity])}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold leading-snug">{signal.title}</p>
              <span className="rounded-full border border-current/25 bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {severityLabel[signal.severity]}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed opacity-95">{signal.explanation}</p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
              Category: {signal.category}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function severityRank(severity: RiskSignal["severity"]): number {
  return severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

export function ClaimAnalysisSection({ claims }: { claims: ClaimAnalysis[] }) {
  if (claims.length === 0) return null;
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-sm font-semibold tracking-tight text-navy-900 sm:text-base">Claim analysis</h3>
      <p className="mt-0.5 text-xs text-navy-600">
        Claims pulled out of what you shared, checked against our verification data and known fraud
        patterns.
      </p>
      <ul className="mt-3 divide-y divide-[color:var(--color-hairline)]">
        {claims.map((claim) => {
          const tone = verdictTone[claim.verdict];
          const Icon = tone.icon;
          return (
            <li key={claim.claim} className="py-3">
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-navy-900">
                    &ldquo;{claim.claim}&rdquo;
                  </p>
                  <p className={cn("mt-0.5 text-[11px] font-bold uppercase tracking-wide", tone.className)}>
                    {tone.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-navy-600">{claim.explanation}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function StillNeeded({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="border-dashed p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-navy-900">
        <HelpCircle className="size-[18px] text-navy-500" aria-hidden="true" />
        What we could not verify yet
      </h3>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-navy-700">
            <span aria-hidden="true">○</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
