import fs from 'node:fs'
import path from 'node:path'

import { AI_MODEL } from '../adapters/anthropic/index.js'
import { userError } from '../domain/errors.js'
import { paths } from '../infrastructure/paths.js'
import { emit } from '../transport/emitter.js'

import type { ClientSocket, Session } from '../domain/types.js'
import type { IAIClient } from '../ports/ai.js'

export function safeResolveOutput(userPath: string) {
  const norm = path.normalize(userPath).replace(/^([/\\])+/, '')
  const full = path.resolve(paths.outputsDir, norm)
  if (!full.startsWith(paths.outputsDir))
    throw userError('Invalid path', 'invalid_path', {
      publicMessage: 'Caminho de arquivo inválido.',
    })
  return full
}

export function defaultFilename() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `arquivo-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate(),
  )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.txt`
  return name
}

const STREAM_CHUNK_SIZE = 1024

export async function executeCreateFileStreaming(
  ws: ClientSocket,
  requestId: string,
  userPath: string | undefined,
  content: string,
  correlationId?: string,
) {
  const rel =
    userPath && typeof userPath === 'string' && userPath.trim().length > 0
      ? userPath
      : defaultFilename()
  const target = safeResolveOutput(rel)
  await fs.promises.mkdir(path.dirname(target), { recursive: true })

  const CHUNK = STREAM_CHUNK_SIZE
  const total = Buffer.byteLength(content)
  let written = 0
  await new Promise<void>(async (resolve, reject) => {
    const stream = fs.createWriteStream(target, { flags: 'w' })
    stream.on('error', reject)
    stream.on('close', () => resolve())
    for (let i = 0; i < content.length; i += CHUNK) {
      const part = content.slice(i, i + CHUNK)
      written += Buffer.byteLength(part)
      stream.write(part)
      emit(ws, {
        type: 'tool_stream',
        requestId,
        done: false,
        bytes: written,
        total,
        chunk: part,
        ...(correlationId ? { correlationId } : {}),
      })
      await new Promise<void>((r) => setTimeout(r, 5))
    }
    stream.end()
  })
  const relPath = path.relative(paths.outputsDir, target)
  emit(ws, {
    type: 'tool_stream',
    requestId,
    done: true,
    path: relPath,
    bytes: Buffer.byteLength(content),
    ...(correlationId ? { correlationId } : {}),
  })
  return { path: relPath, bytes: Buffer.byteLength(content) }
}

export function lastUserText(messages: { role: string; text: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].text
  }
  return ''
}

export async function executeCreateFileViaAIStreaming(
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
  const target = safeResolveOutput(rel)
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  const writer = fs.createWriteStream(target, { flags: 'w' })
  let bytes = 0
  const userCtx = lastUserText(historyForContext)
  const promptText = `Gere APENAS o conteúdo bruto do arquivo solicitado. Sem explicações, apenas o texto/markdown. Pedido do usuário: ${userCtx}`
  const aiMessages: any = [{ role: 'user', content: [{ type: 'text', text: promptText }] }]
  const stream = await aiClient.streamWithTools({
    model: AI_MODEL(),
    max_tokens: 4096,
    temperature: 0,
    tools: [],
    messages: aiMessages,
  })
  type StreamingEvent = { type?: string; delta?: { type?: string; text?: string } }
  try {
    for await (const event of stream) {
      const ev = event as StreamingEvent
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
        const chunk = ev.delta.text
        if (chunk && chunk.length) {
          writer.write(chunk)
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
  } catch {}
  await new Promise<void>((r) => writer.end(() => r()))
  emit(ws, {
    type: 'tool_stream',
    requestId,
    done: true,
    path: path.relative(paths.outputsDir, target),
    bytes,
    ...(correlationId ? { correlationId } : {}),
  })
  return { path: path.relative(paths.outputsDir, target), bytes }
}
