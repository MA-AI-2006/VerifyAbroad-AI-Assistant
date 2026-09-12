import type { Metadata } from "next";

import { ChatView } from "@/components/Chat/ChatView";
import { getInvestigation } from "@/server/repositories/investigations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Investigation — Study Abroad Safety Assistant",
  description:
    "Describe the university, program, scholarship, consultant or payment request you have been offered and find out what needs to be verified.",
};

export default async function InvestigatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const investigation = id ? await getInvestigation(Number(id)).catch(() => null) : null;
  return <ChatView initialInvestigation={investigation} />;
}
