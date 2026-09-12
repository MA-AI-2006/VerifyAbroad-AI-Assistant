"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/utils/ui";

/* ------------------------------------------------------------------ hero art */

const FLOATING_CARDS = [
  {
    icon: "🎓",
    title: "University",
    value: "Technical University of Munich",
    state: "Verified",
    tone: "brand",
    position: "left-0 top-0",
    delay: "delay-1",
  },
  {
    icon: "🎁",
    title: "Scholarship",
    value: "DAAD — funding claim",
    state: "Needs verification",
    tone: "amber",
    position: "right-0 top-[27%]",
    delay: "delay-2",
  },
  {
    icon: "👤",
    title: "Consultant",
    value: "Affiliation unconfirmed",
    state: "Unverified",
    tone: "amber",
    position: "left-0 bottom-[27%]",
    delay: "delay-3",
  },
  {
    icon: "💳",
    title: "Payment",
    value: "PKR 500,000 requested",
    state: "High risk",
    tone: "coral",
    position: "right-0 bottom-0",
    delay: "delay-4",
  },
] as const;

const toneClass: Record<string, string> = {
  brand: "text-brand-700 bg-brand-50 border-brand-200",
  amber: "text-risk-amber bg-coral-50 border-coral-200",
  coral: "text-risk-red bg-coral-50 border-coral-200",
};

export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* colour blobs */}
      <span aria-hidden="true" className="blob absolute -left-6 top-8 size-40 bg-brand-300" />
      <span aria-hidden="true" className="blob absolute -right-4 top-0 size-44 bg-powder-300" />
      <span aria-hidden="true" className="blob absolute bottom-4 left-1/3 size-40 bg-lilac-300" />
      <span aria-hidden="true" className="blob absolute -bottom-2 right-6 size-36 bg-coral-200" />

      {/* central illustration: passport, route, shield, cap */}
      <div className="glass pop-in absolute inset-[12%] grid place-items-center rounded-[42px] shadow-[0_40px_80px_-50px_rgba(34,48,74,0.6)]">
        <svg viewBox="0 0 320 320" className="h-full w-full p-4" role="img" aria-label="Illustration of a student's study-abroad journey: a passport, a graduation cap, a verification shield and a travel route">
          <defs>
            <linearGradient id="route" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#12b388" />
              <stop offset="60%" stopColor="#5f83ef" />
              <stop offset="100%" stopColor="#8b6ef2" />
            </linearGradient>
            <linearGradient id="cap" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5f83ef" />
              <stop offset="100%" stopColor="#8b6ef2" />
            </linearGradient>
          </defs>

          <circle cx="160" cy="160" r="118" fill="none" stroke="#ded4ff" strokeWidth="2" strokeDasharray="4 8" />
          <circle cx="160" cy="160" r="92" fill="none" stroke="#a7f3d4" strokeWidth="2" strokeDasharray="3 10" />

          <path
            d="M46 232 C 96 150, 150 210, 208 120 S 258 92, 274 78"
            fill="none"
            stroke="url(#route)"
            strokeWidth="5"
            strokeLinecap="round"
            className="draw-line"
          />
          <circle cx="46" cy="232" r="10" fill="#0a9670" />
          <circle cx="46" cy="232" r="10" fill="#0a9670" className="ping-soft" />
          <circle cx="274" cy="78" r="9" fill="#8b6ef2" />
          <path d="M262 84 l24 10 -24 10 5 -10 z" fill="#ff8a68" />

          {/* passport */}
          <g transform="translate(72 178) rotate(-8)">
            <rect width="86" height="60" rx="10" fill="#ffffff" stroke="#cfd7e8" strokeWidth="2" />
            <rect width="86" height="16" rx="8" fill="#5f83ef" />
            <circle cx="26" cy="40" r="10" fill="#e5efff" stroke="#a9caff" strokeWidth="2" />
            <rect x="44" y="32" width="30" height="5" rx="2.5" fill="#cfd7e8" />
            <rect x="44" y="42" width="22" height="5" rx="2.5" fill="#e8ecf5" />
          </g>

          {/* graduation cap */}
          <g transform="translate(176 58)">
            <path d="M0 18 L40 0 L80 18 L40 36 Z" fill="url(#cap)" />
            <path d="M16 26 v16 c0 8 48 8 48 0 V26" fill="#7151d8" opacity="0.85" />
            <circle cx="78" cy="20" r="5" fill="#f76b45" />
            <path d="M78 20 v22" stroke="#f76b45" strokeWidth="2" />
          </g>

          {/* shield with check */}
          <g transform="translate(196 176)">
            <path
              d="M34 4 L62 15 v22 c0 20 -14 30 -28 36 C20 67 6 57 6 37 V15 Z"
              fill="#ffffff"
              stroke="#33cfa0"
              strokeWidth="4"
            />
            <path d="M22 36 l9 9 l17 -19" fill="none" stroke="#0a9670" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* magnifier over document */}
          <g transform="translate(120 108)">
            <rect width="58" height="40" rx="6" fill="#ffffff" stroke="#cfd7e8" strokeWidth="2" />
            <rect x="10" y="10" width="38" height="4" rx="2" fill="#a9caff" />
            <rect x="10" y="19" width="28" height="4" rx="2" fill="#e8ecf5" />
            <rect x="10" y="28" width="32" height="4" rx="2" fill="#e8ecf5" />
            <circle cx="50" cy="36" r="12" fill="#d2fbe9" stroke="#0a9670" strokeWidth="3" />
            <path d="M59 45 l10 10" stroke="#0a9670" strokeWidth="4" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* floating evidence cards */}
      {FLOATING_CARDS.map((card, index) => (
        <article
          key={card.title}
          className={cn(
            "glass absolute w-[54%] rounded-2xl px-3 py-2.5 shadow-[0_20px_40px_-26px_rgba(34,48,74,0.6)] sm:w-[48%] sm:px-3.5",
            card.position,
            index % 2 === 0 ? "floaty" : "floaty-alt",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/90 text-base" aria-hidden="true">
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{card.title}</p>
              <p className="truncate text-xs font-semibold text-ink-800">{card.value}</p>
              <span
                className={cn(
                  "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  toneClass[card.tone],
                )}
              >
                {card.state}
              </span>
            </div>
          </div>
        </article>
      ))}

      {/* connector lines */}
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M14 14 C 34 26, 34 38, 42 46" fill="none" stroke="#a9caff" strokeWidth="0.7" strokeDasharray="2 2" />
        <path d="M86 34 C 70 42, 66 46, 58 50" fill="none" stroke="#a7f3d4" strokeWidth="0.7" strokeDasharray="2 2" />
        <path d="M16 78 C 34 72, 38 66, 44 60" fill="none" stroke="#c6b5ff" strokeWidth="0.7" strokeDasharray="2 2" />
        <path d="M84 84 C 68 78, 64 72, 58 64" fill="none" stroke="#ffac8c" strokeWidth="0.7" strokeDasharray="2 2" />
      </svg>
    </div>
  );
}

