export type ErrorCategory = 'user' | 'infra' | 'provider'

export class AppError extends Error {
  category: ErrorCategory
  code: string
  retryable?: boolean
  publicMessage?: string
  constructor(opts: {
    message: string
    code: string
    category: ErrorCategory
    retryable?: boolean
    publicMessage?: string
    cause?: unknown
  }) {
    super(opts.message)
    this.code = opts.code
    this.category = opts.category
    this.retryable = opts.retryable
    this.publicMessage = opts.publicMessage
    if (opts.cause) (this as any).cause = opts.cause
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError

export function userError(
  message: string,
  code = 'user_error',
  options?: { details?: {errors: string[], path: string[]}, retryable?: boolean; publicMessage?: string; cause?: unknown },
) {
  return new AppError({ message, code, category: 'user', ...options })
}

export function infraError(
  message: string,
  code = 'infra_error',
  options?: { retryable?: boolean; publicMessage?: string; cause?: unknown },
) {
  return new AppError({ message, code, category: 'infra', ...options })
}

export function providerError(
  message: string,
  code = 'provider_error',
  options?: { retryable?: boolean; publicMessage?: string; cause?: unknown },
) {
  return new AppError({ message, code, category: 'provider', ...options })
}

export function toClientError(
  e: unknown,
  fallbackCode = 'unknown_error',
  includeDetails = false,
  correlationId?: string,
) {
  if (isAppError(e)) {
    return {
      type: 'error',
      category: e.category,
      error: e.code,
      message: e.publicMessage || stableMessageFor(e.code, e.category) || 'Ocorreu um erro.',
      retryable: !!e.retryable,
      ...(correlationId ? { correlationId } : {}),
      ...(includeDetails ? { details: { message: e.message } } : {}),
    } as const
  }
  return {
    type: 'error',
    category: 'infra' as const,
    error: fallbackCode,
    message: stableMessageFor(fallbackCode, 'infra') || 'Ocorreu um erro.',
    ...(correlationId ? { correlationId } : {}),
    ...(includeDetails ? { details: { message: String((e as any)?.message || e) } } : {}),
  } as const
}

function stableMessageFor(code: string, _: ErrorCategory): string | undefined {
  const map: Record<string, string> = {
    invalid_json: 'JSON inválido.',
    invalid_event: 'Evento inválido.',
    invalid_event_schema: 'Formato de evento não suportado.',
    payload_too_large: 'Payload excede o limite permitido.',
    invalid_path: 'Caminho de arquivo inválido.',
    ai_unavailable: 'Serviço de IA indisponível.',
    mcp_unavailable: 'Serviço de arquivos indisponível.',
  }
  return map[code]
}
