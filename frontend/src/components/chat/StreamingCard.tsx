"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { StreamState } from "@/types";

interface StreamingCardProps {
  requestId: string;
  stream: StreamState;
  onToggleExpand: (requestId: string) => void;
}

export const StreamingCard = memo<StreamingCardProps>(({ 
  requestId, 
  stream, 
  onToggleExpand 
}) => {
  const streamRef = useRef<HTMLPreElement | null>(null);

  const pct = stream.total && stream.total > 0
    ? Math.min(100, Math.floor(((stream.bytes || 0) / stream.total) * 100))
    : undefined;

  const handleToggleExpand = useCallback(() => {
    onToggleExpand(requestId);
  }, [requestId, onToggleExpand]);

  useEffect(() => {
    if (streamRef.current && stream.expanded !== false) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [stream.content, stream.expanded]);

  return (
    <li className="flex flex-col" role="listitem" aria-label="Execução de ferramenta">
      <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 bg-white/40 dark:bg-black/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="flex items-center gap-2">
            {!stream.done ? (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            ) : (
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            )}
            <span className="opacity-80">
              Executando {stream.tool || "mcp"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-60">
              {stream.done ? "Concluído" : "Em execução"}
              {pct !== undefined ? ` • ${pct}%` : ""}
            </span>
            <button
              className="text-xs px-2 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
              onClick={handleToggleExpand}
              aria-expanded={stream.expanded}
              aria-controls={`stream-content-${requestId}`}
            >
              {stream.expanded ? "Minimizar" : "Expandir"}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {pct !== undefined && (
          <div className="h-2 bg-black/10 dark:bg-white/10 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Content */}
        {stream.expanded !== false && (
          <>
            <div className="text-xs opacity-70 mb-1">
              Saída (streaming):
            </div>
            <pre
              id={`stream-content-${requestId}`}
              ref={streamRef}
              className="text-xs whitespace-pre-wrap break-words max-h-60 overflow-auto p-2 bg-black/5 dark:bg-white/10 rounded"
              tabIndex={0}
              aria-label="Saída da execução da ferramenta"
            >
              {stream.content}
            </pre>
            {stream.done && stream.path && (
              <div className="text-xs opacity-70 mt-1">
                Arquivo criado: {stream.path}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
});

StreamingCard.displayName = "StreamingCard";