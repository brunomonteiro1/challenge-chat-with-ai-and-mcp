"use client";

import { useCallback, useState } from "react";
import { ChatMessage, StreamState, UseChatReturn } from "@/types";

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streams, setStreams] = useState<Record<string, StreamState>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  const setTyping = useCallback((typing: boolean) => {
    setIsTyping(typing);
  }, []);

  const updateStream = useCallback((requestId: string, update: Partial<StreamState>) => {
    setStreams((prev) => {
      const current = prev[requestId] || {
        content: "",
        bytes: 0,
        done: false,
      };

      return {
        ...prev,
        [requestId]: {
          ...current,
          ...update,
        },
      };
    });
  }, []);

  const setMessages_internal = useCallback((messages: ChatMessage[]) => {
    setMessages(messages);
  }, []);

  const updateMessage = useCallback((id: string, update: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...update } : m))
    );
  }, []);

  const clearStreams = useCallback(() => {
    setStreams({});
  }, []);

  return {
    messages,
    streams,
    isProcessing,
    isTyping,
    addMessage,
    setProcessing,
    setTyping,
    updateStream,
    setMessages: setMessages_internal,
    updateMessage,
    clearStreams,
  };
}