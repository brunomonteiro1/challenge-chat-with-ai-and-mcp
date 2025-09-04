import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { logger } from '../../infrastructure/logger.js'
import { paths } from '../../infrastructure/paths.js'



export interface MCPClient {
  callTool(
    name: string,
    args: any,
    handlers?: { onChunk?: (text: string) => void; onDone?: (res: any) => void },
  ): Promise<void>;
}

let clientSingleton: Client | null = null
let initPromise: Promise<Client> | null = null

async function init(rootDir?: string): Promise<Client> {
  if (clientSingleton) return clientSingleton

  if (initPromise) return initPromise

  initPromise = (async () => {
    const ROOT = resolve(rootDir || paths.outputsDir)

    if (!existsSync(ROOT)) {
      mkdirSync(ROOT, { recursive: true })

      logger.info('mcp.root.created', { root: ROOT })
    }

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', ROOT],
    })

    const client = new Client({ name: 'node-mcp-client', version: '1.0.0' })

    await client.connect(transport)

    logger.info('mcp.connected', { root: ROOT })

    clientSingleton = client

    return client
  })()
  return initPromise
}

export async function getMCP(rootDir?: string): Promise<MCPClient | null> {
  try {
    const client = await init(rootDir)

    const wrapper: MCPClient = {
      async callTool(name, args, handlers) {
        const res = await client.callTool({ name, arguments: args || {} })

        if (handlers?.onDone) handlers.onDone(res)
      },
    }

    return wrapper
  } catch (e) {
    logger.error('mcp.init_failed', { error: String((e as any)?.message || e) })
    return null
  }
}
