import { WebSocketServer } from 'ws'

import { emit, emitError } from './emitter.js'
import { clientEventSchema, MAX_MESSAGE_TEXT } from './schemas.js'
import { rid } from '../application/aiService.js'
import { createSession, deleteSession, getSession } from '../application/session.js'
import { userError } from '../domain/errors.js'
import { config } from '../infrastructure/config.js'
import { logger } from '../infrastructure/logger.js'
import { wsConnectionsGauge, wsMessageCounter, wsMessageSize, messageCounter } from '../infrastructure/metrics.js'

import type { MessageEventOut } from './events.js'
import type { AIService } from '../application/aiService.js'
import type { ClientSocket } from '../domain/types.js'
import type http from 'node:http'
import type { WebSocket } from 'ws'

type ChatMessage = { id: string; text: string; ts: number; role: 'user' | 'assistant' | 'system' }

export function startWs(server: http.Server, ai: AIService) {
  const messages: ChatMessage[] = []
  const MAX_PAYLOAD_BYTES = config.ws.maxPayload
  const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES })

  function broadcast(data: any, except?: ClientSocket) {
    const payload = JSON.stringify(data)
    for (const client of wss.clients) {
      if (client !== except && client.readyState === 1) {
        client.send(payload)
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    const s = createSession(ws)
    const sessionLogger = logger.child({ sessionId: String(s.id) })


    wsConnectionsGauge.inc()

    sessionLogger.info('WebSocket connection established', {
      sessionId: String(s.id),
      totalConnections: wss.clients.size,
    })

    const historyPayload = JSON.stringify({
      type: 'history',
      messages: messages.slice(-200).map(msg => ({
        ...msg,
        user: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system'
      }))
    })
    ws.send(historyPayload)

    wsMessageCounter.inc({ direction: 'outbound', type: 'history', status: 'success' })
    wsMessageSize.observe({ direction: 'outbound', type: 'history' }, Buffer.byteLength(historyPayload))

    ws.on('message', async (raw: Buffer) => {
      const correlationId = rid()
      const messageLogger = sessionLogger.child({ correlationId, requestId: correlationId })


      wsMessageCounter.inc({ direction: 'inbound', type: 'unknown', status: 'received' })
      wsMessageSize.observe({ direction: 'inbound', type: 'unknown' }, raw.length)

      if (raw.length > MAX_PAYLOAD_BYTES) {
        messageLogger.warn('Payload too large', {
          payloadSize: raw.length,
          maxPayload: MAX_PAYLOAD_BYTES,
        })

        wsMessageCounter.inc({ direction: 'inbound', type: 'unknown', status: 'error_payload_too_large' })

        emitError(
          ws,
          userError('Payload too large', 'payload_too_large'),
          'payload_too_large',
          config.env !== 'production',
          correlationId,
        )
        ws.close(1009, 'Payload Too Large')
        return
      }
      let evt: any
      try {
        evt = JSON.parse(raw.toString())
      } catch (error) {
        messageLogger.warn('Invalid JSON received', {
          error: (error as Error).message,
          payloadSize: raw.length,
        })

        wsMessageCounter.inc({ direction: 'inbound', type: 'unknown', status: 'error_invalid_json' })

        emitError(
          ws,
          userError('Invalid JSON', 'invalid_json'),
          'invalid_json',
          config.env !== 'production',
          correlationId,
        )
        return
      }
      if (!evt || typeof evt !== 'object') {
        messageLogger.warn('Invalid event object', { evt })

        wsMessageCounter.inc({ direction: 'inbound', type: 'unknown', status: 'error_invalid_event' })

        emitError(
          ws,
          userError('Invalid event', 'invalid_event'),
          'invalid_event',
          config.env !== 'production',
          correlationId,
        )
        return
      }

      const parsed = clientEventSchema.safeParse(evt)
      if (!parsed.success) {
        messageLogger.warn('Invalid event schema', {
          errors: parsed.error.errors,
          event: evt,
          eventType: evt?.type,
        })

        wsMessageCounter.inc({ direction: 'inbound', type: evt?.type || 'unknown', status: 'error_invalid_schema' })

        emitError(
          ws,
          userError('Invalid schema', 'invalid_event_schema', {
            publicMessage: 'Formato inválido de evento.',
            details: {
              errors: parsed.error.errors.map(e => e.message),
              path: parsed.error.errors.map(e => e.path.join('.')),
            }
          }),
          'invalid_event_schema',
          config.env !== 'production',
          correlationId,
        )
        return
      }
      const data = parsed.data

      if (data.type === 'message') {
        const userText = data.text.toString().slice(0, MAX_MESSAGE_TEXT)

        messageLogger.info('User message received', {
          textLength: userText.length,
          originalLength: data.text.toString().length,
          truncated: data.text.toString().length > MAX_MESSAGE_TEXT,
        })

        wsMessageCounter.inc({ direction: 'inbound', type: 'message', status: 'success' })
        messageCounter.inc({ type: 'user_message', status: 'received' })

        messages.push({ id: rid(), text: userText, ts: Date.now(), role: 'user' })
        if (messages.length > 500) messages.shift()

        const echo: MessageEventOut = {
          type: 'message',
          payload: { id: rid(), user: 'user', text: userText, ts: Date.now() },
          correlationId,
        }

        emit(ws, echo)
        broadcast(echo, ws)

        const echoPayload = JSON.stringify(echo)
        wsMessageCounter.inc({ direction: 'outbound', type: 'message', status: 'success' })
        wsMessageSize.observe({ direction: 'outbound', type: 'message' }, Buffer.byteLength(echoPayload))

        await ai.handleAIFlow(ws, userText, s, broadcast, messages, correlationId)
        return
      }

      if (data.type === 'tool_decision') {
        const approved = !!data.approved
        const params = data.params || {}
        const session = getSession(ws)

        messageLogger.info('Tool decision received', {
          requestId: data.requestId,
          tool: data.tool,
          approved,
          paramsKeys: Object.keys(params),
        })

        wsMessageCounter.inc({ direction: 'inbound', type: 'tool_decision', status: 'success' })
        messageCounter.inc({ type: 'tool_decision', status: approved ? 'approved' : 'denied' })

        if (!session) {
          messageLogger.warn('No session found for tool decision')
          return
        }

        if (session.streamingInFlight) {
          messageLogger.debug('Deferring tool decision due to streaming in flight')
          session.deferred.push({ requestId: data.requestId, approved, params, tool: data.tool })
          return
        }

        await ai.processToolDecision(
          ws,
          session,
          data.requestId,
          approved,
          params,
          data.tool,
          messages,
          correlationId,
          broadcast,
        )
        return
      }
    })

    const interval = setInterval(() => {
      if (ws.readyState === 1) ws.ping()
    }, 30000)

    ws.on('close', (code, reason) => {
      clearInterval(interval)
      deleteSession(ws)
      wsConnectionsGauge.dec()

      sessionLogger.info('WebSocket connection closed', {
        code,
        reason: reason.toString(),
        totalConnections: wss.clients.size,
      })
    })

    ws.on('error', (error) => {
      clearInterval(interval)
      deleteSession(ws)
      wsConnectionsGauge.dec()

      sessionLogger.error(error, 'WebSocket error', {
        totalConnections: wss.clients.size,
      })
    })
  })
}
