
import { AI_MODEL, AI_PROVIDER } from '../adapters/anthropic/index.js'
import { executeCreateFileViaAIStreamingMCP } from '../adapters/files/mcp-ai.js'
import { logger, extractLogContext } from '../infrastructure/logger.js'
import {  recordMCPTool, messageCounter } from '../infrastructure/metrics.js'
import {  traceToolCall } from '../infrastructure/tracing.js'
import { emit } from '../transport/emitter.js'

import type { ClientSocket, Session } from '../domain/types.js'
import type { IAIClient } from '../ports/ai.js'
import type { IFileWriter } from '../ports/files.js'

export const TOOLS: any = [
  {
    name: 'mcp_create_file',
    description:
      "Create a text file in the workspace outputs directory. Prefer .txt or .md. Use 'path' only when a specific relative subpath is important. Content must be UTF-8 text.",
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'File text content to write.' },
        path: {
          type: 'string',
          description:
            'Optional relative path under outputs/. If omitted, the server chooses a safe default filename.',
        },
      },
      required: ['content'],
    },
  },
]

export function rid(): string {
  return Math.random().toString(36).slice(2)
}

type StreamingEvent = {
  type?: string
  content_block?: { type?: string; id?: string; name?: string; input?: Record<string, unknown> }
  delta?: { type?: string; text?: string }
}

