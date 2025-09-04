"use client";

import { ReactNode } from 'react';
import { ChatProvider } from './chatContext';
import { ToolApprovalProvider } from './toolApprovalContext';
import { ThemeProvider } from './themeContext';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <ThemeProvider>
      <ChatProvider>
        <ToolApprovalProvider>
          {children}
        </ToolApprovalProvider>
      </ChatProvider>
    </ThemeProvider>
  );
}
