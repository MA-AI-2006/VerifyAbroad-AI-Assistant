import { NextResponse } from "next/server";

import { healthSnapshot } from "@/server/dataSource";

export const dynamic = "force-dynamic";

/**
 * Which engine this deployment is using, and whether the backend answers.
 * The status strip in the UI reads this; it never exposes keys or the origin.
 */
export async function GET() {
  const status = await healthSnapshot();
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
