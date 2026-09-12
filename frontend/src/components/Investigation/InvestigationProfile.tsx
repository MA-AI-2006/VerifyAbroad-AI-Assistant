"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Building2,
  Check,
  GraduationCap,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import type { ChatMessage, FundingType, InvestigationResult } from "@/types";
import { api } from "@/services/api";
import { cn } from "@/utils/ui";

type Field =
  | "country"
  | "degree_level"
  | "university"
  | "program"
  | "funding_type"
  | "scholarship"
  | "agent"
  | "payment_amount_pkr";

const FIELDS: {
  key: Field;
  label: string;
  icon: typeof Globe2;
  placeholder: string;
  options?: { value: string; label: string }[];
}[] = [
  { key: "country", label: "Country", icon: Globe2, placeholder: "e.g. Germany" },
  {
    key: "degree_level",
    label: "Degree",
    icon: GraduationCap,
    placeholder: "Choose a level",
    options: [
      { value: "BS", label: "BS / Bachelor's" },
      { value: "MS", label: "MS / Master's" },
      { value: "PhD", label: "PhD" },
    ],
  },
  { key: "university", label: "University", icon: Building2, placeholder: "e.g. Technical University of Munich" },
  { key: "program", label: "Program", icon: GraduationCap, placeholder: "e.g. MSc Computer Science" },
  {
    key: "funding_type",
    label: "Funding",
    icon: Sparkles,
    placeholder: "Choose a funding type",
    options: [
      { value: "fully_funded", label: "Fully Funded" },
      { value: "partially_funded", label: "Partially Funded" },
      { value: "university_funded", label: "University Funding" },
      { value: "external_scholarship", label: "External Scholarship" },
      { value: "self_funded", label: "Self Funded" },
      { value: "unsure", label: "I'm Not Sure" },
    ],
  },
  { key: "scholarship", label: "Scholarship", icon: Sparkles, placeholder: "e.g. DAAD" },
  { key: "agent", label: "Consultant", icon: Building2, placeholder: "e.g. EduWay Consultants" },
  { key: "payment_amount_pkr", label: "Payment", icon: Banknote, placeholder: "e.g. 500000" },
];

const FUNDING_LABEL: Record<string, string> = {
  fully_funded: "Fully Funded",
  partially_funded: "Partially Funded",
  university_funded: "University Funding",
  external_scholarship: "External Scholarship",
  self_funded: "Self Funded",
  unsure: "I'm Not Sure",
};

function valueFromResult(result: InvestigationResult | null): Partial<Record<Field, string>> {
  if (!result) return {};
  return {
    country: result.university?.country ?? result.scholarship?.country ?? undefined,
    degree_level: result.program?.degree_level ?? undefined,
    university: result.university?.name ?? undefined,
    program: result.program?.name ?? undefined,
    funding_type: result.scholarship?.funding_type ?? undefined,
    scholarship: result.scholarship?.name ?? undefined,
    agent: result.agent?.company ?? result.agent?.name ?? undefined,
    payment_amount_pkr:
      result.payment?.amount_pkr !== null && result.payment?.amount_pkr !== undefined
        ? String(result.payment.amount_pkr)
        : undefined,
  };
}

