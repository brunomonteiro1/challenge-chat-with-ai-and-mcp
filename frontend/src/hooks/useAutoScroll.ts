"use client";

import { useEffect, useRef } from "react";

interface UseAutoScrollReturn {
  listRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
}

interface UseAutoScrollProps {
  dependencies?: React.DependencyList;
  enabled?: boolean;
}

export function useAutoScroll({
  enabled = true,
}: UseAutoScrollProps = {}): UseAutoScrollReturn {
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTo({ 
        top: listRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (enabled) {
      scrollToBottom();
    }
  }, [enabled]);

  return {
    listRef,
    scrollToBottom,
  };
}