import path from 'node:path'

import { defaultFilename } from '../../application/tools.js'
import { logger } from '../../infrastructure/logger.js'
import { emit } from '../../transport/emitter.js'
import { getMCP } from '../mcp/index.js'

import type { IFileWriter } from '../../ports/files.js'

export class MCPFileWriter implements IFileWriter {
  async write(args: {
    ws: any
    requestId: string
    userPath?: string
    content: string
    correlationId?: string
  }): Promise<{ path: string; bytes: number }> {
    const { ws, requestId, userPath, content, correlationId } = args
    return await this.executeCreateFileStreamingMCP(ws, requestId, userPath, content, correlationId)
  }

  private async executeCreateFileStreamingMCP(
    ws: any,
    requestId: string,
    userPath: string | undefined,
    content: string,
    correlationId?: string,
  ) {
    const rel =
      userPath && typeof userPath === 'string' && userPath.trim().length > 0
        ? userPath
        : defaultFilename()

    const relativeTarget = rel.replace(/^([/\\])+/, '')
    const relativeDirPath = relativeTarget.includes('/') ? path.dirname(relativeTarget) : '.'

    try {
      const mcpClient = await getMCP()
      if (!mcpClient) {
        throw new Error('MCP client not available')
      }

      if (relativeDirPath && relativeDirPath !== '.' && relativeDirPath !== '') {
        try {
          await mcpClient.createDirectory(relativeDirPath)
          logger.info('mcp.directory.created', { path: relativeDirPath })
        } catch (e) {
          logger.debug('mcp.directory.exists', { path: relativeDirPath, error: String(e) })
        }
      }

      const CHUNK_SIZE = 1024
      const total = Buffer.byteLength(content)
      let written = 0

      for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        const chunk = content.slice(i, i + CHUNK_SIZE)
        written += Buffer.byteLength(chunk)

        emit(ws, {
          type: 'tool_stream',
          requestId,
          done: false,
          bytes: written,
          total,
          chunk,
          ...(correlationId ? { correlationId } : {}),
        })

        await new Promise<void>((resolve) => setTimeout(resolve, 5))
      }

      await mcpClient.writeFile(relativeTarget, content)

      logger.info('mcp.file.created', {
        path: relativeTarget,
        bytes: total,
        correlationId
      })

      emit(ws, {
        type: 'tool_stream',
        requestId,
        done: true,
        path: relativeTarget,
        bytes: total,
        content: content,
        ...(correlationId ? { correlationId } : {}),
      })

      emit(ws, {
        type: 'file_created',
        requestId,
        path: relativeTarget,
        content: content,
        bytes: total,
        ...(correlationId ? { correlationId } : {}),
      })

      return { path: relativeTarget, bytes: total }

    } catch (error) {
      logger.error('mcp.file.write.failed', String(error), {
        path: relativeTarget,
        correlationId
      })

      emit(ws, {
        type: 'tool_stream',
        requestId,
        done: true,
        error: 'Failed to write file using MCP',
        ...(correlationId ? { correlationId } : {}),
      })

      throw error
    }
  }
}
