import { describe, it, expect } from 'vitest'

import { AIService } from '../src/application/aiService.js'

import type { IAIClient, AIStream } from '../src/ports/ai.js'
import type { IFileWriter } from '../src/ports/files.js'

class SilentStream implements AIStream<unknown, { content: unknown[] }> {
  async *[Symbol.asyncIterator]() { /* no deltas */ }
  async final() { return { content: [] } }
}

class MockAI implements IAIClient {
  async streamWithTools() { return new SilentStream() }
  async createWithTools() { return { content: [] } }
}

class CaptureFileWriter implements IFileWriter {
  public calls: Array<{ path?: string; content: string }> = []
  async write({ ws, requestId, userPath, content, correlationId }: any) {
    this.calls.push({ path: userPath, content })
    ws.send(JSON.stringify({ type: 'tool_stream', requestId, done: true, path: userPath, bytes: Buffer.byteLength(content), correlationId }))
    return { path: userPath, bytes: Buffer.byteLength(content) }
  }
}

class FakeWS {
  readyState = 1
  sent: any[] = []
  send(d: string) { this.sent.push(JSON.parse(d)) }
}

describe('AIService.processToolDecision', () => {
  it('denied emits ai_done via follow-up', async () => {
    const ai = new MockAI()
    const files = new CaptureFileWriter()
    const service = new AIService(ai as any, files)
    const ws = new FakeWS() as any
    const session: any = { id: 1, aiMessages: [{ role: 'assistant', content: [{ type: 'tool_use', id: 'x', name: 'mcp_create_file', input: {} }] }], pending: new Map(), streamingInFlight: false, deferred: [] }
    session.pending.set('r1', { toolUseId: 'x', name: 'mcp_create_file', input: {} })
    await service.processToolDecision(ws, session, 'r1', false, {}, 'mcp_create_file', [])
    const done = ws.sent.find((e: any) => e.type === 'ai_done')
    expect(done).toBeTruthy()
  })

  it('approved calls file writer and emits tool_stream done', async () => {
    const ai = new MockAI()
    const files = new CaptureFileWriter()
    const service = new AIService(ai as any, files)
    const ws = new FakeWS() as any
    const session: any = { id: 1, aiMessages: [{ role: 'assistant', content: [{ type: 'tool_use', id: 'y', name: 'mcp_create_file', input: {} }] }], pending: new Map(), streamingInFlight: false, deferred: [] }
    session.pending.set('r2', { toolUseId: 'y', name: 'mcp_create_file', input: {} })
    await service.processToolDecision(ws, session, 'r2', true, { path: 'x.txt', content: 'abc' }, 'mcp_create_file', [])
    const streamDone = ws.sent.find((e: any) => e.type === 'tool_stream' && e.done)
    expect(streamDone).toBeTruthy()
    expect(files.calls.length).toBe(1)
  })
})

