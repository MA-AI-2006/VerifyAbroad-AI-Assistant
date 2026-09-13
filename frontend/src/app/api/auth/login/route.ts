import { NextResponse } from "next/server";

import { signIn, toResponse } from "@/server/dataSource";
import { setAuthCookie } from "@/server/session";

export const dynamic = "force-dynamic";

/**
 * Signs in and stores the returned account key in a same-origin httpOnly cookie.
 * The key — not the password — is what the Next server forwards to the backend,
 * so no credential or cookie ever has to cross the Vercel/Render origin split.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }

    const result = await signIn({ email, password });
    await setAuthCookie(result.studentKey);
    return NextResponse.json({ account: result.account });
  } catch (error) {
    return toResponse(error, "Could not sign you in");
  }
}
