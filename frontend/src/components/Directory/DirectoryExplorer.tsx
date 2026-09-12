"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";

import { cn } from "@/utils/ui";

export interface DirectoryItem {
  id: string;
  title: string;
  subtitle: string;
  country: string | null;
  levels: string[];
  tags: string[];
  status: "verified" | "needs_verification" | "not_found";
  statusLabel: string;
  meta: { label: string; value: string }[];
  links: { label: string; url: string }[];
  note?: string | null;
  community?: { rating: number | null; report_count: number | null; complaints: string[]; label: string | null };
}

const statusStyles: Record<DirectoryItem["status"], string> = {
  verified: "border-brand-200 bg-brand-50 text-brand-800",
  needs_verification: "border-coral-200 bg-coral-50 text-coral-700",
  not_found: "border-lilac-200 bg-lilac-100 text-lilac-800",
};

const TONES = ["grad-mint", "grad-lilac", "grad-sage", "grad-coral", "grad-panel"];

export function DirectoryExplorer({
  items,
  searchPlaceholder,
  emptyMessage,
}: {
  items: DirectoryItem[];
  searchPlaceholder: string;
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const countries = useMemo(
    () => Array.from(new Set(items.map((item) => item.country).filter((value): value is string => Boolean(value)))).sort(),
    [items],
  );
  const levels = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.levels))).filter(Boolean),
    [items],
  );
  const tags = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.tags))).filter(Boolean).slice(0, 10),
    [items],
  );

  const filtered = items.filter((item) => {
    const haystack = [
      item.title,
      item.subtitle,
      item.tags.join(" "),
      item.meta.map((meta) => meta.value).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (query.trim() && !haystack.includes(query.trim().toLowerCase())) return false;
    if (country && item.country !== country) return false;
    if (level && !item.levels.includes(level)) return false;
    if (tag && !item.tags.includes(tag)) return false;
    return true;
  });

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
      active
        ? "border-brand-300 bg-white text-ink-900 shadow-[0_10px_22px_-18px_rgba(34,48,74,0.6)]"
        : "border-white bg-white/70 text-ink-600 hover:bg-white",
    );

  return (
    <div>
      <div className="rounded-[28px] border border-white bg-white/75 p-4 shadow-[0_24px_50px_-44px_rgba(34,48,74,0.8)] sm:p-5">
        <label className="relative block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-white bg-white/90 py-3 pl-11 pr-4 text-sm font-medium text-ink-900 placeholder:text-ink-400"
          />
        </label>

        <div className="mt-4 space-y-3">
          {countries.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Country</span>
              <button type="button" onClick={() => setCountry(null)} className={chip(!country)}>
                All
              </button>
              {countries.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCountry(country === value ? null : value)}
                  className={chip(country === value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          {levels.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Level</span>
              <button type="button" onClick={() => setLevel(null)} className={chip(!level)}>
                All
              </button>
              {levels.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLevel(level === value ? null : value)}
                  className={chip(level === value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          {tags.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">More</span>
              <button type="button" onClick={() => setTag(null)} className={chip(!tag)}>
                All
              </button>
              {tags.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTag(tag === value ? null : value)}
                  className={chip(tag === value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-[28px] border border-dashed border-ink-200 bg-white/60 px-5 py-8 text-center text-sm font-semibold text-ink-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, index) => (
            <li
              key={item.id}
              className="card-lift rise overflow-hidden rounded-[30px] border border-white bg-white/85 shadow-[0_24px_50px_-44px_rgba(34,48,74,0.8)]"
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <div className={cn("px-5 py-4", TONES[index % TONES.length])}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-black leading-snug tracking-tight text-ink-900">
                    {item.title}
                  </h3>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      statusStyles[item.status],
                    )}
                  >
                    {item.statusLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-ink-600">{item.subtitle}</p>
              </div>

              <div className="px-5 py-4">
                <dl className="space-y-2">
                  {item.meta.map((meta) => (
                    <div key={meta.label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                        {meta.label}
                      </dt>
                      <dd className="max-w-[62%] text-right text-xs font-semibold text-ink-800">
                        {meta.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {item.community ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-ink-200 bg-white/70 px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      Community signals
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-ink-800">
                      ⭐ {item.community.rating !== null ? item.community.rating.toFixed(1) : "—"}/5 ·{" "}
                      {item.community.report_count ?? 0} reports
                    </p>
                    {item.community.complaints.length > 0 ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                        {item.community.complaints.join(" · ")}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                      Supporting signals only — may contain unverified claims.
                      {item.community.label ? ` (${item.community.label})` : ""}
                    </p>
                  </div>
                ) : null}

                {item.note ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-500">{item.note}</p>
                ) : null}

                {item.links.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white bg-white px-3 py-1.5 text-[11px] font-bold text-ink-800 transition-colors hover:border-brand-200 hover:bg-brand-50"
                      >
                        {link.label}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        Everything here comes from the verification dataset available to this assistant. It is not a
        complete global list and not official verification — always confirm on the official website.
      </p>
    </div>
  );
}
