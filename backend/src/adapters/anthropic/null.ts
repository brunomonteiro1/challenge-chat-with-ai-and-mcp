import { providerError } from '../../domain/errors.js'

import type { IAIClient, AIStream } from '../../ports/ai.js'

export class NullAIClient implements IAIClient {
  async streamWithTools(): Promise<AIStream> {
    throw providerError('AI unavailable', 'ai_unavailable', {
      publicMessage: 'Serviço de IA indisponível.',
      retryable: false,
    })
  }
  async createWithTools(): Promise<{ content: any[] }> {
    throw providerError('AI unavailable', 'ai_unavailable', {
      publicMessage: 'Serviço de IA indisponível.',
      retryable: false,
    })
  }
}
