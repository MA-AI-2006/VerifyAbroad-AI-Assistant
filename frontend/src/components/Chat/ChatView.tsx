"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, PanelRightOpen, RotateCcw, Sparkles } from "lucide-react";

import type { InvestigationRecord, Language } from "@/types";
import { cn } from "@/utils/ui";
import { useInvestigation } from "@/hooks/useInvestigation";
import { backendMode, demo, starterPrompts } from "@/services/api";
import { Composer } from "@/components/Chat/Composer";
import { MessageBubble } from "@/components/Chat/MessageBubble";
import { ProgressTrace, pendingSteps } from "@/components/Investigation/ProgressTrace";
import { JourneyStages, stageFromStatus, type JourneyStage } from "@/components/Journey/JourneyStages";
import { InvestigationProfile } from "@/components/Investigation/InvestigationProfile";
import { AttachmentCard } from "@/components/Evidence/AttachmentCard";
import { Badge } from "@/components/ui/primitives";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "english", label: "English" },
  { value: "roman_urdu", label: "Roman Urdu" },
  { value: "urdu", label: "اردو" },
];

export function ChatView({ initialInvestigation }: { initialInvestigation?: InvestigationRecord | null }) {
  const investigation = useInvestigation({ investigation: initialInvestigation ?? null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [investigation.messages.length, investigation.isThinking]);

  const showSuggestions = investigation.messages.filter((m) => m.role === "student").length === 0;
  const result = investigation.latestResult;

  const stages: JourneyStage[] = useMemo(() => {
    const verification = result?.verification;
    return [
      { key: "university", label: "University", state: stageFromStatus(verification?.university) },
      { key: "program", label: "Program", state: stageFromStatus(verification?.program) },
      {
        key: "scholarship",
        label: "Scholarship / Funding",
        state: stageFromStatus(verification?.scholarship),
      },
      { key: "consultant", label: "Consultant", state: stageFromStatus(verification?.agent) },
      { key: "offer", label: "Offer / Admission", state: "not_checked" },
      {
        key: "payment",
        label: "Payment",
        state:
          verification?.payment === "high_risk_signal"
            ? "needs_verification"
            : verification?.payment === "consistent"
              ? "verified"
              : verification?.payment === "not_applicable"
                ? "not_checked"
                : "needs_verification",
      },
      {
        key: "final",
        label: "Final Verification",
        state: result?.overall_risk === "low" ? "verified" : "not_checked",
      },
    ];
  }, [result]);

  const evidence = useMemo(() => {
    const items = investigation.messages.flatMap((message) => message.attachments ?? []);
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [investigation.messages]);

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col lg:h-dvh lg:flex-row">
      {/* Conversation column */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="subtle-grid border-b border-[color:var(--color-hairline)] bg-white/80 px-4 py-3.5 backdrop-blur sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-navy-900 sm:text-lg">
                Study Abroad Safety Assistant
              </h1>
              <p className="mt-0.5 text-xs leading-relaxed text-navy-600 sm:text-sm">
                Tell me what you&apos;ve been offered. I&apos;ll help you figure out what needs to be
                verified.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="language-select">
                Preferred language
              </label>
              <select
                id="language-select"
                value={investigation.language}
                onChange={(event) => investigation.setLanguage(event.target.value as Language)}
                className="rounded-lg border border-[color:var(--color-hairline)] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void investigation.loadDemo()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                Demo case
              </button>
              <button
                type="button"
                onClick={investigation.reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-hairline)] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-50"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                New
              </button>
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-hairline)] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-50 lg:hidden"
              >
                <PanelRightOpen className="size-3.5" aria-hidden="true" />
                Details
              </button>
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="chat-scroll flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-5"
          role="log"
          aria-live="polite"
          aria-label="Investigation conversation"
        >
          {showSuggestions ? (
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Try one of these
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void investigation.send(prompt)}
                    className="rounded-xl border border-[color:var(--color-hairline)] bg-white px-3.5 py-2 text-left text-sm font-medium text-navy-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-navy-600">
                  Demo case available
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-700">
                  Load a realistic example: a consultant promises guaranteed MS admission in Germany,
                  a 100% scholarship, a guaranteed visa — and asks for 5 lakh PKR today.
                </p>
                <button
                  type="button"
                  onClick={() => void investigation.loadDemo()}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Load demo investigation
                </button>
              </div>
            </div>
          ) : null}

          {investigation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {investigation.isThinking ? (
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-8 place-items-center rounded-full bg-brand-600 text-white"
                aria-hidden="true"
              >
                <Loader2 className="size-4 animate-spin" />
              </span>
              <p className="text-sm font-medium text-navy-700">
                Assistant is reviewing what you shared…
              </p>
            </div>
          ) : null}

          {investigation.error ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{investigation.error}</span>
            </div>
          ) : null}
        </div>

        <Composer
          onSend={(text) => void investigation.send(text)}
          attachments={investigation.attachments}
          onRemoveAttachment={investigation.removeAttachment}
          onUploadFile={(file, label) => void investigation.uploadFile(file, label)}
          onSubmitPastedText={(label, text) => void investigation.submitPastedText(label, text)}
          onSubmitLink={(url, label) => void investigation.submitLink(url, label)}
          disabled={investigation.isThinking}
          degreeLevel={investigation.degreeLevel}
          fundingType={investigation.fundingType}
          onDegreeLevelChange={investigation.setDegreeLevel}
          onFundingTypeChange={investigation.setFundingType}
        />
      </section>

      {/* Investigation context rail */}
      <aside
        className={cn(
          "chat-scroll w-full shrink-0 overflow-y-auto border-l border-[color:var(--color-hairline)] bg-white/95 px-4 py-5 backdrop-blur lg:static lg:block lg:w-[340px] lg:bg-navy-50/40",
          detailsOpen ? "fixed inset-x-0 bottom-0 top-[64px] z-40 block" : "hidden",
        )}
        aria-label="Investigation context"
      >
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setDetailsOpen(false)}
            className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-hairline)] bg-white px-3 py-1.5 text-xs font-bold text-ink-700 lg:hidden"
          >
            <span aria-hidden="true">✕</span> Close details
          </button>
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-navy-600">
              Your Study Abroad Journey
            </h2>
            <JourneyStages stages={stages} compact className="mt-2.5" />
            <p className="mt-2 text-[11px] leading-relaxed text-navy-500">
              You can investigate one item or an entire situation — every stage is optional.
            </p>
          </section>

          <InvestigationProfile
            investigationId={investigation.investigationId}
            result={result}
            onTurn={investigation.appendTurn}
            onSubmitFreeText={(text) => void investigation.send(text)}
          />

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-navy-600">
              Evidence in this investigation
            </h2>
            {evidence.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-navy-200 bg-white px-3.5 py-3 text-xs leading-relaxed text-navy-500">
                No evidence yet. Use the paperclip to upload a screenshot, paste a WhatsApp message,
                or add a link.
              </p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {evidence.map((item) => (
                  <AttachmentCard key={item.id} attachment={item} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-navy-600">
              Investigation trace
            </h2>
            {result ? (
              <ProgressTrace steps={result.progress} className="mt-2.5" />
            ) : (
              <div className="mt-2.5">
                <ProgressTrace steps={pendingSteps} pending className="step-active" />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[color:var(--color-hairline)] bg-white p-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-navy-600">Privacy</h2>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-navy-600">
              <li>• Your evidence is used to analyse your investigation.</li>
              <li>• Never upload passwords, banking credentials or unnecessary documents.</li>
              <li>• AI analysis is not official legal, university, embassy or government verification.</li>
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{backendMode === "internal_engine" ? "Demo mode" : "Live backend"}</Badge>
            <span className="text-[11px] leading-relaxed text-navy-500">
              Sample verification dataset — community reports shown are demo data.
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export const chatDemoFollowUps = demo.followUps;
