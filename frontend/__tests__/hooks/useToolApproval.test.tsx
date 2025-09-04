import { renderHook, act } from '@testing-library/react'
import { useToolApproval } from '@/hooks/useToolApproval'
import { ToolRequest } from '@/types'

describe('useToolApproval', () => {
  it('should initialize with no tool request and modal closed', () => {
    const { result } = renderHook(() => useToolApproval())

    expect(result.current.toolRequest).toBeNull()
    expect(result.current.showModal).toBe(false)
  })

  it('should request approval and show modal', () => {
    const { result } = renderHook(() => useToolApproval())

    const mockRequest: ToolRequest = {
      requestId: 'req-123',
      tool: 'mcp_create_file',
      params: { content: 'Hello world', path: 'test.txt' },
      explanation: 'Creating a test file',
    }

    act(() => {
      result.current.requestApproval(mockRequest)
    })

    expect(result.current.toolRequest).toEqual(mockRequest)
    expect(result.current.showModal).toBe(true)
  })

  it('should approve request and clear state', () => {
    const { result } = renderHook(() => useToolApproval())

    const mockRequest: ToolRequest = {
      requestId: 'req-123',
      tool: 'mcp_create_file',
      params: { content: 'Hello world', path: 'test.txt' },
      explanation: 'Creating a test file',
    }

    act(() => {
      result.current.requestApproval(mockRequest)
    })

    expect(result.current.showModal).toBe(true)

    act(() => {
      result.current.approve()
    })

    expect(result.current.toolRequest).toBeNull()
    expect(result.current.showModal).toBe(false)
  })

  it('should deny request and clear state', () => {
    const { result } = renderHook(() => useToolApproval())

    const mockRequest: ToolRequest = {
      requestId: 'req-123',
      tool: 'mcp_create_file',
      params: { content: 'Hello world', path: 'test.txt' },
      explanation: 'Creating a test file',
    }

    act(() => {
      result.current.requestApproval(mockRequest)
    })

    expect(result.current.showModal).toBe(true)

    act(() => {
      result.current.deny()
    })

    expect(result.current.toolRequest).toBeNull()
    expect(result.current.showModal).toBe(false)
  })

  it('should clear request manually', () => {
    const { result } = renderHook(() => useToolApproval())

    const mockRequest: ToolRequest = {
      requestId: 'req-123',
      tool: 'mcp_create_file',
      params: { content: 'Hello world', path: 'test.txt' },
      explanation: 'Creating a test file',
    }

    act(() => {
      result.current.requestApproval(mockRequest)
    })

    expect(result.current.showModal).toBe(true)

    act(() => {
      result.current.clearRequest()
    })

    expect(result.current.toolRequest).toBeNull()
    expect(result.current.showModal).toBe(false)
  })

  it('should handle multiple approval requests correctly', () => {
    const { result } = renderHook(() => useToolApproval())

    const firstRequest: ToolRequest = {
      requestId: 'req-1',
      tool: 'mcp_create_file',
      params: { content: 'First file' },
      explanation: 'Creating first file',
    }

    const secondRequest: ToolRequest = {
      requestId: 'req-2',
      tool: 'mcp_create_file',
      params: { content: 'Second file' },
      explanation: 'Creating second file',
    }


    act(() => {
      result.current.requestApproval(firstRequest)
    })

    expect(result.current.toolRequest).toEqual(firstRequest)


    act(() => {
      result.current.requestApproval(secondRequest)
    })

    expect(result.current.toolRequest).toEqual(secondRequest)
    expect(result.current.showModal).toBe(true)
  })

  it('should maintain modal state correctly through approval flow', () => {
    const { result } = renderHook(() => useToolApproval())

    const mockRequest: ToolRequest = {
      requestId: 'req-123',
      tool: 'mcp_create_file',
      params: { content: 'Test content' },
      explanation: 'Test explanation',
    }


    expect(result.current.showModal).toBe(false)


    act(() => {
      result.current.requestApproval(mockRequest)
    })
    expect(result.current.showModal).toBe(true)


    act(() => {
      result.current.approve()
    })
    expect(result.current.showModal).toBe(false)


    act(() => {
      result.current.requestApproval(mockRequest)
    })
    expect(result.current.showModal).toBe(true)


    act(() => {
      result.current.deny()
    })
    expect(result.current.showModal).toBe(false)
  })

  it('should preserve tool request details correctly', () => {
    const { result } = renderHook(() => useToolApproval())

    const complexRequest: ToolRequest = {
      requestId: 'req-complex-123',
      tool: 'mcp_create_file',
      params: {
        content: 'Complex file content with special characters: àáâã',
        path: 'nested/folder/file.txt',
        permissions: '644',
        metadata: {
          author: 'Test User',
          created: new Date().toISOString(),
        },
      },
      explanation: 'Creating a complex file with nested structure and metadata',
    }

    act(() => {
      result.current.requestApproval(complexRequest)
    })

    expect(result.current.toolRequest).toEqual(complexRequest)
    expect(result.current.toolRequest?.requestId).toBe('req-complex-123')
    expect(result.current.toolRequest?.tool).toBe('mcp_create_file')
    expect(result.current.toolRequest?.params).toEqual(complexRequest.params)
    expect(result.current.toolRequest?.explanation).toBe(complexRequest.explanation)
  })
})