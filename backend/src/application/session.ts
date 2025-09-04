import type { ClientSocket, Session } from '../domain/types.js'

let nextClientId = 1
const sessions: Map<ClientSocket, Session> = new Map()

export function createSession(ws: ClientSocket): Session {
  const s: Session = {
    id: nextClientId++,
    aiMessages: [],
    pending: new Map(),
    streamingInFlight: false,
    deferred: [],
  }
  sessions.set(ws, s)
  return s
}

export function getSession(ws: ClientSocket): Session | undefined {
  return sessions.get(ws)
}

export function deleteSession(ws: ClientSocket) {
  sessions.delete(ws)
}
