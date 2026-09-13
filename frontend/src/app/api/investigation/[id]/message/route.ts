import { NextResponse } from "next/server";

import type { ChatAttachment, DegreeLevel, FundingType } from "@/types";
import { currentMode, sendTurn, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";
/** Vercel's default serverless budget is shorter than a live verification run. */
export const maxDuration = 60;


interface MessageBody {
  message?: string;
  attachments?: ChatAttachment[];
  degree_level?: DegreeLevel | null;
  funding_type?: FundingType | null;
}

/** One chat turn. The backend scores nothing here; the internal engine still does. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as MessageBody;
    const text = (body.message ?? "").trim();
    const attachments = body.attachments ?? [];
    if (!text && attachments.length === 0) {
      return NextResponse.json(
        { error: "Message or evidence is required" },
        { status: 400 },
      );
    }

    const turn = await sendTurn(id, {
      message: text,
      attachments,
      degreeLevel: body.degree_level ?? null,
      fundingType: body.funding_type ?? null,
    });

    return NextResponse.json({
      assistantMessage: turn.assistantMessage,
      result: turn.result,
      investigation: turn.investigation,
      mode: await currentMode(),
    });
  } catch (error) {
    return toResponse(error, "Failed to process the message");
  }
}
