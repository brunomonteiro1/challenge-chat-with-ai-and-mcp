import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development').optional(),
  AI_PROVIDER: z.enum(['anthropic']).default('anthropic').optional(),
  AI_MODEL: z.string().min(1).default('claude-3-7-sonnet-20250219').optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  MCP_TOOL_CREATE_FILE: z.string().min(1).default('write_file').optional(),
  PORT: z.coerce.number().int().positive().default(4000).optional(),
  WS_MAX_PAYLOAD: z.coerce.number().int().positive().default(262144).optional(),
  OUTPUTS_DIR: z.string().optional(),
  LOGS_DIR: z.string().optional(),
  TMP_DIR: z.string().optional(),
  FILE_WRITER: z.enum(['mcp', 'local']).default('mcp').optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info').optional(),
  OTEL_TRACES_ENABLED: z.enum(['true', 'false']).default('false').optional(),
  OTEL_SERVICE_NAME: z.string().default('chat-backend').optional(),
  JAEGER_ENDPOINT: z.string().default('http://localhost:14268/api/traces').optional(),
  JAEGER_AGENT_HOST: z.string().default('localhost').optional(),
  JAEGER_AGENT_PORT: z.coerce.number().int().positive().default(6832).optional(),
})

const env = EnvSchema.parse(process.env)

export const config = {
  env: env.NODE_ENV ?? 'development',
  server: {
    port: env.PORT ?? 4000,
  },
  ws: {
    maxPayload: env.WS_MAX_PAYLOAD ?? 262144,
  },
  ai: {
    provider: env.AI_PROVIDER ?? 'anthropic',
    model: env.AI_MODEL ?? 'claude-3-7-sonnet-20250219',
    anthropicKey: env.ANTHROPIC_API_KEY,
  },
  mcp: {
    toolCreateFile: env.MCP_TOOL_CREATE_FILE ?? 'write_file',
  },
  files: {
    writer: (env.FILE_WRITER as 'mcp' | 'local') ?? 'mcp',
  },
  paths: {
    outputsDir: env.OUTPUTS_DIR,
    logsDir: env.LOGS_DIR,
    tmpDir: env.TMP_DIR,
  },
  observability: {
    logLevel: env.LOG_LEVEL ?? 'info',
    tracingEnabled: env.OTEL_TRACES_ENABLED === 'true',
    serviceName: env.OTEL_SERVICE_NAME ?? 'chat-backend',
    jaeger: {
      endpoint: env.JAEGER_ENDPOINT ?? 'http://localhost:14268/api/traces',
      agentHost: env.JAEGER_AGENT_HOST ?? 'localhost',
      agentPort: env.JAEGER_AGENT_PORT ?? 6832,
    },
  },
} as const
