"use client";

import { memo } from "react";
import { ChatMessage as ChatMessageType } from "@/types";
import { useTheme } from "@/stores/themeContext";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export const ChatMessage = memo<ChatMessageProps>(({ message, isStreaming }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = useTheme();
  const isUser = message.user === "user" || message.role === "user";
  const isSystem = message.user === "system" || message.role === "system";
  const align = isUser ? "items-end" : "items-start";
  
  const bubbleBase = "text-sm break-words px-3 py-2 rounded max-w-full";
  const bubbleColor = isSystem
    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
    : isUser
    ? "bg-blue-600 text-white"
    : "bg-black/5 dark:bg-white/10";
  
  const label = isUser ? "Você" : isSystem ? "Sistema" : "IA";

  return (
    <li 
      className={`flex flex-col ${align}`}
      role="listitem"
      aria-label={`Mensagem de ${label}`}
    >
      <div className="text-[11px] opacity-60 mb-1" id={`sender-${message.id}`}>{label}</div>
      <div 
        className={`${bubbleBase} ${bubbleColor}`}
        aria-labelledby={`sender-${message.id}`}
        tabIndex={0}
      >
        {message.text}
        
        {/* Exibir informações do arquivo, se existir */}
        {message.file && (
          <div className="mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
            <div className="font-medium text-xs">{message.file.name}</div>
            <pre className="text-xs mt-1 overflow-x-auto">{message.file.content.length > 100 
              ? `${message.file.content.substring(0, 100)}...` 
              : message.file.content}</pre>
          </div>
        )}
      </div>
      {!isStreaming && (
        <div 
          className="text-xs opacity-60 mt-1" 
          aria-label={`Enviado às ${new Date(message.ts).toLocaleTimeString()}`}
        >
          {new Date(message.ts).toLocaleTimeString()}
        </div>
      )}
    </li>
  );
});

ChatMessage.displayName = "ChatMessage";