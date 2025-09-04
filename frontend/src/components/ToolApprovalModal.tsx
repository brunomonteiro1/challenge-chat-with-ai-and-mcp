"use client";

export type ToolRequest = {
  requestId: string;
  tool: string;
  params: { path?: string; content?: string; contentPreview?: string };
  explanation?: string;
};

export default function ToolApprovalModal(props: {
  open: boolean;
  request: ToolRequest | null;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const { open, request, onApprove, onDeny } = props;
  if (!open || !request) return null;

  const preview = request.params.content ?? request.params.contentPreview ?? "";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-approval-title"
    >
      <div className="w-full max-w-lg rounded-lg bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-4 shadow-xl">
        <h2 id="tool-approval-title" className="text-lg font-semibold mb-2">Solicitação de ferramenta da IA</h2>
        {request.explanation && (
          <p className="text-sm opacity-80 mb-2">{request.explanation}</p>
        )}
        <div className="text-sm mb-3">
          <div><span className="opacity-70">Tool:</span> <span className="font-mono">{request.tool}</span></div>
          {request.params.path ? (
            <div><span className="opacity-70">Arquivo:</span> <span className="font-mono break-all">{request.params.path}</span></div>
          ) : (
            <div className="opacity-70">O caminho do arquivo será definido automaticamente.</div>
          )}
        </div>
        {preview && (
          <div className="mb-3">
            <div className="text-xs opacity-70 mb-1">Pré-visualização do conteúdo:</div>
            <pre className="max-h-48 overflow-auto text-xs p-2 bg-black/5 dark:bg-white/10 rounded whitespace-pre-wrap break-words">{preview.slice(0, 2000)}</pre>
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={onDeny} 
            className="px-3 py-2 rounded bg-black/10 dark:bg-white/10"
            aria-label="Negar solicitação da ferramenta"
          >
            Negar
          </button>
          <button 
            onClick={onApprove} 
            className="px-3 py-2 rounded bg-blue-600 text-white"
            aria-label="Aprovar solicitação da ferramenta"
          >
            Aprovar
          </button>
        </div>
      </div>
    </div>
  );
}
