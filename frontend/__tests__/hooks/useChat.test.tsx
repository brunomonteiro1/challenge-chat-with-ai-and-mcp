import { renderHook, act } from '@testing-library/react'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/types'


const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useChat())

    expect(result.current.messages).toEqual([])
    expect(result.current.streams).toEqual({})
    expect(result.current.isProcessing).toBe(false)
    expect(result.current.isTyping).toBe(false)
  })

  it('should replace content when replaceContent flag is true', () => {
    const { result } = renderHook(() => useChat())


    act(() => {
      result.current.updateStream('stream-1', {
        content: 'Initial content',
        bytes: 50,
        done: false,
        tool: 'mcp_create_file',
        startedAt: Date.now(),
        expanded: false,
      })
    })


    act(() => {
      result.current.updateStream('stream-1', {
        content: 'Replaced content',
        replaceContent: true,
      })
    })

    expect(result.current.streams['stream-1'].content).toBe('Replaced content')
  })

  it('should set processing state', () => {
    const { result } = renderHook(() => useChat())

    act(() => {
      result.current.setProcessing(true)
    })

    expect(result.current.isProcessing).toBe(true)

    act(() => {
      result.current.setProcessing(false)
    })

    expect(result.current.isProcessing).toBe(false)
  })

  it('should set typing state', () => {
    const { result } = renderHook(() => useChat())

    act(() => {
      result.current.setTyping(true)
    })

    expect(result.current.isTyping).toBe(true)

    act(() => {
      result.current.setTyping(false)
    })

    expect(result.current.isTyping).toBe(false)
  })

  it('should handle localStorage errors gracefully', () => {

    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useChat())

    const newMessage: ChatMessage = {
      id: 'msg-1',
      user: 'user',
      role: 'user',
      text: 'Hello',
      ts: Date.now(),
    }


    expect(() => {
      act(() => {
        result.current.addMessage(newMessage)
      })
    }).not.toThrow()


    expect(result.current.messages).toContain(newMessage)
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json')

    const { result } = renderHook(() => useChat())


    expect(result.current.messages).toEqual([])
    expect(result.current.streams).toEqual({})
  })
})