import path from 'node:path'

import {
  safeResolveOutput,
  executeCreateFileStreaming,
  defaultFilename,
} from '../../application/tools.js'
import { config } from '../../infrastructure/config.js'
import { paths } from '../../infrastructure/paths.js'
import { getMCP } from '../mcp/index.js'

import type { ClientSocket } from '../../domain/types.js'
import type { IFileWriter } from '../../ports/files.js'

export class MCPFileWriter implements IFileWriter {
  async write(args: {
    ws: ClientSocket
    requestId: string
    userPath?: string
    content: string
    correlationId?: string
  }): Promise<{ path: string; bytes: number }> {
    const { ws, requestId, userPath, content, correlationId } = args
    const mcp = await getMCP(paths.outputsDir)
    if (mcp) {
      const rel =
        userPath && String(userPath).trim().length > 0 ? String(userPath) : defaultFilename()
      const absPath = safeResolveOutput(rel)
      let totalBytes = 0
      try {
        await mcp.callTool(
          config.mcp.toolCreateFile,
          { path: absPath, content },
          {
            onChunk: (text) => {
              if (typeof text === 'string' && text.length) {
                totalBytes += Buffer.byteLength(text)
                ws.send(
                  JSON.stringify({
                    type: 'tool_stream',
                    requestId,
                    done: false,
                    bytes: totalBytes,
                    chunk: text,
                    ...(correlationId ? { correlationId } : {}),
                  }),
                )
              }
            },
            onDone: () => {
              const pathRel = path.relative(paths.outputsDir, absPath)
              ws.send(
                JSON.stringify({
                  type: 'tool_stream',
                  requestId,
                  done: true,
                  path: pathRel,
                  bytes: totalBytes || Buffer.byteLength(content),
                  ...(correlationId ? { correlationId } : {}),
                }),
              )
            },
          },
        )
        return {
          path: path.relative(paths.outputsDir, absPath),
          bytes: Buffer.byteLength(content),
        }
      } catch {

        return await executeCreateFileStreaming(ws, requestId, userPath, content, correlationId)
      }
    }

    return await executeCreateFileStreaming(ws, requestId, userPath, content, correlationId)
  }
}
