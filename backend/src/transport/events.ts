/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { ServerEvent as SchemaServerEvent, ClientEvent as SchemaClientEvent } from './schemas.js'
import type { z } from 'zod'



export type MessageEventOut = z.infer<typeof import('./schemas.js').messageEventOutSchema>
export type ToolRequestEvent = z.infer<typeof import('./schemas.js').toolRequestSchema>
export type ToolStreamEvent = z.infer<typeof import('./schemas.js').toolStreamSchema>
export type FileCreatedEvent = z.infer<typeof import('./schemas.js').fileCreatedSchema>
export type AiStreamEvent = z.infer<typeof import('./schemas.js').aiStreamSchema>
export type AiDoneEvent = z.infer<typeof import('./schemas.js').aiDoneSchema>
export type ErrorEventOut = z.infer<typeof import('./schemas.js').errorEventOutSchema>


export type ServerEvent = SchemaServerEvent


export type MessageEvent = z.infer<typeof import('./schemas.js').messageEventSchema>
export type ToolDecisionEvent = z.infer<typeof import('./schemas.js').toolDecisionSchema>
export type ClientEvent = SchemaClientEvent
