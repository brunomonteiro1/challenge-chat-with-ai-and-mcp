import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { NodeSDK } from '@opentelemetry/sdk-node'

import { config } from './config.js'
import { logger } from './logger.js'


const tracingConfig = {
  enabled: process.env.OTEL_TRACES_ENABLED === 'true' || config.env === 'development',
  serviceName: process.env.OTEL_SERVICE_NAME || 'chat-backend',
  serviceVersion: process.env.npm_package_version || '0.1.0',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
  jaegerAgentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
  jaegerAgentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6832'),
}

let sdk: NodeSDK | null = null

export const initializeTracing = () => {
  if (!tracingConfig.enabled) {
    logger.info('OpenTelemetry tracing disabled', { component: 'tracing' })
    return
  }

  try {

    sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: tracingConfig.jaegerEndpoint,
      }),
      instrumentations: [
        new HttpInstrumentation({

          ignoreIncomingRequestHook: (req) => {
            const url = req.url || ''
            return url.includes('/health') || url.includes('/metrics')
          },
        }),
      ],
    })

    sdk.start()

    logger.info('OpenTelemetry tracing initialized', {
      component: 'tracing',
      service: tracingConfig.serviceName,
      version: tracingConfig.serviceVersion,
      jaeger_endpoint: tracingConfig.jaegerEndpoint,
    })
  } catch (error) {
    logger.error(error as Error, 'Failed to initialize OpenTelemetry tracing', {
      component: 'tracing',
    })
  }
}

export const shutdownTracing = async () => {
  if (sdk && tracingConfig.enabled) {
    try {
      await sdk.shutdown()
      logger.info('OpenTelemetry tracing shut down', { component: 'tracing' })
    } catch (error) {
      logger.error(error as Error, 'Error shutting down OpenTelemetry tracing', {
        component: 'tracing',
      })
    }
  }
}


export const tracer = trace.getTracer(tracingConfig.serviceName, tracingConfig.serviceVersion)


export const SpanAttributes = {

  AI_PROVIDER: 'ai.provider',
  AI_MODEL: 'ai.model',
  AI_INPUT_TOKENS: 'ai.input_tokens',
  AI_OUTPUT_TOKENS: 'ai.output_tokens',
  AI_STREAM: 'ai.stream',


  TOOL_NAME: 'tool.name',
  TOOL_INPUT_SIZE: 'tool.input_size',
  TOOL_OUTPUT_SIZE: 'tool.output_size',


  SESSION_ID: 'session.id',
  REQUEST_ID: 'request.id',
  CORRELATION_ID: 'correlation.id',


  WS_MESSAGE_TYPE: 'ws.message_type',
  WS_MESSAGE_SIZE: 'ws.message_size',


  FILE_PATH: 'file.path',
  FILE_SIZE: 'file.size',
  FILE_OPERATION: 'file.operation',
} as const


export const createSpan = (
  name: string,
  attributes: Record<string, string | number | boolean> = {},
  kind: SpanKind = SpanKind.INTERNAL
) => {
  if (!tracingConfig.enabled) {
    return null
  }

  return tracer.startSpan(name, {
    kind,
    attributes,
  })
}


export const traceAsyncOperation = async <T>(
  name: string,
  operation: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {},
  kind: SpanKind = SpanKind.INTERNAL
): Promise<T> => {
  if (!tracingConfig.enabled) {
    return operation()
  }

  const span = createSpan(name, attributes, kind)
  if (!span) {
    return operation()
  }

  try {
    const result = await context.with(trace.setSpan(context.active(), span), operation)
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    })
    throw error
  } finally {
    span.end()
  }
}


export const traceSyncOperation = <T>(
  name: string,
  operation: () => T,
  attributes: Record<string, string | number | boolean> = {},
  kind: SpanKind = SpanKind.INTERNAL
): T => {
  if (!tracingConfig.enabled) {
    return operation()
  }

  const span = createSpan(name, attributes, kind)
  if (!span) {
    return operation()
  }

  try {
    const result = context.with(trace.setSpan(context.active(), span), operation)
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    })
    throw error
  } finally {
    span.end()
  }
}


export const traceAIRequest = async <T>(
  provider: string,
  model: string,
  operation: () => Promise<T>,
  inputTokens?: number,
  outputTokens?: number
): Promise<T> => {
  const attributes: Record<string, string | number | boolean> = {
    [SpanAttributes.AI_PROVIDER]: provider,
    [SpanAttributes.AI_MODEL]: model,
  }

  if (inputTokens !== undefined) {
    attributes[SpanAttributes.AI_INPUT_TOKENS] = inputTokens
  }

  if (outputTokens !== undefined) {
    attributes[SpanAttributes.AI_OUTPUT_TOKENS] = outputTokens
  }

  return traceAsyncOperation(
    `ai.request.${provider}`,
    operation,
    attributes,
    SpanKind.CLIENT
  )
}

export const traceToolCall = async <T>(
  toolName: string,
  operation: () => Promise<T>,
  inputSize?: number,
  outputSize?: number
): Promise<T> => {
  const attributes: Record<string, string | number | boolean> = {
    [SpanAttributes.TOOL_NAME]: toolName,
  }

  if (inputSize !== undefined) {
    attributes[SpanAttributes.TOOL_INPUT_SIZE] = inputSize
  }

  if (outputSize !== undefined) {
    attributes[SpanAttributes.TOOL_OUTPUT_SIZE] = outputSize
  }

  return traceAsyncOperation(
    `tool.call.${toolName}`,
    operation,
    attributes,
    SpanKind.INTERNAL
  )
}

export const traceFileOperation = async <T>(
  operation: string,
  filePath: string,
  operationFn: () => Promise<T>,
  fileSize?: number
): Promise<T> => {
  const attributes: Record<string, string | number | boolean> = {
    [SpanAttributes.FILE_OPERATION]: operation,
    [SpanAttributes.FILE_PATH]: filePath,
  }

  if (fileSize !== undefined) {
    attributes[SpanAttributes.FILE_SIZE] = fileSize
  }

  return traceAsyncOperation(
    `file.${operation}`,
    operationFn,
    attributes,
    SpanKind.INTERNAL
  )
}


export const getCurrentTraceContext = () => {
  if (!tracingConfig.enabled) {
    return {}
  }

  const activeSpan = trace.getActiveSpan()
  if (!activeSpan) {
    return {}
  }

  const spanContext = activeSpan.spanContext()
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  }
}


export const addTraceToLogger = () => {
  if (!tracingConfig.enabled) {
    return {}
  }

  return getCurrentTraceContext()
}

export { tracingConfig }
