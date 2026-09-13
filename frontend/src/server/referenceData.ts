/**
 * In-memory verification reference data, built from the curated seed module.
 *
 * Two jobs:
 *  1. It is the *source* that seeds Postgres in internal-engine mode.
 *  2. It is the whole dataset when no database is configured, which is the
 *     deployed shape (Vercel frontend + Render backend): the directory pages
 *     (universities / scholarships / consultants) and the lookup endpoints keep
 *     working with zero provisioning, and nothing about them needs a DB.
 *
 * Row shapes match the drizzle schema exactly, so `server/engine/assess.ts` and
 * `server/repositories/verification.ts` cannot tell the difference.
 */
import {
  agentSeed,
  communityReportSeed,
  officialChannelSeed,
  programSeed,
  scholarshipSeed,
  universitySeed,
} from "@/data/seed/verificationData";

export interface UniversityRow {
  id: number;
  name: string;
  aliases: string[];
  country: string | null;
  officialWebsite: string | null;
  applicationPortal: string | null;
  programTypes: string[];
  acceptsDirectApplications: boolean | null;
  notes: string | null;
  dataLabel: string | null;
}

export interface ProgramRow {
  id: number;
  universityId: number | null;
  universityName: string;
  name: string;
  aliases: string[];
  degreeLevel: string;
  availability: string;
  intake: string | null;
  applicationMethod: string | null;
  notes: string | null;
}

export interface AgentRow {
  id: number;
  agentName: string;
  companyName: string | null;
  aliases: string[];
  city: string | null;
  claimedUniversities: string[];
  contactInfo: string | null;
  status: string;
  verificationDate: string | null;
  notes: string | null;
  dataLabel: string | null;
}

export interface ScholarshipRow {
  id: number;
  name: string;
  aliases: string[];
  country: string | null;
  fundedBy: string | null;
  fundingType: string | null;
  eligibleLevels: string[];
  applicationRoute: string | null;
  applicationFee: string | null;
  officialWebsite: string | null;
  applicationPortal: string | null;
  notes: string | null;
}

export interface CommunityRow {
  id: number;
  agentName: string;
  companyName: string | null;
  rating: number | null;
  reportCount: number | null;
  commonComplaints: string[];
  dataLabel: string | null;
}

export interface ChannelRow {
  id: number;
  country: string;
  countryAliases: string[];
  channels: { name: string; url: string }[];
}

export interface ReferenceData {
  universities: UniversityRow[];
  programs: ProgramRow[];
  agents: AgentRow[];
  scholarships: ScholarshipRow[];
  community: CommunityRow[];
  channels: ChannelRow[];
}

let built: ReferenceData | null = null;

export function buildReferenceData(): ReferenceData {
  if (built) return built;
  const universityByName = new Map<string, number>();
  let id = 1;

  const universities: UniversityRow[] = universitySeed.map((row) => {
    const record = {
      id: id++,
      name: row.name,
      aliases: row.aliases ?? [],
      country: row.country ?? null,
      officialWebsite: row.official_website ?? null,
      applicationPortal: row.official_application_portal ?? null,
      programTypes: row.program_types ?? [],
      acceptsDirectApplications: row.accepts_direct_applications ?? null,
      notes: row.notes ?? null,
      dataLabel: row.data_label ?? null,
    };
    universityByName.set(row.name, record.id);
    return record;
  });

  const programs: ProgramRow[] = programSeed.map((row) => ({
    id: id++,
    universityId: universityByName.get(row.universityName) ?? null,
    universityName: row.universityName,
    name: row.name,
    aliases: row.aliases ?? [],
    degreeLevel: row.degreeLevel,
    availability: row.availability,
    intake: row.intake ?? null,
    applicationMethod: row.applicationMethod ?? null,
    notes: row.notes ?? null,
  }));

  const agents: AgentRow[] = agentSeed.map((row) => ({
    id: id++,
    agentName: row.agent_name,
    companyName: row.company_name ?? null,
    aliases: row.aliases ?? [],
    city: row.city ?? null,
    claimedUniversities: row.claimed_universities ?? [],
    contactInfo: row.contact_info ?? null,
    status: row.status,
    verificationDate: row.verification_date ?? null,
    notes: row.notes ?? null,
    dataLabel: null,
  }));

  const scholarships: ScholarshipRow[] = scholarshipSeed.map((row) => ({
    id: id++,
    name: row.name,
    aliases: row.aliases ?? [],
    country: row.country ?? null,
    fundedBy: row.funded_by ?? null,
    fundingType: row.funding_type ?? null,
    eligibleLevels: row.eligible_levels ?? [],
    applicationRoute: row.application_route ?? null,
    applicationFee: row.application_fee ?? null,
    officialWebsite: row.official_website ?? null,
    applicationPortal: row.application_portal ?? null,
    notes: row.notes ?? null,
  }));

  const community: CommunityRow[] = communityReportSeed.map((row) => ({
    id: id++,
    agentName: row.agent_name,
    companyName: row.company_name ?? null,
    rating: row.rating ?? null,
    reportCount: row.report_count ?? null,
    commonComplaints: row.common_complaints ?? [],
    dataLabel: row.data_label ?? null,
  }));

  const channels: ChannelRow[] = officialChannelSeed.map((row) => ({
    id: id++,
    country: row.country,
    countryAliases: row.country_aliases ?? [],
    channels: row.channels ?? [],
  }));

  built = { universities, programs, agents, scholarships, community, channels };
  return built;
}

/** Seed arrays in the exact column names Postgres uses, for db/seed.ts. */
export const seedPayload = {
  universities: universitySeed,
  programs: programSeed,
  agents: agentSeed,
  scholarships: scholarshipSeed,
  community: communityReportSeed,
  channels: officialChannelSeed,
};
