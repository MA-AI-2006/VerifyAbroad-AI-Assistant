import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Languages, ShieldCheck, UserRound } from "lucide-react";

import { ProfileForm } from "@/components/Profile/ProfileForm";
import { getStudentProfile } from "@/server/repositories/investigations";
import { getStudentKey } from "@/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — Study Abroad Safety Assistant",
};

export default async function SettingsPage() {
  const studentKey = await getStudentKey();
  const profile = await getStudentProfile(studentKey).catch(() => ({
    name: "",
    preferred_language: "roman_urdu" as const,
    degree_level: null,
    target_countries: [],
    funding_preference: null,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-2xl">
        <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-black leading-tight tracking-tight text-ink-900">
          Settings
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Preferences that shape how the assistant talks to you. Profile details live in{" "}
          <Link href="/profile" className="font-bold text-brand-700 underline decoration-brand-200">
            your profile
          </Link>
          .
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <section className="rounded-[30px] border border-white bg-white/80 p-5 shadow-[0_24px_50px_-46px_rgba(34,48,74,0.8)] sm:p-6">
          <h2 className="flex items-center gap-2.5 text-base font-black tracking-tight text-ink-900">
            <span className="grid size-9 place-items-center rounded-2xl grad-mint text-brand-700">
              <UserRound className="size-[18px]" aria-hidden="true" />
            </span>
            Student preferences
          </h2>
          <p className="mt-1.5 text-sm text-ink-600">
            Language, level, funding preference and target countries.
          </p>
          <div className="mt-5">
            <ProfileForm initialProfile={profile} />
          </div>
        </section>

        <section className="rounded-[30px] border border-white bg-white/80 p-5 shadow-[0_24px_50px_-46px_rgba(34,48,74,0.8)] sm:p-6">
          <h2 className="flex items-center gap-2.5 text-base font-black tracking-tight text-ink-900">
            <span className="grid size-9 place-items-center rounded-2xl grad-lilac text-lilac-700">
              <Languages className="size-[18px]" aria-hidden="true" />
            </span>
            Language behaviour
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> The assistant replies in the language you used — English,
              Urdu or Roman Urdu, even when you mix them.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Your preferred language is used for greetings and
              follow-up questions.
            </li>
          </ul>
        </section>

        <section className="rounded-[30px] border border-white bg-white/80 p-5 shadow-[0_24px_50px_-46px_rgba(34,48,74,0.8)] sm:p-6">
          <h2 className="flex items-center gap-2.5 text-base font-black tracking-tight text-ink-900">
            <span className="grid size-9 place-items-center rounded-2xl grad-sage text-brand-700">
              <ShieldCheck className="size-[18px]" aria-hidden="true" />
            </span>
            Privacy &amp; evidence
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Evidence is used only to analyse your investigation.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Do not upload passwords, banking credentials or
              unnecessary sensitive documents.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Investigations are linked to an anonymous session key.
            </li>
          </ul>
        </section>

        <section className="rounded-[30px] border border-white bg-white/80 p-5 shadow-[0_24px_50px_-46px_rgba(34,48,74,0.8)] sm:p-6">
          <h2 className="flex items-center gap-2.5 text-base font-black tracking-tight text-ink-900">
            <span className="grid size-9 place-items-center rounded-2xl grad-coral text-coral-700">
              <Bell className="size-[18px]" aria-hidden="true" />
            </span>
            What this assistant will never do
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Never declare a person or company a scammer.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Never invent an official website, scholarship or agent
              listing.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true">•</span> Never present AI analysis as official verification.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
