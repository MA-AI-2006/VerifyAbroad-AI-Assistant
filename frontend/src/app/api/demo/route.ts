import { NextResponse } from "next/server";

import { demoCase, demoFollowUps } from "@/data/mock/demoCase";

export const dynamic = "force-dynamic";

/**
 * Demo-mode endpoint. Returns the scripted sample case used by the
 * "Load demo case" button so the product can be evaluated before a
 * real FastAPI backend (or LLM) is connected.
 */
export async function GET() {
  return NextResponse.json({ demo: demoCase, follow_ups: demoFollowUps });
}
