import 'dotenv/config'
import http from 'node:http'

import { AnthropicAIClient } from '../adapters/anthropic/client.js'
import { NullAIClient } from '../adapters/anthropic/null.js'
import { MCPFileWriter } from '../adapters/files/index.js'
import { LocalFileWriter } from '../adapters/files/local.js'
import { AIService } from '../application/aiService.js'
import { config } from '../infrastructure/config.js'
import { logger } from '../infrastructure/logger.js'
import { getMetrics, getHealthCheck } from '../infrastructure/metrics.js'
import { initializeTracing, shutdownTracing } from '../infrastructure/tracing.js'
import { startWs } from '../transport/ws.js'

const PORT: number | string = config.server.port

const server = http.createServer(async (req, res) => {
  const requestLogger = logger.child({ requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })

  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      const health = getHealthCheck()
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      })
      res.end(JSON.stringify(health))
      requestLogger.debug('Health check requested')
      return
    }

    if (req.method === 'GET' && req.url === '/metrics') {
      try {
        const metrics = await getMetrics()
        res.writeHead(200, {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        })
        res.end(metrics)
        requestLogger.debug('Metrics requested')
        return
      } catch (error) {
        requestLogger.error(error as Error, 'Failed to generate metrics')
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
        return
      }
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      res.end()
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    requestLogger.debug('Not found', { url: req.url, method: req.method })
  } catch (error) {
    requestLogger.error(error as Error, 'Request handling error')
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Server Error')
    }
  }
})


const aiClient = config.ai.anthropicKey ? new AnthropicAIClient() : new NullAIClient()
const fileWriter = config.files.writer === 'mcp' ? new MCPFileWriter() : new LocalFileWriter()


initializeTracing()

logger.info('boot.providers', {
  aiProvider: config.ai.provider,
  aiEnabled: !!config.ai.anthropicKey,
  fileWriter: config.files.writer,
  environment: config.env,
})

const aiService = new AIService(aiClient, fileWriter)

startWs(server, aiService)

server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: config.env,
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      metrics: `http://localhost:${PORT}/metrics`,
      websocket: `ws://localhost:${PORT}`,
    },
  })

})


process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')

  server.close(async () => {
    logger.info('HTTP server closed')
    await shutdownTracing()
    process.exit(0)
  })


  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 30000)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')

  server.close(async () => {
    logger.info('HTTP server closed')
    await shutdownTracing()
    process.exit(0)
  })


  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 30000)
})
