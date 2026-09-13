import { NextResponse } from "next/server";

import type { DegreeLevel, FundingType, Language } from "@/types";
import { signUp, toResponse } from "@/server/dataSource";
import { setAuthCookie } from "@/server/session";

export const dynamic = "force-dynamic";

interface SignUpBody {
  name?: string;
  email?: string;
  password?: string;
  degree_level?: DegreeLevel | null;
  preferred_language?: Language;
  target_countries?: string[];
  funding_preference?: FundingType | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SignUpBody;
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (name.length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const result = await signUp({
      name,
      email,
      password,
      preferred_language: body.preferred_language ?? "roman_urdu",
      degree_level: body.degree_level ?? null,
      target_countries: Array.isArray(body.target_countries) ? body.target_countries.slice(0, 12) : [],
      funding_preference: body.funding_preference ?? null,
    });
    await setAuthCookie(result.studentKey);
    return NextResponse.json({ account: result.account });
  } catch (error) {
    return toResponse(error, "Could not create your account");
  }
}
