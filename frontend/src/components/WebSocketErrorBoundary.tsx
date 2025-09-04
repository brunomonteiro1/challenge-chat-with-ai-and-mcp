"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import { ReactNode } from "react";

interface WebSocketErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

export function WebSocketErrorBoundary({ children, onRetry }: WebSocketErrorBoundaryProps) {
  const handleRetry = () => {
    onRetry?.();
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-md">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
            Problema de conexão
          </h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Não foi possível estabelecer conexão com o servidor. Verifique sua conexão com a internet.
          </p>
          <button
            onClick={handleRetry}
            className="mt-3 px-3 py-1 text-sm bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded hover:bg-amber-200 dark:hover:bg-amber-700"
            aria-label="Tentar reconectar ao servidor"
          >
            Reconectar
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
