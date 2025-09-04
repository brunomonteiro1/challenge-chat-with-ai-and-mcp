import { MCPFileWriter } from './mcp.js'

import type { IFileWriter } from '../../ports/files.js'

export class LocalFileWriter implements IFileWriter {
  private mcpWriter = new MCPFileWriter()

  async write(args: {
    ws: any
    requestId: string
    userPath?: string
    content: string
    correlationId?: string
  }): Promise<{ path: string; bytes: number }> {
    return await this.mcpWriter.write(args)
  }
}
