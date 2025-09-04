import { renderHook } from '@testing-library/react'
import { useAutoScroll } from '@/hooks/useAutoScroll'

describe('useAutoScroll', () => {

  const mockScrollTo = jest.fn()
  const mockElement = {
    scrollTo: mockScrollTo,
    scrollHeight: 1000,
    scrollTop: 0,
    clientHeight: 500,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return listRef and scrollToBottom function', () => {
    const { result } = renderHook(() => useAutoScroll({
      dependencies: [],
      enabled: true,
    }))

    expect(result.current.listRef).toBeDefined()
    expect(typeof result.current.scrollToBottom).toBe('function')
  })

  it('should scroll to bottom when scrollToBottom is called', () => {
    const { result } = renderHook(() => useAutoScroll({
      dependencies: [],
      enabled: true,
    }))


    Object.defineProperty(result.current.listRef, 'current', {
      value: mockElement,
      writable: true,
    })

    result.current.scrollToBottom()

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: 'smooth',
    })
  })

  it('should not scroll when listRef.current is null', () => {
    const { result } = renderHook(() => useAutoScroll({
      dependencies: [],
      enabled: true,
    }))


    Object.defineProperty(result.current.listRef, 'current', {
      value: null,
      writable: true,
    })


    expect(() => {
      result.current.scrollToBottom()
    }).not.toThrow()

    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  it('should auto-scroll when dependencies change and enabled is true', () => {
    let dependencies = [1]
    
    const { result, rerender } = renderHook(() => useAutoScroll({
      dependencies,
      enabled: true,
    }))


    Object.defineProperty(result.current.listRef, 'current', {
      value: mockElement,
      writable: true,
    })


    dependencies = [2]
    rerender()


    setTimeout(() => {
      expect(mockScrollTo).toHaveBeenCalled()
    }, 0)
  })

  it('should not auto-scroll when enabled is false', () => {
    let dependencies = [1]
    
    const { result, rerender } = renderHook(() => useAutoScroll({
      dependencies,
      enabled: false,
    }))


    Object.defineProperty(result.current.listRef, 'current', {
      value: mockElement,
      writable: true,
    })


    dependencies = [2]
    rerender()


    setTimeout(() => {
      expect(mockScrollTo).not.toHaveBeenCalled()
    }, 0)
  })

  it('should handle multiple dependency changes correctly', () => {
    let dependencies = [1, 'a']
    
    const { result, rerender } = renderHook(() => useAutoScroll({
      dependencies,
      enabled: true,
    }))


    Object.defineProperty(result.current.listRef, 'current', {
      value: mockElement,
      writable: true,
    })


    dependencies = [1, 'b']
    rerender()


    dependencies = [2, 'b']
    rerender()


    dependencies = [2, 'c']
    rerender()


    setTimeout(() => {
      expect(mockScrollTo).toHaveBeenCalled()
    }, 0)
  })

  it('should work with empty dependencies array', () => {
    const { result } = renderHook(() => useAutoScroll({
      dependencies: [],
      enabled: true,
    }))


    expect(result.current.listRef).toBeDefined()
    expect(typeof result.current.scrollToBottom).toBe('function')
  })

  it('should maintain ref stability across re-renders', () => {
    const { result, rerender } = renderHook(() => useAutoScroll({
      dependencies: [1],
      enabled: true,
    }))

    const firstRef = result.current.listRef

    rerender()

    const secondRef = result.current.listRef

    expect(firstRef).toBe(secondRef)
  })

  
})