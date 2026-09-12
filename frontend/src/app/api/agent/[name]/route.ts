import { NextResponse } from "next/server";

import { findAgentByName } from "@/server/repositories/verification";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const { match, community } = await findAgentByName(decoded);

  if (!match) {
    return NextResponse.json({
      query: decoded,
      status: "not_found",
      message:
        "No matching agent or company record was found in our dataset. This is not an accusation — it means the affiliation and registration could not be verified here.",
      data_note: "Verification is limited to the curated dataset available to this assistant.",
    });
  }

  const row = match.row;
  return NextResponse.json({
    query: decoded,
    matched_alias: match.matchedAlias,
    status: row.status,
    agent: {
      name: row.agentName,
      company: row.companyName,
      city: row.city,
      claimed_universities: row.claimedUniversities,
      contact_info: row.contactInfo,
      status: row.status,
      verification_date: row.verificationDate,
      notes: row.notes,
    },
    community_signals: community
      ? {
          rating: community.rating,
          report_count: community.reportCount,
          common_complaints: community.commonComplaints,
          data_label: community.dataLabel,
        }
      : null,
    data_note: "Verification is limited to the curated dataset available to this assistant.",
  });
}
