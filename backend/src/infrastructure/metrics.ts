import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'

import { config } from './config.js'
import { logger } from './logger.js'


collectDefaultMetrics({ register })


export const messageCounter = new Counter({
  name: 'chat_messages_total',
  help: 'Total number of messages processed',
  labelNames: ['type', 'status'] as const,
  registers: [register],
})


export const aiRequestCounter = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['provider', 'model', 'status'] as const,
  registers: [register],
})

export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI requests in seconds',
  labelNames: ['provider', 'model', 'status'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
})

export const aiTokensCounter = new Counter({
  name: 'ai_tokens_total',
  help: 'Total number of AI tokens consumed',
  labelNames: ['provider', 'model', 'type'] as const,
  registers: [register],
})


export const mcpToolCounter = new Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total number of MCP tool calls',
  labelNames: ['tool_name', 'status'] as const,
  registers: [register],
})

export const mcpToolDuration = new Histogram({
  name: 'mcp_tool_duration_seconds',
  help: 'Duration of MCP tool calls in seconds',
  labelNames: ['tool_name', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
})


export const wsConnectionsGauge = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
})

export const wsMessageCounter = new Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'type', 'status'] as const,
  registers: [register],
})

export const wsMessageSize = new Histogram({
  name: 'websocket_message_size_bytes',
  help: 'Size of WebSocket messages in bytes',
  labelNames: ['direction', 'type'] as const,
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
})


export const sessionGauge = new Gauge({
  name: 'chat_sessions_active',
  help: 'Number of active chat sessions',
  registers: [register],
})

export const sessionDuration = new Histogram({
  name: 'chat_session_duration_seconds',
  help: 'Duration of chat sessions in seconds',
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400],
  registers: [register],
})


export const fileOperationCounter = new Counter({
  name: 'file_operations_total',
  help: 'Total number of file operations',
  labelNames: ['operation', 'status'] as const,
  registers: [register],
})

export const fileOperationDuration = new Histogram({
  name: 'file_operation_duration_seconds',
  help: 'Duration of file operations in seconds',
  labelNames: ['operation', 'status'] as const,
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  registers: [register],
})

export const fileSizeHistogram = new Histogram({
  name: 'file_size_bytes',
  help: 'Size of files processed in bytes',
  labelNames: ['operation'] as const,
  buckets: [1024, 10240, 102400, 1048576, 10485760],
  registers: [register],
})


export const errorCounter = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['component', 'error_type'] as const,
  registers: [register],
})


export class MetricsTimer {
  private startTime: [number, number]

  constructor() {
    this.startTime = process.hrtime()
  }

  end(): number {
    const [seconds, nanoseconds] = process.hrtime(this.startTime)
    return seconds + nanoseconds / 1e9
  }
}


export const recordAIRequest = (provider: string, model: string) => {
  const timer = new MetricsTimer()

  return {
    success: (inputTokens?: number, outputTokens?: number) => {
      const duration = timer.end()
      aiRequestCounter.inc({ provider, model, status: 'success' })
      aiRequestDuration.observe({ provider, model, status: 'success' }, duration)

      if (inputTokens) {
        aiTokensCounter.inc({ provider, model, type: 'input' }, inputTokens)
      }
      if (outputTokens) {
        aiTokensCounter.inc({ provider, model, type: 'output' }, outputTokens)
      }
    },

    failure: (error: Error) => {
      const duration = timer.end()
      aiRequestCounter.inc({ provider, model, status: 'failure' })
      aiRequestDuration.observe({ provider, model, status: 'failure' }, duration)
      errorCounter.inc({ component: 'ai', error_type: error.constructor.name })

      logger.error(error, 'AI request failed', {
        provider,
        model,
        duration,
      })
    },
  }
}

export const recordMCPTool = (toolName: string) => {
  const timer = new MetricsTimer()

  return {
    success: () => {
      const duration = timer.end()
      mcpToolCounter.inc({ tool_name: toolName, status: 'success' })
      mcpToolDuration.observe({ tool_name: toolName, status: 'success' }, duration)
    },

    failure: (error: Error) => {
      const duration = timer.end()
      mcpToolCounter.inc({ tool_name: toolName, status: 'failure' })
      mcpToolDuration.observe({ tool_name: toolName, status: 'failure' }, duration)
      errorCounter.inc({ component: 'mcp', error_type: error.constructor.name })

      logger.error(error, 'MCP tool call failed', {
        toolName,
        duration,
      })
    },
  }
}

export const recordFileOperation = (operation: 'read' | 'write' | 'delete') => {
  const timer = new MetricsTimer()

  return {
    success: (fileSize?: number) => {
      const duration = timer.end()
      fileOperationCounter.inc({ operation, status: 'success' })
      fileOperationDuration.observe({ operation, status: 'success' }, duration)

      if (fileSize !== undefined) {
        fileSizeHistogram.observe({ operation }, fileSize)
      }
    },

    failure: (error: Error) => {
      const duration = timer.end()
      fileOperationCounter.inc({ operation, status: 'failure' })
      fileOperationDuration.observe({ operation, status: 'failure' }, duration)
      errorCounter.inc({ component: 'file', error_type: error.constructor.name })

      logger.error(error, 'File operation failed', {
        operation,
        duration,
      })
    },
  }
}


export const getMetrics = async (): Promise<string> => {
  try {
    return await register.metrics()
  } catch (error) {
    logger.error(error as Error, 'Failed to collect metrics')
    throw error
  }
}


export const getHealthCheck = () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: process.env.npm_package_version || '0.1.0',
    metrics: {
      enabled: true,
      registry_metrics: register.getMetricsAsArray().length,
    },
  }

  return health
}

logger.info('Prometheus metrics initialized', {
  component: 'metrics',
  registry_metrics: register.getMetricsAsArray().length,
})
