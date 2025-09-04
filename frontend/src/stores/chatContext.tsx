"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { saveState, loadState, saveStreams, loadStreams } from '@/services/storage';
import { ChatMessage, StreamState } from '@/types';

interface ChatContextType {
  messages: ChatMessage[];
  streams: Record<string, StreamState>;
  isProcessing: boolean;
  isTyping: boolean;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateMessage: (id: string, update: Partial<ChatMessage>) => void;
  setProcessing: (processing: boolean) => void;
  setTyping: (typing: boolean) => void;
  updateStream: (requestId: string, update: Partial<StreamState>) => void;
  clearStreams: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streams, setStreams] = useState<Record<string, StreamState>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);


  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      setMessages(savedState.messages);
    }
    
    const savedStreams = loadStreams();
    if (savedStreams) {
      setStreams(savedStreams.streams);
    }
  }, []);
  
  useEffect(() => {
    saveState(messages);
  }, [messages]);
  
  useEffect(() => {
    saveStreams(streams);
  }, [streams]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const newMessages = [...prev, message];
      return newMessages;
    });
  }, []);

  const updateMessage = useCallback((id: string, update: Partial<ChatMessage>) => {
    setMessages((prev) => {
      const newMessages = prev.map((m) => (m.id === id ? { ...m, ...update } : m));
      return newMessages;
    });
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


      if (update.content !== undefined && update.content !== "") {
        if (update.replaceContent) {


        } else {

          update.content = current.content + update.content;
        }

        delete update.replaceContent;
      }


      if (update.done === true && update.content === undefined) {

        return {
          ...prev,
          [requestId]: {
            ...current,
            ...update,
            content: current.content, // Preserva explicitamente o conteúdo acumulado
          },
        };
      }

      return {
        ...prev,
        [requestId]: {
          ...current,
          ...update,
        },
      };
    });
  }, []);

  const clearStreams = useCallback(() => {
    setStreams({});
  }, []);

  const setMessagesCallback = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  }, []);

  const value = {
    messages,
    streams,
    isProcessing,
    isTyping,
    addMessage,
    setMessages: setMessagesCallback,
    updateMessage,
    setProcessing,
    setTyping,
    updateStream,
    clearStreams,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}