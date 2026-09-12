import { NextResponse } from "next/server";

import type { StudentProfile } from "@/types";
import { getStudentProfile, saveStudentProfile } from "@/server/repositories/investigations";
import { getStudentKey } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const studentKey = await getStudentKey();
  const profile = await getStudentProfile(studentKey);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const studentKey = await getStudentKey();
  const body = (await request.json().catch(() => ({}))) as Partial<StudentProfile>;

  const profile: StudentProfile = {
    name: typeof body.name === "string" ? body.name.slice(0, 80) : "",
    preferred_language: body.preferred_language ?? "roman_urdu",
    degree_level: body.degree_level ?? null,
    target_countries: Array.isArray(body.target_countries) ? body.target_countries.slice(0, 12) : [],
    funding_preference: body.funding_preference ?? null,
  };

  const saved = await saveStudentProfile(studentKey, profile);
  return NextResponse.json({ profile: saved });
}
