import path from 'node:path'

import { defaultFilename } from '../../application/tools.js'
import { logger } from '../../infrastructure/logger.js'
import { emit } from '../../transport/emitter.js'
import { AI_MODEL } from '../anthropic/index.js'
import { getMCP } from '../mcp/index.js'

import type { ClientSocket, Session } from '../../domain/types.js'
import type { IAIClient } from '../../ports/ai.js'

export function lastUserText(messages: { role: string; text: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].text
  }
  return ''
}

export async function executeCreateFileViaAIStreamingMCP(
  ws: ClientSocket,
  requestId: string,
  userPath: string | undefined,
  session: Session,

  historyForContext: { role: string; text: string }[],
  correlationId?: string,
  aiClient?: IAIClient,
) {
  if (!aiClient) throw new Error('AI client not configured')

  const rel =
    userPath && typeof userPath === 'string' && userPath.trim().length > 0
      ? userPath
      : defaultFilename()

  const relativeTarget = rel.replace(/^([/\\])+/, '')
  const relativeDirPath = relativeTarget.includes('/') ? path.dirname(relativeTarget) : '.'

  try {
    const mcpClient = await getMCP()
    if (!mcpClient) {
      throw new Error('MCP client not available')
    }

    if (relativeDirPath && relativeDirPath !== '.' && relativeDirPath !== '') {
      try {
        await mcpClient.createDirectory(relativeDirPath)
        logger.info('mcp.directory.created', { path: relativeDirPath })
      } catch (e) {
        logger.debug('mcp.directory.exists', { path: relativeDirPath, error: String(e) })
      }
    }

    let bytes = 0
    let fullContent = ''
    const userCtx = lastUserText(historyForContext)
    const promptText = `Gere APENAS o conteúdo bruto do arquivo solicitado. Sem explicações, apenas o texto/markdown. Pedido do usuário: ${userCtx}`
    const aiMessages: any = [{ role: 'user', content: [{ type: 'text', text: promptText }] }]

    logger.info('mcp.ai.starting.stream', {
      userCtx,
      promptLength: promptText.length,
      historyLength: historyForContext.length,
      historyRoles: historyForContext.map(m => m.role),
      correlationId
    })

    const stream = await aiClient.streamWithTools({
      model: AI_MODEL(),
      max_tokens: 4096,
      temperature: 0,
      tools: [],
      messages: aiMessages,
    })

    type StreamingEvent = { type?: string; delta?: { type?: string; text?: string } }

    try {
      let eventCount = 0
      for await (const event of stream) {
        eventCount++
        const ev = event as StreamingEvent

        logger.info('mcp.ai.stream.event', {
          eventCount,
          eventType: ev?.type,
          deltaType: ev?.delta?.type,
          hasText: !!ev?.delta?.text,
          correlationId
        })

        if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
          const chunk = ev.delta.text
          if (chunk && chunk.length) {
            fullContent += chunk
            bytes += Buffer.byteLength(chunk)
          }
          emit(ws, {
            type: 'tool_stream',
            requestId,
            done: false,
            bytes,
            chunk,
            ...(correlationId ? { correlationId } : {}),
          })
        }
      }

      logger.info('mcp.ai.stream.completed', {
        eventCount,
        fullContentLength: fullContent.length,
        bytes,
        correlationId
      })
    } catch (e) {
      logger.error('mcp.ai.streaming.failed', String(e), { requestId })
    }

    if (fullContent) {
      logger.info('mcp.ai.writing.file', {
        path: relativeTarget,
        contentLength: fullContent.length,
        correlationId
      })

      try {
        logger.info('mcp.ai.calling.writeFile', {
          path: relativeTarget,
          contentLength: fullContent.length,
          correlationId
        })

        const writeResult = await mcpClient.writeFile(relativeTarget, fullContent)

        logger.info('mcp.ai.writeFile.result', {
          path: relativeTarget,
          result: writeResult,
          correlationId
        })

        logger.info('mcp.ai.file.created', {
          path: relativeTarget,
          bytes,
          correlationId
        })
      } catch (writeError) {
        logger.error('mcp.ai.writeFile.failed', String(writeError), {
          path: relativeTarget,
          correlationId
        })
        throw writeError
      }
    } else {
      logger.warn('mcp.ai.no.content', {
        path: relativeTarget,
        correlationId
      })
    }

    emit(ws, {
      type: 'tool_stream',
      requestId,
      done: true,
      path: relativeTarget,
      bytes,
      content: fullContent,
      ...(correlationId ? { correlationId } : {}),
    })

    emit(ws, {
      type: 'file_created',
      requestId,
      path: relativeTarget,
      content: fullContent,
      bytes,
      ...(correlationId ? { correlationId } : {}),
    })

    return { path: relativeTarget, bytes }

  } catch (error) {
    logger.error('mcp.ai.file.write.failed', String(error), {
      path: relativeTarget,
      correlationId
    })

    emit(ws, {
      type: 'tool_stream',
      requestId,
      done: true,
      error: 'Failed to write file using MCP AI streaming',
      ...(correlationId ? { correlationId } : {}),
    })

    throw error
  }
}
