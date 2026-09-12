import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "node:crypto";

import type { DegreeLevel, FundingType, Language } from "@/types";
import { createAccount, findStudentByEmail } from "@/server/repositories/investigations";
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

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  const existing = await findStudentByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in instead." },
      { status: 409 },
    );
  }

  const account = await createAccount({
    name,
    email,
    passwordHash: hashPassword(password),
    preferredLanguage: body.preferred_language ?? "roman_urdu",
    degreeLevel: body.degree_level ?? null,
    targetCountries: Array.isArray(body.target_countries) ? body.target_countries.slice(0, 12) : [],
    fundingPreference: body.funding_preference ?? null,
  });

  await setAuthCookie(account.key);

  return NextResponse.json({
    account: {
      name: account.name,
      email: account.email,
      preferred_language: account.preferredLanguage,
      degree_level: account.degreeLevel,
      target_countries: account.targetCountries,
      funding_preference: account.fundingPreference,
    },
  });
}
