import { renderHook, act } from '@testing-library/react'
import { useDataBuffer } from '../useDataBuffer'
import { DataPoint } from '@/types'

describe('useDataBuffer', () => {
  const createMockDataPoint = (id: string, value: number = 42): DataPoint => ({
    id,
    timestamp: new Date(),
    value,
    category: 'test',
    metadata: {},
    source: 'test-source'
  })

  const createMockDataPoints = (count: number, startId = 0): DataPoint[] => {
    return Array.from({ length: count }, (_, i) => 
      createMockDataPoint(`point-${startId + i}`, i)
    )
  }

  it('should initialize with empty buffer', () => {
    const { result } = renderHook(() => useDataBuffer())

    expect(result.current.data).toEqual([])
    expect(result.current.bufferSize).toBe(0)
    expect(result.current.isBufferFull).toBe(false)
  })

  it('should add data points to buffer', () => {
    const { result } = renderHook(() => useDataBuffer())
    const testPoints = createMockDataPoints(5)

    act(() => {
      result.current.addData(testPoints)
    })

    expect(result.current.data).toHaveLength(5)
    expect(result.current.bufferSize).toBe(5)
    expect(result.current.data).toEqual(testPoints)
  })

  it('should handle empty or null data gracefully', () => {
    const { result } = renderHook(() => useDataBuffer())

    act(() => {
      result.current.addData([])
    })

    expect(result.current.data).toEqual([])
    expect(result.current.bufferSize).toBe(0)
  })

  it('should implement sliding window when buffer exceeds max size', () => {
    const maxSize = 10
    const { result } = renderHook(() => useDataBuffer({ maxSize }))

    // Add initial data that fits within buffer
    const initialPoints = createMockDataPoints(8)
    act(() => {
      result.current.addData(initialPoints)
    })

    expect(result.current.bufferSize).toBe(8)
    expect(result.current.isBufferFull).toBe(false)

    // Add more data that exceeds buffer size
    const additionalPoints = createMockDataPoints(5, 8)
    act(() => {
      result.current.addData(additionalPoints)
    })

    expect(result.current.bufferSize).toBe(maxSize)
    expect(result.current.isBufferFull).toBe(true)

    // Should contain the most recent 10 points
    const expectedIds = Array.from({ length: 10 }, (_, i) => `point-${i + 3}`)
    const actualIds = result.current.data.map(point => point.id)
    expect(actualIds).toEqual(expectedIds)
  })

  it('should handle case where new data exceeds entire buffer size', () => {
    const maxSize = 5
    const { result } = renderHook(() => useDataBuffer({ maxSize }))

    // Add initial data
    const initialPoints = createMockDataPoints(3)
    act(() => {
      result.current.addData(initialPoints)
    })

    expect(result.current.bufferSize).toBe(3)

    // Add data that exceeds entire buffer size
    const largeDataSet = createMockDataPoints(10, 100)
    act(() => {
      result.current.addData(largeDataSet)
    })

    expect(result.current.bufferSize).toBe(maxSize)
    expect(result.current.isBufferFull).toBe(true)

    // Should contain only the last 5 points from the large dataset
    const expectedIds = ['point-105', 'point-106', 'point-107', 'point-108', 'point-109']
    const actualIds = result.current.data.map(point => point.id)
    expect(actualIds).toEqual(expectedIds)
  })

  it('should clear buffer correctly', () => {
    const { result } = renderHook(() => useDataBuffer())
    const testPoints = createMockDataPoints(5)

    act(() => {
      result.current.addData(testPoints)
    })

    expect(result.current.bufferSize).toBe(5)

    act(() => {
      result.current.clearBuffer()
    })

    expect(result.current.data).toEqual([])
    expect(result.current.bufferSize).toBe(0)
    expect(result.current.isBufferFull).toBe(false)
  })

  it('should track metrics correctly', () => {
    const { result } = renderHook(() => useDataBuffer({ enableMetrics: true }))

    // Add some data
    act(() => {
      result.current.addData(createMockDataPoints(5))
    })

    let metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(5)
    expect(metrics.totalPointsDropped).toBe(0)
    expect(metrics.bufferUtilization).toBe(0.005) // 5/100000 * 100

    // Add more data
    act(() => {
      result.current.addData(createMockDataPoints(3, 5))
    })

    metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(8)
    expect(metrics.totalPointsDropped).toBe(0)
  })

  it('should track dropped points when buffer overflows', () => {
    const maxSize = 5
    const { result } = renderHook(() => 
      useDataBuffer({ maxSize, enableMetrics: true })
    )

    // Fill buffer to capacity
    act(() => {
      result.current.addData(createMockDataPoints(5))
    })

    let metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(5)
    expect(metrics.totalPointsDropped).toBe(0)

    // Add more data to trigger dropping
    act(() => {
      result.current.addData(createMockDataPoints(3, 5))
    })

    metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(8)
    expect(metrics.totalPointsDropped).toBe(3) // 3 oldest points dropped
    expect(metrics.bufferUtilization).toBe(100) // 5/5 * 100
  })

  it('should calculate average points per second', () => {
    jest.useFakeTimers()
    const startTime = Date.now()
    jest.setSystemTime(startTime)

    const { result } = renderHook(() => useDataBuffer({ enableMetrics: true }))

    // Add data at start
    act(() => {
      result.current.addData(createMockDataPoints(10))
    })

    // Advance time by 2 seconds
    jest.advanceTimersByTime(2000)

    // Add more data
    act(() => {
      result.current.addData(createMockDataPoints(5, 10))
    })

    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(15)
    expect(metrics.averagePointsPerSecond).toBe(7.5) // 15 points / 2 seconds

    jest.useRealTimers()
  })

  it('should reset metrics when buffer is cleared', () => {
    const { result } = renderHook(() => useDataBuffer({ enableMetrics: true }))

    // Add data and verify metrics
    act(() => {
      result.current.addData(createMockDataPoints(5))
    })

    let metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(5)

    // Clear buffer
    act(() => {
      result.current.clearBuffer()
    })

    metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(0)
    expect(metrics.totalPointsDropped).toBe(0)
    expect(metrics.bufferUtilization).toBe(0)
  })

  it('should handle custom buffer size configuration', () => {
    const customMaxSize = 50
    const { result } = renderHook(() => 
      useDataBuffer({ maxSize: customMaxSize })
    )

    // Add data up to custom limit
    act(() => {
      result.current.addData(createMockDataPoints(customMaxSize))
    })

    expect(result.current.bufferSize).toBe(customMaxSize)
    expect(result.current.isBufferFull).toBe(true)

    // Add one more point to trigger sliding window
    act(() => {
      result.current.addData(createMockDataPoints(1, customMaxSize))
    })

    expect(result.current.bufferSize).toBe(customMaxSize)
    expect(result.current.data[0].id).toBe('point-1') // First point should be dropped
    expect(result.current.data[customMaxSize - 1].id).toBe(`point-${customMaxSize}`)
  })

  it('should maintain data order in sliding window', () => {
    const maxSize = 3
    const { result } = renderHook(() => useDataBuffer({ maxSize }))

    // Add initial data
    act(() => {
      result.current.addData([
        createMockDataPoint('first', 1),
        createMockDataPoint('second', 2),
        createMockDataPoint('third', 3)
      ])
    })

    expect(result.current.data.map(p => p.id)).toEqual(['first', 'second', 'third'])

    // Add more data to trigger sliding
    act(() => {
      result.current.addData([
        createMockDataPoint('fourth', 4),
        createMockDataPoint('fifth', 5)
      ])
    })

    // Should maintain chronological order with most recent data
    expect(result.current.data.map(p => p.id)).toEqual(['third', 'fourth', 'fifth'])
  })
})