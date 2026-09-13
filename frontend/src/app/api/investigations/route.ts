import { NextResponse } from "next/server";

import { currentMode, loadHistory, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";

/** Investigation history for the signed-in student (or the anonymous session). */
export async function GET() {
  try {
    return NextResponse.json({
      investigations: await loadHistory(),
      mode: await currentMode(),
    });
  } catch (error) {
    return toResponse(error, "Could not load your investigations");
  }
}
