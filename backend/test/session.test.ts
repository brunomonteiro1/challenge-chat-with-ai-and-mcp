import { describe, expect, it } from 'vitest'

import { createSession, getSession, deleteSession } from '../src/application/session.js'

class FakeWS {
  readyState = 1
  sent: string[] = []
  send(data: string) { this.sent.push(data) }
}

describe('sessionService', () => {
  it('creates, gets and deletes session', () => {
    const ws = new FakeWS() as any
    const s = createSession(ws)
    expect(s.id).toBeGreaterThan(0)
    expect(getSession(ws)).toBe(s)
    deleteSession(ws)
    expect(getSession(ws)).toBeUndefined()
  })
})