export function InvestigationProfile({
  investigationId,
  result,
  onTurn,
  onSubmitFreeText,
}: {
  investigationId: string | null;
  result: InvestigationResult | null;
  onTurn: (turn: {
    studentMessage?: ChatMessage;
    assistantMessage: ChatMessage;
    result: InvestigationResult | null;
  }) => void;
  /**
   * Used for information that is not a structured profile field (a claim the
   * student remembers, or other context). It goes through the same AI engine as
   * the chat, so there is still one investigation assistant.
   */
  onSubmitFreeText?: (text: string) => void;
}) {
  const [values, setValues] = useState<Partial<Record<Field, string>>>({});
  const [source, setSource] = useState<Partial<Record<Field, "ai" | "student">>>({});
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [freeTextKind, setFreeTextKind] = useState<"claim" | "other" | null>(null);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState<Field | null>(null);
  const [saved, setSaved] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);
  const appliedResult = useRef<string | null>(null);

  // AI-extracted values fill empty fields only — the student's own edits win.
  useEffect(() => {
    if (!result) return;
    if (appliedResult.current === result.generated_at) return;
    appliedResult.current = result.generated_at;
    const extracted = valueFromResult(result);
    setValues((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(extracted) as [Field, string | undefined][]) {
        if (value && (!next[key] || next[key] === "")) next[key] = value;
      }
      return next;
    });
    setSource((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(extracted) as [Field, string | undefined][]) {
        if (value && !next[key]) next[key] = "ai";
      }
      return next;
    });
  }, [result]);

  const filled = useMemo(() => FIELDS.filter((field) => values[field.key]), [values]);

  const submit = async (
    updates: Record<string, string | number | null>,
    field: Field | null,
  ) => {
    if (!investigationId) {
      setError("Start the conversation first, then edit the profile.");
      return;
    }
    setSaving(field ?? "university");
    setError(null);
    try {
      const response = await api.updateContext(investigationId, updates);
      setValues((current) => {
        const next: Partial<Record<Field, string>> = { ...current };
        for (const [key, value] of Object.entries(updates)) {
          const typed = key as Field;
          if (value === null || value === undefined || value === "") delete next[typed];
          else next[typed] = String(value);
        }
        return next;
      });
      if (field) {
        setSource((current) => ({
          ...current,
          [field]: updates[field] ? "student" : undefined,
        }));
        setSaved(field);
        window.setTimeout(() => setSaved(null), 2200);
      }
      onTurn(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the profile");
    } finally {
      setSaving(null);
      setEditing(null);
      setAdding(false);
    }
  };

  const save = (field: Field, raw: string | null) => {
    const payload: Record<string, string | number | null> = {};
    if (field === "payment_amount_pkr") {
      const digits = raw ? raw.replace(/[^\d.]/g, "") : "";
      payload[field] = digits ? Number(digits) : null;
    } else {
      payload[field] = raw && raw.trim().length > 0 ? raw.trim() : null;
    }
    return submit(payload, field);
  };

  /**
   * Re-runs the investigation with everything currently in the profile.
   * Only fields that are set are sent, so nothing the assistant found gets
   * wiped by a refresh.
   */
  const reinvestigate = () => {
    const updates: Record<string, string | number> = {};
    for (const field of FIELDS) {
      const value = values[field.key];
      if (!value) continue;
      if (field.key === "payment_amount_pkr") {
        const digits = value.replace(/[^\d.]/g, "");
        if (digits) updates[field.key] = Number(digits);
      } else {
        updates[field.key] = value;
      }
    }
    return submit(updates, null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-600">
          <Sparkles className="size-3.5 text-brand-600" aria-hidden="true" />
          Investigation profile
        </h2>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="inline-flex items-center gap-1 rounded-full border border-white bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Plus className="size-3" aria-hidden="true" />
          Add information
        </button>
      </div>

      <p className="rounded-2xl border border-dashed border-ink-200 bg-white/60 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
        The assistant fills this from what you say and upload. Extraction is not verification — you
        can confirm, correct or remove anything.
      </p>

      {adding ? (
        <div className="pop-in space-y-3 rounded-2xl border border-white bg-white/85 p-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Investigation details
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FIELDS.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => {
                    setEditing(field.key);
                    setDraft("");
                    setAdding(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white bg-white px-2.5 py-1 text-[11px] font-bold text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  <Plus className="size-3 text-brand-600" aria-hidden="true" />
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[color:var(--color-hairline)] pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Claims &amp; evidence
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFreeTextKind("claim");
                  setFreeText("");
                  setAdding(false);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white bg-white px-2.5 py-1 text-[11px] font-bold text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <Plus className="size-3 text-lilac-500" aria-hidden="true" />
                Claim
              </button>
              <button
                type="button"
                onClick={() => {
                  setFreeTextKind("other");
                  setFreeText("");
                  setAdding(false);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white bg-white px-2.5 py-1 text-[11px] font-bold text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <Plus className="size-3 text-lilac-500" aria-hidden="true" />
                Other Information
              </button>
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-200 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-500">
                Evidence — use the 📎 paperclip in the chat
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {freeTextKind ? (
        <div className="pop-in rounded-2xl border border-white bg-white/85 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
            {freeTextKind === "claim" ? "Add a claim you were told" : "Add other information"}
          </p>
          <textarea
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            rows={3}
            autoFocus
            aria-label={freeTextKind === "claim" ? "Claim" : "Other information"}
            placeholder={
              freeTextKind === "claim"
                ? 'e.g. "100% Fully Funded XYZ Scholarship guaranteed"'
                : "Anything else the assistant should know about this case"
            }
            className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-sm font-semibold text-ink-900"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={freeText.trim().length === 0 || !onSubmitFreeText}
              onClick={() => {
                onSubmitFreeText?.(
                  freeTextKind === "claim"
                    ? `Student added a claim: "${freeText.trim()}"`
                    : `Additional information from the student: ${freeText.trim()}`,
                );
                setFreeText("");
                setFreeTextKind(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="size-3" aria-hidden="true" />
              Add to investigation
            </button>
            <button
              type="button"
              onClick={() => {
                setFreeTextKind(null);
                setFreeText("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-bold text-ink-600"
            >
              <X className="size-3" aria-hidden="true" />
              Cancel
            </button>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-ink-500">
            This is sent to the same investigation assistant so the claim can be analysed alongside
            everything else.
          </p>
        </div>
      ) : null}

      {result && result.claim_analysis.length > 0 ? (
        <div className="rounded-2xl border border-white bg-white/85 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-ink-400">
            Claims detected in this investigation
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {result.claim_analysis.slice(0, 6).map((claim) => (
              <li key={claim.claim} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-[11px]">
                  {claim.verdict === "conflicts" ? "🔴" : claim.verdict === "supported" ? "🟢" : "⚠️"}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold leading-snug text-ink-900">
                    {claim.claim}
                  </span>
                  <span className="block text-[10px] leading-relaxed text-ink-500">
                    {claim.verdict === "conflicts"
                      ? "Conflicting information"
                      : claim.verdict === "supported"
                        ? "Consistent with our data"
                        : "Needs verification"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="space-y-2">
        {FIELDS.map((field) => {
          const Icon = field.icon;
          const value = values[field.key];
          const isEditing = editing === field.key;
          const wasSaved = saved === field.key;
          const aiDetected = source[field.key] === "ai";

          return (
            <li
              key={field.key}
              className={cn(
                "card-lift rounded-2xl border bg-white/85 px-3 py-2.5",
                value ? "border-white" : "border-dashed border-ink-200 bg-white/55",
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl grad-mint text-brand-700">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wide text-ink-400">
                    {field.label}
                  </p>

                  {isEditing ? (
                    <div className="mt-1.5">
                      {field.options ? (
                        <div className="flex flex-wrap gap-1.5">
                          {field.options.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => void save(field.key, option.value)}
                              className="rounded-full border border-white bg-white px-2.5 py-1 text-[11px] font-bold text-ink-700 hover:bg-brand-50"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder={field.placeholder}
                          autoFocus
                          aria-label={field.label}
                          className="w-full rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-900"
                        />
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void save(field.key, draft)}
                          disabled={saving === field.key}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                        >
                          {saving === field.key ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="size-3" aria-hidden="true" />
                          )}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                            setDraft("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-bold text-ink-600"
                        >
                          <X className="size-3" aria-hidden="true" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        className={cn(
                          "mt-0.5 break-words text-sm font-semibold",
                          value ? "text-ink-900" : "text-ink-400",
                        )}
                      >
                        {value
                          ? field.key === "funding_type"
                            ? FUNDING_LABEL[value] ?? value
                            : field.key === "payment_amount_pkr"
                              ? `PKR ${Number(value).toLocaleString("en-US")}`
                              : value
                          : "Not provided"}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {aiDetected ? (
                          <span className="rounded-full border border-lilac-200 bg-lilac-100 px-2 py-0.5 text-[10px] font-bold text-lilac-800">
                            Detected by AI
                          </span>
                        ) : value ? (
                          <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                            You set this
                          </span>
                        ) : null}
                        {wasSaved ? (
                          <span className="pop-in rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                            ✓ Updated
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(field.key);
                            setDraft(value ?? "");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-800"
                        >
                          <Pencil className="size-3" aria-hidden="true" />
                          {value ? "Edit" : "Add"}
                        </button>
                        {aiDetected ? (
                          <button
                            type="button"
                            onClick={() => void save(field.key, value ?? null)}
                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-brand-700 transition-colors hover:bg-brand-50"
                          >
                            <Check className="size-3" aria-hidden="true" />
                            Confirm
                          </button>
                        ) : null}
                        {value ? (
                          <button
                            type="button"
                            onClick={() => void save(field.key, null)}
                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-ink-500 transition-colors hover:bg-coral-50 hover:text-coral-700"
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filled.length > 0 ? (
        <button
          type="button"
          onClick={() => void reinvestigate()}
          disabled={saving !== null}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-4 py-2.5 text-xs font-bold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving !== null ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-3.5" aria-hidden="true" />
          )}
          Re-investigate with updated information
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 text-[11px] font-semibold text-coral-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
