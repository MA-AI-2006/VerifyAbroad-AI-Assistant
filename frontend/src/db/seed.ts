import { sql } from "drizzle-orm";

import { db } from "@/db";
import {
  agents,
  communityReports,
  officialChannels,
  programs,
  scholarships,
  universities,
} from "@/db/schema";
import {
  agentSeed,
  communityReportSeed,
  officialChannelSeed,
  programSeed,
  scholarshipSeed,
  universitySeed,
} from "@/data/seed/verificationData";

let seedPromise: Promise<void> | null = null;

async function runSeed(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(universities);

  if (count > 0) return;

  await db.insert(universities).values(
    universitySeed.map((u) => ({
      name: u.name,
      aliases: u.aliases,
      country: u.country,
      officialWebsite: u.official_website,
      applicationPortal: u.official_application_portal,
      programTypes: u.program_types,
      acceptsDirectApplications: u.accepts_direct_applications,
      notes: u.notes,
      dataLabel: u.data_label ?? null,
    })),
  );

  await db.insert(programs).values(
    programSeed.map((p) => ({
      universityName: p.universityName,
      name: p.name,
      aliases: p.aliases,
      degreeLevel: p.degreeLevel,
      availability: p.availability,
      intake: p.intake ?? null,
      applicationMethod: p.applicationMethod,
      notes: p.notes,
    })),
  );

  await db.insert(agents).values(
    agentSeed.map((a) => ({
      agentName: a.agent_name,
      companyName: a.company_name,
      aliases: a.aliases,
      city: a.city,
      claimedUniversities: a.claimed_universities,
      contactInfo: a.contact_info,
      status: a.status,
      verificationDate: a.verification_date,
      notes: a.notes,
    })),
  );

  await db.insert(scholarships).values(
    scholarshipSeed.map((s) => ({
      name: s.name,
      aliases: s.aliases,
      country: s.country,
      fundedBy: s.funded_by,
      fundingType: s.funding_type,
      eligibleLevels: s.eligible_levels,
      applicationRoute: s.application_route,
      applicationFee: s.application_fee,
      officialWebsite: s.official_website,
      applicationPortal: s.application_portal,
      notes: s.notes,
    })),
  );

  await db.insert(communityReports).values(
    communityReportSeed.map((c) => ({
      agentName: c.agent_name,
      companyName: c.company_name,
      rating: c.rating,
      reportCount: c.report_count,
      commonComplaints: c.common_complaints,
      dataLabel: c.data_label,
    })),
  );

  await db.insert(officialChannels).values(officialChannelSeed);
}

/**
 * Idempotent, best-effort seeding of the verification datasets.
 * Safe to call from any server route / server component.
 */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}
