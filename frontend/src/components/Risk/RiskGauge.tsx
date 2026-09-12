import type { RiskLevel } from "@/types";
import { cn } from "@/utils/ui";

const TONES: Record<RiskLevel, { from: string; to: string; text: string; label: string; icon: string }> = {
  high: { from: "#ff8a68", to: "#e0524d", text: "text-risk-red", label: "High Risk", icon: "🔴" },
  medium: { from: "#ffc98c", to: "#f0a03c", text: "text-risk-amber", label: "Medium Risk", icon: "🟡" },
  low: { from: "#33cfa0", to: "#0a9670", text: "text-brand-700", label: "Low Risk", icon: "🟢" },
  pending_more_info: { from: "#a9caff", to: "#7151d8", text: "text-lilac-700", label: "More Info Needed", icon: "🟠" },
};

/**
 * Circular risk gauge. Risk is never communicated by colour alone — the label,
 * the number and the icon are all part of the visual.
 */
export function RiskGauge({
  level,
  score,
  className,
}: {
  level: RiskLevel;
  score: number;
  className?: string;
}) {
  const tone = TONES[level];
  const clamped = Math.max(4, Math.min(100, Math.round(score)));
  const radius = 78;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - clamped / 100);
  const gradientId = `gauge-${level}-${clamped}`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-[200px] max-w-full">
        <svg viewBox="0 0 200 118" role="img" aria-label={`Risk level: ${tone.label}, score ${clamped} out of 100`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={tone.from} />
              <stop offset="100%" stopColor={tone.to} />
            </linearGradient>
          </defs>
          <path
            d="M18 104 A 78 78 0 0 1 182 104"
            fill="none"
            stroke="#e8ecf5"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M18 104 A 78 78 0 0 1 182 104"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className="text-[40px] font-black leading-none tracking-tight text-ink-900">
            {clamped}
          </span>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
            risk score
          </span>
        </div>
      </div>
      <p className={cn("mt-2 flex items-center gap-2 text-base font-black tracking-tight", tone.text)}>
        <span aria-hidden="true">{tone.icon}</span>
        {tone.label}
      </p>
    </div>
  );
}

/** Derives a 0-100 score from the backend's risk level and signal mix. */
export function riskScore(level: RiskLevel, highCount: number, mediumCount: number): number {
  if (level === "high") return Math.min(96, 68 + highCount * 6);
  if (level === "medium") return Math.min(66, 40 + mediumCount * 5);
  if (level === "low") return Math.max(8, 18 - mediumCount * 3);
  return 34;
}
