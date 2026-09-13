import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, History as HistoryIcon, MessageSquareText } from "lucide-react";

import { loadHistory } from "@/server/dataSource";
import { Card, LinkButton, RiskPill } from "@/components/ui/primitives";
import { relativeDate } from "@/utils/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Investigations — Study Abroad Safety Assistant",
};

export default async function HistoryPage() {
  const investigations = await loadHistory().catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
            <HistoryIcon className="size-6 text-navy-600" aria-hidden="true" />
            My Investigations
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
            Every conversation is saved so you can pick an investigation back up before you pay or
            sign anything.
          </p>
        </div>
        <LinkButton href="/investigate">
          <MessageSquareText className="size-4" aria-hidden="true" />
          Start a new investigation
        </LinkButton>
      </div>

      {investigations.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="text-sm font-semibold text-navy-900">No investigations yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-navy-600">
            When you describe an offer, a scholarship, a consultant or a payment request, the
            investigation and its result are saved here.
          </p>
          <div className="mt-4 flex justify-center">
            <LinkButton href="/investigate" variant="primary">
              Start Investigation
            </LinkButton>
          </div>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {investigations.map((item) => (
            <li key={item.id}>
              <Link href={`/investigate?id=${item.id}`} className="block">
                <Card className="p-4 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(11,31,54,0.45)] sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold tracking-tight text-navy-900 sm:text-base">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-navy-500">
                        {[item.country, item.degree_level, item.program].filter(Boolean).join(" · ") ||
                          "Details pending"}
                        {" · "}
                        {relativeDate(item.updated_at)} · {item.message_count} messages
                      </p>
                      {item.summary ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-navy-600">
                          {item.summary}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <RiskPill level={item.overall_risk} />
                      <ArrowRight className="size-4 text-navy-400" aria-hidden="true" />
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-navy-500">
        Investigations are linked to this browser session only. No sensitive personal data is
        collected.
      </p>
    </div>
  );
}
