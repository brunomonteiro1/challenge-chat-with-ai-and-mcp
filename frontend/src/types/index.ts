
export type MessageId = string & { readonly __brand: unique symbol };
export type RequestId = string & { readonly __brand: unique symbol };


export interface ChatMessage {
  id: MessageId | string;
  user: UserType;
  role?: "user" | "assistant" | "system"; // Novo campo para compatibilidade
  text: string;
  ts: number;
  file?: {
    name: string;
    content: string;
  };
  source?: MessageSource | undefined; // Identifica a origem da mensagem
  messageType?: "message" | "stream"; // Tipo da mensagem
  hasStream?: boolean; // Indica se a mensagem tem um stream associado
  streamId?: string; // ID do stream associado à mensagem
  _locallyCreated?: boolean; // Flag para identificar mensagens criadas localmente
}


export interface StreamMessage extends ChatMessage {
  streamId: string;
  tool?: string;
  messageType: "stream";
}


export function isStreamMessage(message: ChatMessage): message is StreamMessage {
  return message.messageType === 'stream' && 'streamId' in message && typeof message.streamId === 'string';
}

export function hasStreamId(message: ChatMessage): message is ChatMessage & { streamId: string } {
  return 'streamId' in message && typeof message.streamId === 'string';
}

export function hasTool(obj: unknown): obj is { tool: string } {
  return typeof obj === 'object' && obj !== null && 'tool' in obj && typeof (obj as Record<string, unknown>).tool === 'string';
}


export type UserType = "user" | "assistant" | "system";


export const LegacyUserTypeMapping = {
  "Usuário": "user",
  "IA": "assistant",
  "Sistema": "system",
  "user": "user",
  "assistant": "assistant",
  "system": "system"
} as const;


export enum MessageSource {
  CLIENT = "client",
  SERVER = "server",
  SYSTEM = "system"
}


export interface ToolRequest {
  requestId: RequestId | string;
  tool: ToolType;
  params: ToolParams;
  explanation?: string;
}

export type ToolType = string;

export interface ToolParams {
  path?: string;
  content?: string;
  contentPreview?: string;
  [key: string]: unknown;
}


export interface ToolRequestEvent {
  type: "tool_request";
  requestId: string;
  tool: string;
  params: { path?: string; content?: string; contentPreview?: string };
  explanation?: string;
}

export interface ToolRequestEventExtended extends ToolRequestEvent {
  [key: string]: unknown;
}

export interface ToolStreamEvent {
  type: "tool_stream";
  requestId: string;
  done: boolean;
  chunk?: string;
  bytes?: number;
  total?: number;
  path?: string;
}

export interface AIStreamEvent {
  type: "ai_stream";
  text?: string;
}

export interface AIStreamEventExtended extends AIStreamEvent {
  [key: string]: unknown;
}

export interface AIDoneEvent {
  type: "ai_done";
}

export interface MessageEvent {
  type: "message";
  payload: ChatMessage;
}

export interface HistoryEvent {
  type: "history";
  messages: ChatMessage[];
}

export type WebSocketEvent = 
  | ToolRequestEvent
  | ToolStreamEvent 
  | AIStreamEvent
  | AIDoneEvent
  | MessageEvent
  | HistoryEvent
  | { type: string; [k: string]: unknown };


export interface StreamState {
  content: string;
  bytes: number;
  total?: number;
  done: boolean;
  path?: string;
  tool?: ToolType;
  startedAt?: number;
  expanded?: boolean;
  anchorId?: MessageId | string;
  messageType?: MessageSource | undefined;
  replaceContent?: boolean; // Flag para substituir o conteúdo em vez de concatenar
}


export type ConnectionStatus = "Conectando" | "Conectado" | "Desconectado" | "Falha";


export * from './utils';


export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  title?: string;
}


export interface UseWebSocketReturn {
  status: ConnectionStatus;
  retries: number;
  nextDelay: number;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => void;
  isConnected: boolean;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  streams: Record<string, StreamState>;
  isProcessing: boolean;
  isTyping: boolean;
  addMessage: (message: ChatMessage) => void;
  setProcessing: (processing: boolean) => void;
  setTyping: (typing: boolean) => void;
  updateStream: (requestId: string, update: Partial<StreamState>) => void;
  setMessages?: (messages: ChatMessage[]) => void;
  updateMessage?: (id: string, update: Partial<ChatMessage>) => void
  clearStreams?: () => void
}