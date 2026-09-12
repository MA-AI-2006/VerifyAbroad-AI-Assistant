"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Paperclip,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { api } from "@/services/api";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_BYTES,
  evidenceTextSamples,
  isAcceptedFile,
  isValidEvidenceUrl,
  officialPortalSample,
} from "@/data/mock/evidenceSamples";
import { cn, formatBytes } from "@/utils/ui";

type EvidenceType = "message" | "link" | "file";

const TYPES: { value: EvidenceType; label: string; hint: string; icon: typeof Link2 }[] = [
  { value: "message", label: "Paste Message / Text", hint: "WhatsApp, email, ad copy", icon: ClipboardList },
  { value: "link", label: "Paste Link / URL", hint: "Website or portal link", icon: Link2 },
  { value: "file", label: "Upload File / Photo", hint: "PDF, JPG, PNG up to 10MB", icon: Upload },
];

/**
 * The single reusable "Attach Evidence to Investigation" modal.
 *
 * Collects evidence, previews it, and hands it to the existing investigation
 * flow. No OCR, no AI and no verification happens here — analysis is returned
 * by the backend.
 */
export function AttachEvidenceModal({
  open,
  onClose,
  onSubmitText,
  onSubmitLink,
  onUploadFile,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitText: (label: string, text: string) => void;
  onSubmitLink: (url: string, label: string) => void;
  onUploadFile: (file: File, label: string) => void;
  busy?: boolean;
}) {
  const [type, setType] = useState<EvidenceType>("message");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [officialUrl, setOfficialUrl] = useState<string | null>(null);
  const [officialUrlState, setOfficialUrlState] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset the form each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    setType("message");
    setTitle("");
    setText("");
    setUrl("");
    setFile(null);
    setError(null);
  }, [open]);

  // Load the verified official scholarship URL from the backend (never invented).
  useEffect(() => {
    if (!open || officialUrlState !== "loading") return;
    api
      .lookupScholarship("Chevening")
      .then((response) => {
        const found = response as { scholarship?: { official_website?: string | null } };
        const value = found.scholarship?.official_website ?? null;
        setOfficialUrl(value);
        setOfficialUrlState(value ? "ready" : "unavailable");
      })
      .catch(() => setOfficialUrlState("unavailable"));
  }, [open, officialUrlState]);

  // Escape to close + a light focus trap so keyboard users stay inside the modal.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, input, textarea")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]",
        ),
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

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const acceptFile = (incoming: File | null | undefined) => {
    if (!incoming) return;
    if (!isAcceptedFile(incoming)) {
      setError("Only PDF, JPG, JPEG and PNG files are supported.");
      return;
    }
    if (incoming.size > MAX_FILE_BYTES) {
      setError("That file is larger than 10MB.");
      return;
    }
    setError(null);
    setFile(incoming);
  };

  const canSubmit =
    !busy &&
    ((type === "message" && text.trim().length > 0) ||
      (type === "link" && isValidEvidenceUrl(url)) ||
      (type === "file" && file !== null));

  const submit = () => {
    if (!canSubmit) return;
    if (type === "message") {
      onSubmitText(title.trim() || "Pasted message", text);
    } else if (type === "link") {
      const normalized = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
      onSubmitLink(normalized, title.trim() || normalized);
    } else if (file) {
      onUploadFile(file, title.trim() || file.name);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close attach evidence"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/35 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Attach Evidence to Investigation"
        className="pop-in relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-white bg-canvas shadow-[0_40px_90px_-40px_rgba(34,48,74,0.8)] sm:max-h-[90dvh] sm:rounded-[32px]"
      >
        {/* Header */}
        <div className="grad-panel shrink-0 border-b border-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/90 text-brand-700">
                <Paperclip className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-tight text-ink-900 sm:text-xl">
                  Attach Evidence to Investigation
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-600 sm:text-sm">
                  Offer letters, WhatsApp chats, links, or payment invoices
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/85 text-ink-700 transition-colors hover:bg-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="chat-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Evidence type selector */}
          <div role="tablist" aria-label="Evidence type" className="grid gap-2.5 sm:grid-cols-3">
            {TYPES.map((option) => {
              const Icon = option.icon;
              const active = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setType(option.value);
                    setError(null);
                  }}
                  className={cn(
                    "card-lift flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                    active
                      ? "border-brand-300 bg-brand-50"
                      : "border-white bg-white/85 hover:border-brand-200",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      active ? "bg-brand-600 text-white" : "bg-white text-ink-600",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-snug text-ink-900">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional title */}
          <div>
            <label htmlFor="evidence-title" className="text-sm font-bold text-ink-800">
              Title or Label <span className="font-medium text-ink-400">(Optional)</span>
            </label>
            <input
              id="evidence-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. WhatsApp offer from consultant"
              className="mt-1.5 w-full rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900"
            />
          </div>

          {/* Message form */}
          {type === "message" ? (
            <div>
              <label htmlFor="evidence-text" className="text-sm font-bold text-ink-800">
                Paste Message / Text
              </label>
              <textarea
                id="evidence-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={7}
                placeholder="Paste the WhatsApp message, email, scholarship claim, admission message, or other text here..."
                className="chat-scroll mt-1.5 w-full resize-y rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-ink-900"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
                The text is analysed as evidence — claims inside it are extracted and compared with
                the verification data. Extraction is not verification.
              </p>
            </div>
          ) : null}

          {/* Link form */}
          {type === "link" ? (
            <div>
              <label htmlFor="evidence-url" className="text-sm font-bold text-ink-800">
                Link or Website URL <span className="text-coral-600">*</span>
              </label>
              <input
                id="evidence-url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setError(null);
                }}
                inputMode="url"
                placeholder="https://example.com"
                className="mt-1.5 w-full rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
                A valid URL is not proof that a website is legitimate. The link is sent to the
                backend and compared with the official domains in our data.
              </p>
            </div>
          ) : null}

          {/* File form */}
          {type === "file" ? (
            <div>
              <span className="text-sm font-bold text-ink-800">
                Choose Document or Screenshot <span className="text-coral-600">*</span>
              </span>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  acceptFile(event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "mt-1.5 rounded-[24px] border-2 border-dashed px-4 py-7 text-center transition-colors",
                  dragging ? "border-brand-400 bg-brand-50" : "border-ink-200 bg-white/85",
                )}
              >
                <span className="mx-auto grid size-12 place-items-center rounded-2xl grad-mint text-brand-700">
                  <Upload className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-bold text-ink-900">Click or drop file here</p>
                <p className="mt-1 text-xs text-ink-500">PDF, JPG, PNG up to 10MB</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-2 text-xs font-bold text-ink-800 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  id="evidence-file"
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  className="sr-only"
                  onChange={(event) => {
                    acceptFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>

              {file ? (
                <div className="pop-in mt-3 flex items-start gap-3 rounded-2xl border border-white bg-white/90 px-3.5 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl grad-mint text-brand-700">
                    {/\.(jpe?g|png)$/i.test(file.name) ? (
                      <ImageIcon className="size-[18px]" aria-hidden="true" />
                    ) : (
                      <FileText className="size-[18px]" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{file.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {formatBytes(file.size)} · ready to attach
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-bold text-ink-700 hover:bg-navy-50"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-ink-500 hover:bg-coral-50 hover:text-coral-700"
                    >
                      <X className="size-3" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-coral-200 bg-coral-50 px-3.5 py-2.5 text-sm font-semibold text-coral-700"
            >
              {error}
            </p>
          ) : null}

          {/* Sample scenarios */}
          <div className="rounded-[24px] border border-dashed border-ink-200 bg-white/70 p-4">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-ink-500">
              <Sparkles className="size-3.5 text-lilac-500" aria-hidden="true" />
              Or attach a test sample scenario
            </p>
            <ul className="mt-3 space-y-2.5">
              {evidenceTextSamples.map((sample) => (
                <li
                  key={sample.key}
                  className="card-lift flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/90 px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl grad-lilac text-base" aria-hidden="true">
                      {sample.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{sample.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                        {sample.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setType("message");
                      setTitle(sample.title);
                      setText(sample.text);
                      setError(null);
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-powder-600 px-3 py-1.5 text-[11px] font-bold text-white transition-transform hover:-translate-y-0.5"
                  >
                    Use Sample →
                  </button>
                </li>
              ))}

              <li className="card-lift flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/90 px-3.5 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl grad-mint text-base" aria-hidden="true">
                    {officialPortalSample.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">{officialPortalSample.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                      {officialUrlState === "loading"
                        ? "Loading the verified official URL from the backend…"
                        : officialUrlState === "unavailable"
                          ? "Official URL not available in our verification data."
                          : officialUrl}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={officialUrlState !== "ready" || !officialUrl}
                  onClick={() => {
                    if (!officialUrl) return;
                    setType("link");
                    setTitle("Official Chevening Scholarship portal");
                    setUrl(officialUrl);
                    setError(null);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-powder-600 px-3 py-1.5 text-[11px] font-bold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {officialUrlState === "loading" ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : null}
                  Use Sample →
                </button>
              </li>
            </ul>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
              Sample scenarios are demo data for demonstrating the application. They are not real
              reports, and the official-portal sample is only populated with a URL that exists in the
              backend verification data.
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-500">
            Your evidence is used to analyse your investigation. Do not upload passwords, banking
            credentials or unnecessary sensitive documents.
          </p>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white bg-white/85 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[color:var(--color-hairline)] bg-white px-4 py-2.5 text-sm font-bold text-ink-800 transition-colors hover:bg-navy-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-powder-600 px-5 py-2.5 text-sm font-bold text-white",
                "shadow-[0_18px_34px_-18px_rgba(70,99,214,0.95)] transition-transform hover:-translate-y-0.5",
                !canSubmit && "pointer-events-none opacity-50",
              )}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Attach to Investigation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
