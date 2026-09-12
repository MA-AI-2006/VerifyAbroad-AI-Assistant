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
  const [messages, setMessages] = useState<ChatMessage[]>(initial?.investigation?.messages ?? []);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [pendingSteps, setPendingSteps] = useState<ProgressStep[] | null>(null);
  const [language, setLanguage] = useState<Language>(initial?.language ?? "roman_urdu");
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | null>(
    initial?.investigation?.context.degree_level ?? null,
  );
  const [fundingType, setFundingType] = useState<FundingType | null>(
    initial?.investigation?.context.funding_type ?? null,
  );
  const idRef = useRef<string | null>(initial?.investigation?.id ?? null);

  const pushAssistantTurn = useCallback((turn: {
    assistantMessage: ChatMessage;
    result: InvestigationResult | null;
  }) => {
    setMessages((current) => [...current, turn.assistantMessage]);
  }, []);

  const ensureInvestigation = useCallback(async (): Promise<string> => {
    if (idRef.current) return idRef.current;
    const response = await api.startInvestigation({ language });
    idRef.current = response.investigation_id;
    setInvestigationId(response.investigation_id);
    setMessages(response.investigation?.messages ?? []);
    return response.investigation_id;
  }, [language]);

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
            attachments: sentAttachments,
          });
          idRef.current = response.investigation_id;
          setInvestigationId(response.investigation_id);
          // Replace the optimistic transcript with the server-rendered one
          // (welcome message + the student's first message), then add the turn.
          const existing = response.investigation?.messages ?? [];
          setMessages(existing.length > 0 ? existing : [optimistic]);
          if (response.first_turn) pushAssistantTurn(response.first_turn);
        } else {
          const response = await api.sendMessage(idRef.current, {
            message: trimmed,
            attachments: sentAttachments,
            degree_level: degreeLevel,
            funding_type: fundingType,
          });
          pushAssistantTurn(response);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
        setAttachments(sentAttachments);
      } finally {
        setIsThinking(false);
      }
    },
    [attachments, degreeLevel, fundingType, language, pushAssistantTurn],
  );

  const uploadFile = useCallback(
    async (file: File, label?: string) => {
      setError(null);
      setIsThinking(true);
      try {
        const id = await ensureInvestigation();
        const response = await api.uploadEvidence({ investigationId: Number(id), file, label });
        setMessages((current) => [
          ...current,
          {
            id: `evidence-${response.evidence_id}`,
            role: "student",
            text: `[Evidence attached: ${response.attachment.label}]`,
            created_at: new Date().toISOString(),
            attachments: [response.attachment],
          },
          response.turn.assistantMessage,
        ]);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not upload that file.");
      } finally {
        setIsThinking(false);
      }
    },
    [ensureInvestigation],
  );

  const submitPastedText = useCallback(
    async (label: string, text: string) => {
      if (!text.trim()) return;
      setError(null);
      setIsThinking(true);
      try {
        const id = await ensureInvestigation();
        const response = await api.submitPastedEvidence({
          investigationId: Number(id),
          label,
          text,
        });
        setMessages((current) => [
          ...current,
          {
            id: `evidence-${response.evidence_id}`,
            role: "student",
            text: `[${label}]\n${text.slice(0, 400)}`,
            created_at: new Date().toISOString(),
            attachments: [response.attachment],
          },
          response.turn.assistantMessage,
        ]);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not submit that message.");
      } finally {
        setIsThinking(false);
      }
    },
    [ensureInvestigation],
  );

  const submitLink = useCallback(
    async (url: string, label?: string) => {
      if (!url.trim()) return;
      setError(null);
      setIsThinking(true);
      try {
        const id = await ensureInvestigation();
        const response = await api.submitLinkEvidence({
          investigationId: Number(id),
          url,
          label,
        });
        setMessages((current) => [
          ...current,
          {
            id: `evidence-${response.evidence_id}`,
            role: "student",
            text: `[Link submitted: ${url}]`,
            created_at: new Date().toISOString(),
            attachments: [response.attachment],
          },
          response.turn.assistantMessage,
        ]);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not submit that link.");
      } finally {
        setIsThinking(false);
      }
    },
    [ensureInvestigation],
  );

  const addAttachment = useCallback((attachment: ChatAttachment) => {
    setAttachments((current) => [...current, attachment]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
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
      const transcript = response.investigation?.messages ?? [];
      setMessages(transcript);
      if (response.first_turn) pushAssistantTurn(response.first_turn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the demo case.");
    } finally {
      setIsThinking(false);
    }
  }, [pushAssistantTurn]);

  const loadExisting = useCallback(async (id: string) => {
    setError(null);
    setIsThinking(true);
    try {
      const response = await api.getInvestigation(id);
      idRef.current = response.investigation.id;
      setInvestigationId(response.investigation.id);
      setMessages(response.investigation.messages);
      setDegreeLevel(response.investigation.context.degree_level ?? null);
      setFundingType(response.investigation.context.funding_type ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open that investigation.");
    } finally {
      setIsThinking(false);
    }
  }, []);

  const reset = useCallback(() => {
    idRef.current = null;
    setInvestigationId(null);
    setMessages([]);
    setAttachments([]);
    setError(null);
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
    appendTurn: pushAssistantTurn,
  };
}
