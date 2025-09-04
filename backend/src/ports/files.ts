import type { ClientSocket } from '../domain/types.js'

export interface IFileWriter {
  write(args: {
    ws: ClientSocket
    requestId: string
    userPath?: string
    content: string
    correlationId?: string
  }): Promise<{ path: string; bytes: number }>
}
