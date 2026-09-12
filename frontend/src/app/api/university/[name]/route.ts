import { NextResponse } from "next/server";

import { findUniversityByName } from "@/server/repositories/verification";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const match = await findUniversityByName(decoded);

  if (!match) {
    return NextResponse.json({
      query: decoded,
      status: "not_found",
      message:
        "No matching university record was found in our verification dataset. This is not a conclusion about the institution — it means it still needs independent verification.",
      data_note: "Verification is limited to the curated dataset available to this assistant.",
    });
  }

  const row = match.row;
  const status = row.officialWebsite ? "verified" : "not_found";

  return NextResponse.json({
    query: decoded,
    matched_alias: match.matchedAlias,
    status,
    university: {
      name: row.name,
      country: row.country,
      official_website: row.officialWebsite,
      official_application_portal: row.applicationPortal,
      program_types: row.programTypes,
      accepts_direct_applications: row.acceptsDirectApplications,
      notes: row.notes,
      data_label: row.dataLabel,
    },
    data_note: "Verification is limited to the curated dataset available to this assistant.",
  });
}
