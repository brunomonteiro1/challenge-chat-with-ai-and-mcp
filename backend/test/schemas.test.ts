import { describe, expect, it } from 'vitest'

import { clientEventSchema } from '../src/transport/schemas.js'

describe('WS client schema', () => {
  it('accepts valid message event', () => {
    const res = clientEventSchema.safeParse({ type: 'message', text: 'olá' })
    expect(res.success).toBe(true)
  })

  it('rejects invalid event', () => {
    const res = clientEventSchema.safeParse({ foo: 'bar' })
    expect(res.success).toBe(false)
  })
})
