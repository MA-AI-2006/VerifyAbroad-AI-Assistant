import { databaseConfigured, db } from "@/db";
import { buildReferenceData, type ReferenceData } from "@/server/referenceData";
import {
  agents,
  communityReports,
  officialChannels,
  programs,
  scholarships,
  universities,
} from "@/db/schema";
import { normalize } from "@/server/engine/extract";

type UniversityRow = ReferenceData["universities"][number];
type ProgramRow = ReferenceData["programs"][number];
type AgentRow = ReferenceData["agents"][number];
type ScholarshipRow = ReferenceData["scholarships"][number];
type CommunityRow = ReferenceData["community"][number];
type ChannelRow = ReferenceData["channels"][number];

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

/**
 * Reference rows for every lookup the engine and the directory pages make.
 *
 * The curated seed dataset (`src/data/seed/verificationData.ts`) is the source of
 * truth; Postgres is only a cache of it. So with no DATABASE_URL — the deployed
 * Vercel shape — or a DB that is empty/unreachable, the same data is served from
 * memory and the feature set is unchanged. Lookup quality must never depend on
 * infrastructure.
 */
export async function loadVerificationData(): Promise<ReferenceData> {
  const fallback = buildReferenceData();
  if (!databaseConfigured()) return fallback;

  try {
    const { ensureSeeded } = await import("@/db/seed");
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
    if (universityRows.length === 0) return fallback;
    return {
      universities: universityRows as unknown as ReferenceData["universities"],
      programs: programRows as unknown as ReferenceData["programs"],
      agents: agentRows as unknown as ReferenceData["agents"],
      scholarships: scholarshipRows as unknown as ReferenceData["scholarships"],
      community: communityRows as unknown as ReferenceData["community"],
      channels: channelRows as unknown as ReferenceData["channels"],
    };
  } catch (error) {
    console.warn("[verification] database unavailable, serving the seed dataset instead", error);
    return fallback;
  }
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
  return matchUniversity(await loadVerificationData(), name);
}

export async function findScholarshipByName(name: string) {
  return matchScholarship(await loadVerificationData(), name);
}

export async function findAgentByName(name: string) {
  const data = await loadVerificationData();
  const match = matchAgent(data, name);
  if (match) {
    const community = matchCommunity(data, match.row.agentName, match.row.companyName);
    return { match, community };
  }
  return { match: null, community: null };
}

export async function listUniversities() {
  const data = await loadVerificationData();
  return data.universities.filter((row) => row.acceptsDirectApplications === true);
}
