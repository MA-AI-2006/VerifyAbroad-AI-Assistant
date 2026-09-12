import { NextResponse } from "next/server";

import type { Language } from "@/types";
import { backendEnabled, backendGetResults, backendRunVerification } from "@/server/backendClient";
import { adaptReport } from "@/server/backendAdapter";

export const dynamic = "force-dynamic";

/**
 * Runs the full institution + agent + payment verification pipeline on the
 * FastAPI backend (backend/api/verification.py: POST /investigations/{id}/verify)
 * and returns the resulting risk report.
 *
 * There is no internal-engine equivalent of this endpoint: the deterministic
 * engine scores risk continuously as part of every chat turn instead of as a
 * separate step, so this route only does anything when BACKEND_URL is set.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!backendEnabled()) {
    return NextResponse.json(
      { error: "No external backend is configured. Set BACKEND_URL to enable a separate verification step." },
      { status: 501 },
    );
  }
  try {
    const { id } = await params;
    await backendRunVerification(id);
    const data = await backendGetResults(id);
    const language: Language = "roman_urdu";
    const result = data.report ? adaptReport(id, language, data.report) : null;
    return NextResponse.json({ status: data.status, result, mode: "external_backend" });
  } catch (error) {
    console.error("verification run failed", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 502 });
  }
}
