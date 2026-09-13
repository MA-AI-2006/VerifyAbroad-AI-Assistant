"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, demo } from "@/services/api";
import type {
  ChatAttachment,
  ChatMessage,
  DegreeLevel,
  FundingType,
  InvestigationRecord,
  InvestigationResult,
  Language,
  ProgressStep,
} from "@/types";

/**
 * State of the separate verification step. It only exists when the deployment
 * proxies to the FastAPI backend; the internal engine scores risk on every
 * message instead, so `available` is false and the UI hides the control.
 */
export interface VerificationState {
  available: boolean;
  status: "idle" | "running" | "done" | "error";
  message: string | null;
  riskScore: number | null;
  displayStatus: string | null;
  ready: boolean;
  needsReverification: boolean;
}

interface ReadinessExtras {
  ready_for_verification?: boolean;
  needs_reverification?: boolean;
}

function readiness(
  investigation: InvestigationRecord | null | undefined,
): ReadinessExtras {
  return (investigation ?? {}) as ReadinessExtras;
}

export interface UseInvestigation {
  investigationId: string | null;
  messages: ChatMessage[];
  isThinking: boolean;
  error: string | null;
  attachments: ChatAttachment[];
  pendingSteps: ProgressStep[] | null;
  latestResult: InvestigationResult | null;
  language: Language;
  degreeLevel: DegreeLevel | null;
  fundingType: FundingType | null;
  mode: "external_backend" | "internal_engine" | null;
  verification: VerificationState;
  setLanguage: (language: Language) => void;
  setDegreeLevel: (level: DegreeLevel | null) => void;
  setFundingType: (funding: FundingType | null) => void;
  send: (text: string) => Promise<void>;
  addAttachment: (attachment: ChatAttachment) => void;
  removeAttachment: (id: string) => void;
  uploadFile: (file: File, label?: string) => Promise<void>;
  submitPastedText: (label: string, text: string) => Promise<void>;
  submitLink: (url: string, label?: string) => Promise<void>;
  loadDemo: () => Promise<void>;
  reset: () => void;
  loadExisting: (id: string) => Promise<void>;
  /** Runs (or re-runs) the backend verification pipeline for this case. */
  runVerification: (force?: boolean) => Promise<void>;
  /** Called after a profile edit so the report is marked as needing a re-run. */
  markNeedsReverification: () => void;
  /** Appends a turn produced outside the chat composer (e.g. a profile edit). */
  appendTurn: (turn: {
    studentMessage?: ChatMessage;
    assistantMessage: ChatMessage;
    result: InvestigationResult | null;
  }) => void;
}

