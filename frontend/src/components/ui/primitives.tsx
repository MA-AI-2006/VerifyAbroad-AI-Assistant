"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import type { RiskLevel, VerificationStatus } from "@/types";
import { cn, riskTone, statusTone } from "@/utils/ui";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={cn(
        "rounded-2xl border border-[color:var(--color-hairline)] bg-white shadow-[0_1px_2px_rgba(11,31,54,0.04),0_12px_32px_-18px_rgba(11,31,54,0.28)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionHeading({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold tracking-tight text-navy-900 sm:text-lg">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm leading-relaxed text-navy-600">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "navy";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-700 shadow-[0_8px_20px_-12px_rgba(4,120,87,0.9)]",
  secondary:
    "bg-white text-navy-800 border border-[color:var(--color-hairline)] hover:bg-navy-50 focus-visible:outline-navy-600",
  ghost: "bg-transparent text-navy-700 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-700",
  navy: "bg-navy-900 text-white hover:bg-navy-800 focus-visible:outline-navy-600",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  onClick,
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(buttonBase, buttonStyles[variant], className)}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "secondary",
  className,
  external,
}: {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  className?: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn(buttonBase, buttonStyles[variant], className)}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(buttonBase, buttonStyles[variant], className)}>
      {children}
    </Link>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "warn" | "danger" | "navy";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
    brand: "bg-brand-50 text-brand-800 border-brand-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    navy: "bg-navy-50 text-navy-700 border-navy-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RiskPill({ level, className }: { level: RiskLevel; className?: string }) {
  const tone = riskTone[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide sm:text-sm",
        tone.badge,
        className,
      )}
    >
      <span aria-hidden="true">{tone.icon}</span>
      {tone.short}
    </span>
  );
}

export function StatusPill({
  status,
  className,
  compact,
}: {
  status: VerificationStatus;
  className?: string;
  compact?: boolean;
}) {
  const tone = statusTone[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone.badge,
        className,
      )}
    >
      <span aria-hidden="true">{tone.icon}</span>
      {compact ? (status === "verified" ? "Verified" : status === "not_applicable" ? "—" : tone.label) : tone.label}
    </span>
  );
}

export function CheckRow({
  icon,
  label,
  detail,
  className,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  className?: string;
}) {
  return (
    <li className={cn("flex gap-3 py-2", className)}>
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-navy-900">{label}</p>
        {detail ? <p className="mt-0.5 break-words text-xs leading-relaxed text-navy-600">{detail}</p> : null}
      </div>
    </li>
  );
}

export function InfoNote({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-navy-100 bg-navy-50/70 px-3.5 py-3 text-xs leading-relaxed text-navy-700">
      {icon ? <span className="mt-0.5 shrink-0 text-navy-500">{icon}</span> : null}
      <div>{children}</div>
    </div>
  );
}
