import { NextResponse } from "next/server";

import { currentMode, loadResults, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";

/**
 * Polls the stored report for an investigation. Useful after a verify call that
 * takes a while, and on page reload to re-render the verdict.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const outcome = await loadResults(id);
    return NextResponse.json({
      status: outcome.status,
      result: outcome.result,
      needs_reverification: outcome.needs_reverification,
      mode: await currentMode(),
    });
  } catch (error) {
    return toResponse(error, "Could not load the report");
  }
}
