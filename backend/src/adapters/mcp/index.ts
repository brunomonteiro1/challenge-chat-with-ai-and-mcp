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
  ): Promise<any>;
  writeFile(path: string, content: string): Promise<any>;
  readFile(path: string): Promise<string>;
  listFiles(path?: string): Promise<any[]>;
  createDirectory(path: string): Promise<any>;
}

let clientSingleton: Client | null = null
let initPromise: Promise<Client> | null = null

async function init(rootDir?: string): Promise<Client> {
  if (clientSingleton) return clientSingleton

  if (initPromise) return initPromise

  initPromise = (async () => {
    const ROOT = resolve(rootDir || paths.outputsDir)

    logger.info('mcp.init.details', {
      rootDir,
      outputsDir: paths.outputsDir,
      resolvedRoot: ROOT
    })

    if (!existsSync(ROOT)) {
      mkdirSync(ROOT, { recursive: true })

      logger.info('mcp.root.created', { root: ROOT })
    }

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '.'],
      cwd: ROOT,
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
    logger.info('mcp.client.initializing', { rootDir })
    const client = await init(rootDir)

    const wrapper: MCPClient = {
      async callTool(name, args, handlers) {
        const res = await client.callTool({ name, arguments: args || {} })

        if (handlers?.onDone) handlers.onDone(res)
        return res
      },

      async writeFile(path, content) {
        logger.info('mcp.writeFile.called', { path, contentLength: content.length })
        const result = await client.callTool({
          name: 'write_file',
          arguments: { path, content: content }
        })
        logger.info('mcp.writeFile.result', { path, result })
        return result
      },

      async readFile(path) {
        const result = await client.callTool({
          name: 'read_file',
          arguments: { path }
        })
        const content = (result as any)?.content
        return Array.isArray(content) && content[0]?.text ? content[0].text : ''
      },

      async listFiles(path = '.') {
        const result = await client.callTool({
          name: 'list_directory',
          arguments: { path }
        })
        const content = (result as any)?.content
        if (Array.isArray(content) && content[0]?.text) {
          try {
            return JSON.parse(content[0].text)
          } catch {
            return []
          }
        }
        return []
      },

      async createDirectory(path) {
        return await client.callTool({
          name: 'create_directory',
          arguments: { path }
        })
      },
    }

    return wrapper
  } catch (e) {
    logger.error('mcp.init_failed', String((e as any)?.message || e))
    return null
  }
}