export function useInvestigation(initial?: {
  investigation?: InvestigationRecord | null;
  language?: Language;
}): UseInvestigation {
  const [investigationId, setInvestigationId] = useState<string | null>(
    initial?.investigation?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initial?.investigation?.messages ?? [],
  );
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [pendingSteps, setPendingSteps] = useState<ProgressStep[] | null>(null);
  const [language, setLanguage] = useState<Language>(
    initial?.language ?? "roman_urdu",
  );
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | null>(
    initial?.investigation?.context.degree_level ?? null,
  );
  const [fundingType, setFundingType] = useState<FundingType | null>(
    initial?.investigation?.context.funding_type ?? null,
  );
  const [mode, setMode] = useState<
    "external_backend" | "internal_engine" | null
  >(null);
  const [verification, setVerification] = useState<VerificationState>(() => {
    // Seed from the server-rendered investigation so a page reload keeps the
    // "re-run verification" affordance and the last risk indicator.
    const extras = readiness(initial?.investigation);
    return {
      available: false,
      status: initial?.investigation?.latest_result ? "done" : "idle",
      message: null,
      riskScore: null,
      displayStatus: null,
      ready: Boolean(extras.ready_for_verification),
      needsReverification: Boolean(extras.needs_reverification),
    };
  });
  const idRef = useRef<string | null>(initial?.investigation?.id ?? null);

  // Ask the server which engine is live; the verification control only exists
  // in backend mode.
  useEffect(() => {
    let active = true;
    api
      .health()
      .then((health) => {
        if (!active) return;
        setMode(health.mode);
        setVerification((current) => ({
          ...current,
          available: health.mode === "external_backend",
        }));
      })
      .catch(() => {
        /* health is cosmetic; requests still work and report their own mode */
      });
    return () => {
      active = false;
    };
  }, []);

  const adoptInvestigation = useCallback(
    (investigation: InvestigationRecord | null | undefined) => {
      const extras = readiness(investigation);
      setVerification((current) => ({
        ...current,
        ready: Boolean(extras.ready_for_verification),
        needsReverification: Boolean(extras.needs_reverification),
      }));
    },
    [],
  );

  const pushAssistantTurn = useCallback(
    (turn: {
      assistantMessage: ChatMessage;
      result: InvestigationResult | null;
    }) => {
      setMessages((current) => [...current, turn.assistantMessage]);
    },
    [],
  );

  const ensureInvestigation = useCallback(async (): Promise<string> => {
    if (idRef.current) return idRef.current;
    const response = await api.startInvestigation({ language });
    idRef.current = response.investigation_id;
    setInvestigationId(response.investigation_id);
    setMessages(response.investigation?.messages ?? []);
    setMode(
      (current) =>
        (response.mode as "external_backend" | "internal_engine") ?? current,
    );
    adoptInvestigation(response.investigation);
    return response.investigation_id;
  }, [adoptInvestigation, language]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;
      setError(null);
      setIsThinking(true);
      setPendingSteps(null);

      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "student",
        text: trimmed,
        created_at: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      setMessages((current) => [...current, optimistic]);
      const sentAttachments = attachments;
      setAttachments([]);

      try {
        if (!idRef.current) {
          const response = await api.startInvestigation({
            message: trimmed,
            language,
            degree_level: degreeLevel,
            funding_type: fundingType,
            attachments: sentAttachments,
          });
          idRef.current = response.investigation_id;
          setInvestigationId(response.investigation_id);
          setMode(response.mode as "external_backend" | "internal_engine");
          // Replace the optimistic transcript with the server-rendered one
          // (welcome message + the student's first message), then add the turn.
          const existing = response.investigation?.messages ?? [];
          setMessages(existing.length > 0 ? existing : [optimistic]);
          adoptInvestigation(response.investigation);
          if (response.first_turn) pushAssistantTurn(response.first_turn);
        } else {
          const response = await api.sendMessage(idRef.current, {
            message: trimmed,
            attachments: sentAttachments,
            degree_level: degreeLevel,
            funding_type: fundingType,
          });
          setMode(response.mode as "external_backend" | "internal_engine");
          if (response.investigation) {
            // The server transcript is authoritative: it carries the report that
            // was attached to the last assistant turn, if any.
            setMessages(response.investigation.messages);
            adoptInvestigation(response.investigation);
          } else {
            pushAssistantTurn(response);
          }
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
        );
        setAttachments(sentAttachments);
      } finally {
        setIsThinking(false);
      }
    },
    [
      adoptInvestigation,
      attachments,
      degreeLevel,
      fundingType,
      language,
      pushAssistantTurn,
    ],
  );

  const appendEvidenceTurn = useCallback(
    (response: {
      evidence_id: string;
      attachment: ChatAttachment;
      turn: {
        assistantMessage: ChatMessage;
        result: InvestigationResult | null;
      };
      studentText: string;
    }) => {
      setMessages((current) => [
        ...current,
        {
          id: `evidence-${response.evidence_id}`,
          role: "student",
          text: response.studentText,
          created_at: new Date().toISOString(),
          attachments: [response.attachment],
        },
        response.turn.assistantMessage,
      ]);
      if (response.turn.result) {
        setVerification((current) => ({ ...current, status: "done" }));
      }
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File, label?: string) => {
      setError(null);
      setIsThinking(true);
      try {
        const id = await ensureInvestigation();
        const response = await api.uploadEvidence({
          investigationId: id,
          file,
          label,
        });
        appendEvidenceTurn({
          ...response,
          studentText: `[Evidence attached: ${response.attachment.label}]`,
        });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not upload that file.",
        );
      } finally {
        setIsThinking(false);
      }
    },
    [appendEvidenceTurn, ensureInvestigation],
  );

  const submitPastedText = useCallback(
    async (label: string, text: string) => {
      if (!text.trim()) return;
      setError(null);
      setIsThinking(true);
      try {
        const id = await ensureInvestigation();
        const response = await api.submitPastedEvidence({
          investigationId: id,
          label,
          text,
        });
        appendEvidenceTurn({
          ...response,
          studentText: `[${label}]\n${text.slice(0, 400)}`,
        });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not submit that message.",
        );
      } finally {
        setIsThinking(false);
      }
    },
    [appendEvidenceTurn, ensureInvestigation],
  );

  const submitLink = useCallback(
    async (url: string, label?: string) => {
      if (!url.trim()) return;
      setError(null);
      setIsThinking(true);
      try {
        const id = await ensureInvestigation();
        const response = await api.submitLinkEvidence({
          investigationId: id,
          url,
          label,
        });
        appendEvidenceTurn({
          ...response,
          studentText: `[Link submitted: ${url}]`,
        });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not submit that link.",
        );
      } finally {
        setIsThinking(false);
      }
    },
    [appendEvidenceTurn, ensureInvestigation],
  );

  const runVerification = useCallback(
    async (force?: boolean) => {
      if (!idRef.current) {
        setError(
          "Start an investigation first — send me the offer or message you want checked.",
        );
        return;
      }
      setError(null);
      setIsThinking(true);
      setVerification((current) => ({
        ...current,
        status: "running",
        message: null,
      }));
      try {
        const response = await api.runVerification(
          idRef.current,
          force ?? false,
        );
        setMode(response.mode as "external_backend" | "internal_engine");
        if (response.investigation) {
          setMessages(response.investigation.messages);
          adoptInvestigation(response.investigation);
        }
        setVerification((current) => ({
          ...current,
          status: "done",
          ready: true,
          needsReverification: false,
          message: null,
          riskScore: response.run?.risk_score ?? null,
          displayStatus: response.run?.display_status ?? null,
        }));
        if (response.result) {
          pushAssistantTurn({
            assistantMessage: {
              id: `verification-${Date.now()}`,
              role: "assistant",
              text: `Verification complete — risk indicator ${response.run?.risk_score ?? "—"}/100 (${
                response.run?.display_status ?? response.result.overall_risk
              }). The full report is below.`,
              created_at: new Date().toISOString(),
              result: response.result,
            },
            result: response.result,
          });
        }
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Verification failed.";
        setVerification((current) => ({
          ...current,
          status: "error",
          message,
        }));
        setError(message);
      } finally {
        setIsThinking(false);
      }
    },
    [adoptInvestigation, pushAssistantTurn],
  );

  const markNeedsReverification = useCallback(() => {
    setVerification((current) => ({
      ...current,
      needsReverification: true,
      message:
        "Details changed — re-run verification for an up-to-date report.",
    }));
  }, []);

  const addAttachment = useCallback((attachment: ChatAttachment) => {
    setAttachments((current) => [...current, attachment]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
  }, []);

  const loadDemo = useCallback(async () => {
    setError(null);
    setIsThinking(true);
    setMessages([]);
    idRef.current = null;
    setInvestigationId(null);
    try {
      const response = await api.startInvestigation({
        message: demo.case.message,
        language: demo.case.language,
        attachments: [demo.attachment()],
      });
      idRef.current = response.investigation_id;
      setInvestigationId(response.investigation_id);
      setMode(response.mode as "external_backend" | "internal_engine");
      setMessages(response.investigation?.messages ?? []);
      adoptInvestigation(response.investigation);
      if (response.first_turn) pushAssistantTurn(response.first_turn);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the demo case.",
      );
    } finally {
      setIsThinking(false);
    }
  }, [adoptInvestigation, pushAssistantTurn]);

  const loadExisting = useCallback(
    async (id: string) => {
      setError(null);
      setIsThinking(true);
      try {
        const response = await api.getInvestigation(id);
        idRef.current = response.investigation.id;
        setInvestigationId(response.investigation.id);
        setMessages(response.investigation.messages);
        setDegreeLevel(response.investigation.context.degree_level ?? null);
        setFundingType(response.investigation.context.funding_type ?? null);
        adoptInvestigation(response.investigation);
        setVerification((current) => ({
          ...current,
          status: response.investigation.latest_result
            ? "done"
            : current.status,
          riskScore: response.investigation.latest_result
            ? current.riskScore
            : null,
        }));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not open that investigation.",
        );
      } finally {
        setIsThinking(false);
      }
    },
    [adoptInvestigation],
  );

  const reset = useCallback(() => {
    idRef.current = null;
    setInvestigationId(null);
    setMessages([]);
    setAttachments([]);
    setError(null);
    setVerification((current) => ({
      ...current,
      status: "idle",
      message: null,
      riskScore: null,
      displayStatus: null,
      ready: false,
      needsReverification: false,
    }));
  }, []);

  useEffect(() => {
    if (!isThinking) setPendingSteps(null);
  }, [isThinking]);

  const latestResult = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.result) return message.result;
    }
    return null;
  }, [messages]);

  return {
    investigationId,
    messages,
    isThinking,
    error,
    attachments,
    pendingSteps,
    latestResult,
    language,
    degreeLevel,
    fundingType,
    mode,
    verification,
    setLanguage,
    setDegreeLevel,
    setFundingType,
    send,
    addAttachment,
    removeAttachment,
    uploadFile,
    submitPastedText,
    submitLink,
    loadDemo,
    reset,
    loadExisting,
    runVerification,
    markNeedsReverification,
    appendTurn: (turn) => {
      if (turn.studentMessage)
        setMessages((current) => [...current, turn.studentMessage!]);
      pushAssistantTurn(turn);
    },
  };
}
