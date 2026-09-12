"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, LifeBuoy, Loader2, ShieldCheck, X } from "lucide-react";

import { api } from "@/services/api";
import { cn } from "@/utils/ui";

type EmergencyPayload = Awaited<ReturnType<typeof api.getEmergencyProtocols>>["emergency"];

const CALM_STEPS = [
  "Preserve evidence",
  "Write down the timeline",
  "Save payment information",
  "Save messages and screenshots",
  "Take one step at a time",
];

/**
 * The single reusable Emergency Fraud & Recovery modal.
 *
 * Rendered as a centered modal above the page with a soft overlay — never as a
 * sidebar or drawer. All guidance and official contacts come from the backend,
 * so nothing is hard-coded here.
 */
export function EmergencyRecoveryModal({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EmergencyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    api
      .getEmergencyProtocols()
      .then((response) => setData(response.emergency))
      .catch(() => setError("Could not load the recovery protocols. Please try again."))
      .finally(() => setLoading(false));
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-start gap-2.5 rounded-2xl border border-coral-200 bg-coral-50/70 px-3.5 py-3 text-left transition-transform hover:-translate-y-0.5"
        >
          <LifeBuoy className="mt-0.5 size-4 shrink-0 text-coral-600" aria-hidden="true" />
          <span>
            <span className="block text-xs font-bold text-coral-700">Scammed or Pressured?</span>
            <span className="block text-[11px] font-medium leading-relaxed text-ink-600">
              Emergency Recovery Steps
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5 text-xs font-bold text-coral-700 transition-colors hover:bg-coral-50"
        >
          <LifeBuoy className="size-3.5" aria-hidden="true" />
          Scammed or Pressured?
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop only — clicks inside the panel never close the modal */}
          <button
            type="button"
            aria-label="Close emergency protocols"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/35 backdrop-blur-sm"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={data?.title ?? "Emergency Fraud and Recovery Protocols"}
            className="pop-in relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-white bg-canvas shadow-[0_40px_90px_-40px_rgba(34,48,74,0.85)] sm:max-h-[90dvh] sm:rounded-[32px]"
          >
            {/* Header (stays visible while the content scrolls) */}
            <div className="grad-coral shrink-0 border-b border-white px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-coral-700">
                    <LifeBuoy className="size-3" aria-hidden="true" />
                    Emergency
                  </p>
                  <h2 className="mt-2 text-lg font-black leading-tight tracking-tight text-ink-900 sm:text-2xl">
                    {data?.title ?? "Emergency Fraud & Recovery Protocols"}
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-600 sm:text-sm">
                    {data?.subtitle ??
                      "Immediate actions if you have already transferred funds or your passport is being held."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/85 text-ink-700 transition-colors hover:bg-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="chat-scroll flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              {loading ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading recovery protocols…
                </p>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700"
                >
                  {error}
                </p>
              ) : null}

              {data ? (
                <>
                  <section className="rounded-[26px] border border-white bg-white/85 p-5">
                    <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-brand-800">
                      <ShieldCheck className="size-[18px] text-brand-600" aria-hidden="true" />
                      {data.reassurance.heading}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">
                      {data.reassurance.body}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {CALM_STEPS.map((step) => (
                        <li
                          key={step}
                          className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800"
                        >
                          {step}
                        </li>
                      ))}
                    </ul>
                  </section>

                  {data.sections.map((section, index) => (
                    <section
                      key={section.id}
                      className="rounded-[26px] border border-white bg-white/85 p-5"
                    >
                      <h3 className="flex items-center gap-2.5 text-base font-black tracking-tight text-ink-900">
                        <span className="grid size-9 shrink-0 place-items-center rounded-2xl grad-mint text-lg" aria-hidden="true">
                          {section.icon}
                        </span>
                        {index + 1}. {section.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">{section.intro}</p>
                      <ul className="mt-3 space-y-2.5">
                        {section.actions.map((action) => (
                          <li key={action.title} className="flex gap-2.5">
                            <span
                              className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-500"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="text-sm font-bold leading-snug text-ink-900">
                                {action.title}
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                                {action.detail}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {section.caution ? (
                        <p className="mt-3 rounded-2xl border border-coral-200 bg-coral-50/80 px-3.5 py-3 text-xs leading-relaxed text-coral-800">
                          <span className="font-bold">Important: </span>
                          {section.caution}
                        </p>
                      ) : null}
                    </section>
                  ))}

                  <section className="rounded-[26px] border border-white bg-white/85 p-5">
                    <h3 className="text-base font-black tracking-tight text-ink-900">
                      {data.sections.length + 1}. Official Pakistan Regulatory Contacts
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                      These are official organisation homepages. Reporting routes and contact numbers
                      change — always confirm the current process on the official website.
                    </p>
                    <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {data.contacts.map((contact) => (
                        <li key={contact.name} className="card-lift rounded-2xl border border-white grad-panel p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                            {contact.category}
                          </p>
                          <p className="mt-0.5 text-sm font-bold leading-snug text-ink-900">
                            {contact.name}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                            {contact.note}
                          </p>
                          {contact.url ? (
                            <a
                              href={contact.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className={cn(
                                "mt-2 inline-flex items-center gap-1.5 rounded-xl border border-white bg-white px-3 py-1.5",
                                "text-[11px] font-bold text-ink-800 transition-colors hover:border-brand-200 hover:bg-brand-50",
                              )}
                            >
                              Official website
                              <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <p className="text-[11px] leading-relaxed text-ink-500">
                    {data.disclaimer} {data.data_label}
                  </p>
                </>
              ) : null}
            </div>

            {/* Footer (stays visible) */}
            <div className="shrink-0 border-t border-white bg-white/85 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <p className="mr-auto text-[11px] leading-relaxed text-ink-500">
                  Consider contacting the relevant authorities, and seek qualified legal assistance
                  where appropriate.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_18px_34px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  I Understand • Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
