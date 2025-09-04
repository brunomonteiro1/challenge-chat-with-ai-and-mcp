"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// import { clearState } from "@/services/storage";
import { MessageSource, UserType } from "@/types";

export type ChatMessage = {
  id: string;
  user: UserType;
  text: string;
  ts: number;
  source: MessageSource | undefined;
  messageType: 'message' | 'stream';
};

export type ToolRequestEvent = {
  type: "tool_request";
  requestId: string;
  tool: string;
  params: { path?: string; content?: string; contentPreview?: string };
  explanation?: string;
};

export type ToolStreamEvent = {
  type: "tool_stream";
  requestId: string;
  done: boolean;
  chunk?: string;
  bytes?: number;
  total?: number;
  path?: string;
};

type WsEvent =
  | { type: "history"; messages: ChatMessage[] }
  | { type: "message"; payload: ChatMessage }
  | ToolRequestEvent
  | ToolStreamEvent
  | { type: string; [k: string]: unknown };

type Status = "Conectando" | "Conectado" | "Desconectado" | "Falha";

export default function WsStatus(props: {
  url: string;
  onHistory?: (messages: ChatMessage[]) => void;
  onMessage?: (message: ChatMessage) => void;
  onSocket?: (ws: WebSocket | null) => void;
  autoReconnect?: boolean;
  onEvent?: (evt: WsEvent) => void;
}) {
  const { url, onHistory, onMessage, onSocket, autoReconnect = true, onEvent } = props;
  const [status, setStatus] = useState<Status>("Conectando");
  const [retries, setRetries] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextDelay = useMemo(() => {
    if (retries <= 0) return 0;
    if (retries === 1) return 1000;
    if (retries === 2) return 2000;
    if (retries <= 4) return 5000;
    return 10000; // cap
  }, [retries]);

  function clearRetry() {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }

  function cleanupSocket() {
    if (wsRef.current) {
      try { wsRef.current.onopen = null; } catch {}
      try { wsRef.current.onclose = null; } catch {}
      try { wsRef.current.onerror = null; } catch {}
      try { wsRef.current.onmessage = null; } catch {}
      try { wsRef.current.close(); } catch {}
    }
    wsRef.current = null;
    onSocket?.(null);
  }

  function connect() {
    clearRetry();
    cleanupSocket();
    setStatus("Conectando");
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      onSocket?.(ws);

      ws.onopen = () => {
        setStatus("Conectado");
        setRetries(0);
      };
      ws.onclose = () => {
        setStatus("Desconectado");
        if (autoReconnect) scheduleReconnect();
      };
      ws.onerror = () => {
        setStatus("Falha");
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as WsEvent;
          onEvent?.(data);
          if (data?.type === "history" && Array.isArray(data.messages)) {
            onHistory?.(data.messages);
          } else if (data?.type === "message" && data.payload) {
            onMessage?.(data.payload);
          }
        } catch {}
      };
    } catch {
      setStatus("Falha");
      if (autoReconnect) scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    clearRetry();
    setRetries((r) => r + 1);
    retryTimer.current = setTimeout(() => connect(), nextDelay);
  }

  // function handleReconnectClick() {
  //   setRetries(0);
  //   connect();
  // }

  // function handleDisconnectClick() {
  //   clearRetry();
  //   setRetries(0);
  //   cleanupSocket();
  //   setStatus("Desconectado");
    
  //   // Limpa o histórico e streams do localStorage quando desconecta
  //   clearState();
    
  //   // Notifica o componente pai que o histórico foi limpo
  //   onHistory?.([]);
  // }

  useEffect(() => {
    connect();
    return () => {
      clearRetry();
      cleanupSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const badgeColor =
    status === "Conectado" ? "bg-green-500" : status === "Conectando" ? "bg-yellow-500" : status === "Falha" ? "bg-red-500" : "bg-gray-400";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${badgeColor}`} />
      <span className="opacity-80">{status}</span>
      {retries > 0 && status !== "Conectado" && (
        <span className="opacity-60">tentando novamente em {Math.round(nextDelay / 1000)}s</span>
      )}
      {/* <div className="flex items-center gap-2 ml-2">
        {status !== "Conectado" ? (
          <button onClick={handleReconnectClick} className="px-2 py-1 rounded bg-blue-600 text-white">Reconectar</button>
        ) : (
          <button onClick={handleDisconnectClick} className="px-2 py-1 rounded bg-black/10 dark:bg-white/10">Desconectar</button>
        )}
      </div> */}
    </div>
  );
}
