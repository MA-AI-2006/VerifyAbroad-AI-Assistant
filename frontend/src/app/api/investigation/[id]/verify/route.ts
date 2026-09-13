import { NextResponse } from "next/server";

import { currentMode, runVerification, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";
/** Vercel's default serverless budget is shorter than a live verification run. */
export const maxDuration = 60;


interface VerifyBody {
  force?: boolean;
}

/**
 * Runs the institution + agent + payment + document pipeline on the FastAPI
 * backend (backend/api/verification.py) and returns the resulting report.
 *
 * `force: true` re-runs instead of returning the stored report — used after a
 * profile edit, which marks the previous verdict as needing re-verification.
 * There is no internal-engine equivalent: that engine scores every message.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as VerifyBody;
    const outcome = await runVerification(id, Boolean(body.force));
    return NextResponse.json({
      status: outcome.status,
      result: outcome.result,
      run: outcome.run,
      investigation: outcome.investigation,
      mode: await currentMode(),
    });
  } catch (error) {
    return toResponse(error, "Verification failed");
  }
}
