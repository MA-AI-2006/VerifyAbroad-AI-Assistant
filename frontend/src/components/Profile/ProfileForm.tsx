"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import type { DegreeLevel, FundingType, Language, StudentProfile } from "@/types";
import { api } from "@/services/api";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/utils/ui";

const LANGUAGES: { value: Language; label: string; hint: string }[] = [
  { value: "english", label: "English", hint: "Reply in English" },
  { value: "roman_urdu", label: "Roman Urdu", hint: "Reply in Roman Urdu" },
  { value: "urdu", label: "اردو", hint: "Reply in Urdu script" },
];

const DEGREES: { value: DegreeLevel; label: string }[] = [
  { value: "BS", label: "BS / Bachelor's" },
  { value: "MS", label: "MS / Master's" },
  { value: "PhD", label: "PhD" },
];

const FUNDING: { value: FundingType; label: string }[] = [
  { value: "fully_funded", label: "Fully Funded" },
  { value: "partially_funded", label: "Partially Funded" },
  { value: "university_funded", label: "University Funding" },
  { value: "external_scholarship", label: "External Scholarship" },
  { value: "self_funded", label: "Self Funded" },
  { value: "unsure", label: "I'm Not Sure" },
];

const COUNTRIES = [
  "Germany",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Türkiye",
  "Singapore",
  "Saudi Arabia",
  "Malaysia",
  "Sweden",
  "Netherlands",
  "Ireland",
];

export function ProfileForm({ initialProfile }: { initialProfile: StudentProfile }) {
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const toggleCountry = (country: string) => {
    setProfile((current) => ({
      ...current,
      target_countries: current.target_countries.includes(country)
        ? current.target_countries.filter((item) => item !== country)
        : [...current.target_countries, country].slice(0, 12),
    }));
    setStatus("idle");
  };

  const save = async () => {
    setStatus("saving");
    try {
      const response = await api.saveProfile(profile);
      setProfile(response.profile);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="text-sm font-semibold text-navy-900">
            Name (optional)
          </label>
          <input
            id="name"
            value={profile.name}
            onChange={(event) => {
              setProfile((current) => ({ ...current, name: event.target.value }));
              setStatus("idle");
            }}
            placeholder="e.g. Ayesha"
            className="mt-1.5 w-full rounded-xl border border-[color:var(--color-hairline)] px-3.5 py-2.5 text-sm text-navy-900"
          />
          <p className="mt-1.5 text-xs text-navy-500">
            We do not collect ID numbers, addresses, passport or banking details.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">Preferred language</legend>
          <p className="mt-1 text-xs text-navy-500">
            The assistant also detects your language automatically from each message.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {LANGUAGES.map((language) => (
              <button
                key={language.value}
                type="button"
                onClick={() => {
                  setProfile((current) => ({ ...current, preferred_language: language.value }));
                  setStatus("idle");
                }}
                aria-pressed={profile.preferred_language === language.value}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
                  profile.preferred_language === language.value
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-[color:var(--color-hairline)] bg-white text-navy-700 hover:bg-navy-50",
                )}
              >
                {language.label}
                <span className="ml-2 text-[11px] font-normal text-navy-500">{language.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">Degree level</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DEGREES.map((degree) => (
              <button
                key={degree.value}
                type="button"
                onClick={() => {
                  setProfile((current) => ({
                    ...current,
                    degree_level: current.degree_level === degree.value ? null : degree.value,
                  }));
                  setStatus("idle");
                }}
                aria-pressed={profile.degree_level === degree.value}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
                  profile.degree_level === degree.value
                    ? "border-navy-500 bg-navy-50 text-navy-900"
                    : "border-[color:var(--color-hairline)] bg-white text-navy-700 hover:bg-navy-50",
                )}
              >
                {degree.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">Funding preference</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {FUNDING.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setProfile((current) => ({
                    ...current,
                    funding_preference:
                      current.funding_preference === option.value ? null : option.value,
                  }));
                  setStatus("idle");
                }}
                aria-pressed={profile.funding_preference === option.value}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
                  profile.funding_preference === option.value
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-[color:var(--color-hairline)] bg-white text-navy-700 hover:bg-navy-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">Target countries</legend>
          <p className="mt-1 text-xs text-navy-500">Used to surface the right official channels.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {COUNTRIES.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => toggleCountry(country)}
                aria-pressed={profile.target_countries.includes(country)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  profile.target_countries.includes(country)
                    ? "border-navy-500 bg-navy-50 text-navy-900"
                    : "border-[color:var(--color-hairline)] bg-white text-navy-700 hover:bg-navy-50",
                )}
              >
                {country}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--color-hairline)] pt-4">
          <Button onClick={() => void save()} disabled={status === "saving"}>
            {status === "saving" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            Save preferences
          </Button>
          {status === "saved" ? (
            <span className="text-sm font-semibold text-brand-700">Saved.</span>
          ) : null}
          {status === "error" ? (
            <span className="text-sm font-semibold text-red-700">
              Could not save. Please try again.
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
