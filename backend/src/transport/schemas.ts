import { z } from 'zod'

export const MAX_MESSAGE_TEXT = 4000


export const messageEventSchema = z
  .object({
    type: z.literal('message'),
    text: z.string().min(1).max(MAX_MESSAGE_TEXT),
    correlationId: z.string().optional(),
  })
  .strict()

export const toolDecisionSchema = z
  .object({
    type: z.literal('tool_decision'),
    requestId: z.string().min(1),
    approved: z.boolean(),
    params: z.record(z.any()).optional().default({}),
    tool: z.string().optional(),
    correlationId: z.string().optional(),
  })
  .strict()

export const clientEventSchema = z.union([messageEventSchema, toolDecisionSchema])

export type ClientEvent = z.infer<typeof clientEventSchema>


export const messageEventOutSchema = z
  .object({
    type: z.literal('message'),
    payload: z.object({
      id: z.string(),
      user: z.string(),
      text: z.string(),
      ts: z.number(),
    }),
    correlationId: z.string().optional(),
  })
  .strict()

export const toolRequestSchema = z
  .object({
    type: z.literal('tool_request'),
    requestId: z.string(),
    tool: z.string(),
    params: z.record(z.unknown()),
    explanation: z.string(),
    correlationId: z.string().optional(),
  })
  .strict()

export const toolStreamSchema = z
  .object({
    type: z.literal('tool_stream'),
    requestId: z.string(),
    done: z.boolean(),
    bytes: z.number().optional(),
    total: z.number().optional(),
    chunk: z.string().optional(),
    path: z.string().optional(),
    correlationId: z.string().optional(),
  })
  .strict()

export const aiStreamSchema = z
  .object({
    type: z.literal('ai_stream'),
    text: z.string(),
    correlationId: z.string().optional(),
  })
  .strict()

export const aiDoneSchema = z
  .object({
    type: z.literal('ai_done'),
    text: z.string().optional(),
    correlationId: z.string().optional(),
  })
  .strict()

export const errorEventOutSchema = z
  .object({
    type: z.literal('error'),
    category: z.enum(['user', 'infra', 'provider']),
    error: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
    details: z.unknown().optional(),
    correlationId: z.string().optional(),
  })
  .strict()

export const serverEventSchema = z.union([
  messageEventOutSchema,
  toolRequestSchema,
  toolStreamSchema,
  aiStreamSchema,
  aiDoneSchema,
  errorEventOutSchema,
])

export type ServerEvent = z.infer<typeof serverEventSchema>
