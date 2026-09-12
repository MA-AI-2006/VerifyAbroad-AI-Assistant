import { NextResponse } from "next/server";

import { runInvestigationTurn } from "@/server/engine/run";
import { addEvidence } from "@/server/repositories/investigations";
import { loadVerificationData } from "@/server/repositories/verification";
import { backendEnabled, backendUploadFileEvidence, backendUploadTextEvidence } from "@/server/backendClient";
import { adaptAssistantMessage } from "@/server/backendAdapter";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const TEXTUAL = ["text/plain", "text/html", "message/rfc822", "text/csv", "application/json"];

function kindFor(mime: string | null, fileName: string | null): "screenshot" | "document" | "link" | "pasted_text" {
  if (!mime) return "document";
  if (mime.startsWith("image/")) return "screenshot";
  if (mime === "application/pdf") return "document";
  if (TEXTUAL.includes(mime)) return "document";
  if (fileName && /\.(png|jpe?g|webp|gif|heic)$/i.test(fileName)) return "screenshot";
  return "document";
}

/**
 * Evidence intake. Files are stored as investigation evidence with metadata.
 * Text the student pastes (message, offer letter, ad copy) is passed to the
 * investigation engine as evidence text.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // Backend evidence intake (backend/api/evidence.py: POST /investigations/{id}/evidence)
    // takes the investigation id as a path segment and only a file OR a text
    // form field — it has no "link" concept, so a submitted link is passed
    // through as text.
    if (backendEnabled()) {
      if (contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        const investigationId = String(form.get("investigation_id") ?? "");
        const file = form.get("file");
        const label = String(form.get("label") ?? "") || (file instanceof File ? file.name : "Evidence");
        if (!investigationId) {
          return NextResponse.json({ error: "A valid investigation_id is required" }, { status: 400 });
        }
        if (!(file instanceof File)) {
          return NextResponse.json({ error: "A file is required" }, { status: 400 });
        }
        const kind = kindFor(file.type || null, file.name);
        const uploadResult = await backendUploadFileEvidence(investigationId, file);
        const attachment = {
          id: uploadResult.evidence_id,
          kind,
          label,
          mime: file.type || null,
          size_bytes: file.size,
          url: null,
          analysis_status: "analyzed" as const,
          note: null,
        };
        const assistantMessage = adaptAssistantMessage(
          "Evidence received and processed by the verification backend. Run verification when you're ready for a full risk report.",
          null,
        );
        return NextResponse.json({
          evidence_id: uploadResult.evidence_id,
          attachment,
          turn: { assistantMessage, result: null },
          mode: "external_backend",
        });
      }

      const body = (await request.json().catch(() => ({}))) as {
        investigation_id?: string;
        kind?: "link" | "pasted_text";
        label?: string;
        url?: string;
        text?: string;
      };
      const investigationId = String(body.investigation_id ?? "");
      if (!investigationId) {
        return NextResponse.json({ error: "A valid investigation_id is required" }, { status: 400 });
      }
      const isLink = body.kind === "link" && body.url;
      const label = isLink ? body.label?.trim() || body.url! : body.label?.trim() || "Pasted message";
      const text = isLink ? body.url! : body.text ?? "";
      const uploadResult = await backendUploadTextEvidence(investigationId, text);
      const attachment = {
        id: uploadResult.evidence_id,
        kind: isLink ? ("link" as const) : ("pasted_text" as const),
        label,
        mime: null,
        size_bytes: null,
        url: isLink ? body.url! : null,
        analysis_status: "analyzed" as const,
        note: null,
      };
      const assistantMessage = adaptAssistantMessage(
        "Evidence received and processed by the verification backend. Run verification when you're ready for a full risk report.",
        null,
      );
      return NextResponse.json({
        evidence_id: uploadResult.evidence_id,
        attachment,
        turn: { assistantMessage, result: null },
        mode: "external_backend",
      });
    }

    let investigationId: number | null = null;
    let label = "Evidence";
    let mime: string | null = null;
    let sizeBytes: number | null = null;
    let url: string | null = null;
    let extractedText: string | null = null;
    let note: string | null = null;
    let analysisStatus: "analyzed" | "pending" | "not_analyzed" = "not_analyzed";
    let kind: "screenshot" | "document" | "link" | "pasted_text" = "document";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      investigationId = Number(form.get("investigation_id"));
      const file = form.get("file");
      label = String(form.get("label") ?? "") || (file instanceof File ? file.name : "Evidence");
      if (file instanceof File) {
        if (file.size > MAX_BYTES) {
          return NextResponse.json({ error: "File is larger than 5 MB" }, { status: 413 });
        }
        mime = file.type || null;
        sizeBytes = file.size;
        kind = kindFor(mime, file.name);
        if (mime && TEXTUAL.includes(mime)) {
          extractedText = (await file.text()).slice(0, 8000);
          analysisStatus = "analyzed";
        } else {
          analysisStatus = "pending";
          note =
            kind === "screenshot"
              ? "Screenshot attached to the investigation. Paste the text of the message if you want every claim checked."
              : "Document attached to the investigation. Paste the key text so the claims can be checked line by line.";
        }
      }
      url = (form.get("url") as string | null) ?? null;
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        investigation_id?: number;
        kind?: "link" | "pasted_text";
        label?: string;
        url?: string;
        text?: string;
      };
      investigationId = Number(body.investigation_id);
      url = body.url ?? null;
      if (body.kind === "link" && url) {
        kind = "link";
        label = body.label?.trim() || url;
        extractedText = url;
        analysisStatus = "analyzed";
        const data = await loadVerificationData();
        note = `Link submitted for review (${new URL(url.startsWith("http") ? url : `https://${url}`).hostname}). ${
          data.universities.length
        } university records checked against this domain.`;
      } else {
        kind = "pasted_text";
        label = body.label?.trim() || "Pasted message";
        extractedText = (body.text ?? "").slice(0, 8000);
        analysisStatus = extractedText ? "analyzed" : "not_analyzed";
      }
    }

    if (!Number.isFinite(investigationId) || investigationId === null || investigationId <= 0) {
      return NextResponse.json({ error: "A valid investigation_id is required" }, { status: 400 });
    }

    const evidence = await addEvidence({
      investigationId,
      kind,
      label,
      mime,
      sizeBytes,
      url,
      extractedText,
      analysisStatus,
      note,
    });

    const attachment = {
      id: String(evidence.id),
      kind,
      label,
      mime,
      size_bytes: sizeBytes,
      url,
      analysis_status: analysisStatus,
      note,
    };

    const studentText = [
      `[Evidence attached: ${label}]`,
      kind === "link" ? `Link: ${url}` : "",
      extractedText ? `Content:\n${extractedText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const turn = await runInvestigationTurn({
      investigationId,
      studentText,
      attachments: [attachment],
    });

    return NextResponse.json({ evidence_id: String(evidence.id), attachment, turn, mode: "internal_engine" });
  } catch (error) {
    console.error("evidence upload failed", error);
    return NextResponse.json({ error: "Failed to store evidence" }, { status: 500 });
  }
}
