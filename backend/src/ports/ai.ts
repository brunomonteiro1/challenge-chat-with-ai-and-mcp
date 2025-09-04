export interface AIStream<TEvent = unknown, TFinal = { content: unknown[] }> {
  [Symbol.asyncIterator](): AsyncIterator<TEvent>
  final(): Promise<TFinal>
}

export interface IAIClient {
  streamWithTools(args: {
    model: string
    max_tokens: number
    temperature: number
    tools: any[]
    messages: any[]
  }): Promise<AIStream>

  createWithTools(args: {
    model: string
    max_tokens: number
    temperature: number
    tools: any[]
    messages: any[]
  }): Promise<{ content: any[] }>
}
