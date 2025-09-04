"use client";

import { useEffect, useRef } from "react";
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { StreamingCard } from "./StreamingCard";
import { ChatMessage, StreamState } from "@/types";

interface MessageListProps {
  messages: ChatMessage[];
  streams: Record<string, StreamState>;
  isTyping: boolean;
  isProcessing: boolean;
  assistantMsgId: string | null;
  onToggleStreamExpand: (requestId: string) => void;
  height?: number | string;
}

const MessageList = ({
  messages,
  streams,
  isTyping,
  isProcessing,
  assistantMsgId,
  onToggleStreamExpand,
  height = "100%"
}: MessageListProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages.length, streams, isTyping, isProcessing]);

  return (
    <div
      role="log"
      aria-label="Histórico de mensagens"
      aria-live="polite"
      className="rounded-lg border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 h-full"
      style={{ height: height }}
    >
      <PerfectScrollbar
        className="p-3 h-full"
        containerRef={(ref) => (listRef.current = ref)}
        options={{
          suppressScrollX: true,
          wheelPropagation: false
        }}
      >
      <ul className="space-y-2">
        {messages.map((message) => (
          <div key={`wrap-${message.id}`}>
            <ChatMessageComponent
              message={message}
              isStreaming={assistantMsgId === message.id}
            />
            
            {/* Stream cards anchored to this message */}
            {Object.entries(streams)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              .filter(([_, stream]) => {
                return stream.anchorId === message.id;
              })
              .map(([requestId, stream]) => (
                <StreamingCard
                  key={`${message.id}-stream-${requestId}`}
                  requestId={requestId}
                  stream={stream}
                  onToggleExpand={onToggleStreamExpand}
                />
              ))}
            
            {/* Typing indicator */}
            {isTyping && message.id === assistantMsgId && (
              <div className="text-sm opacity-70">
                IA digitando...
              </div>
            )}
          </div>
        ))}
        
        {/* Processing indicator - só mostra quando não há typing específico */}
        {isProcessing && !isTyping && (
          <div className="text-sm opacity-70 mt-2">
            IA processando...
          </div>
        )}
      </ul>
      </PerfectScrollbar>
    </div>
  );
};

export default MessageList;
