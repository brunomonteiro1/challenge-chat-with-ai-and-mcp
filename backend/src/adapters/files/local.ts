import { executeCreateFileStreaming } from '../../application/tools.js'

import type { IFileWriter } from '../../ports/files.js'

export class LocalFileWriter implements IFileWriter {
  async write(args: {
    ws: any
    requestId: string
    userPath?: string
    content: string
    correlationId?: string
  }): Promise<{ path: string; bytes: number }> {
    const { ws, requestId, userPath, content, correlationId } = args
    return await executeCreateFileStreaming(ws, requestId, userPath, content, correlationId)
  }
}
