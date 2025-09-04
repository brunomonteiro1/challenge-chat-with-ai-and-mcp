import type { WebSocket } from 'ws'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  text: string
  ts: number
  role: ChatRole
}

export interface SessionPendingEntry {
  toolUseId?: string
  name: string
  input: any
}

export interface DeferredDecision {
  requestId: string
  approved: boolean
  params: any
  tool?: string
}

export interface Session {
  id: number
  aiMessages: any[] // SDK-shaped, keep flexible
  pending: Map<string, SessionPendingEntry>
  streamingInFlight: boolean
  deferred: DeferredDecision[]
}

export type ClientSocket = WebSocket
