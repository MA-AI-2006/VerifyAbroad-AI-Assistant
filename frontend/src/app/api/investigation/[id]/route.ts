import { NextResponse } from "next/server";

import type { InvestigationRecord, Language } from "@/types";
import { loadInvestigationPayload } from "@/server/engine/run";
import { backendEnabled, backendGetResults } from "@/server/backendClient";
import { adaptContext, adaptReport } from "@/server/backendAdapter";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (backendEnabled()) {
    try {
      const data = await backendGetResults(id);
      const language: Language = "roman_urdu";
      const result = data.report ? adaptReport(id, language, data.report) : null;
      const now = new Date().toISOString();
      // NOTE: backend/api/reports.py does not return chat history, only the
      // structured case + final report, so `messages` is empty here. Use the
      // /investigation/{id}/message responses on the client to build up the
      // visible transcript as the conversation happens.
      const investigation: InvestigationRecord = {
        id,
        title: data.structured_case.university ?? "Investigation",
        language,
        status: data.status === "completed" ? "assessed" : "gathering",
        overall_risk: result?.overall_risk ?? "pending_more_info",
        context: adaptContext(data.structured_case),
        messages: [],
        latest_result: result,
        created_at: now,
        updated_at: now,
      };
      return NextResponse.json({ investigation, mode: "external_backend" });
    } catch (error) {
      console.error("backend investigation lookup failed", error);
      return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
    }
  }

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid investigation id" }, { status: 400 });
  }
  const investigation = await loadInvestigationPayload(numericId);
  if (!investigation) {
    return NextResponse.json({ error: "Investigation not found" }, { status: 404 });
  }
  return NextResponse.json({ investigation, mode: "internal_engine" });
}
