import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StreamingCard } from '@/components/chat/StreamingCard'
import { StreamState } from '@/types'

describe('StreamingCard', () => {
  const mockOnToggleExpand = jest.fn()
  const baseStream: StreamState = {
    content: 'console.log("Hello World");',
    bytes: 26,
    total: 100,
    done: false,
    tool: 'mcp_create_file',
    startedAt: Date.now(),
    expanded: false,
  }

  beforeEach(() => {
    mockOnToggleExpand.mockClear()
  })

  it('should render streaming card with tool name', () => {
    render(
      <StreamingCard
        requestId="test-request-1"
        stream={baseStream}
        onToggleExpand={mockOnToggleExpand}
      />
    )

    expect(screen.getByText('Executando mcp_create_file')).toBeTruthy()
  })

  it('should toggle expansion when clicked', async () => {
    const user = userEvent.setup()

    render(
      <StreamingCard
        requestId="test-request-1"
        stream={baseStream}
        onToggleExpand={mockOnToggleExpand}
      />
    )

    const toggleButton = screen.getByRole('button')
    await user.click(toggleButton)

    expect(mockOnToggleExpand).toHaveBeenCalledWith('test-request-1')
  })

  it('should show content when expanded', () => {
    const expandedStream = {
      ...baseStream,
      expanded: true,
    }

    render(
      <StreamingCard
        requestId="test-request-1"
        stream={expandedStream}
        onToggleExpand={mockOnToggleExpand}
      />
    )

    expect(screen.getByText('console.log("Hello World");')).toBeTruthy()
  })

  it('should not show content when collapsed', () => {
    render(
      <StreamingCard
        requestId="test-request-1"
        stream={baseStream}
        onToggleExpand={mockOnToggleExpand}
      />
    )

    expect(screen.queryByText('console.log("Hello World");')).toBeFalsy()
  })

  it('should have proper accessibility attributes', () => {
    render(
      <StreamingCard
        requestId="test-request-1"
        stream={baseStream}
        onToggleExpand={mockOnToggleExpand}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeTruthy()
    
    const listItem = screen.getByRole('listitem')
    expect(listItem).toBeTruthy()
  })

  it('should handle empty content gracefully', () => {
    const emptyStream = {
      ...baseStream,
      content: '',
      expanded: true,
    }

    render(
      <StreamingCard
        requestId="test-request-1"
        stream={emptyStream}
        onToggleExpand={mockOnToggleExpand}
      />
    )


    expect(screen.getByRole('listitem')).toBeTruthy()
  })
})