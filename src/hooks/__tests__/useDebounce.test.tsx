import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    
    expect(result.current).toBe('initial')
  })

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    expect(result.current).toBe('initial')

    // Change the value
    rerender({ value: 'updated', delay: 500 })
    
    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Fast forward time but not enough
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(result.current).toBe('initial')

    // Fast forward past the delay
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(result.current).toBe('updated')
  })

  it('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    // First change
    rerender({ value: 'change1', delay: 500 })
    
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(result.current).toBe('initial')

    // Second change before first completes
    rerender({ value: 'change2', delay: 500 })
    
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    // Should still be initial because timer was reset
    expect(result.current).toBe('initial')

    // Complete the debounce
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(result.current).toBe('change2')
  })

  it('handles different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 100 }
      }
    )

    rerender({ value: 'updated', delay: 100 })
    
    act(() => {
      jest.advanceTimersByTime(150)
    })
    
    expect(result.current).toBe('updated')
  })

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    )

    rerender({ value: 'updated', delay: 0 })
    
    act(() => {
      jest.advanceTimersByTime(1)
    })
    
    expect(result.current).toBe('updated')
  })

  it('works with different data types', () => {
    // Test with numbers
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 1, delay: 100 }
      }
    )

    numberRerender({ value: 2, delay: 100 })
    
    act(() => {
      jest.advanceTimersByTime(150)
    })
    
    expect(numberResult.current).toBe(2)

    // Test with objects
    const initialObj = { id: 1, name: 'test' }
    const updatedObj = { id: 2, name: 'updated' }
    
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 100 }
      }
    )

    objectRerender({ value: updatedObj, delay: 100 })
    
    act(() => {
      jest.advanceTimersByTime(150)
    })
    
    expect(objectResult.current).toBe(updatedObj)
  })

  it('cleans up timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    
    const { unmount } = renderHook(() => useDebounce('test', 500))
    
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })

  it('handles delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    )

    rerender({ value: 'updated', delay: 100 })
    
    act(() => {
      jest.advanceTimersByTime(150)
    })
    
    expect(result.current).toBe('updated')
  })
})