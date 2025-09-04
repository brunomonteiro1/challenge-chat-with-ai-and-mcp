import { getAnthropic, AI_MODEL } from './index.js'

import type { IAIClient, AIStream } from '../../ports/ai.js'

export class AnthropicAIClient implements IAIClient {
  async streamWithTools(args: {
    model: string
    max_tokens: number
    temperature: number
    tools: any[]
    messages: any[]
  }): Promise<AIStream<unknown, { content: unknown[] }>> {
    const anthropic = getAnthropic()
    if (!anthropic) throw new Error('Anthropic client not configured')
    const stream = await anthropic.messages.stream({
      model: args.model || AI_MODEL(),
      max_tokens: args.max_tokens,
      temperature: args.temperature,
      tools: args.tools,
      messages: args.messages,
    })
    return {
      async *[Symbol.asyncIterator]() {
        for await (const event of stream) yield event as unknown
      },
      async final() {
        const msg = await stream.finalMessage()
        return { content: (msg as any)?.content || [] }
      },
    }
  }

  async createWithTools(args: {
    model: string
    max_tokens: number
    temperature: number
    tools: any[]
    messages: any[]
  }): Promise<{ content: unknown[] }> {
    const anthropic = getAnthropic()
    if (!anthropic) throw new Error('Anthropic client not configured')
    const resp = await anthropic.messages.create({
      model: args.model || AI_MODEL(),
      max_tokens: args.max_tokens,
      temperature: args.temperature,
      tools: args.tools,
      messages: args.messages,
    })
    return { content: (resp as any)?.content || [] }
  }
}
