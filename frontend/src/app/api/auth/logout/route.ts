import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/server/session";

export const dynamic = "force-dynamic";

/** Drops the local session cookie; no backend state is deleted. */
export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
