import { ClipboardList, FileText, Image as ImageIcon, Link2, X } from "lucide-react";

import type { ChatAttachment } from "@/types";
import { cn, formatBytes, hostnameOf } from "@/utils/ui";

const kindMeta: Record<ChatAttachment["kind"], { icon: typeof FileText; label: string }> = {
  screenshot: { icon: ImageIcon, label: "Screenshot" },
  document: { icon: FileText, label: "Document" },
  link: { icon: Link2, label: "Link" },
  pasted_text: { icon: ClipboardList, label: "Pasted message" },
};

const analysisLabel: Record<NonNullable<ChatAttachment["analysis_status"]>, string> = {
  analyzed: "Text analysed",
  pending: "Analysis pending",
  not_analyzed: "Not analysed",
};

export function AttachmentCard({
  attachment,
  onRemove,
  className,
}: {
  attachment: ChatAttachment;
  onRemove?: () => void;
  className?: string;
}) {
  const meta = kindMeta[attachment.kind] ?? kindMeta.document;
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2.5 rounded-xl border border-[color:var(--color-hairline)] bg-white px-3 py-2.5",
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy-900">{attachment.label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-navy-500">
          <span>{meta.label}</span>
          {attachment.size_bytes ? <span>· {formatBytes(attachment.size_bytes)}</span> : null}
          {attachment.kind === "link" ? <span>· {hostnameOf(attachment.url ?? "")}</span> : null}
          {attachment.analysis_status ? (
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 font-semibold",
                attachment.analysis_status === "analyzed"
                  ? "border-brand-200 bg-brand-50 text-brand-800"
                  : "border-navy-200 bg-navy-50 text-navy-600",
              )}
            >
              {analysisLabel[attachment.analysis_status]}
            </span>
          ) : null}
        </p>
        {attachment.note ? (
          <p className="mt-1 text-[11px] leading-relaxed text-navy-500">{attachment.note}</p>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${attachment.label}`}
          className="rounded-lg p-1 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-800"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
