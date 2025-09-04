import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import type { IAIClient, AIStream } from '../src/ports/ai.js'

const TMP = path.resolve(process.cwd(), 'tmp-test-tools-ai')

class DeltaStream implements AIStream<unknown, { content: unknown[] }> {
  constructor(private chunks: string[]) {}
  async *[Symbol.asyncIterator]() {
    for (const text of this.chunks) {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
    }
  }
  async final() { return { content: [] } }
}

class MockAI implements IAIClient {
  constructor(private chunks: string[]) {}
  async streamWithTools() { return new DeltaStream(this.chunks) }
  async createWithTools() { return { content: [] } }
}

describe('executeCreateFileViaAIStreaming', () => {
  beforeAll(async () => {
    process.env.OUTPUTS_DIR = 'tmp-test-tools-ai'
    await fs.promises.mkdir(TMP, { recursive: true })
  })
  afterAll(async () => {
    try { await fs.promises.rm(TMP, { recursive: true, force: true }) } catch {}
  })

  it('streams AI text to file and emits tool_stream events', async () => {
    const { executeCreateFileViaAIStreaming } = await import('../src/application/tools.js')
    const sent: any[] = []
    const ws = { send: (d: string) => sent.push(JSON.parse(d)), readyState: 1 } as any
    const ai = new MockAI(['Hello ', 'World'])
    const session: any = { id: 1 }
    const res = await executeCreateFileViaAIStreaming(ws, 'req-ai', 'note.txt', session, [{ role: 'user', text: 'write note' }], 'corr-x', ai)
    expect(res.path).toBe('note.txt')
    const content = await fs.promises.readFile(path.resolve(TMP, 'note.txt'), 'utf8')
    expect(content).toBe('Hello World')

    expect(sent.some((e) => e.type === 'tool_stream' && e.done === false)).toBe(true)
    expect(sent.some((e) => e.type === 'tool_stream' && e.done === true)).toBe(true)
  })
})

