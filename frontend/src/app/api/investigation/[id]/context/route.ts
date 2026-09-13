import { NextResponse } from "next/server";

import { currentMode, toResponse, updateContext } from "@/server/dataSource";

export const dynamic = "force-dynamic";

type ContextField =
  | "country"
  | "degree_level"
  | "university"
  | "program"
  | "scholarship"
  | "agent"
  | "funding_type"
  | "payment_amount_pkr";

interface ContextBody {
  updates?: Partial<Record<ContextField, string | number | null>>;
  note?: string;
}

/**
 * The student has final control over the investigation profile. Edits,
 * confirmations and removals land here and are recorded in the transcript.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as ContextBody;
    const updates = body.updates ?? {};
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates supplied" },
        { status: 400 },
      );
    }

    const turn = await updateContext(
      id,
      updates as Record<string, string | number | null>,
      body.note ?? null,
    );
    return NextResponse.json({ ...turn, mode: await currentMode() });
  } catch (error) {
    return toResponse(error, "Could not update the investigation profile");
  }
}
