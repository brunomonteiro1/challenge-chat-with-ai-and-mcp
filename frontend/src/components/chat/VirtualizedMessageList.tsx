"use client";

import { useEffect, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { StreamingCard } from "./StreamingCard";
import { ChatMessage, StreamState } from "@/types";

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  streams: Record<string, StreamState>;
  isTyping: boolean;
  assistantMsgId: string | null;
  onToggleStreamExpand: (requestId: string) => void;
  height?: number;
}

const VirtualizedMessageList = ({
  messages,
  streams,
  isTyping,
  assistantMsgId,
  onToggleStreamExpand,
  height = 500
}: VirtualizedMessageListProps) => {
  const listRef = useRef<List>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, "end");
    }
  }, [messages.length]);

  const items = messages.flatMap((message) => {
    const messageItems: { type: 'message', message?: ChatMessage, id: string }[] = [{ type: "message", message, id: message.id }];
    
    const messageStreams = Object.entries(streams)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, stream]) => stream.anchorId === message.id)
      .map(([requestId, stream]) => ({
        type: "stream",
        id: `${message.id}-stream-${requestId}`,
        requestId,
        stream
      }));
    
    if (isTyping && message.id === assistantMsgId) {
      messageItems.push({
        type: "typing",
        id: `${message.id}-typing`,
      });
    }
    
    return [...messageItems, ...messageStreams];
  });

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    
    if (!item) return null;
    
    if (item.type === "message") {
      return (
        <div style={style}>
          <ChatMessageComponent
            message={item.message}
            isStreaming={assistantMsgId === item.message.id}
          />
        </div>
      );
    }
    
    if (item.type === "stream") {
      return (
        <div style={style}>
          <StreamingCard
            requestId={item.requestId}
            stream={item.stream}
            onToggleExpand={onToggleStreamExpand}
          />
        </div>
      );
    }
    
    if (item.type === "typing") {
      return (
        <div style={style}>
          <div className="text-sm opacity-70">IA digitando...</div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div
      role="log"
      aria-label="Histórico de mensagens"
      aria-live="polite"
    >
      <List
        ref={listRef}
        height={height}
        width="100%"
        itemCount={items.length}
        itemSize={70} // Average height of an item, will be adjusted by content
        overscanCount={5} // Render extra items for smoother scrolling
        className="rounded-lg border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 p-3"
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedMessageList;
