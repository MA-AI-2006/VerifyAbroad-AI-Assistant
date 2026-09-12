import { ShieldCheck, UserRound } from "lucide-react";

import type { ChatMessage } from "@/types";
import { cn } from "@/utils/ui";
import { AttachmentCard } from "@/components/Evidence/AttachmentCard";
import { InvestigationReport } from "@/components/Investigation/InvestigationReport";
import { ProgressTrace } from "@/components/Investigation/ProgressTrace";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "student") {
    return (
      <article className="flex justify-end gap-2.5 sm:gap-3">
        <div className="max-w-[88%] sm:max-w-[76%]">
          {message.attachments && message.attachments.length > 0 ? (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {message.attachments.map((attachment) => (
                <AttachmentCard key={attachment.id} attachment={attachment} className="max-w-full" />
              ))}
            </div>
          ) : null}
          <div className="rounded-2xl rounded-tr-md bg-navy-900 px-4 py-3 text-sm leading-relaxed text-white shadow-[0_10px_28px_-18px_rgba(11,31,54,0.9)]">
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          </div>
        </div>
        <span
          className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-navy-100 text-navy-700"
          aria-hidden="true"
        >
          <UserRound className="size-4" />
        </span>
      </article>
    );
  }

  const hasResult = Boolean(message.result);
  const isWide = hasResult;

  return (
    <article className={cn("flex gap-2.5 sm:gap-3", isWide && "w-full")}>
      <span
        className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white"
        aria-hidden="true"
      >
        <ShieldCheck className="size-4" />
      </span>
      <div className={cn("min-w-0", isWide ? "w-full max-w-[860px]" : "max-w-[88%] sm:max-w-[76%]")}>
        <div className="rounded-2xl rounded-tl-md border border-[color:var(--color-hairline)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(11,31,54,0.04)]">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-navy-900">
            {message.text}
          </p>
        </div>

        {message.result ? (
          <div className="mt-3 space-y-4">
            <ProgressTrace steps={message.result.progress} />
            <InvestigationReport result={message.result} />
          </div>
        ) : null}

        {message.still_need && message.still_need.length > 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-navy-200 bg-navy-50/40 px-3.5 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-600">
              Waiting on
            </p>
            <ul className="mt-1 space-y-1">
              {message.still_need.map((item) => (
                <li key={item} className="text-xs leading-relaxed text-navy-700">
                  ○ {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
