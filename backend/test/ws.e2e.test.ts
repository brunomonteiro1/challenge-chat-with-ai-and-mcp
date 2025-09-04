import http from 'node:http'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import WebSocket from 'ws'

import { AIService } from '../src/application/aiService.js'
import { startWs } from '../src/transport/ws.js'

import type { IAIClient, AIStream } from '../src/ports/ai.js'

class NoopStream implements AIStream<unknown, { content: unknown[] }> {
  async *[Symbol.asyncIterator]() { /* noop */ }
  async final() { return { content: [] } }
}
class NoopAI implements IAIClient {
  async streamWithTools() { return new NoopStream() }
  async createWithTools() { return { content: [] } }
}

const PORT = 5055

describe('WS contract', () => {
  let server: http.Server
  beforeAll(() => {
    server = http.createServer((_, res) => res.end('ok'))
    startWs(server, new AIService(new NoopAI() as any))
    server.listen(PORT)
  })
  afterAll(() => {
    server?.close()
  })

  it('rejects invalid event with error', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`)
    await new Promise((r) => ws.once('open', r))
    const waitForMessage = (pred: (m: any) => boolean, timeoutMs = 5000) =>
      new Promise<any>((resolve, reject) => {
        const onMsg = (data: WebSocket.RawData) => {
          try {
            const msg = JSON.parse(String(data))
            if (pred(msg)) {
              cleanup()
              resolve(msg)
            }
          } catch {}
        }
        const cleanup = () => {
          clearTimeout(timer)
          ws.off('message', onMsg)
        }
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('timeout'))
        }, timeoutMs)
        ws.on('message', onMsg)
      })
    const errPromise = waitForMessage((m) => m?.type === 'error')
    ws.send(JSON.stringify({ foo: 'bar' }))
    const err = await errPromise
    expect(err?.type).toBe('error')
    ws.close()
  })
})
