"use client";

import { useState } from "react";
import { Paperclip, Send } from "lucide-react";

import type { ChatAttachment, DegreeLevel, FundingType } from "@/types";
import { AttachEvidenceModal } from "@/components/Evidence/AttachEvidenceModal";
import { AttachmentCard } from "@/components/Evidence/AttachmentCard";

const DEGREE_OPTIONS: { value: DegreeLevel; label: string }[] = [
  { value: "BS", label: "BS / Bachelor's" },
  { value: "MS", label: "MS / Master's" },
  { value: "PhD", label: "PhD" },
];

const FUNDING_OPTIONS: { value: FundingType; label: string }[] = [
  { value: "fully_funded", label: "Fully Funded" },
  { value: "partially_funded", label: "Partially Funded" },
  { value: "university_funded", label: "University Funding" },
  { value: "external_scholarship", label: "External Scholarship" },
  { value: "self_funded", label: "Self Funded" },
  { value: "unsure", label: "I'm Not Sure" },
];

export interface ComposerProps {
  onSend: (text: string) => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onUploadFile: (file: File, label?: string) => void;
  onSubmitPastedText: (label: string, text: string) => void;
  onSubmitLink: (url: string, label?: string) => void;
  disabled?: boolean;
  degreeLevel: DegreeLevel | null;
  fundingType: FundingType | null;
  onDegreeLevelChange: (level: DegreeLevel | null) => void;
  onFundingTypeChange: (funding: FundingType | null) => void;
}

export function Composer(props: ComposerProps) {
  const [value, setValue] = useState("");
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const submit = () => {
    const text = value.trim();
    if (!text && props.attachments.length === 0) return;
    props.onSend(text);
    setValue("");
  };

  return (
    <div className="border-t border-[color:var(--color-hairline)] bg-white/85 px-3 pt-3 pb-3 backdrop-blur sm:px-5 sm:pb-4">
      {/* Quick context selectors — optional, the AI can infer both from the chat */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="degree-select">
          Degree level you are applying for
        </label>
        <select
          id="degree-select"
          value={props.degreeLevel ?? ""}
          onChange={(event) =>
            props.onDegreeLevelChange((event.target.value as DegreeLevel) || null)
          }
          className="rounded-lg border border-[color:var(--color-hairline)] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800"
        >
          <option value="">Level: not set</option>
          {DEGREE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="funding-select">
          Funding type
        </label>
        <select
          id="funding-select"
          value={props.fundingType ?? ""}
          onChange={(event) =>
            props.onFundingTypeChange((event.target.value as FundingType) || null)
          }
          className="rounded-lg border border-[color:var(--color-hairline)] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800"
        >
          <option value="">Funding: not set</option>
          {FUNDING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="text-[11px] text-navy-400">
          Optional — the assistant can infer these from your messages.
        </span>
      </div>

      {props.attachments.length > 0 ? (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {props.attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onRemove={() => props.onRemoveAttachment(attachment.id)}
              className="max-w-full"
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setEvidenceOpen(true)}
          aria-label="Attach evidence to investigation"
          aria-haspopup="dialog"
          className="grid size-11 place-items-center rounded-xl border border-[color:var(--color-hairline)] bg-white text-navy-700 transition-colors hover:bg-navy-50"
        >
          <Paperclip className="size-[18px]" aria-hidden="true" />
        </button>

        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Describe the offer — university, program, scholarship, consultant, payment… (English, Urdu or Roman Urdu)"
          aria-label="Message the study abroad safety assistant"
          className="chat-scroll min-h-[52px] flex-1 resize-y rounded-xl border border-[color:var(--color-hairline)] bg-white px-3.5 py-3 text-sm leading-relaxed text-navy-900 placeholder:text-navy-400"
        />

        <button
          type="button"
          onClick={submit}
          disabled={props.disabled || (value.trim().length === 0 && props.attachments.length === 0)}
          aria-label="Send message"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-[18px]" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-navy-500">
        Do not upload passwords, banking credentials or unnecessary sensitive documents. Evidence is
        used only to analyse your investigation.
      </p>

      {/* One reusable evidence modal for every evidence type */}
      <AttachEvidenceModal
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        busy={props.disabled}
        onSubmitText={(label, text) => props.onSubmitPastedText(label, text)}
        onSubmitLink={(url, label) => props.onSubmitLink(url, label)}
        onUploadFile={(file, label) => props.onUploadFile(file, label)}
      />
    </div>
  );
}
