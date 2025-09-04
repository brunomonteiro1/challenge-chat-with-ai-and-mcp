/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WsStatus from "@/components/WsStatus";
import ToolApprovalModal from "@/components/ToolApprovalModal";
import MessageList from "@/components/chat/MessageList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WebSocketErrorBoundary } from "@/components/WebSocketErrorBoundary";
import { useChat } from "@/stores/chatContext";
import { useToolApproval } from "@/stores/toolApprovalContext";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { MessageSource, hasStreamId, hasTool, ToolRequestEventExtended, AIStreamEventExtended } from "@/types";
import { Button, Input } from "@/components/ui";

export default function Home() {
  const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL;
  const wsRef = useRef<WebSocket | null>(null);
  const assistMsgIdRef = useRef<string | null>(null);
  const currentAssistantTextRef = useRef<string>("");
  

  const { 
    messages, 
    streams, 
    isProcessing, 
    isTyping, 
    addMessage, 
    setProcessing, 
    setTyping, 
    updateStream, 
    setMessages, 
    updateMessage 
  } = useChat();
  
  const { 
    toolRequest: toolReq, 
    showModal, 
    requestApproval, 
    approve: approveToolRequest, 
    deny: denyToolRequest,
    clearRequest
  } = useToolApproval();
  
  const { listRef } = useAutoScroll({
    dependencies: [messages.length, streams],
    enabled: true
  });

  const handleToggleStreamExpand = useCallback((rid: string) => {
    updateStream(rid, { 
      expanded: !streams[rid].expanded 
    });
  }, [streams, updateStream]);
  
  const [text, setText] = useState("");


  useEffect(() => {
    if (wsUrl) {

      return;
    } else {

      setMessages([]);

      updateStream('', { content: '', replaceContent: true });
    }
  }, [wsUrl, setMessages, updateStream]);

  const canSend = useMemo(() => {
    return text.trim().length > 0 &&
      !!wsUrl &&
      wsRef.current?.readyState === WebSocket.OPEN &&
      !isProcessing;
  }, [text, wsUrl, isProcessing]);

  const sendMessage = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const payload = { text };
    setText("");
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {


        setProcessing(true);
        setTyping(false);
        wsRef.current.send(JSON.stringify({ type: "message", ...payload }));
      }
    } catch {

    }
  }, [canSend, text, setProcessing, setTyping]);

  return (
    <ErrorBoundary>
      <div className="bg-background text-foreground font-sans p-4 sm:p-6 flex flex-col max-w-3xl mx-auto h-screen">
      <ToolApprovalModal
        open={showModal}
        request={toolReq}
        onApprove={() => {
          if (!toolReq || !wsRef.current) return;
          setProcessing(true);
          setTyping(false);

          wsRef.current.send(
            JSON.stringify({
              type: "tool_decision",
              requestId: toolReq.requestId,
              approved: true,
              tool: toolReq.tool,
              params: toolReq.params,
            })
          );

          clearRequest();
        }}
        onDeny={() => {
          if (!toolReq || !wsRef.current) return;
          wsRef.current.send(
            JSON.stringify({
              type: "tool_decision",
              requestId: toolReq.requestId,
              approved: false,
            })
          );


          setProcessing(true);
          setTyping(true); 
          clearRequest();
        }}
      />
      <header className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Chat em Tempo Real</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {wsUrl ? (
            <WebSocketErrorBoundary onRetry={() => window.location.reload()}>
              <WsStatus
                url={wsUrl}
                onSocket={(ws) => (wsRef.current = ws)}
                onHistory={(msgs) => {

                  const serverMessages = msgs.map(m => ({
                    ...m,
                    source: m.source || MessageSource.SERVER
                  }));
                  
                  setMessages(serverMessages);
                }}
                onMessage={(m) => {

                  const messageWithSource = {
                    ...m,
                    source: m.source || (m.user === "user" ? MessageSource.CLIENT : MessageSource.SERVER),
                    messageType: m.messageType || "message"
                  };
                  addMessage(messageWithSource);
                  

                  if (hasStreamId(m) && m.messageType === 'stream') {
                    updateStream(m.streamId, {
                      content: "",
                      bytes: 0,
                      total: undefined,
                      done: false,
                      tool: hasTool(m) ? m.tool : 'mcp_create_file',
                      startedAt: Date.now(),
                      expanded: true,
                      anchorId: m.id,
                      messageType: MessageSource.SERVER
                    });
                  }
                }}
                onEvent={(evt) => {
                if (evt.type === "tool_request") {
                  const tr = evt as unknown as ToolRequestEventExtended;

                  if (
                    typeof tr.tool === "string" &&
                    (tr.tool === "mcp_create_file" ||
                      tr.tool.startsWith("mcp_"))
                  ) {


                    if (assistMsgIdRef.current) {
                      assistMsgIdRef.current = null;
                    }
                    setTyping(false);
                    requestApproval({
                      requestId: tr.requestId,
                      tool: tr.tool,
                      params: tr.params,
                      explanation: tr.explanation,
                    });
                  }
                } else if (evt.type === "tool_stream") {
                  const e = evt as unknown as { requestId: string; done: boolean; chunk?: string; bytes?: number; total?: number; path?: string; [key: string]: unknown };

                  if (e.done) {
                    updateStream(e.requestId, {
                      bytes: e.bytes,
                      total: e.total,
                      done: true,
                      path: e.path
                    });
                  } else {
                    updateStream(e.requestId, {
                      content: e.chunk || "",
                      replaceContent: true, 
                      bytes: e.bytes,
                      total: e.total,
                      done: false
                    });
                  }
                }
                if (evt.type === "ai_stream") {

                  if (!assistMsgIdRef.current) {
                    const id = `ai-${Date.now()}`;
                    assistMsgIdRef.current = id;
                    currentAssistantTextRef.current = "";
                    addMessage({ 
                      id, 
                      user: "assistant", 
                      role: "assistant",
                      text: "", 
                      ts: Date.now(),
                      messageType: "stream" // Marcar como stream inicialmente
                    });
                  }
                  const aiEvt = evt as unknown as AIStreamEventExtended;
                  const t = aiEvt.text || "";
                  

                  currentAssistantTextRef.current += t;
                  

                  updateMessage(assistMsgIdRef.current!, { 
                    text: currentAssistantTextRef.current 
                  });
                  if (!isTyping) setTyping(true);
                }
                if (evt.type === "ai_done") {
                  setProcessing(false);
                  setTyping(false);
                  
                  // Finalizar a mensagem da IA se ela existir
                  if (assistMsgIdRef.current && currentAssistantTextRef.current) {
                    console.log('Finalizando mensagem da IA:', {
                      id: assistMsgIdRef.current,
                      text: currentAssistantTextRef.current,
                      length: currentAssistantTextRef.current.length
                    });
                    
                    updateMessage(assistMsgIdRef.current, { 
                      text: currentAssistantTextRef.current,
                      messageType: "message" // Garantir que seja uma mensagem final
                    });
                  } else {
                    console.log('Nenhuma mensagem da IA para finalizar:', {
                      hasId: !!assistMsgIdRef.current,
                      hasText: !!currentAssistantTextRef.current
                    });
                  }
                  
                  assistMsgIdRef.current = null;
                  currentAssistantTextRef.current = "";
                }
              }}
              />
            </WebSocketErrorBoundary>
          ) : (
            <span className="text-sm opacity-70">
              Configure NEXT_PUBLIC_CHAT_WS_URL
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {messages.length === 0 ? (
          <div
            ref={listRef}
            className="flex-1 overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/30 p-3"
          >
            <p className="text-sm opacity-70"></p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            streams={streams}
            isTyping={isTyping}
            isProcessing={isProcessing}
            assistantMsgId={assistMsgIdRef.current}
            onToggleStreamExpand={handleToggleStreamExpand}
            height="100%"
          />
        )}

      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-2 mt-4">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem"
          fullWidth
          disabled={!wsUrl}
          aria-label="Mensagem para enviar"
        />
        <Button
          type="submit"
          disabled={!canSend}
          variant="primary"
          size="md"
        >
          Enviar
        </Button>
      </form>
      </div>
    </ErrorBoundary>
  );
}
