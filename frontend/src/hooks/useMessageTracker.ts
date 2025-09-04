"use client";

/**
 * Hook para rastrear mensagens enviadas e evitar duplicação
 */
export function useMessageTracker() {

  const sentMessages = new Set<string>();
  
  /**
   * Marca uma mensagem como enviada
   */
  const trackSentMessage = (messageId: string, text: string) => {

    const key = `${messageId}:${text}`;
    sentMessages.add(key);
    

    setTimeout(() => {
      sentMessages.delete(key);
    }, 10000);
  };
  
  /**
   * Verifica se uma mensagem foi enviada recentemente
   */
  const isRecentlySent = (messageId: string, text: string) => {
    const key = `${messageId}:${text}`;
    return sentMessages.has(key);
  };
  
  return {
    trackSentMessage,
    isRecentlySent
  };
}