export class AIService {
  constructor(
    private ai: IAIClient,
    private files: IFileWriter,
  ) {}
  async handleAIFlow(
    ws: ClientSocket,
    text: string,
    session: Session,
    broadcast: (data: any, except?: ClientSocket) => void,
    messages: { id: string; text: string; ts: number; role: 'user' | 'assistant' | 'system' }[],
    correlationId?: string,
  ) {
    const logContext = extractLogContext({ sessionId: session.id, correlationId })
    const flowLogger = logger.child(logContext)

    flowLogger.info('AI flow started', {
      textLength: text.length,
      model: AI_MODEL(),
      provider: AI_PROVIDER(),
    })

    if (AI_PROVIDER() !== 'anthropic' || !this.ai) {
      const warn = 'IA indisponível: configure ANTHROPIC_API_KEY e AI_MODEL.'

      flowLogger.warn('AI unavailable', {
        provider: AI_PROVIDER(),
        hasAIClient: !!this.ai,
      })

      messageCounter.inc({ type: 'ai_unavailable', status: 'warning' })

      messages.push({ id: rid(), text: warn, ts: Date.now(), role: 'system' })
      emit(ws, {
        type: 'message',
        payload: { id: rid(), user: 'Sistema', text: warn, ts: Date.now() },
        ...(correlationId ? { correlationId } : {}),
      })
      return
    }
    session.aiMessages.push({ role: 'user', content: [{ type: 'text', text }] })
    try {
      session.streamingInFlight = true
      const stream = await this.ai.streamWithTools({
        model: AI_MODEL(),
        max_tokens: 1024,
        temperature: 0,
        tools: TOOLS,
        messages: session.aiMessages,
      })
      let accText = ''
      let sawTool = false
      const pendingTools: Array<{
        requestId: string
        id?: string
        name?: string
        input: Record<string, unknown>
      }> = []
      let firstDelta = true
      try {
        for await (const event of stream) {
          const ev = event as StreamingEvent
          if (ev?.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
            const tu = ev.content_block
            sawTool = true
            const requestId = rid()
            pendingTools.push({
              requestId,
              id: tu?.id,
              name: tu?.name,
              input: tu?.input || {},
            })
            session.pending.set(requestId, {
              toolUseId: tu?.id,
              name: tu?.name as any,
              input: (tu?.input || {}) as any,
            })
            emit(ws, {
              type: 'tool_request',
              requestId,
              tool: String(tu?.name || 'mcp_create_file'),
              params: tu?.input || {},
              explanation: 'A IA solicitou executar uma ferramenta.',
              ...(correlationId ? { correlationId } : {}),
            })
            continue
          }
          if (
            !sawTool &&
            ev?.type === 'content_block_delta' &&
            ev.delta?.type === 'text_delta' &&
            ev.delta.text
          ) {
            accText += ev.delta.text
            if (firstDelta) firstDelta = false
            emit(ws, {
              type: 'ai_stream',
              text: ev.delta.text,
              ...(correlationId ? { correlationId } : {}),
            })
          }
        }
      } catch {}
      const final = await stream.final()
      const blocks = ((final as { content?: Array<{ type: string; [k: string]: unknown }> })
        ?.content ?? []) as Array<{ type: string; [k: string]: unknown }>
      session.aiMessages.push({ role: 'assistant', content: blocks })
      if (sawTool) {
        const finalToolUses = (blocks || []).filter((b) => b.type === 'tool_use') as Array<{
          id?: unknown
        }>
        pendingTools.forEach((pt, idx) => {
          const fin = finalToolUses[idx]
          if (!fin) return
          const rec = session.pending.get(pt.requestId)
          if (rec) rec.toolUseId = fin.id as string | undefined
        })

        const textParts = blocks
          .filter((b) => b.type === 'text')
          .map((b) => String((b as any).text || ''))
          .join('\n')
          .trim()
        const finalText = textParts || accText
        if (finalText) {
          messages.push({ id: rid(), text: finalText, ts: Date.now(), role: 'assistant' })
          emit(ws, { type: 'ai_done', text: finalText, ...(correlationId ? { correlationId } : {}) })
        } else {
          emit(ws, { type: 'ai_done', ...(correlationId ? { correlationId } : {}) })
        }

        session.streamingInFlight = false
        if (session.deferred && session.deferred.length) {
          const items = [...session.deferred]
          session.deferred = []
          for (const d of items) {
            await this.processToolDecision(
              ws,
              session,
              d.requestId,
              d.approved,
              d.params,
              d.tool,
              messages,
              correlationId,
              undefined,
            )
          }
        }
        return
      }
      const textParts = blocks
        .filter((b) => b.type === 'text')
        .map((b) => String((b as any).text || ''))
        .join('\n')
        .trim()
      const finalText = textParts || accText
      session.streamingInFlight = false
      if (finalText) {
        messages.push({ id: rid(), text: finalText, ts: Date.now(), role: 'assistant' })
        emit(ws, { type: 'ai_done', text: finalText, ...(correlationId ? { correlationId } : {}) })
      } else {
        emit(ws, { type: 'ai_done', ...(correlationId ? { correlationId } : {}) })
      }
    } catch (err) {
      try {
        const resp = await this.ai.createWithTools({
          model: AI_MODEL(),
          max_tokens: 1024,
          temperature: 0,
          tools: TOOLS,
          messages: session.aiMessages,
        })
        const blocks = (resp?.content ?? []) as Array<{ type: string; [k: string]: unknown }>
        session.aiMessages.push({ role: 'assistant', content: blocks })
        const toolUses = blocks.filter((b) => b.type === 'tool_use') as Array<{
          id?: unknown
          name?: unknown
          input?: Record<string, unknown>
        }>
        if (toolUses.length > 0) {
          for (const tu of toolUses) {
            const requestId = rid()
            session.pending.set(requestId, {
              toolUseId: tu.id as string | undefined,
              name: tu.name as any,
              input: (tu.input || {}) as any,
            })
            emit(ws, {
              type: 'tool_request',
              requestId,
              tool: String(tu.name || 'mcp_create_file'),
              params: tu.input || {},
              explanation: 'A IA solicitou executar uma ferramenta.',
              ...(correlationId ? { correlationId } : {}),
            })
          }
          return
        }
        const textParts = blocks
          .filter((b) => b.type === 'text')
          .map((b) => String((b as any).text || ''))
          .join('\n')
          .trim()
        if (textParts) {
          messages.push({ id: rid(), text: textParts, ts: Date.now(), role: 'assistant' })
          emit(ws, {
            type: 'ai_stream',
            text: textParts,
            ...(correlationId ? { correlationId } : {}),
          })
          emit(ws, {
            type: 'ai_done',
            text: textParts,
            ...(correlationId ? { correlationId } : {}),
          })
        } else {
          emit(ws, { type: 'ai_done', ...(correlationId ? { correlationId } : {}) })
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        const msg = `Erro ao chamar IA: ${(err as any)?.message || String(err)}`
        messages.push({ id: rid(), text: msg, ts: Date.now(), role: 'system' })
        emit(ws, {
          type: 'message',
          payload: { id: rid(), user: 'Sistema', text: msg, ts: Date.now() },
          ...(correlationId ? { correlationId } : {}),
        })
      } finally {
        const s = session
        if (s) {
          s.streamingInFlight = false
          if (s.deferred && s.deferred.length) {
            const items = [...s.deferred]
            s.deferred = []
            for (const d of items) {
              await this.processToolDecision(
                ws,
                s,
                d.requestId,
                d.approved,
                d.params,
                d.tool,
                messages,
                correlationId,
                undefined,
              )
            }
          }
        }
      }
    }
  }

  async sendToolResultAndFollowUp(
    ws: ClientSocket,
    session: Session,
    toolUseId: string | undefined,
    resultObj: any,
    followUpInstruction?: string,
    messages?: { id: string; text: string; ts: number; role: 'user' | 'assistant' | 'system' }[],
    correlationId?: string,
  ) {
    if (!session || !this.ai) return
    session.aiMessages.push({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: toolUseId, content: JSON.stringify(resultObj) },
      ],
    })
    if (followUpInstruction && typeof followUpInstruction === 'string') {
      session.aiMessages.push({
        role: 'user',
        content: [{ type: 'text', text: followUpInstruction }],
      })
    }
    try {
      const stream = await this.ai.streamWithTools({
        model: AI_MODEL(),
        max_tokens: 1024,
        temperature: 0,
        tools: TOOLS,
        messages: session.aiMessages,
      })
      let accText = ''
      try {
        for await (const event of stream) {
          const ev = event as StreamingEvent
          if (
            ev?.type === 'content_block_delta' &&
            ev.delta?.type === 'text_delta' &&
            ev.delta.text
          ) {
            accText += ev.delta.text
            emit(ws, {
              type: 'ai_stream',
              text: ev.delta.text,
              ...(correlationId ? { correlationId } : {}),
            })
          }
        }
      } catch {}
      const final = await stream.final()
      const blocks = ((final as { content?: Array<{ type: string; [k: string]: unknown }> })
        ?.content ?? []) as Array<{ type: string; [k: string]: unknown }>
      session.aiMessages.push({ role: 'assistant', content: blocks })
      const textParts = blocks
        .filter((b) => b.type === 'text')
        .map((b) => String((b as any).text || ''))
        .join('\n')
        .trim()
      const finalText = textParts || accText
      if (finalText) {
        messages?.push?.({ id: rid(), text: finalText, ts: Date.now(), role: 'assistant' })
        emit(ws, { type: 'ai_done', text: finalText, ...(correlationId ? { correlationId } : {}) })
      } else {
        emit(ws, { type: 'ai_done', ...(correlationId ? { correlationId } : {}) })
      }
    } catch (err) {
      try {
        const resp = await this.ai.createWithTools({
          model: AI_MODEL(),
          max_tokens: 1024,
          temperature: 0,
          tools: TOOLS,
          messages: session.aiMessages,
        })
        const blocks = (resp?.content ?? []) as Array<{ type: string; [k: string]: unknown }>
        session.aiMessages.push({ role: 'assistant', content: blocks })
        const textParts = blocks
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n')
          .trim()
        if (textParts) {
          messages?.push?.({ id: rid(), text: textParts, ts: Date.now(), role: 'assistant' })
          emit(ws, {
            type: 'ai_stream',
            text: textParts,
            ...(correlationId ? { correlationId } : {}),
          })
          emit(ws, {
            type: 'ai_done',
            text: textParts,
            ...(correlationId ? { correlationId } : {}),
          })
        } else {
          emit(ws, { type: 'ai_done', ...(correlationId ? { correlationId } : {}) })
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        const msg = `Erro ao enviar resultado da tool para IA: ${(err as any)?.message || String(err)}`
        messages?.push?.({ id: rid(), text: msg, ts: Date.now(), role: 'system' })
        emit(ws, {
          type: 'message',
          payload: { id: rid(), user: 'Sistema', text: msg, ts: Date.now() },
          ...(correlationId ? { correlationId } : {}),
        })
      }
    }
  }

