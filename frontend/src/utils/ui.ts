import type { RiskLevel, VerificationStatus } from "@/types";

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

export const riskTone: Record<
  RiskLevel,
  { label: string; short: string; icon: string; badge: string; bar: string; text: string; ring: string }
> = {
  high: {
    label: "High Risk",
    short: "HIGH RISK",
    icon: "🔴",
    badge: "bg-red-50 text-red-700 border-red-200",
    bar: "bg-red-600",
    text: "text-red-700",
    ring: "ring-red-200",
  },
  medium: {
    label: "Medium Risk",
    short: "MEDIUM RISK",
    icon: "🟡",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-800",
    ring: "ring-amber-200",
  },
  low: {
    label: "Low Risk",
    short: "LOW RISK",
    icon: "🟢",
    badge: "bg-brand-50 text-brand-800 border-brand-200",
    bar: "bg-brand-600",
    text: "text-brand-700",
    ring: "ring-brand-200",
  },
  pending_more_info: {
    label: "Needs More Info",
    short: "MORE INFO NEEDED",
    icon: "🟠",
    badge: "bg-navy-50 text-navy-700 border-navy-200",
    bar: "bg-navy-400",
    text: "text-navy-700",
    ring: "ring-navy-200",
  },
};

export const statusTone: Record<VerificationStatus, { icon: string; label: string; badge: string }> = {
  verified: { icon: "✓", label: "Verified", badge: "bg-brand-50 text-brand-800 border-brand-200" },
  needs_verification: {
    icon: "⚠",
    label: "Needs Verification",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  not_found: { icon: "?", label: "Not Found in Our Data", badge: "bg-navy-50 text-navy-700 border-navy-200" },
  conflicts: { icon: "!", label: "Conflicts With Known Info", badge: "bg-red-50 text-red-700 border-red-200" },
  not_applicable: { icon: "–", label: "Not Applicable", badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatPkr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `PKR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  return `Updated on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
