import { NextResponse } from "next/server";

import type { ChatAttachment, DegreeLevel, FundingType, InvestigationRecord, Language } from "@/types";
import { startNewInvestigation } from "@/server/engine/run";
import { getStudentKey } from "@/server/session";
import { getInvestigation } from "@/server/repositories/investigations";
import { backendEnabled, backendCreateInvestigation } from "@/server/backendClient";
import { adaptAssistantMessage, adaptContext, adaptStudentMessage } from "@/server/backendAdapter";

export const dynamic = "force-dynamic";

interface StartBody {
  message?: string;
  language?: Language;
  degree_level?: DegreeLevel;
  funding_type?: FundingType;
  attachments?: ChatAttachment[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as StartBody;
    const language: Language = body.language ?? "roman_urdu";
    const message = body.message ?? "";

    // When BACKEND_URL is configured, the FastAPI service owns the investigation
    // (see backend/api/investigation.py: POST /investigations). Otherwise this
    // falls through, unchanged, to the internal deterministic engine below.
    if (backendEnabled()) {
      const created = await backendCreateInvestigation(message || "I need help verifying a study abroad offer.");
      const studentMessage = adaptStudentMessage(message);
      const assistantMessage = adaptAssistantMessage(created.assistant_message, null);
      const now = new Date().toISOString();
      const investigation: InvestigationRecord = {
        id: created.investigation_id,
        title: created.structured_case.university || message.slice(0, 80) || "New investigation",
        language,
        status: created.ready_for_verification ? "assessed" : "gathering",
        overall_risk: "pending_more_info",
        context: adaptContext(created.structured_case),
        messages: [studentMessage, assistantMessage],
        latest_result: null,
        created_at: now,
        updated_at: now,
      };
      return NextResponse.json({
        investigation_id: created.investigation_id,
        investigation,
        first_turn: { assistantMessage, result: null },
        mode: "external_backend",
      });
    }

    const studentKey = await getStudentKey();
    const started = await startNewInvestigation({
      studentKey,
      language,
      firstMessage: message,
      attachments: body.attachments ?? [],
    });

    const investigation = await getInvestigation(started.investigationId);

    return NextResponse.json({
      investigation_id: String(started.investigationId),
      investigation,
      first_turn: started.turn,
      mode: "internal_engine",
    });
  } catch (error) {
    console.error("investigate failed", error);
    return NextResponse.json({ error: "Failed to start investigation" }, { status: 500 });
  }
}
