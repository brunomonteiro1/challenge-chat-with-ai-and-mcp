import { hostname } from 'node:os'
import pino from 'pino'

import { config } from './config.js'

interface LogContext {
  requestId?: string
  sessionId?: string
  toolUseId?: string
  correlationId?: string
  [key: string]: unknown
}

type LogMethod = (message: string, context?: LogContext) => void
type LogMethodWithError = (error: Error | string, message?: string, context?: LogContext) => void

const createLogger = () => {
  const isDevelopment = config.env === 'development'

  const baseConfig = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    base: {
      pid: process.pid,
      hostname: process.env.HOSTNAME || hostname(),
      service: 'chat-backend',
      version: process.env.npm_package_version || '0.1.0',
    },
  }

  if (isDevelopment) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{msg} [{context}]',
        },
      },
    })
  }

  return pino(baseConfig)
}

const pinoLogger = createLogger()

interface Logger {
  debug: LogMethod
  info: LogMethod
  warn: LogMethod
  error: LogMethodWithError
  child: (context: LogContext) => Logger
}

const createLoggerWrapper = (baseLogger: pino.Logger = pinoLogger): Logger => ({
  debug: (message: string, context?: LogContext) => {
    baseLogger.debug(context, message)
  },
  info: (message: string, context?: LogContext) => {
    baseLogger.info(context, message)
  },
  warn: (message: string, context?: LogContext) => {
    baseLogger.warn(context, message)
  },
  error: (error: Error | string, message?: string, context?: LogContext) => {
    if (error instanceof Error) {
      baseLogger.error({ err: error, ...context }, message || error.message)
    } else {
      baseLogger.error(context, error)
    }
  },
  child: (context: LogContext) => {
    const childLogger = baseLogger.child(context)
    return createLoggerWrapper(childLogger)
  },
})

export const logger = createLoggerWrapper()

export const rawLogger = pinoLogger


export const createContextualLogger = (context: LogContext) => logger.child(context)


export const extractLogContext = (obj: any): LogContext => {
  const context: LogContext = {}

  if (obj?.requestId) context.requestId = obj.requestId
  if (obj?.sessionId) context.sessionId = obj.sessionId
  if (obj?.toolUseId) context.toolUseId = obj.toolUseId
  if (obj?.correlationId) context.correlationId = obj.correlationId
  if (obj?.session?.id) context.sessionId = obj.session.id.toString()

  return context
}
