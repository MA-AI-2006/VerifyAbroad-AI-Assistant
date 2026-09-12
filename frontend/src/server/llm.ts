import type { InvestigationResult } from "@/types";

/**
 * Optional server-side LLM enrichment.
 *
 * API keys are read from the server environment only — they are never exposed
 * to the browser bundle. When no key is configured the assistant uses its
 * deterministic investigation engine output, which is fully explainable and
 * does not depend on external services.
 */

const TIMEOUT_MS = 12_000;

export function llmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.OPENAI_API_KEY);
}

interface EnrichInput {
  systemGoal: string;
  studentText: string;
  draft: string;
  structured: InvestigationResult;
}

/**
 * Rewrites the deterministic draft into a more natural reply when an LLM key is
 * available. Any failure returns the draft unchanged, so the product never
 * depends on the external call succeeding.
 */
export async function maybeEnrichReply(input: EnrichInput): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            system_instruction: { parts: [{ text: input.systemGoal }] },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Student message: ${input.studentText}\n\nStructured investigation output (must not be contradicted):\n${JSON.stringify(
                      input.structured,
                    )}\n\nDeterministic draft reply (rewrite for clarity and tone, keep all facts, verdicts, risk level and next step):\n${input.draft}`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
          }),
        },
      );
      clearTimeout(timer);
      if (response.ok) {
        const payload = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (text.trim().length > 0) return text.trim();
      }
    } catch {
      // fall through to the deterministic draft
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            { role: "system", content: input.systemGoal },
            {
              role: "user",
              content: `Student message: ${input.studentText}\n\nStructured output (must not be contradicted): ${JSON.stringify(
                input.structured,
              )}\n\nRewrite this draft for clarity and tone without changing any fact, verdict, risk level or next step:\n${input.draft}`,
            },
          ],
        }),
      });
      clearTimeout(timer);
      if (response.ok) {
        const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const text = payload.choices?.[0]?.message?.content ?? "";
        if (text.trim().length > 0) return text.trim();
      }
    } catch {
      // fall through to the deterministic draft
    }
  }

  return input.draft;
}
