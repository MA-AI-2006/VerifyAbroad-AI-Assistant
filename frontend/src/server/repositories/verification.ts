import { eq } from "drizzle-orm";

import { db } from "@/db";
import { ensureSeeded } from "@/db/seed";
import {
  agents,
  communityReports,
  officialChannels,
  programs,
  scholarships,
  universities,
} from "@/db/schema";
import { normalize } from "@/server/engine/extract";

type UniversityRow = typeof universities.$inferSelect;
type ProgramRow = typeof programs.$inferSelect;
type AgentRow = typeof agents.$inferSelect;
type ScholarshipRow = typeof scholarships.$inferSelect;
type CommunityRow = typeof communityReports.$inferSelect;
type ChannelRow = typeof officialChannels.$inferSelect;

export interface Match<T> {
  row: T;
  matchedAlias: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Short aliases need word boundaries so "us" doesn't match inside "campus". */
function aliasMatches(norm: string, alias: string): boolean {
  const clean = alias.trim().toLowerCase();
  if (!clean) return false;
  if (clean.length <= 4) {
    return new RegExp(`(^|\\s)${escapeRegex(clean)}(\\s|$)`).test(norm);
  }
  return norm.includes(clean);
}

function bestMatch<T>(norm: string, rows: T[], getAliases: (row: T) => string[]): Match<T> | null {
  let fallback: Match<T> | null = null;
  for (const row of rows) {
    const aliases = getAliases(row) ?? [];
    for (const alias of aliases) {
      if (aliasMatches(norm, alias)) {
        if (alias.length >= 6) return { row, matchedAlias: alias };
        fallback = fallback ?? { row, matchedAlias: alias };
      }
    }
  }
  return fallback ?? null;
}

export async function loadVerificationData() {
  await ensureSeeded();
  const [universityRows, programRows, agentRows, scholarshipRows, communityRows, channelRows] =
    await Promise.all([
      db.select().from(universities),
      db.select().from(programs),
      db.select().from(agents),
      db.select().from(scholarships),
      db.select().from(communityReports),
      db.select().from(officialChannels),
    ]);
  return {
    universities: universityRows,
    programs: programRows,
    agents: agentRows,
    scholarships: scholarshipRows,
    community: communityRows,
    channels: channelRows,
  };
}

export function matchUniversity(
  data: Awaited<ReturnType<typeof loadVerificationData>>,
  text: string,
): Match<UniversityRow> | null {
  const norm = normalize(text);
  return bestMatch(
    norm,
    data.universities,
    (row) => [row.name, ...(row.aliases ?? [])],
  );
}

export function matchScholarship(
  data: Awaited<ReturnType<typeof loadVerificationData>>,
  text: string,
): Match<ScholarshipRow> | null {
  const norm = normalize(text);
  return bestMatch(norm, data.scholarships, (row) => [row.name, ...(row.aliases ?? [])]);
}

export function matchAgent(
  data: Awaited<ReturnType<typeof loadVerificationData>>,
  text: string,
): Match<AgentRow> | null {
  const norm = normalize(text);
  return bestMatch(norm, data.agents, (row) => [
    ...(row.aliases ?? []),
    row.agentName,
    row.companyName ?? "",
  ]);
}

export function matchProgram(
  data: Awaited<ReturnType<typeof loadVerificationData>>,
  text: string,
  universityName: string | null,
): Match<ProgramRow> | null {
  const norm = normalize(text);
  const scoped = universityName
    ? data.programs.filter((row) => row.universityName === universityName)
    : data.programs;
  const direct = bestMatch(norm, scoped, (row) => [row.name, ...(row.aliases ?? [])]);
  if (direct) return direct;
  return bestMatch(norm, data.programs, (row) => [row.name, ...(row.aliases ?? [])]);
}

export function matchCommunity(
  data: Awaited<ReturnType<typeof loadVerificationData>>,
  agentName: string | null,
  companyName: string | null,
): CommunityRow | null {
  if (!agentName && !companyName) return null;
  const byName = agentName
    ? data.community.find((row) => normalize(row.agentName) === normalize(agentName))
    : undefined;
  if (byName) return byName;
  if (!companyName) return null;
  return (
    data.community.find((row) => normalize(row.companyName ?? "") === normalize(companyName)) ?? null
  );
}

export function matchChannels(
  data: Awaited<ReturnType<typeof loadVerificationData>>,
  country: string | null,
): ChannelRow | null {
  if (!country) return null;
  const exact = data.channels.find((row) => row.country === country);
  if (exact) return exact;
  const norm = normalize(country);
  return (
    data.channels.find((row) => (row.countryAliases ?? []).some((alias) => aliasMatches(norm, alias))) ??
    null
  );
}

/** Lookups used by the standalone lookup endpoints. */
export async function findUniversityByName(name: string) {
  await ensureSeeded();
  const data = await loadVerificationData();
  return matchUniversity(data, name);
}

export async function findScholarshipByName(name: string) {
  await ensureSeeded();
  const data = await loadVerificationData();
  return matchScholarship(data, name);
}

export async function findAgentByName(name: string) {
  await ensureSeeded();
  const data = await loadVerificationData();
  const match = matchAgent(data, name);
  if (match) {
    const community = matchCommunity(data, match.row.agentName, match.row.companyName);
    return { match, community };
  }
  return { match: null, community: null };
}

export async function listUniversities() {
  await ensureSeeded();
  return db.select().from(universities).where(eq(universities.acceptsDirectApplications, true));
}