  async processToolDecision(
    ws: ClientSocket,
    session: Session,
    requestId: string,
    approved: boolean,
    params: any,
    toolName: string | undefined,
    messages: { id: string; text: string; ts: number; role: 'user' | 'assistant' | 'system' }[],
    correlationId?: string,
    broadcast?: (data: any, except?: ClientSocket) => void,
  ) {
    const logContext = extractLogContext({ sessionId: session.id, correlationId, requestId })
    const toolLogger = logger.child(logContext)

    toolLogger.info('Processing tool decision', {
      toolName,
      approved,
      paramsKeys: Object.keys(params || {}),
    })

    const pending = session?.pending?.get(requestId)
    if (!pending) {
      toolLogger.warn('No pending tool request found', { requestId })
      return
    }
    session.pending.delete(requestId)
    if (!pending.toolUseId) {
      const lastAssistant = [...(session.aiMessages || [])]
        .reverse()
        .find((m: any) => m.role === 'assistant')
      const toolUses = (lastAssistant?.content || []).filter((b: any) => b.type === 'tool_use')
      if (toolUses.length === 1) pending.toolUseId = toolUses[0].id
      else if (toolUses.length > 1) {
        const matchByName = toolUses.find(
          (tu: any) => tu.name === pending.name || tu.name === toolName,
        )
        if (matchByName) pending.toolUseId = matchByName.id
        else pending.toolUseId = toolUses[0].id
      }
    }
    if (!approved) {
      const tool = pending.name || toolName || 'mcp_create_file'
      const maybePath = params?.path ? String(params.path) : undefined

      toolLogger.info('Tool execution denied by user', {
        tool,
        path: maybePath,
      })

      messageCounter.inc({ type: 'tool_execution', status: 'denied' })

      const systemMessage = {
        id: rid(),
        text: 'O usuário não aprovou a solicitação da IA',
        ts: Date.now(),
        role: 'system' as const
      }
      messages.push(systemMessage)
      if (messages.length > 500) messages.shift()

      const messageEvent = {
        type: 'message' as const,
        payload: { id: systemMessage.id, user: 'system', text: systemMessage.text, ts: systemMessage.ts },
        correlationId,
      }
      emit(ws, messageEvent)
      broadcast?.(messageEvent, ws)

      const instr =
        `Explique de forma objetiva que a IA solicitou usar a ferramenta "${tool}" ` +
        (maybePath ? `para criar o arquivo "${maybePath}"` : 'para criar um arquivo') +
        ', mas o usuário não aprovou a solicitação. ' +
        'Não tente repetir a ação nem pedir novamente; apenas reconheça a negativa.'
      await this.sendToolResultAndFollowUp(
        ws,
        session,
        pending.toolUseId,
        { error: 'denied', message: 'User denied tool execution.' },
        instr,
        messages,
        correlationId,
      )
      return
    }
    if (pending.name === 'mcp_create_file' || toolName === 'mcp_create_file') {
      const mcpMetrics = recordMCPTool('mcp_create_file')

      const systemMessage = {
        id: rid(),
        text: `Executando ${toolName || 'mcp_create_file'}...`,
        ts: Date.now(),
        role: 'system' as const
      }
      messages.push(systemMessage)
      if (messages.length > 500) messages.shift()

      const messageEvent = {
        type: 'message' as const,
        payload: {
          id: systemMessage.id,
          user: 'system',
          text: systemMessage.text,
          ts: systemMessage.ts,
          streamId: requestId,
          messageType: 'stream'
        },
        correlationId,
      }
      emit(ws, messageEvent)
      broadcast?.(messageEvent, ws)

      try {
        let result: any
        if (typeof params?.content === 'string') {
          toolLogger.info('Executing file write with provided content', {
            contentLength: params.content.length,
            path: params.path,
          })

          result = await traceToolCall(
            'mcp_create_file',
            () => this.files.write({
              ws,
              requestId,
              userPath: params.path,
              content: params.content,
              correlationId,
            }),
            params.content.length
          )
        } else {
          toolLogger.info('Executing file write via AI streaming', {
            path: params?.path,
          })

          result = await traceToolCall(
            'mcp_create_file_ai',
            () => executeCreateFileViaAIStreamingMCP(
              ws,
              requestId,
              params?.path,
              session,
              messages,
              correlationId,
              this.ai,
            )
          )
        }

        toolLogger.info('Tool execution completed successfully', {
          result: result ? Object.keys(result) : [],
        })

        messageCounter.inc({ type: 'tool_execution', status: 'success' })
        mcpMetrics.success()

        await this.sendToolResultAndFollowUp(
          ws,
          session,
          pending.toolUseId,
          result,
          undefined,
          messages,
          correlationId,
        )
      } catch (error) {
        toolLogger.error(error as Error, 'Tool execution failed')
        messageCounter.inc({ type: 'tool_execution', status: 'error' })
        mcpMetrics.failure(error as Error)
        throw error
      }
    }
  }
}
