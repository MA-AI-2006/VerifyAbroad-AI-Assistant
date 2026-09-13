import { NextResponse } from "next/server";

import { currentMode, submitEvidence, toResponse } from "@/server/dataSource";

export const dynamic = "force-dynamic";
/** Vercel's default serverless budget is shorter than a live verification run. */
export const maxDuration = 60;


const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Evidence intake: an uploaded file, pasted text (WhatsApp message, offer
 * letter, ad copy) or a link. One endpoint for all three so the UI has a single
 * path, and both engines accept the same shape.
 *
 * In backend mode the FastAPI service validates the file bytes, parses it into
 * structured claims and stores it (backend/api/evidence.py).
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const investigationId = String(form.get("investigation_id") ?? "");
      const file = form.get("file");
      const label =
        String(form.get("label") ?? "").trim() ||
        (file instanceof File ? file.name : "Evidence");
      if (!investigationId) {
        return NextResponse.json(
          { error: "A valid investigation_id is required" },
          { status: 400 },
        );
      }
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "A file is required" },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `File is larger than ${MAX_BYTES / (1024 * 1024)} MB` },
          { status: 413 },
        );
      }
      const result = await submitEvidence({ investigationId, file, label });
      return NextResponse.json({ ...result, mode: await currentMode() });
    }

    const body = (await request.json().catch(() => ({}))) as {
      investigation_id?: string | number;
      kind?: "link" | "pasted_text";
      label?: string;
      url?: string;
      text?: string;
    };
    const investigationId = String(body.investigation_id ?? "");
    if (!investigationId) {
      return NextResponse.json(
        { error: "A valid investigation_id is required" },
        { status: 400 },
      );
    }
    const isLink = body.kind === "link" && Boolean(body.url);
    if (!isLink && !(body.text ?? "").trim()) {
      return NextResponse.json(
        { error: "Evidence text is required" },
        { status: 400 },
      );
    }
    const label = (isLink ? body.label : body.label) ?? "";
    const result = await submitEvidence({
      investigationId,
      kind: isLink ? "link" : "pasted_text",
      label: label.trim() || (isLink ? (body.url as string) : "Pasted message"),
      url: isLink ? (body.url as string) : null,
      text: isLink ? null : (body.text ?? ""),
    });
    return NextResponse.json({ ...result, mode: await currentMode() });
  } catch (error) {
    return toResponse(error, "Could not save that evidence");
  }
}
