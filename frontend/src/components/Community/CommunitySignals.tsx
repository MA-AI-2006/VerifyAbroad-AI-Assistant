import { MessagesSquare, Star } from "lucide-react";

import type { CommunitySignals as CommunitySignalsType } from "@/types";
import { cn } from "@/utils/ui";

/**
 * Community reports are always rendered as *supporting signals*, visually
 * separated from official verification so they can never be mistaken for proof.
 */
export function CommunitySignals({
  signals,
  className,
}: {
  signals: CommunitySignalsType;
  className?: string;
}) {
  const rating = signals.rating;
  const tone =
    rating === null
      ? "text-navy-500"
      : rating >= 4
        ? "text-brand-700"
        : rating >= 3
          ? "text-amber-600"
          : "text-red-600";

  return (
    <section
      aria-label="Community signals"
      className={cn(
        "rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <MessagesSquare className="size-4 text-navy-600" aria-hidden="true" />
        <h4 className="text-xs font-bold uppercase tracking-wide text-navy-700">Community Signals</h4>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex items-center gap-1.5 text-lg font-bold", tone)}>
          <Star className="size-4" aria-hidden="true" />
          {signals.rating !== null ? `${signals.rating.toFixed(1)} / 5` : "No rating"}
        </span>
        <span className="text-sm font-medium text-navy-700">
          {signals.report_count !== null ? `${signals.report_count} reports` : "No reports"}
        </span>
      </div>

      {signals.common_complaints.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">
            Commonly reported issues
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {signals.common_complaints.map((complaint) => (
              <li
                key={complaint}
                className="rounded-full border border-navy-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-700"
              >
                {complaint}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 border-t border-navy-200/70 pt-2.5 text-[11px] leading-relaxed text-navy-600">
        ⚠ Community reports are supporting signals and may contain unverified claims. They are not
        official verification and are not proof of fraud.
        {signals.data_label ? ` (${signals.data_label})` : ""}
      </p>
    </section>
  );
}
