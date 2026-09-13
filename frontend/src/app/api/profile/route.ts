import { NextResponse } from "next/server";

import type { StudentProfile } from "@/types";
import { loadProfile, storeProfile, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";

/**
 * Student preferences. Persisted by the FastAPI backend when configured
 * (backend/api/accounts.py) so the frontend itself needs no database.
 */
export async function GET() {
  try {
    return NextResponse.json({ profile: await loadProfile() });
  } catch (error) {
    return toResponse(error, "Could not load your profile");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => ({}))) as Partial<StudentProfile>;
    const profile: StudentProfile = {
      name: typeof body.name === "string" ? body.name.slice(0, 80) : "",
      preferred_language: body.preferred_language ?? "roman_urdu",
      degree_level: body.degree_level ?? null,
      target_countries: Array.isArray(body.target_countries)
        ? body.target_countries.slice(0, 12)
        : [],
      funding_preference: body.funding_preference ?? null,
    };
    return NextResponse.json({ profile: await storeProfile(profile) });
  } catch (error) {
    return toResponse(error, "Could not save your profile");
  }
}
