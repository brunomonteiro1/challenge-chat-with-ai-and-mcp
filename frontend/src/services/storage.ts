"use client";

import { ChatMessage, StreamState } from "@/types";


const STORAGE_KEY = 'chat_messages';
const STREAMS_KEY = 'chat_streams';


interface PersistedState {
  messages: ChatMessage[];
}

interface PersistedStreams {
  streams: Record<string, StreamState>;
}

/**
 * Salva o estado atual do chat no localStorage
 */
export function saveState(messages: ChatMessage[]): void {
  try {
    if (typeof window === 'undefined') return;
    

    const validatedMessages = messages.map(message => {

      let user = message.user;
      let role = message.role;
      

      if (user === "Usuário") user = "user";
      else if (user === "IA") user = "assistant";
      else if (user === "Sistema") user = "system";
      

      if (!role) {
        if (user === "user") role = "user";
        else if (user === "assistant") role = "assistant";
        else if (user === "system") role = "system";
      }
      

      if (role === "user") user = "user";
      else if (role === "assistant") user = "assistant";
      else if (role === "system") user = "system";
      
      return {
        id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        user,
        role,
        text: message.text || "",
        ts: message.ts || Date.now(),
        source: message.source,
        messageType: message.messageType || "message",
        ...(message.file ? { file: message.file } : {})
      };
    });
    
    const state: PersistedState = {
      messages: validatedMessages
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Erro ao salvar estado do chat:', error);
  }
}

/**
 * Carrega o estado do chat do localStorage
 */
export function loadState(): PersistedState | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const stateJson = localStorage.getItem(STORAGE_KEY);
    if (!stateJson) return null;
    
    const parsedState = JSON.parse(stateJson);
    

    if (!parsedState || !Array.isArray(parsedState.messages)) {
      console.warn('Estado do chat inválido no localStorage');
      return null;
    }
    

    const validatedMessages = parsedState.messages.map((message: Record<string, unknown>) => {

      let user = message.user;
      let role = message.role;
      

      if (user === "Usuário") user = "user";
      else if (user === "IA") user = "assistant";
      else if (user === "Sistema") user = "system";
      

      if (!role) {
        if (user === "user") role = "user";
        else if (user === "assistant") role = "assistant";
        else if (user === "system") role = "system";
      }
      

      if (role === "user") user = "user";
      else if (role === "assistant") user = "assistant";
      else if (role === "system") user = "system";
      
      return {
        id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        user,
        role,
        text: message.text || "",
        ts: message.ts || Date.now(),
        source: message.source,
        messageType: message.messageType || "message",
        ...(message.file ? { file: message.file } : {})
      };
    });
    
    const state: PersistedState = {
      messages: validatedMessages
    };
    
    return state;
  } catch (error) {
    console.error('Erro ao carregar estado do chat:', error);
    return null;
  }
}

/**
 * Salva o estado dos streams no localStorage
 */
export function saveStreams(streams: Record<string, StreamState>): void {
  try {
    if (typeof window === 'undefined') return;
    
    const state: PersistedStreams = { streams };
    localStorage.setItem(STREAMS_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Erro ao salvar estado dos streams:', error);
  }
}

/**
 * Carrega o estado dos streams do localStorage
 */
export function loadStreams(): PersistedStreams | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const stateJson = localStorage.getItem(STREAMS_KEY);
    if (!stateJson) return null;
    
    const parsedState = JSON.parse(stateJson);
    

    if (!parsedState || !parsedState.streams || typeof parsedState.streams !== 'object') {
      console.warn('Estado dos streams inválido no localStorage');
      return null;
    }
    
    return parsedState;
  } catch (error) {
    console.error('Erro ao carregar estado dos streams:', error);
    return null;
  }
}

/**
 * Limpa o estado do chat do localStorage
 */
export function clearState(): void {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STREAMS_KEY);
  } catch (error) {
    console.error('Erro ao limpar estado do chat:', error);
  }
}