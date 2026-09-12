import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

import type { VerificationCheck } from "@/types";
import { cn } from "@/utils/ui";

export const checkIcons: Record<VerificationCheck["status"], ReactNode> = {
  ok: <CheckCircle2 className="size-4 text-brand-600" aria-hidden="true" />,
  warn: <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />,
  fail: <XCircle className="size-4 text-red-600" aria-hidden="true" />,
  unknown: <HelpCircle className="size-4 text-navy-400" aria-hidden="true" />,
};

/** Icon + accessible text, so risk is never communicated by colour alone. */
export const checkText: Record<VerificationCheck["status"], string> = {
  ok: "Verified",
  warn: "Needs verification",
  fail: "Conflicting information",
  unknown: "Information unavailable",
};

export function VerificationList({ checks }: { checks: VerificationCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="mt-3 divide-y divide-[color:var(--color-hairline)]">
      {checks.map((check) => (
        <li key={check.label} className="flex items-start gap-3 py-2.5">
          <span className="mt-0.5 shrink-0">{checkIcons[check.status]}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-navy-900">
              {check.label}
              <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-navy-400">
                {checkText[check.status]}
              </span>
            </p>
            {check.detail ? (
              <p className="mt-0.5 break-words text-xs leading-relaxed text-navy-600">{check.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Fact({
  label,
  value,
  className,
  children,
}: {
  label: string;
  value?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium leading-snug break-words text-navy-900">
        {value ?? children ?? "—"}
      </dd>
    </div>
  );
}

export function FactGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2", className)}>{children}</dl>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug tracking-tight text-navy-900 sm:text-base">
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-xs text-navy-600">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
