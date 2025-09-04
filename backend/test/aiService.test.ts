import { describe, expect, it } from 'vitest'

import { AIService } from '../src/application/aiService.js'

import type { IAIClient, AIStream } from '../src/ports/ai.js'

class ArrayStream implements AIStream<any, { content: any[] }> {
  constructor(private events: any[], private finalContent: any[]) {}
  async *[Symbol.asyncIterator]() { for (const e of this.events) yield e }
  async final() { return { content: this.finalContent } }
}

class MockAI implements IAIClient {
  constructor(private events: any[], private finalContent: any[]) {}
  async streamWithTools() { return new ArrayStream(this.events, this.finalContent) }
  async createWithTools() { return { content: [] } }
}

class FakeWS {
  readyState = 1
  sent: any[] = []
  send(data: string) { this.sent.push(JSON.parse(data)) }
}

describe('AIService', () => {
  it('emits tool_request when tool_use appears', async () => {
    const events = [
      { type: 'content_block_start', content_block: { type: 'tool_use', id: 't1', name: 'mcp_create_file', input: { path: 'x.txt', content: 'a' } } },
    ]
    const final = [{ type: 'tool_use', id: 't1', name: 'mcp_create_file', input: { path: 'x.txt', content: 'a' } }]
    const ai = new MockAI(events, final)
    const service = new AIService(ai as any)
    const ws = new FakeWS() as any
    const session: any = { id: 1, aiMessages: [], pending: new Map(), streamingInFlight: false, deferred: [] }
    const messages: any[] = []
    await service.handleAIFlow(ws, 'hi', session, () => {}, messages, 'corr-1')
    const sent = ws.sent.find((e: any) => e.type === 'tool_request')
    expect(sent).toBeTruthy()
    expect(sent.tool).toBe('mcp_create_file')
  })
})

