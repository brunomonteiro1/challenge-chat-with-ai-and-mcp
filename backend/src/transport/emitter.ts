import { serverEventSchema } from './schemas.js'
import { toClientError } from '../domain/errors.js'
import { logger } from '../infrastructure/logger.js'

import type { ServerEvent } from './events.js'
import type { WebSocket } from 'ws'

export function emit(ws: WebSocket, event: ServerEvent) {
  try {

    serverEventSchema.parse(event)
    ws.send(JSON.stringify(event))
  } catch (error) {
    logger.error(error as Error, 'Invalid server event schema', { eventType: event.type })

    const fallbackEvent = {
      type: 'error',
      category: 'infra' as const,
      error: 'invalid_event_schema',
      message: 'Internal error: Invalid event schema',
      correlationId: (event as any).correlationId,
    }
    ws.send(JSON.stringify(fallbackEvent))
  }
}

export function emitError(
  ws: WebSocket,
  e: unknown,
  fallbackCode: string,
  includeDetails: boolean,
  correlationId?: string,
) {
  emit(ws, toClientError(e, fallbackCode, includeDetails, correlationId))
}
