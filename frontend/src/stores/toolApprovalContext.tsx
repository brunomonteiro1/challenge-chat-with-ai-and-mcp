"use client";

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { ToolRequest } from '@/types';

interface ToolApprovalContextType {
  toolRequest: ToolRequest | null;
  showModal: boolean;
  requestApproval: (request: ToolRequest) => void;
  approve: () => void;
  deny: () => void;
  clearRequest: () => void;
  onApproveCallback: ((request: ToolRequest) => void) | null;
  onDenyCallback: ((request: ToolRequest) => void) | null;
  setCallbacks: (onApprove: (request: ToolRequest) => void, onDeny: (request: ToolRequest) => void) => void;
}

const ToolApprovalContext = createContext<ToolApprovalContextType | undefined>(undefined);

export function ToolApprovalProvider({ children }: { children: ReactNode }) {
  const [toolRequest, setToolRequest] = useState<ToolRequest | null>(null);
  const [onApproveCallback, setOnApproveCallback] = useState<((request: ToolRequest) => void) | null>(null);
  const [onDenyCallback, setOnDenyCallback] = useState<((request: ToolRequest) => void) | null>(null);

  const showModal = Boolean(toolRequest);

  const requestApproval = useCallback((request: ToolRequest) => {
    setToolRequest(request);
  }, []);

  const approve = useCallback(() => {
    if (toolRequest && onApproveCallback) {
      onApproveCallback(toolRequest);
      setToolRequest(null);
    }
  }, [toolRequest, onApproveCallback]);

  const deny = useCallback(() => {
    if (toolRequest && onDenyCallback) {
      onDenyCallback(toolRequest);
      setToolRequest(null);
    }
  }, [toolRequest, onDenyCallback]);

  const clearRequest = useCallback(() => {
    setToolRequest(null);
  }, []);

  const setCallbacks = useCallback((onApprove: (request: ToolRequest) => void, onDeny: (request: ToolRequest) => void) => {
    setOnApproveCallback(() => onApprove);
    setOnDenyCallback(() => onDeny);
  }, []);

  const value = {
    toolRequest,
    showModal,
    requestApproval,
    approve,
    deny,
    clearRequest,
    onApproveCallback,
    onDenyCallback,
    setCallbacks
  };

  return <ToolApprovalContext.Provider value={value}>{children}</ToolApprovalContext.Provider>;
}

export function useToolApproval() {
  const context = useContext(ToolApprovalContext);
  if (context === undefined) {
    throw new Error('useToolApproval must be used within a ToolApprovalProvider');
  }
  return context;
}
