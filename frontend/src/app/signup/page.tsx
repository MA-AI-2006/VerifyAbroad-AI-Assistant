"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, ShieldCheck, UserPlus } from "lucide-react";

import type { DegreeLevel, Language } from "@/types";
import { api } from "@/services/api";
import { cn } from "@/utils/ui";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "english", label: "English" },
  { value: "roman_urdu", label: "Roman Urdu" },
  { value: "urdu", label: "اردو" },
];

const DEGREES: { value: DegreeLevel; label: string }[] = [
  { value: "BS", label: "BS / Bachelor's" },
  { value: "MS", label: "MS / Master's" },
  { value: "PhD", label: "PhD" },
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

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | null>(null);
  const [language, setLanguage] = useState<Language>("roman_urdu");
  const [countries, setCountries] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const toggleCountry = (country: string) =>
    setCountries((current) =>
      current.includes(country)
        ? current.filter((item) => item !== country)
        : [...current, country].slice(0, 12),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api.signUp({
        name,
        email,
        password,
        preferred_language: language,
        degree_level: degreeLevel,
        target_countries: countries,
      });
      setStatus("done");
      setMessage("Account created. Opening your investigation workspace…");
      window.setTimeout(() => router.push("/investigate"), 700);
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : "Could not create the account.");
    }
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
      active
        ? "border-brand-300 bg-white text-ink-900 shadow-[0_10px_22px_-18px_rgba(34,48,74,0.6)]"
        : "border-white bg-white/70 text-ink-600 hover:bg-white",
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-700">
            <ShieldCheck className="size-4 text-brand-600" aria-hidden="true" />
            VerifyAbroad AI
          </span>
          <h1 className="mt-4 text-[clamp(1.8rem,4.2vw,2.6rem)] font-black leading-tight tracking-tight text-ink-900">
            Create your account.
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink-600">
            Save your investigations, keep your preferences, and pick up a case before you pay
            anything.
          </p>
          <p className="mt-4 max-w-md rounded-2xl border border-white bg-white/70 px-4 py-3 text-xs leading-relaxed text-ink-600">
            We only ask for what the assistant genuinely needs. No passport, CNIC or ID numbers, no
            bank details, no documents at sign-up.
          </p>
          <p className="mt-4 text-xs font-bold text-ink-600">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-700 underline decoration-brand-200">
              Sign in
            </Link>
          </p>
        </div>

        <form
          onSubmit={submit}
          className="card-lift space-y-5 rounded-[32px] border border-white bg-white/85 p-6 shadow-[0_30px_60px_-50px_rgba(34,48,74,0.8)] sm:p-8"
        >
          <div>
            <label htmlFor="name" className="text-sm font-bold text-ink-800">
              Name
            </label>
            <input
              id="name"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-900"
              placeholder="e.g. Ayesha Khan"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="text-sm font-bold text-ink-800">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-900"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="text-sm font-bold text-ink-800">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-900"
              placeholder="At least 8 characters"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-ink-800">Degree level (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEGREES.map((degree) => (
                <button
                  key={degree.value}
                  type="button"
                  onClick={() => setDegreeLevel(degreeLevel === degree.value ? null : degree.value)}
                  aria-pressed={degreeLevel === degree.value}
                  className={chip(degreeLevel === degree.value)}
                >
                  {degree.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold text-ink-800">Preferred language</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLanguage(option.value)}
                  aria-pressed={language === option.value}
                  className={chip(language === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold text-ink-800">Target countries (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {COUNTRIES.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => toggleCountry(country)}
                  aria-pressed={countries.includes(country)}
                  className={chip(countries.includes(country))}
                >
                  {country}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={status === "loading"}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-5 py-3.5 text-sm font-bold text-white",
              "shadow-[0_18px_34px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {status === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="size-4" aria-hidden="true" />
            )}
            Create Account
          </button>

          {message ? (
            <p
              role="status"
              className={cn(
                "flex items-start gap-2 rounded-2xl border px-3.5 py-3 text-sm font-semibold",
                status === "error"
                  ? "border-coral-200 bg-coral-50 text-coral-700"
                  : "border-brand-200 bg-brand-50 text-brand-800",
              )}
            >
              {status === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              {message}
            </p>
          ) : null}

          <p className="border-t border-[color:var(--color-hairline)] pt-4 text-[11px] leading-relaxed text-ink-500">
            Your evidence is used to analyse your investigation. Do not upload passwords, banking
            credentials or unnecessary sensitive documents. AI analysis is not official university,
            embassy or government verification.
          </p>
        </form>
      </div>
    </div>
  );
}
