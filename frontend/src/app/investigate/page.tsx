import type { Metadata } from "next";

import { ChatView } from "@/components/Chat/ChatView";
import { loadScreen } from "@/server/dataSource";

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
  // Ids are opaque (UUIDs from the backend, numeric in the internal engine), so
  // they are passed through as strings and resolved by the data seam.
  const investigation = id ? await loadScreen(id).catch(() => null) : null;
  return <ChatView initialInvestigation={investigation} />;
}
