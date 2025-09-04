import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const TMP = path.resolve(process.cwd(), 'tmp-test-tools')

describe('toolService utils', () => {
  beforeAll(async () => {
    process.env.OUTPUTS_DIR = 'tmp-test-tools'
    await fs.promises.mkdir(TMP, { recursive: true })
  })
  afterAll(async () => {
    try { await fs.promises.rm(TMP, { recursive: true, force: true }) } catch {}
  })

  it('safeResolveOutput disallows path escape', async () => {
    const { safeResolveOutput } = await import('../src/application/tools.js')
    expect(() => safeResolveOutput('../etc/passwd')).toThrow()
  })

  it('defaultFilename returns timestamped name', async () => {
    const { defaultFilename } = await import('../src/application/tools.js')
    const name = defaultFilename()
    expect(name.endsWith('.txt')).toBe(true)
    expect(name).toContain('arquivo-')
  })

  it('executeCreateFileStreaming writes file and emits progress', async () => {
    const { executeCreateFileStreaming } = await import('../src/application/tools.js')
    const sent: any[] = []
    const ws = { send: (d: string) => sent.push(JSON.parse(d)), readyState: 1 } as any
    const res = await executeCreateFileStreaming(ws, 'req1', 'hello.txt', 'olá mundo', 'corr-1')
    const target = path.resolve(TMP, 'hello.txt')
    expect(res.path).toBe('hello.txt')
    expect(await fs.promises.readFile(target, 'utf8')).toBe('olá mundo')

    const last = sent.at(-1)
    expect(last.type).toBe('tool_stream')
    expect(last.done).toBe(true)
  })
})

