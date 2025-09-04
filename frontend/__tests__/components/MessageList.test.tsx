import { render, screen } from '@testing-library/react'
import MessageList from '@/components/chat/MessageList'
import { ChatMessage, StreamState } from '@/types'


jest.mock('react-perfect-scrollbar', () => {
  return function MockPerfectScrollbar({ 
    children, 
    containerRef, 
    ...props 
  }: { 
    children: React.ReactNode; 
    containerRef?: (ref: HTMLDivElement) => void;
    [key: string]: unknown;
  }) {
    return (
      <div 
        ref={containerRef} 
        data-testid="perfect-scrollbar"
        {...props}
      >
        {children}
      </div>
    )
  }
}, { virtual: true })


jest.mock('@/components/chat/ChatMessage', () => ({
  ChatMessage: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`message-${message.id}`}>
      {message.text}
    </div>
  )
}), { virtual: true })

jest.mock('@/components/chat/StreamingCard', () => ({
  StreamingCard: ({ 
    requestId, 
    onToggleExpand 
  }: { 
    requestId: string; 
    onToggleExpand: (id: string) => void;
  }) => (
    <div data-testid={`stream-${requestId}`}>
      <button onClick={() => onToggleExpand(requestId)}>
        Toggle Stream
      </button>
    </div>
  )
}), { virtual: true })

describe('MessageList', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      user: 'user',
      role: 'user',
      text: 'Hello',
      ts: Date.now() - 1000,
    },
    {
      id: 'msg-2',
      user: 'assistant',
      role: 'assistant',
      text: 'Hi there!',
      ts: Date.now(),
    },
  ]

  const mockStreams: Record<string, StreamState> = {
    'stream-1': {
      content: 'Stream content',
      bytes: 50,
      total: 100,
      done: false,
      tool: 'mcp_create_file',
      startedAt: Date.now(),
      expanded: false,
      anchorId: 'msg-2',
    },
  }

  const mockProps = {
    messages: mockMessages,
    streams: mockStreams,
    isTyping: false,
    isProcessing: false,
    assistantMsgId: null,
    onToggleStreamExpand: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle empty messages list', () => {
    const emptyProps = {
      ...mockProps,
      messages: [],
    }

    render(<MessageList {...emptyProps} />)

    expect(screen.queryByTestId('message-msg-1')).toBeFalsy()
    expect(screen.queryByTestId('message-msg-2')).toBeFalsy()
  })

  

 

  
})