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

async function writeIncremental(
  mcpClient: any,
  path: string,
  content: string,
  buffer: string,
  correlationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await mcpClient.writeFile(path, content)
    return { success: true }
  } catch (error) {
    logger.warn('mcp.ai.incremental.write.failed', {
      error: String(error),
      path,
      bufferSize: buffer.length,
      correlationId
    })
    return { success: false, error: String(error) }
  }
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
      let writeBuffer = ''
      let lastWriteTime = Date.now()
      const WRITE_INTERVAL = 50 // Escrever a cada 50ms para ser mais responsivo
      const BUFFER_SIZE = 512 // Buffer menor para escrita mais frequente
      let writeCount = 0
      let isFirstWrite = true

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
            writeBuffer += chunk
            bytes += Buffer.byteLength(chunk)

            // Escrever incrementalmente se buffer atingir tamanho ou tempo limite
            const now = Date.now()
            const shouldWrite = writeBuffer.length >= BUFFER_SIZE ||
                               (now - lastWriteTime) >= WRITE_INTERVAL ||
                               (isFirstWrite && fullContent.length >= 100) // Primeira escrita mais cedo

            if (shouldWrite) {
              const result = await writeIncremental(mcpClient, relativeTarget, fullContent, writeBuffer, correlationId)
              if (result.success) {
                writeCount++
                logger.debug('mcp.ai.incremental.write', {
                  path: relativeTarget,
                  contentLength: fullContent.length,
                  bufferSize: writeBuffer.length,
                  writeCount,
                  isFirstWrite,
                  correlationId
                })
                writeBuffer = ''
                lastWriteTime = now
                isFirstWrite = false
              }
            }
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

      // Escrever qualquer conteúdo restante no buffer
      if (writeBuffer.length > 0) {
        const result = await writeIncremental(mcpClient, relativeTarget, fullContent, writeBuffer, correlationId)
        if (result.success) {
          logger.debug('mcp.ai.final.buffer.write', {
            path: relativeTarget,
            contentLength: fullContent.length,
            bufferSize: writeBuffer.length,
            correlationId
          })
        }
      }

      logger.info('mcp.ai.stream.completed', {
        eventCount,
        fullContentLength: fullContent.length,
        bytes,
        writeCount,
        correlationId
      })
    } catch (e) {
      logger.error('mcp.ai.streaming.failed', String(e), { requestId })
    }

    if (fullContent) {
      logger.info('mcp.ai.file.created', {
        path: relativeTarget,
        bytes,
        correlationId
      })
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
