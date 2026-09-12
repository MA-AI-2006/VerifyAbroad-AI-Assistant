import { NextResponse } from "next/server";

import { findScholarshipByName } from "@/server/repositories/verification";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const match = await findScholarshipByName(decoded);

  if (!match) {
    return NextResponse.json({
      query: decoded,
      status: "not_found",
      message:
        "No matching scholarship record was found in our verification dataset. Confirm the scholarship name directly with the provider before acting on any claim.",
      data_note: "Verification is limited to the curated dataset available to this assistant.",
    });
  }

  const row = match.row;
  return NextResponse.json({
    query: decoded,
    matched_alias: match.matchedAlias,
    status: "verified",
    scholarship: {
      name: row.name,
      country: row.country,
      funded_by: row.fundedBy,
      funding_type: row.fundingType,
      eligible_levels: row.eligibleLevels,
      application_route: row.applicationRoute,
      application_fee: row.applicationFee,
      official_website: row.officialWebsite,
      official_application_portal: row.applicationPortal,
      notes: row.notes,
    },
    data_note: "Verification is limited to the curated dataset available to this assistant.",
  });
}
