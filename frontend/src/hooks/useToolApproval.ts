"use client";

import { useCallback, useState } from "react";
import { ToolRequest } from "@/types";

interface UseToolApprovalReturn {
  toolRequest: ToolRequest | null;
  showModal: boolean;
  requestApproval: (request: ToolRequest) => void;
  approve: () => void;
  deny: () => void;
  clearRequest: () => void;
}

interface UseToolApprovalProps {
  onApprove?: (request: ToolRequest) => void;
  onDeny?: (request: ToolRequest) => void;
}

export function useToolApproval({
  onApprove,
  onDeny,
}: UseToolApprovalProps = {}): UseToolApprovalReturn {
  const [toolRequest, setToolRequest] = useState<ToolRequest | null>(null);

  const showModal = Boolean(toolRequest);

  const requestApproval = useCallback((request: ToolRequest) => {
    setToolRequest(request);
  }, []);

  const approve = useCallback(() => {
    if (toolRequest) {
      onApprove?.(toolRequest);
      setToolRequest(null);
    }
  }, [toolRequest, onApprove]);

  const deny = useCallback(() => {
    if (toolRequest) {
      onDeny?.(toolRequest);
      setToolRequest(null);
    }
  }, [toolRequest, onDeny]);

  const clearRequest = useCallback(() => {
    setToolRequest(null);
  }, []);

  return {
    toolRequest,
    showModal,
    requestApproval,
    approve,
    deny,
    clearRequest,
  };
}