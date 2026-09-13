import { NextResponse } from "next/server";

import { currentMode, loadScreen, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";

/**
 * Full investigation screen (transcript, evidence, profile, report).
 *
 * In backend mode this maps GET /investigations/{id}, which returns the stored
 * transcript too — so reloading an investigation from /history works.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const investigation = await loadScreen(id);
    if (!investigation) {
      return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
    }
    return NextResponse.json({ investigation, mode: await currentMode() });
  } catch (error) {
    return toResponse(error, "Could not load that investigation");
  }
}
