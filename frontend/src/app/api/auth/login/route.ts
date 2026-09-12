import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "node:crypto";

import { findStudentByEmail } from "@/server/repositories/investigations";
import { setAuthCookie } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const account = await findStudentByEmail(email);
  if (!account?.passwordHash) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const [salt, stored] = account.passwordHash.split(":");
  if (!salt || !stored) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, "hex");
  const valid = derived.length === expected.length && timingSafeEqual(derived, expected);

  if (!valid) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

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
