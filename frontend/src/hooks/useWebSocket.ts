"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionStatus, WebSocketEvent, UseWebSocketReturn } from "@/types";

interface UseWebSocketProps {
  url: string;
  autoReconnect?: boolean;
  onEvent?: (event: WebSocketEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  url,
  autoReconnect = true,
  onEvent,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketProps): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>("Conectando");
  const [retries, setRetries] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextDelay = useMemo(() => {
    if (retries <= 0) return 0;
    if (retries === 1) return 1000;
    if (retries === 2) return 2000;
    if (retries <= 4) return 5000;
    return 10000;
  }, [retries]);

  const clearRetry = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const cleanupSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // Ignore cleanup errors
      }
    }
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    clearRetry();
    cleanupSocket();
    setStatus("Conectando");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("Conectado");
        setRetries(0);
        onConnect?.();
      };

      ws.onclose = () => {
        setStatus("Desconectado");
        onDisconnect?.();
        if (autoReconnect) {
          setRetries((r) => r + 1);
          retryTimer.current = setTimeout(connect, nextDelay);
        }
      };

      ws.onerror = (error) => {
        setStatus("Falha");
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          onEvent?.(data);
        } catch (error) {
          console.warn("Failed to parse WebSocket message:", error);
        }
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      setStatus("Falha");
      if (autoReconnect) {
        setRetries((r) => r + 1);
        retryTimer.current = setTimeout(connect, nextDelay);
      }
    }
  }, [url, autoReconnect, nextDelay, clearRetry, cleanupSocket, onConnect, onDisconnect, onError, onEvent]);

  const disconnect = useCallback(() => {
    clearRetry();
    setRetries(0);
    cleanupSocket();
    setStatus("Desconectado");
  }, [clearRetry, cleanupSocket]);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const isConnected = useMemo(() => 
    wsRef.current?.readyState === WebSocket.OPEN, 
    []
  );

  useEffect(() => {
    connect();
    return () => {
      clearRetry();
      cleanupSocket();
    };
  }, [cleanupSocket, clearRetry, connect]);

  return {
    status,
    retries,
    nextDelay,
    connect,
    disconnect,
    sendMessage,
    isConnected,
  };
}