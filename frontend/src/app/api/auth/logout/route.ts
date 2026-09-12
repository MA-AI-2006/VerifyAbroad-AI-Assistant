import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
