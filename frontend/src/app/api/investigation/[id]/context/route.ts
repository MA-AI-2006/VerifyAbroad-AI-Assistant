import { NextResponse } from "next/server";

import { runContextUpdate } from "@/server/engine/run";

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
 * The student has final control over the investigation profile.
 * Edits, confirmations and removals are sent here, stored, and re-investigated.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const investigationId = Number(id);
    if (!Number.isFinite(investigationId)) {
      return NextResponse.json({ error: "Invalid investigation id" }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as ContextBody;
    const updates = body.updates ?? {};
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates supplied" }, { status: 400 });
    }

    const turn = await runContextUpdate({ investigationId, updates, note: body.note });
    return NextResponse.json({ ...turn, mode: "internal_engine" });
  } catch (error) {
    console.error("context update failed", error);
    return NextResponse.json({ error: "Could not update the investigation profile" }, { status: 500 });
  }
}