/* --------------------------------------------------------- world map section */

interface Destination {
  code: string;
  flag: string;
  name: string;
  levels: string;
  funding: string;
  x: number;
  y: number;
  tone: string;
}

const DESTINATIONS: Destination[] = [
  { code: "PK", flag: "🇵🇰", name: "Pakistan", levels: "Home", funding: "Start here", x: 66, y: 55, tone: "#0a9670" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", levels: "BS • MS • PhD", funding: "Scholarships • Self funded", x: 45, y: 30, tone: "#5f83ef" },
  { code: "DE", flag: "🇩🇪", name: "Germany", levels: "BS • MS • PhD", funding: "DAAD • University funding", x: 52, y: 31, tone: "#f0a03c" },
  { code: "CA", flag: "🇨🇦", name: "Canada", levels: "BS • MS • PhD", funding: "Partial funding • Self funded", x: 20, y: 32, tone: "#e0524d" },
  { code: "AU", flag: "🇦🇺", name: "Australia", levels: "BS • MS • PhD", funding: "Australia Awards", x: 82, y: 72, tone: "#12b388" },
  { code: "TR", flag: "🇹🇷", name: "Türkiye", levels: "BS • MS • PhD", funding: "Türkiye Scholarships", x: 58, y: 43, tone: "#8b6ef2" },
];

const ROUTES = [
  "M66 55 C 58 44, 50 38, 45 30",
  "M66 55 C 62 44, 56 36, 52 31",
  "M66 55 C 48 48, 32 40, 20 32",
  "M66 55 C 74 62, 79 66, 82 72",
  "M66 55 C 63 51, 60 47, 58 43",
];

export function WorldJourney() {
  const [active, setActive] = useState<string | null>(null);
  const activeDestination = DESTINATIONS.find((item) => item.code === active) ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
      <div className="relative overflow-hidden rounded-[36px] border border-white bg-white/70 p-4 shadow-[0_30px_70px_-50px_rgba(34,48,74,0.6)] sm:p-6">
        <div className="relative aspect-[16/10] w-full">
          <svg
            viewBox="0 0 100 64"
            className="absolute inset-0 size-full"
            role="img"
            aria-label="Illustrated world map with study routes from Pakistan to the UK, Germany, Canada, Australia and Türkiye"
          >
            {/* abstract continents */}
            <g fill="#e5efff" stroke="#c9e0ff" strokeWidth="0.3">
              <ellipse cx="18" cy="26" rx="12" ry="9" />
              <ellipse cx="26" cy="48" rx="7" ry="10" />
              <ellipse cx="46" cy="24" rx="9" ry="7" />
              <ellipse cx="50" cy="46" rx="7" ry="9" />
              <ellipse cx="70" cy="52" rx="13" ry="7" />
              <ellipse cx="78" cy="24" rx="9" ry="6" />
              <ellipse cx="86" cy="66" rx="8" ry="5" />
            </g>
            <g fill="#f8f5ff" stroke="#ded4ff" strokeWidth="0.3">
              <ellipse cx="60" cy="20" rx="16" ry="8" />
            </g>

            {/* routes */}
            {ROUTES.map((route, index) => (
              <path
                key={route}
                d={route}
                fill="none"
                stroke={DESTINATIONS[index + 1]?.tone ?? "#5f83ef"}
                strokeWidth="0.6"
                strokeLinecap="round"
                strokeDasharray="2 2"
                className="dash-run"
                opacity="0.85"
              />
            ))}

            {/* markers */}
            {DESTINATIONS.map((destination) => (
              <g
                key={destination.code}
                transform={`translate(${destination.x} ${destination.y * 0.64})`}
                onMouseEnter={() => setActive(destination.code)}
                onFocus={() => setActive(destination.code)}
                onMouseLeave={() => setActive((current) => (current === destination.code ? null : current))}
                onBlur={() => setActive((current) => (current === destination.code ? null : current))}
                tabIndex={0}
                role="button"
                aria-label={`${destination.name}: ${destination.levels}`}
                className="cursor-pointer outline-none"
              >
                <circle r="2.6" fill={destination.tone} opacity="0.25" />
                <circle r="1.5" fill={destination.tone} />
                <circle r="1.5" fill={destination.tone} className="ping-soft" />
                <text y="-3" textAnchor="middle" fontSize="2.6" fill="#2f3d5c" fontWeight="700">
                  {destination.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-500">
          Illustrative storytelling map — hover or tap a destination to see what students usually
          verify first.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {DESTINATIONS.slice(1).map((destination) => (
            <button
              key={destination.code}
              type="button"
              onMouseEnter={() => setActive(destination.code)}
              onClick={() => setActive(destination.code)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                active === destination.code
                  ? "border-brand-300 bg-white text-ink-900 shadow-[0_10px_24px_-18px_rgba(34,48,74,0.6)]"
                  : "border-white bg-white/70 text-ink-600 hover:bg-white",
              )}
            >
              <span aria-hidden="true">{destination.flag}</span>
              {destination.name}
            </button>
          ))}
        </div>

        <div className="grad-panel rounded-[32px] border border-white p-6 ring-soft">
          {activeDestination ? (
            <div className="pop-in space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {activeDestination.flag}
                </span>
                <div>
                  <p className="text-lg font-bold tracking-tight text-ink-900">{activeDestination.name}</p>
                  <p className="text-xs font-semibold text-ink-500">Popular study levels</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-brand-700">{activeDestination.levels}</p>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Funding</p>
                <p className="mt-0.5 text-sm text-ink-700">{activeDestination.funding}</p>
              </div>
              <Link
                href="/investigate"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(70,99,214,0.9)] transition-transform hover:-translate-y-0.5"
              >
                Start an investigation
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/80 text-brand-600">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <p className="text-base font-bold tracking-tight text-ink-900">
                Pick a destination to preview the questions
              </p>
              <p className="text-sm leading-relaxed text-ink-600">
                Every route raises different things to verify: funding letters, application portals,
                consultancy claims and payment routes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
