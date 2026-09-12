"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Award,
  BookOpenCheck,
  Compass,
  FileSearch,
  GraduationCap,
  HeartHandshake,
  History,
  Home,
  LogIn,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { EmergencyRecoveryModal } from "@/components/Emergency/EmergencyRecoveryModal";
import { cn } from "@/utils/ui";

const NAV_SECTIONS = [
  {
    label: "Investigate",
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/investigate", label: "Investigate", icon: MessageSquareText },
    ],
  },
  {
    label: "Explore",
    items: [
      { href: "/universities", label: "Universities", icon: GraduationCap },
      { href: "/scholarships", label: "Scholarships", icon: Award },
      { href: "/consultants", label: "Consultants", icon: UserRound },
      { href: "/guides", label: "Safety Guides", icon: BookOpenCheck },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/how-it-works", label: "How It Works", icon: Compass },
      { href: "/about", label: "About", icon: HeartHandshake },
    ],
  },
  {
    label: "Your workspace",
    items: [
      { href: "/history", label: "My Investigations", icon: History },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-powder-600 text-white shadow-[0_10px_24px_-12px_rgba(10,150,112,0.9)]">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-[13px] font-bold tracking-tight text-ink-800">
            VerifyAbroad
          </span>
          <span className="block text-[13px] font-bold tracking-tight grad-text">AI</span>
        </span>
      ) : null}
    </span>
  );
}

function NavPill({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-white text-ink-900 shadow-[0_12px_26px_-18px_rgba(34,48,74,0.55)] ring-1 ring-white"
          : "text-ink-600 hover:bg-white/70 hover:text-ink-900",
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-xl transition-colors",
          active
            ? "bg-gradient-to-br from-brand-400 to-powder-500 text-white"
            : "bg-white/70 text-ink-500 group-hover:text-brand-600",
        )}
      >
        <Icon className="size-[17px]" aria-hidden="true" />
      </span>
      <span className="truncate">{label}</span>
      {active ? (
        <span className="ml-auto size-2 rounded-full bg-gradient-to-br from-coral-400 to-lilac-400" aria-hidden="true" />
      ) : null}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="chat-scroll flex h-full flex-col gap-5 overflow-y-auto px-4 py-6">
      <Link href="/" onClick={onNavigate} className="px-1.5">
        <Logo />
      </Link>

      <div className="space-y-4">
        {NAV_SECTIONS.map((section) => (
          <nav key={section.label} aria-label={section.label} className="space-y-1.5">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavPill key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </nav>
        ))}
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent" />

      <div className="mt-auto space-y-3">
        <EmergencyRecoveryModal variant="sidebar" />

        {/* Decorative travel illustration */}
        <div aria-hidden="true" className="relative h-24 overflow-hidden rounded-3xl grad-mint">
          <svg viewBox="0 0 220 96" className="absolute inset-0 size-full" role="presentation">
            <path
              d="M8 74 C 52 18, 104 62, 152 26 S 196 46, 214 22"
              fill="none"
              stroke="#82a8f9"
              strokeWidth="2"
              strokeDasharray="6 7"
              className="dash-run"
            />
            <circle cx="8" cy="74" r="4.5" fill="#0a9670" />
            <circle cx="214" cy="22" r="4.5" fill="#8b6ef2" />
            <circle cx="152" cy="26" r="3" fill="#ff8a68" />
            <path
              d="M150 20 l14 6 -14 6 3 -6 z"
              fill="#5f83ef"
              transform="rotate(-8 152 26)"
              opacity="0.85"
            />
            <text x="14" y="90" fontSize="8" fill="#405074" fontFamily="sans-serif">
              Pakistan
            </text>
            <text x="182" y="14" fontSize="8" fill="#5b3fae" fontFamily="sans-serif">
              World
            </text>
          </svg>
        </div>

        <div className="rounded-3xl border border-white bg-white/80 p-4 ring-soft">
          <p className="text-sm font-bold tracking-tight text-ink-800">Ready to verify?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
            Bring the message, offer letter or payment request. The assistant works out what needs
            checking.
          </p>
          <Link
            href="/investigate"
            onClick={onNavigate}
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Start Investigation
          </Link>
        </div>
      </div>
    </div>
  );
}

function LandingNav() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <header className="glass pointer-events-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-full px-4 py-2.5 shadow-[0_18px_40px_-28px_rgba(34,48,74,0.5)]">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-powder-600 text-white">
            <ShieldCheck className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-tight text-ink-800">
            VerifyAbroad <span className="grad-text">AI</span>
          </span>
        </Link>
        <nav aria-label="Landing navigation" className="hidden items-center gap-1 md:flex">
          {[
            { href: "#journey", label: "Journey" },
            { href: "#problem", label: "The problem" },
            { href: "#how", label: "How it works" },
            { href: "/guides", label: "Safety guides" },
            { href: "/about", label: "About" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-600 transition-colors hover:bg-white/70 hover:text-ink-900"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden items-center gap-1.5 rounded-full border border-white bg-white/80 px-3.5 py-2 text-sm font-bold text-ink-800 transition-colors hover:bg-white sm:inline-flex"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Sign In
          </Link>
          <Link
            href="/investigate"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-powder-600 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_-14px_rgba(70,99,214,0.9)] transition-transform hover:-translate-y-0.5"
          >
            <FileSearch className="size-4" aria-hidden="true" />
            Start Investigation
          </Link>
        </div>
      </header>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isLanding = pathname === "/";
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLanding) {
    return (
      <div className="relative min-h-dvh">
        <LandingNav />
        <main>{children}</main>
        <div className="pointer-events-none fixed bottom-4 left-4 z-30 hidden sm:block">
          <div className="pointer-events-auto">
            <EmergencyRecoveryModal variant="compact" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="grad-sidebar sticky top-0 hidden h-dvh w-[280px] shrink-0 border-r border-white/70 lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/70 px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo compact />
            <span className="text-sm font-bold tracking-tight text-ink-800">
              VerifyAbroad <span className="grad-text">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/investigate"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-powder-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              <FileSearch className="size-3.5" aria-hidden="true" />
              Check
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="grid size-9 place-items-center rounded-xl border border-white bg-white/80 text-ink-700"
            >
              <Menu className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>

        <nav
          aria-label="Mobile navigation"
          className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/70 px-1 py-1.5 lg:hidden"
        >
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/investigate", label: "Investigate", icon: MessageSquareText },
            { href: "/guides", label: "Guides", icon: BookOpenCheck },
            { href: "/history", label: "Cases", icon: History },
            { href: "/profile", label: "Profile", icon: UserRound },
          ].map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-colors",
                  active ? "bg-white text-ink-900" : "text-ink-500",
                )}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-ink-900/25 backdrop-blur-sm"
            />
            <div className="grad-sidebar pop-in absolute inset-y-0 left-0 w-[86%] max-w-[320px] overflow-y-auto shadow-[24px_0_60px_-30px_rgba(34,48,74,0.6)]">
              <div className="flex justify-end p-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                  className="grid size-9 place-items-center rounded-xl bg-white/80 text-ink-700"
                >
                  <X className="size-[18px]" aria-hidden="true" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
