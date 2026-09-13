import type { Metadata } from "next";
import { Info, Lock, UserRound } from "lucide-react";

import { ProfileForm } from "@/components/Profile/ProfileForm";
import { Card } from "@/components/ui/primitives";
import { loadProfile } from "@/server/dataSource";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile — Study Abroad Safety Assistant",
};

export default async function ProfilePage() {
  const profile = await loadProfile().catch(() => ({
    name: "",
    preferred_language: "roman_urdu" as const,
    degree_level: null,
    target_countries: [],
    funding_preference: null,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
        <UserRound className="size-6 text-navy-600" aria-hidden="true" />
        Student profile
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
        A few preferences so the assistant speaks your language and knows what you are aiming for.
      </p>

      <div className="mt-6">
        <ProfileForm initialProfile={profile} />
      </div>

      <Card className="mt-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-navy-900">
          <Lock className="size-4 text-navy-500" aria-hidden="true" />
          What we deliberately do not collect
        </h2>
        <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-navy-600">
          <li className="flex gap-2">
            <span aria-hidden="true">•</span> No passport, CNIC or ID numbers
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span> No bank account or card details
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true">•</span> No passwords or account credentials
          </li>
        </ul>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-navy-50/70 px-3.5 py-3 text-xs leading-relaxed text-navy-700">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Preferences and investigations are linked to an anonymous session key in this browser. Clearing
          your cookies removes them.
        </p>
      </Card>
    </div>
  );
}
