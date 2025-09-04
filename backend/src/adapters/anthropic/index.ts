import Anthropic from '@anthropic-ai/sdk'

import { config } from '../../infrastructure/config.js'

let client: Anthropic | null = null

export function getAnthropic(): Anthropic | null {
  if (client) return client
  const key = config.ai.anthropicKey
  if (!key) return null
  client = new Anthropic({ apiKey: key })
  return client
}

export const AI_PROVIDER = () => config.ai.provider
export const AI_MODEL = () => config.ai.model
