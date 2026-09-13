import { NextResponse } from "next/server";

import type {
  ChatAttachment,
  DegreeLevel,
  FundingType,
  Language,
} from "@/types";
import {
  currentMode,
  startInvestigation,
  toResponse,
} from "@/server/dataSource";

export const dynamic = "force-dynamic";
/** Vercel's default serverless budget is shorter than a live verification run. */
export const maxDuration = 60;


interface StartBody {
  message?: string;
  language?: Language;
  degree_level?: DegreeLevel;
  funding_type?: FundingType;
  attachments?: ChatAttachment[];
}

/**
 * Starts an investigation.
 *
 * `BACKEND_URL` set  -> the FastAPI service owns the case (backend/api/investigation.py).
 * unset              -> the internal deterministic engine, unchanged.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as StartBody;
    const started = await startInvestigation({
      message: body.message ?? "",
      language: body.language ?? "roman_urdu",
      degreeLevel: body.degree_level ?? null,
      fundingType: body.funding_type ?? null,
      attachments: body.attachments ?? [],
    });

    return NextResponse.json({
      investigation_id: started.investigationId,
      investigation: started.investigation,
      first_turn: {
        assistantMessage: started.assistantMessage,
        result: started.result,
      },
      mode: await currentMode(),
    });
  } catch (error) {
    return toResponse(error, "Failed to start investigation");
  }
}
